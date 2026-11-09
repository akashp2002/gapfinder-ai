"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { listMaterials } from "@/lib/material-store";
import type { StoredMaterial } from "@/lib/materials";
import { retrieveRelevantChunks } from "@/lib/retrieval";

type ExplanationResponse = {
  answer?: string;
  citations?: string[];
  error?: string;
};

function describeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The explanation could not be generated. Try again.";
}

export default function ExplainTopic() {
  const [materials, setMaterials] = useState<StoredMaterial[]>([]);
  const [topic, setTopic] = useState("");
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    listMaterials()
      .then((savedMaterials) => {
        if (active) setMaterials(savedMaterials);
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(describeError(error));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const retrievedChunks = useMemo(
    () => retrieveRelevantChunks(materials, topic, 8),
    [materials, topic],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setAnswer("");
    setCitations([]);

    if (retrievedChunks.length === 0) {
      setErrorMessage("No matching source text was found. Try another topic or add material.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          question: question.trim(),
          sources: retrievedChunks.map((chunk) => ({
            id: chunk.id,
            citation: chunk.citation,
            text: chunk.text,
          })),
        }),
      });
      const payload = (await response.json()) as ExplanationResponse;
      if (!response.ok || !payload.answer || !payload.citations?.length) {
        throw new Error(payload.error ?? "The explanation could not be validated.");
      }

      setAnswer(payload.answer);
      setCitations(payload.citations);
    } catch (error: unknown) {
      setErrorMessage(describeError(error));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="quiz-shell">
      <header className="materials-topbar">
        <Link className="brand" href="/" aria-label="GapFinder home">
          <span className="brand-mark">g</span>
          <span>gapfinder<span className="brand-period">.</span></span>
        </Link>
        <Link className="back-link" href="/">← Back to overview</Link>
      </header>

      <div className="quiz-content">
        <div className="materials-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-dot" /> ASK YOUR MATERIAL</p>
            <h1>Understand it from your sources.</h1>
            <p className="welcome-copy">
              Answers use only the excerpts retrieved from your uploaded study material.
            </p>
          </div>
          <div className="rag-flow" aria-label="Retrieval then explanation">
            <span>01 RETRIEVE</span><span aria-hidden="true">→</span><span>02 EXPLAIN</span>
          </div>
        </div>

        <section className="quiz-setup-card" aria-labelledby="explain-setup-heading">
          <div className="quiz-setup-heading">
            <div>
              <div className="section-kicker">RETRIEVAL HAPPENS FIRST</div>
              <h2 id="explain-setup-heading">What would you like explained?</h2>
            </div>
            <span>{materials.length} {materials.length === 1 ? "source" : "sources"}</span>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="explain-fields">
              <div>
                <label className="field-label" htmlFor="explain-topic">Topic</label>
                <input
                  autoComplete="off"
                  className="topic-input"
                  id="explain-topic"
                  maxLength={120}
                  onChange={(event) => {
                    setTopic(event.currentTarget.value);
                    setAnswer("");
                    setErrorMessage("");
                  }}
                  placeholder="e.g. quadratic equations"
                  required
                  value={topic}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="explain-question">Your question</label>
                <textarea
                  className="explain-question"
                  id="explain-question"
                  maxLength={500}
                  onChange={(event) => {
                    setQuestion(event.currentTarget.value);
                    setAnswer("");
                    setErrorMessage("");
                  }}
                  placeholder="What would you like to understand?"
                  required
                  rows={3}
                  value={question}
                />
              </div>
            </div>
            <div className="quiz-setup-bottom">
              <span>{retrievedChunks.length} relevant source {retrievedChunks.length === 1 ? "excerpt" : "excerpts"} retrieved</span>
              <button
                className="primary-button"
                disabled={isLoading || isGenerating || retrievedChunks.length === 0}
                type="submit"
              >
                {isGenerating ? "Explaining from sources…" : "Explain from my sources"}
                {!isGenerating && <span aria-hidden="true">→</span>}
              </button>
            </div>
          </form>

          <div className="retrieval-preview">
            <div className="retrieval-preview-heading">
              <span className="retrieval-indicator" />
              <strong>Retrieved evidence</strong>
              {retrievedChunks.length > 0 && <span>LOCAL SEARCH</span>}
            </div>
            {isLoading ? (
              <p className="retrieval-empty">Loading your saved study material…</p>
            ) : retrievedChunks.length > 0 ? (
              <div className="retrieval-sources">
                {retrievedChunks.slice(0, 3).map((chunk) => (
                  <article className="retrieval-source" key={chunk.id}>
                    <span>{chunk.citation}</span>
                    <p>{chunk.text.slice(0, 220)}{chunk.text.length > 220 ? "…" : ""}</p>
                  </article>
                ))}
                {retrievedChunks.length > 3 && (
                  <p className="more-extracts">
                    {retrievedChunks.length - 3} additional excerpts will be supplied to generation.
                  </p>
                )}
              </div>
            ) : (
              <p className="retrieval-empty">
                {materials.length === 0
                  ? "Upload notes or a textbook chapter to ask a source-grounded question."
                  : "Enter a topic that appears in your material to retrieve supporting excerpts."}
              </p>
            )}
          </div>
          <p className="generation-note">
            Only the retrieved excerpts are sent to Groq. If they do not contain the answer, the assistant should say so instead of using outside knowledge.
          </p>
        </section>

        {errorMessage && <p className="notice error-notice" role="alert">{errorMessage}</p>}

        {answer && (
          <section className="explanation-card" aria-labelledby="explanation-heading">
            <div className="section-kicker">SOURCE-GROUNDED EXPLANATION</div>
            <h2 id="explanation-heading">{topic}</h2>
            <p>{answer}</p>
            <div className="missed-evidence">
              <span>BASED ON</span>
              <div>
                {citations.map((citation) => (
                  <span className="evidence-chip" key={citation}>{citation}</span>
                ))}
              </div>
            </div>
          </section>
        )}

        <footer className="page-footer">
          <span>Retrieval selects evidence; generation explains from that evidence.</span>
          <Link href="/quiz">Take a diagnostic quiz <span aria-hidden="true">→</span></Link>
        </footer>
      </div>
    </main>
  );
}

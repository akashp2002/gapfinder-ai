"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getPaperAnalysis,
  getTopicMap,
  listMaterials,
  savePaperAnalysis,
  saveTopicMap,
} from "@/lib/material-store";
import type { StoredMaterial } from "@/lib/materials";
import type {
  StoredPaperAnalysis,
  StoredTopicMap,
} from "@/lib/topic-map";

type TopicMapResponse = {
  topics?: StoredTopicMap["topics"];
  error?: string;
};

type PaperAnalysisResponse = {
  questions?: StoredPaperAnalysis["questions"];
  error?: string;
};

const MAX_MAPPING_CHUNKS = 20;

function describeError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getChunks(materials: StoredMaterial[]) {
  return materials.flatMap((material) =>
    material.chunks.map((chunk) => ({
      id: chunk.id,
      citation: chunk.citation,
      text: chunk.text,
      materialName: material.name,
    })),
  );
}

export default function TopicWorkspace() {
  const [materials, setMaterials] = useState<StoredMaterial[]>([]);
  const [topicMap, setTopicMap] = useState<StoredTopicMap | null>(null);
  const [paperAnalysis, setPaperAnalysis] =
    useState<StoredPaperAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMappingSyllabus, setIsMappingSyllabus] = useState(false);
  const [isAnalyzingPaper, setIsAnalyzingPaper] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([listMaterials(), getTopicMap(), getPaperAnalysis()])
      .then(([savedMaterials, savedTopicMap, savedAnalysis]) => {
        if (!active) return;
        setMaterials(savedMaterials);
        setTopicMap(savedTopicMap);
        setPaperAnalysis(savedAnalysis);
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            describeError(error, "The topic workspace could not be loaded."),
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const syllabusMaterials = materials.filter(
    (material) => material.sourceKind === "syllabus",
  );
  const paperMaterials = materials.filter(
    (material) => material.sourceKind === "past_paper",
  );
  const activeTopicMap =
    topicMap &&
    topicMap.syllabusSources.length > 0 &&
    topicMap.syllabusSources.every((name) =>
      syllabusMaterials.some((material) => material.name === name),
    )
      ? topicMap
      : null;
  const activePaperAnalysis =
    paperAnalysis &&
    paperAnalysis.paperSources.length > 0 &&
    activeTopicMap &&
    paperAnalysis.paperSources.every((name) =>
      paperMaterials.some((material) => material.name === name),
    )
      ? paperAnalysis
      : null;
  const syllabusChunks = useMemo(
    () => getChunks(syllabusMaterials),
    [syllabusMaterials],
  );
  const paperChunks = useMemo(
    () => getChunks(paperMaterials),
    [paperMaterials],
  );
  const selectedSyllabusChunks = syllabusChunks.slice(0, MAX_MAPPING_CHUNKS);
  const selectedPaperChunks = paperChunks.slice(0, MAX_MAPPING_CHUNKS);
  const topicCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const question of activePaperAnalysis?.questions ?? []) {
      counts.set(question.topicId, (counts.get(question.topicId) ?? 0) + 1);
    }
    return counts;
  }, [activePaperAnalysis]);

  async function handleGenerateTopicMap() {
    setErrorMessage("");
    setSuccessMessage("");
    if (selectedSyllabusChunks.length === 0) {
      setErrorMessage("Upload and label a syllabus before building the topic map.");
      return;
    }

    setIsMappingSyllabus(true);
    try {
      const response = await fetch("/api/topic-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: selectedSyllabusChunks.map(({ id, citation, text }) => ({
            id,
            citation,
            text,
          })),
        }),
      });
      const payload = (await response.json()) as TopicMapResponse;
      if (!response.ok || !payload.topics?.length) {
        throw new Error(payload.error ?? "The syllabus topic map could not be generated.");
      }

      const savedMap: StoredTopicMap = {
        id: "syllabus-topic-map",
        generatedAt: new Date().toISOString(),
        syllabusSources: [
          ...new Set(selectedSyllabusChunks.map((chunk) => chunk.materialName)),
        ],
        sourceChunkCount: selectedSyllabusChunks.length,
        topics: payload.topics,
      };
      await saveTopicMap(savedMap);
      setTopicMap(savedMap);
      setPaperAnalysis(null);
      setSuccessMessage(
        `Built a cited map of ${savedMap.topics.length} syllabus topics.`,
      );
    } catch (error: unknown) {
      setErrorMessage(
        describeError(error, "The syllabus topic map could not be generated."),
      );
    } finally {
      setIsMappingSyllabus(false);
    }
  }

  async function handleAnalyzePapers() {
    setErrorMessage("");
    setSuccessMessage("");
    if (!activeTopicMap?.topics.length) {
      setErrorMessage("Generate the syllabus topic map before mapping past-paper questions.");
      return;
    }
    if (selectedPaperChunks.length === 0) {
      setErrorMessage("Upload and label a past paper before analyzing questions.");
      return;
    }

    setIsAnalyzingPaper(true);
    try {
      const response = await fetch("/api/paper-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics: activeTopicMap.topics.map(({ id, title, subtopics }) => ({
            id,
            title,
            subtopics,
          })),
          sources: selectedPaperChunks.map(({ id, citation, text }) => ({
            id,
            citation,
            text,
          })),
        }),
      });
      const payload = (await response.json()) as PaperAnalysisResponse;
      if (!response.ok || !payload.questions?.length) {
        throw new Error(
          payload.error ??
            "No source-grounded questions could be extracted from these excerpts.",
        );
      }

      const savedAnalysis: StoredPaperAnalysis = {
        id: "past-paper-analysis",
        generatedAt: new Date().toISOString(),
        paperSources: [
          ...new Set(selectedPaperChunks.map((chunk) => chunk.materialName)),
        ],
        questionCount: payload.questions.length,
        questions: payload.questions,
      };
      await savePaperAnalysis(savedAnalysis);
      setPaperAnalysis(savedAnalysis);
      setSuccessMessage(
        `Mapped ${savedAnalysis.questionCount} extracted questions to syllabus topics.`,
      );
    } catch (error: unknown) {
      setErrorMessage(
        describeError(error, "Past-paper questions could not be analyzed."),
      );
    } finally {
      setIsAnalyzingPaper(false);
    }
  }

  return (
    <main className="report-shell">
      <header className="materials-topbar">
        <Link className="brand" href="/" aria-label="GapFinder home">
          <span className="brand-mark">g</span>
          <span>gapfinder<span className="brand-period">.</span></span>
        </Link>
        <Link className="back-link" href="/">← Back to overview</Link>
      </header>

      <div className="report-content">
        <div className="materials-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-dot" /> SOURCE-BASED TOPIC MAP</p>
            <h1>Connect topics to your papers.</h1>
            <p className="welcome-copy">
              Build topics from the syllabus, then extract and map actual questions from past papers.
            </p>
          </div>
          <Link className="primary-button" href="/materials">Manage sources <span aria-hidden="true">→</span></Link>
        </div>

        {errorMessage && <p className="notice error-notice" role="alert">{errorMessage}</p>}
        {successMessage && <p className="notice success-notice" role="status">{successMessage}</p>}

        {isLoading ? (
          <div className="library-empty">Loading your saved syllabus and papers…</div>
        ) : (
          <>
            <section className="mapping-step" aria-labelledby="syllabus-map-heading">
              <div className="mapping-step-heading">
                <div>
                  <div className="section-kicker">STEP 1 · SYLLABUS</div>
                  <h2 id="syllabus-map-heading">Build the topic map</h2>
                </div>
                <span>{syllabusMaterials.length} labeled syllabus {syllabusMaterials.length === 1 ? "source" : "sources"}</span>
              </div>
              {syllabusMaterials.length ? (
                <>
                  <p className="mapping-description">
                    Groq organizes topics only from your syllabus excerpts. Each topic is checked against the excerpts and retains its source citation.
                  </p>
                  {syllabusChunks.length > MAX_MAPPING_CHUNKS && (
                    <p className="mapping-limit-note">
                      This syllabus has {syllabusChunks.length} chunks; this request uses the first {MAX_MAPPING_CHUNKS}. Split the syllabus into smaller labeled sources for fuller coverage.
                    </p>
                  )}
                  <button
                    className="primary-button"
                    disabled={isMappingSyllabus || isAnalyzingPaper}
                    onClick={handleGenerateTopicMap}
                    type="button"
                  >
                    {isMappingSyllabus ? "Mapping syllabus…" : activeTopicMap ? "Refresh topic map" : "Generate topic map"}
                    {!isMappingSyllabus && <span aria-hidden="true">→</span>}
                  </button>
                </>
              ) : (
                <div className="mapping-empty">
                  <p>Upload a syllabus and choose “Syllabus” as its source type.</p>
                  <Link className="text-link" href="/materials">Upload a syllabus <span aria-hidden="true">→</span></Link>
                </div>
              )}
              {topicMap && !activeTopicMap && (
                <p className="mapping-limit-note">
                  The saved topic map references a syllabus source that is no longer available. Generate a new map from your current syllabus.
                </p>
              )}
              {activeTopicMap && (
                <div className="mapped-topic-list">
                  <div className="mapping-results-heading">
                    <strong>{activeTopicMap.topics.length} syllabus topics</strong>
                    <span>Updated {new Date(activeTopicMap.generatedAt).toLocaleString()}</span>
                  </div>
                  {activeTopicMap.topics.map((topic) => (
                    <article className="mapped-topic-card" key={topic.id}>
                      <div>
                        <h3>{topic.title}</h3>
                        {topic.subtopics.length > 0 && (
                          <p>{topic.subtopics.join(" · ")}</p>
                        )}
                      </div>
                      <div className="mapped-topic-citations">
                        {topic.citations.map((citation) => (
                          <span className="evidence-chip" key={citation}>{citation}</span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="mapping-step" aria-labelledby="paper-map-heading">
              <div className="mapping-step-heading">
                <div>
                  <div className="section-kicker">STEP 2 · PAST PAPERS</div>
                  <h2 id="paper-map-heading">Map individual questions</h2>
                </div>
                <span>{paperMaterials.length} labeled past-paper {paperMaterials.length === 1 ? "source" : "sources"}</span>
              </div>
              {paperMaterials.length ? (
                <>
                  <p className="mapping-description">
                    The model extracts readable exam questions from your paper excerpts and matches each to one syllabus topic. Per-topic counts reflect extracted questions, not chunk counts.
                  </p>
                  {paperChunks.length > MAX_MAPPING_CHUNKS && (
                    <p className="mapping-limit-note">
                      This paper set has {paperChunks.length} chunks; this request uses the first {MAX_MAPPING_CHUNKS}. Analyze smaller paper sets separately for complete counts.
                    </p>
                  )}
                  <button
                    className="secondary-button"
                    disabled={!activeTopicMap?.topics.length || isMappingSyllabus || isAnalyzingPaper}
                    onClick={handleAnalyzePapers}
                    type="button"
                  >
                    {isAnalyzingPaper ? "Extracting and mapping…" : activePaperAnalysis ? "Refresh paper analysis" : "Analyze past-paper questions"}
                  </button>
                  {!activeTopicMap?.topics.length && (
                    <p className="mapping-limit-note">Generate the syllabus topic map first.</p>
                  )}
                </>
              ) : (
                <div className="mapping-empty">
                  <p>Upload a question paper and choose “Past paper” as its source type.</p>
                  <Link className="text-link" href="/materials">Upload a past paper <span aria-hidden="true">→</span></Link>
                </div>
              )}
              {paperAnalysis && !activePaperAnalysis && (
                <p className="mapping-limit-note">
                  The saved question analysis references a source that is no longer available. Analyze your current past papers again.
                </p>
              )}
              {activePaperAnalysis && (
                <div className="mapped-topic-list">
                  <div className="mapping-results-heading">
                    <strong>{activePaperAnalysis.questionCount} questions extracted</strong>
                    <span>Counts by syllabus topic</span>
                  </div>
                  <div className="paper-topic-counts">
                    {activeTopicMap?.topics.map((topic) => (
                      <span className="paper-topic-count" key={topic.id}>
                        {topic.title} <strong>{topicCounts.get(topic.id) ?? 0}</strong>
                      </span>
                    ))}
                  </div>
                  {activePaperAnalysis.questions.map((question, index) => (
                    <article className="mapped-question-card" key={`${question.topicId}-${index}`}>
                      <div className="mapped-question-title">
                        <strong>Q{index + 1} · {question.topic}</strong>
                        <span>{question.citation}</span>
                      </div>
                      <p>{question.question}</p>
                      <small>{question.mappingReason}</small>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <p className="report-method-note">
          Model-generated maps and question classifications are reviewed against supplied excerpts and citations. OCR is not available for scanned PDFs; verify extracted paper questions before relying on counts.
        </p>
        <footer className="page-footer">
          <span>Both outputs are saved in this browser.</span>
          <Link href="/quiz">Take a diagnostic <span aria-hidden="true">→</span></Link>
        </footer>
      </div>
    </main>
  );
}

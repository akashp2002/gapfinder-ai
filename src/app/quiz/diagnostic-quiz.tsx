"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  listMaterials,
  listQuizAttempts,
  saveQuizAttempt,
} from "@/lib/material-store";
import type { StoredMaterial } from "@/lib/materials";
import type {
  QuizAttempt,
  QuizAttemptAnswer,
  QuizQuestion,
} from "@/lib/quiz";
import {
  retrieveRelevantChunks,
  type RetrievedChunk,
} from "@/lib/retrieval";

type GenerationResponse = {
  topic?: string;
  questions?: QuizQuestion[];
  error?: string;
};

const QUESTION_COUNTS = [3, 4, 5, 6];

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function createAttempt(
  topic: string,
  questions: QuizQuestion[],
  selectedAnswers: Record<string, number>,
): QuizAttempt {
  const answers: QuizAttemptAnswer[] = questions.map((question) => ({
    questionId: question.id,
    prompt: question.prompt,
    selectedOptionIndex: selectedAnswers[question.id],
    correctOptionIndex: question.correctOptionIndex,
    citation: question.citation,
  }));
  const correctCount = answers.filter(
    (answer) => answer.selectedOptionIndex === answer.correctOptionIndex,
  ).length;

  return {
    id: crypto.randomUUID(),
    topic,
    completedAt: new Date().toISOString(),
    correctCount,
    questionCount: questions.length,
    answers,
  };
}

export default function DiagnosticQuiz() {
  const [materials, setMaterials] = useState<StoredMaterial[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [completedAttempt, setCompletedAttempt] = useState<QuizAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([listMaterials(), listQuizAttempts()])
      .then(([savedMaterials, savedAttempts]) => {
        if (!active) return;
        setMaterials(savedMaterials);
        setAttempts(savedAttempts);
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

  const topicSuggestions = useMemo(
    () =>
      [...new Set(materials.flatMap((material) => material.chunks.map((chunk) => chunk.section)))]
        .filter((section) => section && section !== "Full text")
        .slice(0, 100),
    [materials],
  );
  const retrievedChunks = useMemo(
    () => retrieveRelevantChunks(materials, topic, 8),
    [materials, topic],
  );

  async function generateQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setQuestions([]);
    setCompletedAttempt(null);
    setSelectedAnswers({});

    if (topic.trim().length < 2) {
      setErrorMessage("Enter a topic to find relevant material.");
      return;
    }
    if (retrievedChunks.length === 0) {
      setErrorMessage(
        "No matching source text was found. Try a topic from your material or upload another source.",
      );
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          questionCount,
          sources: retrievedChunks.map((chunk) => ({
            id: chunk.id,
            section: chunk.section,
            citation: chunk.citation,
            text: chunk.text,
          })),
        }),
      });
      const payload = (await response.json()) as GenerationResponse;
      if (!response.ok || !payload.questions) {
        throw new Error(payload.error ?? "The diagnostic quiz could not be generated.");
      }

      setQuestions(payload.questions);
    } catch (error: unknown) {
      setErrorMessage(describeError(error));
    } finally {
      setIsGenerating(false);
    }
  }

  async function submitAnswers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    const unanswered = questions.find(
      (question) => selectedAnswers[question.id] === undefined,
    );
    if (unanswered) {
      setErrorMessage("Answer every question before checking your result.");
      return;
    }

    const attempt = createAttempt(topic.trim(), questions, selectedAnswers);
    setCompletedAttempt(attempt);
    setIsSaving(true);
    try {
      await saveQuizAttempt(attempt);
      setAttempts((current) => [attempt, ...current]);
    } catch (error: unknown) {
      setErrorMessage(`Your result was scored, but could not be saved: ${describeError(error)}`);
    } finally {
      setIsSaving(false);
    }
  }

  function startNewQuiz() {
    setQuestions([]);
    setSelectedAnswers({});
    setCompletedAttempt(null);
    setErrorMessage("");
  }

  function selectAnswer(questionId: string, optionIndex: number) {
    setSelectedAnswers((current) => ({ ...current, [questionId]: optionIndex }));
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
            <p className="eyebrow"><span className="eyebrow-dot" /> STEP 2 · FIND YOUR GAPS</p>
            <h1>Let&apos;s see what stuck.</h1>
            <p className="welcome-copy">
              Questions are generated from retrieved passages in your own study material.
            </p>
          </div>
          <div className="rag-flow" aria-label="Retrieval then generation">
            <span className="rag-step current">01 <b>RETRIEVE</b></span>
            <span className="rag-arrow" aria-hidden="true">→</span>
            <span className="rag-step">02 <b>GENERATE</b></span>
          </div>
        </div>

        {isLoading ? (
          <div className="library-empty">Loading your saved study material…</div>
        ) : materials.length === 0 ? (
          <div className="quiz-empty-state">
            <div className="section-kicker">NO SOURCES YET</div>
            <h2>Start with your own study material.</h2>
            <p>Upload a chapter or notes first. The quiz generator only uses retrieved content from your library.</p>
            <Link className="primary-button" href="/materials">Add study material <span aria-hidden="true">→</span></Link>
          </div>
        ) : (
          <>
            <section className="quiz-setup-card" aria-labelledby="quiz-setup-heading">
              <div className="quiz-setup-header">
                <div>
                  <div className="section-kicker">RETRIEVAL HAPPENS FIRST</div>
                  <h2 id="quiz-setup-heading">Choose a focus area</h2>
                </div>
                <span className="source-count">{materials.length} {materials.length === 1 ? "SOURCE" : "SOURCES"}</span>
              </div>

              <form className="quiz-setup-form" onSubmit={generateQuiz}>
                <label className="field-label" htmlFor="quiz-topic">Topic or concept</label>
                <input
                  id="quiz-topic"
                  className="topic-input"
                  list="available-topics"
                  maxLength={120}
                  onChange={(event) => {
                    setTopic(event.currentTarget.value);
                    setQuestions([]);
                    setCompletedAttempt(null);
                    setErrorMessage("");
                  }}
                  placeholder="e.g. photosynthesis, quadratic equations"
                  value={topic}
                />
                <datalist id="available-topics">
                  {topicSuggestions.map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>

                <div className="quiz-setup-bottom">
                  <div>
                    <label className="field-label" htmlFor="question-count">Questions</label>
                    <select
                      id="question-count"
                      className="count-select"
                      onChange={(event) => setQuestionCount(Number(event.currentTarget.value))}
                      value={questionCount}
                    >
                      {QUESTION_COUNTS.map((count) => (
                        <option key={count} value={count}>{count} questions</option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="primary-button"
                    disabled={isGenerating || isLoading || retrievedChunks.length === 0}
                    type="submit"
                  >
                    {isGenerating ? "Generating from sources..." : "Generate diagnostic"}
                    {!isGenerating && <span aria-hidden="true">→</span>}
                  </button>
                </div>
              </form>

              <div className="retrieval-preview" aria-live="polite">
                <div className="retrieval-preview-heading">
                  <span className="retrieval-indicator" />
                  <strong>
                    {topic.trim().length < 2
                      ? "Enter a topic to preview retrieved sources"
                      : `${retrievedChunks.length} relevant source ${retrievedChunks.length === 1 ? "chunk" : "chunks"} retrieved`}
                  </strong>
                  {retrievedChunks.length > 0 && <span>LOCAL SEARCH</span>}
                </div>
                {retrievedChunks.length > 0 ? (
                  <div className="retrieval-sources">
                    {retrievedChunks.slice(0, 3).map((chunk: RetrievedChunk) => (
                      <article className="retrieval-source" key={chunk.id}>
                        <span>{chunk.citation}</span>
                        <p>{chunk.text.slice(0, 190)}{chunk.text.length > 190 ? "…" : ""}</p>
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
                    {topic.trim().length < 2
                      ? "Your saved PDFs and notes stay in this browser until relevant excerpts are selected."
                      : "No match yet. Try a heading from the topic suggestions or a related phrase."}
                  </p>
                )}
              </div>
              <p className="generation-note">
                Only the retrieved excerpts above are sent to Groq for generation. The rest of your library is not included.
              </p>
            </section>

            {errorMessage && <p className="notice error-notice" role="alert">{errorMessage}</p>}

            {questions.length > 0 && !completedAttempt && (
              <form className="quiz-questions" onSubmit={submitAnswers}>
                <div className="quiz-results-heading">
                  <div>
                    <div className="section-kicker">SOURCE-GROUNDED DIAGNOSTIC</div>
                    <h2>{topic.trim()}</h2>
                  </div>
                  <span>{questions.length} questions</span>
                </div>
                {questions.map((question, questionIndex) => (
                  <fieldset className="question-card" key={question.id}>
                    <legend className="question-legend">Question {questionIndex + 1}</legend>
                    <p className="question-prompt">{question.prompt}</p>
                    <div className="answer-options">
                      {question.options.map((option, optionIndex) => (
                        <label
                          className={`answer-option${selectedAnswers[question.id] === optionIndex ? " selected" : ""}`}
                          key={`${question.id}-${optionIndex}`}
                        >
                          <input
                            checked={selectedAnswers[question.id] === optionIndex}
                            name={`answer-${question.id}`}
                            onChange={() => selectAnswer(question.id, optionIndex)}
                            type="radio"
                            value={optionIndex}
                          />
                          <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                    <div className="question-citation">Source: {question.citation}</div>
                  </fieldset>
                ))}
                <div className="quiz-submit-row">
                  <span>Answers are checked against the source-grounded answer key.</span>
                  <button className="primary-button" disabled={isSaving} type="submit">
                    {isSaving ? "Saving result..." : "Check my answers"}
                    {!isSaving && <span aria-hidden="true">→</span>}
                  </button>
                </div>
              </form>
            )}

            {completedAttempt && (
              <section className="graded-quiz" aria-labelledby="graded-heading">
                <div className="graded-summary">
                  <div>
                    <div className="section-kicker">YOUR DIAGNOSTIC RESULT</div>
                    <h2 id="graded-heading">
                      {completedAttempt.correctCount} <span>/ {completedAttempt.questionCount}</span> correct
                    </h2>
                    <p>
                      {completedAttempt.correctCount === completedAttempt.questionCount
                        ? "Excellent work. Keep this topic warm with a quick recall later."
                        : "Your answers reveal what to review next. Each explanation points back to its source."}
                    </p>
                    <Link className="text-link" href="/plan">
                      View your updated revision plan <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                  <button className="secondary-button" onClick={startNewQuiz} type="button">
                    New diagnostic
                  </button>
                </div>

                <div className="graded-questions">
                  {questions.map((question, index) => {
                    const selected = selectedAnswers[question.id];
                    const isCorrect = selected === question.correctOptionIndex;
                    return (
                      <article className="graded-question" key={question.id}>
                        <div className={`graded-status ${isCorrect ? "correct" : "incorrect"}`}>
                          <span>{isCorrect ? "✓" : "×"}</span>
                          Question {index + 1} · {isCorrect ? "Correct" : "Review this"}
                        </div>
                        <p>{question.prompt}</p>
                        <div className="answer-review">
                          <span>Your answer</span>
                          <strong>{question.options[selected]}</strong>
                        </div>
                        {!isCorrect && (
                          <div className="answer-review correct-answer">
                            <span>Best answer</span>
                            <strong>{question.options[question.correctOptionIndex]}</strong>
                          </div>
                        )}
                        <p className="answer-explanation">{question.explanation}</p>
                        <div className="question-citation">Source: {question.citation}</div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {attempts.length > 0 && (
              <section className="attempt-history" aria-labelledby="history-heading">
                <div className="library-heading">
                  <div>
                    <div className="section-kicker">SAVED IN THIS BROWSER</div>
                    <h2 id="history-heading">Recent attempts</h2>
                  </div>
                </div>
                <div className="attempt-list">
                  {attempts.slice(0, 4).map((attempt) => (
                    <article className="attempt-row" key={attempt.id}>
                      <div>
                        <strong>{attempt.topic}</strong>
                        <span>{formatDate(attempt.completedAt)}</span>
                      </div>
                      <span className="attempt-score">
                        {attempt.correctCount}/{attempt.questionCount}
                      </span>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <footer className="page-footer">
          <span>Retrieval selects evidence; generation writes questions from that evidence.</span>
          <Link href="/plan">Build my revision plan <span aria-hidden="true">→</span></Link>
        </footer>
      </div>
    </main>
  );
}

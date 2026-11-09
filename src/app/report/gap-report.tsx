"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listQuizAttempts } from "@/lib/material-store";
import { buildTopicGaps, type TopicStrength } from "@/lib/gap-analysis";
import type { QuizAttempt } from "@/lib/quiz";

const STRENGTH_LABELS: Record<TopicStrength, string> = {
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function GapReport() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    listQuizAttempts()
      .then((savedAttempts) => {
        if (active) setAttempts(savedAttempts);
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : "The gap report could not be loaded.",
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

  const topics = useMemo(() => buildTopicGaps(attempts), [attempts]);
  const summary = useMemo(
    () => ({
      weak: topics.filter((topic) => topic.strength === "weak").length,
      medium: topics.filter((topic) => topic.strength === "medium").length,
      strong: topics.filter((topic) => topic.strength === "strong").length,
    }),
    [topics],
  );

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
            <p className="eyebrow"><span className="eyebrow-dot" /> YOUR LEARNING DIAGNOSIS</p>
            <h1>Your gaps, made clear.</h1>
            <p className="welcome-copy">
              A topic is only rated after you test it. This report uses your latest quiz attempt for each topic.
            </p>
          </div>
          <Link className="primary-button" href="/quiz">Take a diagnostic <span aria-hidden="true">→</span></Link>
        </div>

        {errorMessage && <p className="notice error-notice" role="alert">{errorMessage}</p>}

        {isLoading ? (
          <div className="library-empty">Loading your saved quiz attempts…</div>
        ) : topics.length === 0 ? (
          <section className="report-empty">
            <span className="empty-mark" aria-hidden="true">↳</span>
            <h2>No topics diagnosed yet</h2>
            <p>Take a source-grounded quiz to see which topics need attention. We won&apos;t label a topic strong until you&apos;ve tested it.</p>
            <div className="report-empty-actions">
              <Link className="primary-button" href="/quiz">Start a diagnostic <span aria-hidden="true">→</span></Link>
              <Link className="text-link" href="/materials">Manage study material</Link>
            </div>
          </section>
        ) : (
          <>
            <section className="report-summary" aria-label="Topic strength summary">
              <article className="report-summary-card weak">
                <span>WEAK</span>
                <strong>{summary.weak}</strong>
                <small>below 50%</small>
              </article>
              <article className="report-summary-card medium">
                <span>MEDIUM</span>
                <strong>{summary.medium}</strong>
                <small>50-79%</small>
              </article>
              <article className="report-summary-card strong">
                <span>STRONG</span>
                <strong>{summary.strong}</strong>
                <small>80% or higher</small>
              </article>
              <article className="report-summary-card assessed">
                <span>TOPICS TESTED</span>
                <strong>{topics.length}</strong>
                <small>from {attempts.length} {attempts.length === 1 ? "attempt" : "attempts"}</small>
              </article>
            </section>

            <section className="report-topic-section" aria-labelledby="topics-report-heading">
              <div className="report-section-heading">
                <div>
                  <div className="section-kicker">PRIORITIZED BY NEED</div>
                  <h2 id="topics-report-heading">Topic-by-topic diagnosis</h2>
                </div>
                <span>Based on your latest result for each topic</span>
              </div>

              <div className="report-topic-list">
                {topics.map((topic) => (
                  <article className={`report-topic-card ${topic.strength}`} key={topic.topic}>
                    <div className="report-topic-top">
                      <div>
                        <span className={`strength-badge ${topic.strength}`}>
                          {STRENGTH_LABELS[topic.strength]}
                        </span>
                        <h3>{topic.topic}</h3>
                      </div>
                      <div className={`report-score ${topic.strength}`}>
                        <strong>{topic.score}%</strong>
                        <span>{topic.correctCount}/{topic.questionCount} correct</span>
                      </div>
                    </div>

                    <div className="report-score-track" aria-label={`${topic.score}% correct`}>
                      <span style={{ width: `${topic.score}%` }} />
                    </div>

                    <p className="gap-reason">{topic.reason}</p>

                    {topic.evidence.length > 0 && (
                      <div className="missed-evidence">
                        <span>REVIEW THESE SOURCES</span>
                        <div>
                          {topic.evidence.slice(0, 3).map((evidence) => (
                            <span className="evidence-chip" key={evidence.citation}>
                              {evidence.citation}
                              {evidence.missedCount > 1 ? ` · ${evidence.missedCount} missed` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="report-topic-footer">
                      <span>Latest attempt {formatDate(topic.latestAttemptAt)}</span>
                      <span>{topic.attemptCount} {topic.attemptCount === 1 ? "attempt" : "attempts"}</span>
                      {topic.previousScore !== null && (
                        <span className={topic.score >= topic.previousScore ? "trend-up" : "trend-down"}>
                          Previous {topic.previousScore}% → {topic.score}%
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <p className="report-method-note">
              Ratings use the latest score per topic: Weak below 50%, Medium 50-79%, Strong 80% or higher. Missed-question reasons link to the cited source sections from your quiz.
            </p>
          </>
        )}

        <footer className="page-footer">
          <span>This diagnosis updates when you complete another quiz.</span>
          <Link href="/plan">Build your revision plan <span aria-hidden="true">→</span></Link>
        </footer>
      </div>
    </main>
  );
}

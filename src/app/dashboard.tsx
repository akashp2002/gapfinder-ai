"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SignOutButton from "./sign-out-button";
import {
  getTopicMap,
  getStudySchedule,
  listMaterials,
  listQuizAttempts,
} from "@/lib/material-store";
import { buildTopicGaps } from "@/lib/gap-analysis";
import {
  buildRevisionPlan,
  DEFAULT_STUDY_SCHEDULE,
} from "@/lib/study-plan";
import type { StoredMaterial } from "@/lib/materials";
import type { QuizAttempt } from "@/lib/quiz";
import type { StoredTopicMap } from "@/lib/topic-map";

function formatToday(): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date()).toLocaleUpperCase();
}

function formatMinutes(minutes: number): string {
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} hr${minutes % 60 ? ` ${minutes % 60} min` : ""}`
    : `${minutes} min`;
}

export default function Dashboard() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [materials, setMaterials] = useState<StoredMaterial[]>([]);
  const [topicMap, setTopicMap] = useState<StoredTopicMap | null>(null);
  const [schedule, setSchedule] = useState(DEFAULT_STUDY_SCHEDULE);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      listQuizAttempts(),
      listMaterials(),
      getStudySchedule(),
      getTopicMap(),
    ])
      .then(([savedAttempts, savedMaterials, savedSchedule, savedTopicMap]) => {
        if (!active) return;
        setAttempts(savedAttempts);
        setMaterials(savedMaterials);
        setSchedule(savedSchedule);
        setTopicMap(savedTopicMap);
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : "The dashboard could not be loaded.",
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
  const revisionPlan = useMemo(
    () =>
      buildRevisionPlan(
        topics,
        materials,
        schedule.daysUntilExam,
        schedule.hoursPerDay,
      ),
    [materials, schedule, topics],
  );
  const averageScore = topics.length
    ? Math.round(topics.reduce((sum, topic) => sum + topic.score, 0) / topics.length)
    : 0;
  const weakCount = topics.filter((topic) => topic.strength === "weak").length;
  const weakestTopic = [...topics].sort((left, right) => left.score - right.score)[0];
  const strongestTopic = [...topics].sort((left, right) => right.score - left.score)[0];
  const availableMaterialNames = new Set(materials.map((material) => material.name));
  const activeTopicMap =
    topicMap?.syllabusSources.every((name) => availableMaterialNames.has(name))
      ? topicMap
      : null;
  const mappedTopics = activeTopicMap?.topics ?? [];
  const mappedAssessedCount = mappedTopics.filter((mappedTopic) =>
    topics.some(
      (topic) =>
        topic.topic.trim().toLocaleLowerCase() ===
        mappedTopic.title.trim().toLocaleLowerCase(),
    ),
  ).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="GapFinder home">
          <span className="brand-mark">g</span>
          <span>gapfinder<span className="brand-period">.</span></span>
        </Link>

        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-link active" href="#overview"><span className="nav-icon">◫</span> Overview</a>
          <a className="nav-link" href="#topics"><span className="nav-icon">◉</span> My topics</a>
          <Link className="nav-link" href="/quiz"><span className="nav-icon">✳</span> Diagnostic quiz</Link>
          <Link className="nav-link" href="/report"><span className="nav-icon">◒</span> Gap report</Link>
          <Link className="nav-link" href="/materials"><span className="nav-icon">▤</span> My materials</Link>
          <Link className="nav-link" href="/plan"><span className="nav-icon">☷</span> Revision plan</Link>
          <Link className="nav-link" href="/topics"><span className="nav-icon">⌗</span> Syllabus &amp; papers</Link>
          <Link className="nav-link" href="/explain"><span className="nav-icon">?</span> Explain a topic</Link>
          <a className="nav-link" href="#progress"><span className="nav-icon">↗</span> Progress</a>
        </nav>

        <div className="sidebar-bottom">
          <div className="study-note">
            <span className="note-spark">✳</span>
            <strong>Small steps add up.</strong>
            <p>Your plan changes as you improve. Just keep showing up.</p>
          </div>
          <div className="profile">
            <div className="avatar">S</div>
            <div><strong>Sam Student</strong><span>Demo workspace</span></div>
            <span className="profile-menu" aria-hidden="true">···</span>
          </div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">g</span>
            <strong>gapfinder<span className="brand-period">.</span></strong>
          </div>
          <div className="breadcrumb">My learning <span>/</span> Overview</div>
          <Link className="topbar-quiz" href="/quiz">Take a quiz <span aria-hidden="true">→</span></Link>
          <Link className="topbar-materials" href="/materials">My materials <span aria-hidden="true">→</span></Link>
          <div className="topbar-right">
            <span className="today-label">{formatToday()}</span>
            <div className="avatar small">S</div>
            <SignOutButton />
          </div>
        </header>

        <div className="content-wrap">
          <section className="welcome-row">
            <div>
              <p className="eyebrow"><span className="eyebrow-dot" /> YOUR STUDY HEALTH</p>
              <h1>Know what you <em>don&apos;t know.</em></h1>
              <p className="welcome-copy">A clearer picture of your learning, and a plan for what to do next.</p>
            </div>
            <Link className="primary-button" href={topics.length ? "/plan" : "/quiz"}>
              {topics.length ? "See my revision plan" : "Start my diagnosis"} <span aria-hidden="true">→</span>
            </Link>
          </section>

          {errorMessage && <p className="notice error-notice" role="alert">{errorMessage}</p>}

          <section className="diagnosis-card" aria-labelledby="diagnosis-heading">
            <div className="diagnosis-copy">
              <div className="section-kicker">YOUR LATEST DIAGNOSIS</div>
              <h2 id="diagnosis-heading">
                {isLoading
                  ? "Loading your learning data…"
                  : topics.length
                    ? `${weakestTopic?.topic} needs your focus.`
                    : "Your diagnosis starts with a quiz."}
              </h2>
              <p>
                {isLoading
                  ? "Checking your saved quiz results and study material."
                  : topics.length
                    ? `Your latest topic average is ${averageScore}%. ${
                        strongestTopic
                          ? `${strongestTopic.topic} is currently your strongest topic at ${strongestTopic.score}%.`
                          : ""
                      }`
                    : "Upload your material, then take a source-grounded quiz to find what to review."}
              </p>
              <Link className="text-link" href={topics.length ? "/report" : "/materials"}>
                {topics.length ? "Open your gap report" : "Add study material"} <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="readiness" id="progress">
              <div className="readiness-ring"><span>{isLoading || !topics.length ? "—" : averageScore}<small>{isLoading || !topics.length ? "" : "%"}</small></span></div>
              <div className="readiness-caption">LATEST TOPIC AVERAGE</div>
              <div className="readiness-trend">{attempts.length} saved {attempts.length === 1 ? "attempt" : "attempts"}</div>
            </div>
          </section>

          <section className="stats-grid" aria-label="Learning summary">
            <article className="stat-card">
              <div className="stat-label">{mappedTopics.length ? "SYLLABUS TOPICS" : "TOPICS DIAGNOSED"}</div>
              <div className="stat-value">{isLoading ? "—" : mappedTopics.length || topics.length}</div>
              <div className="stat-foot"><span className="mini-track"><i style={{ width: `${averageScore}%` }} /></span> {isLoading ? "Loading…" : mappedTopics.length ? `${mappedAssessedCount} assessed · ${topics.length ? `avg ${averageScore}%` : "start your diagnosis"}` : topics.length ? `latest average ${averageScore}%` : "No results yet"}</div>
            </article>
            <article className="stat-card">
              <div className="stat-label">NEED A REVIEW</div>
              <div className="stat-value">{isLoading ? "—" : weakCount} <span>topics</span></div>
              <div className="stat-foot"><span className="status-dot weak-dot" /> Weak topics prioritized first</div>
            </article>
            <article className="stat-card">
              <div className="stat-label">SAVED STUDY DATA</div>
              <div className="stat-value">{isLoading ? "—" : materials.length} <span>sources</span></div>
              <div className="stat-foot streak-foot">{attempts.length} quiz {attempts.length === 1 ? "attempt" : "attempts"} saved in this browser</div>
            </article>
          </section>

          <section className="lower-grid">
            <div className="panel topics-panel" id="topics">
              <div className="panel-heading">
                <div><div className="section-kicker">{activeTopicMap ? "FROM YOUR SYLLABUS" : "LATEST QUIZ RESULTS"}</div><h2>Your topic map</h2></div>
                <Link className="subtle-link" href={activeTopicMap ? "/topics" : "/report"}>{activeTopicMap ? "Edit map" : "All topics"} <span aria-hidden="true">→</span></Link>
              </div>
              {mappedTopics.length ? (
                <div className="topic-list">
                  {mappedTopics.slice(0, 5).map((mappedTopic) => {
                    const assessedTopic = topics.find(
                      (topic) =>
                        topic.topic.trim().toLocaleLowerCase() ===
                        mappedTopic.title.trim().toLocaleLowerCase(),
                    );
                    return (
                      <article className="topic-row" key={mappedTopic.id}>
                        <div
                          className={`topic-status ${assessedTopic?.strength ?? "untested"}`}
                          aria-hidden="true"
                        />
                        <div className="topic-main">
                          <div className="topic-title">{mappedTopic.title}</div>
                          <div className="topic-subtitle">
                            {mappedTopic.subtopics.slice(0, 2).join(" · ") || mappedTopic.citations[0]}
                          </div>
                        </div>
                        <div className="topic-result">
                          <div className={`topic-status-label ${assessedTopic?.strength ?? "untested"}`}>
                            {assessedTopic ? assessedTopic.strength : "untested"}
                          </div>
                          <div className="topic-score">{assessedTopic ? `${assessedTopic.score}%` : "—"}</div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : topics.length ? (
                <div className="topic-list">
                  {topics.slice(0, 5).map((topic) => (
                    <article className="topic-row" key={topic.topic}>
                      <div className={`topic-status ${topic.strength}`} aria-hidden="true" />
                      <div className="topic-main">
                        <div className="topic-title">{topic.topic}</div>
                        <div className="topic-subtitle">{topic.correctCount}/{topic.questionCount} correct · {topic.attemptCount} {topic.attemptCount === 1 ? "attempt" : "attempts"}</div>
                      </div>
                      <div className="topic-result">
                        <div className={`topic-status-label ${topic.strength}`}>{topic.strength}</div>
                        <div className="topic-score">{topic.score}%</div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty">
                  <p>{isLoading ? "Loading saved results…" : "No topics diagnosed yet. Your topic map will fill in after your first quiz."}</p>
                  {!isLoading && <Link className="text-link" href="/quiz">Take a diagnostic <span aria-hidden="true">→</span></Link>}
                </div>
              )}
              <div className="source-note">
                <span className="source-mark">↳</span>
              {activeTopicMap
                ? `Syllabus citations are available in the full topic map. ${mappedTopics.length - Math.min(5, mappedTopics.length)} more topics are shown there.`
                : materials.length
                ? `${materials.length} source${materials.length === 1 ? "" : "s"} available for retrieval.`
                : "Upload your syllabus and study material to get started."}
              </div>
            </div>

            <div className="panel plan-panel" id="revision-plan">
              <div className="panel-heading">
                <div><div className="section-kicker">A PLAN THAT ADAPTS</div><h2>Next best steps</h2></div>
                <span className="time-budget">{formatMinutes(revisionPlan.scheduledMinutes)} TOTAL</span>
              </div>
              {revisionPlan.items.length ? (
                <div className="plan-list">
                  {revisionPlan.items.slice(0, 3).map((item, index) => (
                    <article className="plan-item" key={item.topic}>
                      <div className={`plan-number ${item.strength}`}>{String(index + 1).padStart(2, "0")}</div>
                      <div className="plan-copy">
                        <h3>{item.topic}</h3>
                        <p>{item.recommendation}</p>
                        <span className="duration">{formatMinutes(item.minutes)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty">
                  <p>{isLoading ? "Building your plan…" : "Complete a diagnostic to receive revision priorities."}</p>
                </div>
              )}
              <Link className="plan-button" href="/plan">
                {revisionPlan.items.length ? "Adjust my time & view plan" : "Build my first plan"} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>

          <footer className="page-footer">
            <span>Built around your learning, not just another chatbot.</span>
            <span>GapFinder AI · Browser demo workspace</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

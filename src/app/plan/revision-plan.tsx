"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  getStudySchedule,
  listMaterials,
  listQuizAttempts,
  saveStudySchedule,
} from "@/lib/material-store";
import { buildTopicGaps, type TopicStrength } from "@/lib/gap-analysis";
import {
  buildRevisionPlan,
  DEFAULT_STUDY_SCHEDULE,
  type StudySchedulePreferences,
} from "@/lib/study-plan";
import type { StoredMaterial } from "@/lib/materials";
import type { QuizAttempt } from "@/lib/quiz";

const STRENGTH_LABELS: Record<TopicStrength, string> = {
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
}

export default function RevisionPlan() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [materials, setMaterials] = useState<StoredMaterial[]>([]);
  const [schedule, setSchedule] = useState<StudySchedulePreferences>(
    DEFAULT_STUDY_SCHEDULE,
  );
  const [daysInput, setDaysInput] = useState(
    String(DEFAULT_STUDY_SCHEDULE.daysUntilExam),
  );
  const [hoursInput, setHoursInput] = useState(
    String(DEFAULT_STUDY_SCHEDULE.hoursPerDay),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([listQuizAttempts(), listMaterials(), getStudySchedule()])
      .then(([savedAttempts, savedMaterials, savedSchedule]) => {
        if (!active) return;
        setAttempts(savedAttempts);
        setMaterials(savedMaterials);
        setSchedule(savedSchedule);
        setDaysInput(String(savedSchedule.daysUntilExam));
        setHoursInput(String(savedSchedule.hoursPerDay));
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Your revision plan could not be loaded.",
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
  const daysUntilExam = Number(daysInput);
  const hoursPerDay = Number(hoursInput);
  const scheduleIsValid =
    Number.isInteger(daysUntilExam) &&
    daysUntilExam >= 1 &&
    daysUntilExam <= 30 &&
    Number.isFinite(hoursPerDay) &&
    hoursPerDay >= 0.5 &&
    hoursPerDay <= 8 &&
    Number.isInteger(hoursPerDay * 2);
  const plan = useMemo(
    () =>
      buildRevisionPlan(
        topics,
        materials,
        daysUntilExam,
        hoursPerDay,
      ),
    [daysUntilExam, hoursPerDay, materials, topics],
  );
  const pastPaperCount = materials.filter(
    (material) => material.sourceKind === "past_paper",
  ).length;

  async function handleSaveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!scheduleIsValid) {
      setErrorMessage(
        "Enter 1-30 days and 0.5-8 study hours per day in half-hour steps.",
      );
      return;
    }

    const updatedSchedule: StudySchedulePreferences = {
      id: DEFAULT_STUDY_SCHEDULE.id,
      daysUntilExam,
      hoursPerDay,
    };
    setIsSaving(true);
    try {
      await saveStudySchedule(updatedSchedule);
      setSchedule(updatedSchedule);
      setSuccessMessage("Schedule saved. Your plan will adapt after each new quiz.");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Your schedule could not be saved.",
      );
    } finally {
      setIsSaving(false);
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
            <p className="eyebrow"><span className="eyebrow-dot" /> YOUR NEXT STEPS</p>
            <h1>A plan that fits your time.</h1>
            <p className="welcome-copy">
              Your latest quiz results set the priorities. Retest any time to refresh this plan.
            </p>
          </div>
          <Link className="primary-button" href="/quiz">
            Retest your knowledge <span aria-hidden="true">→</span>
          </Link>
        </div>

        <section className="schedule-card" aria-labelledby="schedule-heading">
          <div className="schedule-card-heading">
            <div>
              <div className="section-kicker">MAKE IT REALISTIC</div>
              <h2 id="schedule-heading">How much time do you have?</h2>
            </div>
            <span className="schedule-saved">
              Saved: {schedule.daysUntilExam} days · {schedule.hoursPerDay} hr/day
            </span>
          </div>
          <form className="schedule-form" onSubmit={handleSaveSchedule}>
            <div className="schedule-field">
              <label className="field-label" htmlFor="exam-days">Days until exam</label>
              <input
                className="count-select"
                disabled={isLoading || isSaving}
                id="exam-days"
                max="30"
                min="1"
                onChange={(event) => {
                  setDaysInput(event.currentTarget.value);
                  setSuccessMessage("");
                }}
                required
                type="number"
                value={daysInput}
              />
            </div>
            <div className="schedule-field">
              <label className="field-label" htmlFor="study-hours">Study hours per day</label>
              <input
                className="count-select"
                disabled={isLoading || isSaving}
                id="study-hours"
                max="8"
                min="0.5"
                onChange={(event) => {
                  setHoursInput(event.currentTarget.value);
                  setSuccessMessage("");
                }}
                required
                step="0.5"
                type="number"
                value={hoursInput}
              />
            </div>
            <button className="primary-button" disabled={isLoading || isSaving} type="submit">
              {isSaving ? "Saving…" : "Save my time"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          {errorMessage && <p className="notice error-notice" role="alert">{errorMessage}</p>}
          {successMessage && <p className="notice success-notice" role="status">{successMessage}</p>}
        </section>

        {isLoading ? (
          <div className="library-empty">Building your plan from saved quiz results…</div>
        ) : topics.length === 0 ? (
          <section className="report-empty">
            <span className="empty-mark" aria-hidden="true">↳</span>
            <h2>Take a quiz to get your priorities</h2>
            <p>Your revision plan starts with a diagnosis. Test a topic using your uploaded material, and we&apos;ll order your next steps by need.</p>
            <div className="report-empty-actions">
              <Link className="primary-button" href="/quiz">Start a diagnostic <span aria-hidden="true">→</span></Link>
              <Link className="text-link" href="/materials">Manage study material</Link>
            </div>
          </section>
        ) : !scheduleIsValid ? (
          <p className="notice error-notice" role="alert">
            Enter 1-30 days and 0.5-8 study hours per day in half-hour steps to preview your plan.
          </p>
        ) : (
          <>
            <section className="plan-budget" aria-label="Revision time budget">
              <div>
                <span>AVAILABLE STUDY TIME</span>
                <strong>{formatMinutes(plan.budgetMinutes)}</strong>
              </div>
              <div>
                <span>PRIORITIES SCHEDULED</span>
                <strong>{formatMinutes(plan.scheduledMinutes)}</strong>
              </div>
              <div>
                <span>TOPICS DIAGNOSED</span>
                <strong>{topics.length}</strong>
              </div>
            </section>

            {plan.items.length > 0 ? (
              <section className="revision-plan-section" aria-labelledby="revision-plan-heading">
                <div className="report-section-heading">
                  <div>
                    <div className="section-kicker">WEAKEST FIRST</div>
                    <h2 id="revision-plan-heading">Your revision priorities</h2>
                  </div>
                  <span>{plan.items.length} planned · {formatMinutes(plan.scheduledMinutes)}</span>
                </div>
                <p className="plan-source-summary">
                  {pastPaperCount > 0
                    ? `${pastPaperCount} past-paper ${pastPaperCount === 1 ? "source is" : "sources are"} available for approximate topic matching.`
                    : "No past papers are tagged yet; priorities are based on your quiz results."}{" "}
                  {pastPaperCount === 0 && (
                    <Link href="/materials">Add a past paper <span aria-hidden="true">→</span></Link>
                  )}
                </p>
                <div className="revision-plan-list">
                  {plan.items.map((item, index) => (
                    <article className={`revision-plan-card ${item.strength}`} key={item.topic}>
                      <div className={`revision-plan-number ${item.strength}`}>
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="revision-plan-copy">
                        <div className="revision-plan-title-row">
                          <div>
                            <span className={`strength-badge ${item.strength}`}>
                              {STRENGTH_LABELS[item.strength]} · {item.score}%
                            </span>
                            <h3>{item.topic}</h3>
                          </div>
                          <strong className="revision-duration">{formatMinutes(item.minutes)}</strong>
                        </div>
                        <p>{item.recommendation}</p>
                        {item.paperChunkMatches > 0 ? (
                          <div className="plan-paper-evidence">
                            <span>
                              {item.paperChunkMatches} matching source {item.paperChunkMatches === 1 ? "chunk" : "chunks"} in past papers
                            </span>
                            <div>
                              {item.paperCitations.map((citation) => (
                                <span className="evidence-chip" key={citation}>{citation}</span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="plan-evidence-note">
                            Prioritized from your latest quiz result
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                {plan.unscheduledTopics > 0 && (
                  <p className="plan-overflow-note">
                    {plan.unscheduledTopics} diagnosed {plan.unscheduledTopics === 1 ? "topic does" : "topics do"} not fit into the available time yet. Add more time or focus on the highest priorities first.
                  </p>
                )}
                {plan.unscheduledTopics === 0 && plan.scheduledMinutes < plan.budgetMinutes && (
                  <p className="plan-overflow-note">
                    {formatMinutes(plan.budgetMinutes - plan.scheduledMinutes)} remains unallocated because diagnosed topics have reached their strength-based session caps.
                  </p>
                )}
              </section>
            ) : (
              <section className="report-empty">
                <h2>Your available time is very limited</h2>
                <p>Add at least 30 minutes per day to schedule a revision session.</p>
              </section>
            )}
          </>
        )}

        <p className="report-method-note">
          Priorities use the latest quiz score for each topic. Matching chunks in tagged past papers are only an approximate exam-emphasis signal; the app does not yet count individual paper questions.
        </p>
        <footer className="page-footer">
          <span>Your schedule is saved in this browser and reused on this device.</span>
          <Link href="/report">Review your diagnosis <span aria-hidden="true">→</span></Link>
        </footer>
      </div>
    </main>
  );
}

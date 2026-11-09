import type { QuizAttempt } from "@/lib/quiz";

export type TopicStrength = "weak" | "medium" | "strong";

export type TopicGap = {
  topic: string;
  score: number;
  correctCount: number;
  questionCount: number;
  strength: TopicStrength;
  latestAttemptAt: string;
  attemptCount: number;
  previousScore: number | null;
  reason: string;
  evidence: Array<{ citation: string; missedCount: number }>;
};

function scoreAttempt(attempt: QuizAttempt): number {
  if (attempt.questionCount === 0) return 0;
  return Math.round((attempt.correctCount / attempt.questionCount) * 100);
}

function getStrength(score: number): TopicStrength {
  if (score < 50) return "weak";
  if (score < 80) return "medium";
  return "strong";
}

function getCitationSource(citation: string): string {
  return citation.trim() || "Uncited source excerpt";
}

export function buildTopicGaps(attempts: QuizAttempt[]): TopicGap[] {
  const grouped = new Map<string, QuizAttempt[]>();
  for (const attempt of attempts) {
    const key = attempt.topic.trim().toLocaleLowerCase();
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), attempt]);
  }

  const topics = [...grouped.values()].map((topicAttempts) => {
    const ordered = [...topicAttempts].sort(
      (left, right) =>
        new Date(left.completedAt).getTime() -
        new Date(right.completedAt).getTime(),
    );
    const latest = ordered[ordered.length - 1];
    const previous = ordered.length > 1 ? ordered[ordered.length - 2] : null;
    const rawScore =
      latest.questionCount > 0
        ? (latest.correctCount / latest.questionCount) * 100
        : 0;
    const score = Math.round(rawScore);
    const incorrectAnswers = latest.answers.filter(
      (answer) => answer.selectedOptionIndex !== answer.correctOptionIndex,
    );
    const missedSections = new Map<string, number>();

    for (const answer of incorrectAnswers) {
      const section = getCitationSource(answer.citation);
      missedSections.set(section, (missedSections.get(section) ?? 0) + 1);
    }

    const evidence = [...missedSections.entries()]
      .map(([citation, missedCount]) => ({ citation, missedCount }))
      .sort((left, right) => right.missedCount - left.missedCount);
    const reason =
      incorrectAnswers.length > 0
        ? `Missed ${incorrectAnswers.length} of ${latest.questionCount} questions. Review ${evidence
            .slice(0, 2)
            .map((item) => item.citation)
            .join(" and ")}.`
        : `Answered all ${latest.questionCount} questions correctly on the latest attempt.`;

    return {
      topic: latest.topic.trim(),
      score,
      correctCount: latest.correctCount,
      questionCount: latest.questionCount,
      strength: getStrength(rawScore),
      latestAttemptAt: latest.completedAt,
      attemptCount: ordered.length,
      previousScore: previous ? scoreAttempt(previous) : null,
      reason,
      evidence,
    };
  });

  return topics.sort((left, right) => {
    const strengthOrder: Record<TopicStrength, number> = {
      weak: 0,
      medium: 1,
      strong: 2,
    };
    return (
      strengthOrder[left.strength] - strengthOrder[right.strength] ||
      left.score - right.score ||
      new Date(right.latestAttemptAt).getTime() -
        new Date(left.latestAttemptAt).getTime()
    );
  });
}

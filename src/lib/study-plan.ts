import type { StoredMaterial } from "@/lib/materials";
import type { TopicGap } from "@/lib/gap-analysis";
import { retrieveRelevantChunks } from "@/lib/retrieval";

export type StudySchedulePreferences = {
  id: "study-schedule";
  daysUntilExam: number;
  hoursPerDay: number;
};

export type RevisionPlanItem = {
  topic: string;
  strength: TopicGap["strength"];
  score: number;
  minutes: number;
  priorityScore: number;
  paperChunkMatches: number;
  paperCitations: string[];
  recommendation: string;
};

export type RevisionPlan = {
  budgetMinutes: number;
  scheduledMinutes: number;
  unscheduledTopics: number;
  items: RevisionPlanItem[];
};

export const DEFAULT_STUDY_SCHEDULE: StudySchedulePreferences = {
  id: "study-schedule",
  daysUntilExam: 5,
  hoursPerDay: 2,
};

const MIN_SESSION_MINUTES = 15;

function getMaximumTopicMinutes(strength: TopicGap["strength"]): number {
  if (strength === "weak") return 90;
  if (strength === "medium") return 60;
  return 20;
}

function getRecommendation(strength: TopicGap["strength"]): string {
  if (strength === "weak") {
    return "Revisit the cited sections from missed answers, then retest this topic.";
  }
  if (strength === "medium") {
    return "Review the source material and practise active recall on the missed concepts.";
  }
  return "Keep this topic fresh with a short spaced-recall session.";
}

export function buildRevisionPlan(
  topics: TopicGap[],
  materials: StoredMaterial[],
  daysUntilExam: number,
  hoursPerDay: number,
): RevisionPlan {
  const requestedDays = Number.isFinite(daysUntilExam) ? daysUntilExam : 5;
  const requestedHours = Number.isFinite(hoursPerDay) ? hoursPerDay : 2;
  const days = Math.min(30, Math.max(1, Math.floor(requestedDays)));
  const dailyMinutes = Math.min(
    480,
    Math.max(30, Math.round((requestedHours * 60) / 30) * 30),
  );
  const budgetMinutes = days * dailyMinutes;
  const pastPaperMaterials = materials.filter(
    (material) => material.sourceKind === "past_paper",
  );

  const rankedTopics = topics
    .map((topic) => {
      const paperMatches = retrieveRelevantChunks(
        pastPaperMaterials,
        topic.topic,
        Number.MAX_SAFE_INTEGER,
      );
      const paperBoost = Math.min(35, paperMatches.length * 7);
      return {
        topic,
        paperChunkMatches: paperMatches.length,
        paperCitations: [...new Set(paperMatches.map((match) => match.citation))].slice(0, 3),
        priorityScore: Math.max(1, 100 - topic.score) + paperBoost,
      };
    })
    .sort(
      (left, right) =>
        right.priorityScore - left.priorityScore ||
        left.topic.score - right.topic.score,
    );

  const schedulableCount = Math.min(
    rankedTopics.length,
    Math.floor(budgetMinutes / MIN_SESSION_MINUTES),
  );
  const selectedTopics = rankedTopics.slice(0, schedulableCount);
  const minutesByTopic = new Map(
    selectedTopics.map(({ topic }) => [topic.topic, MIN_SESSION_MINUTES]),
  );
  let remainingMinutes =
    budgetMinutes - selectedTopics.length * MIN_SESSION_MINUTES;

  while (remainingMinutes > 0) {
    const nextTopic = selectedTopics
      .filter(
        ({ topic }) =>
          (minutesByTopic.get(topic.topic) ?? 0) <
          getMaximumTopicMinutes(topic.strength),
      )
      .sort((left, right) => {
        const leftMinutes = minutesByTopic.get(left.topic.topic) ?? 0;
        const rightMinutes = minutesByTopic.get(right.topic.topic) ?? 0;
        return (
          leftMinutes / left.priorityScore -
          rightMinutes / right.priorityScore
        );
      })[0];

    if (!nextTopic) break;

    const currentMinutes = minutesByTopic.get(nextTopic.topic.topic) ?? 0;
    const increase = Math.min(
      5,
      remainingMinutes,
      getMaximumTopicMinutes(nextTopic.topic.strength) - currentMinutes,
    );
    minutesByTopic.set(nextTopic.topic.topic, currentMinutes + increase);
    remainingMinutes -= increase;
  }

  const items = selectedTopics.map(
    ({ topic, paperChunkMatches, paperCitations, priorityScore }) => ({
      topic: topic.topic,
      strength: topic.strength,
      score: topic.score,
      minutes: minutesByTopic.get(topic.topic) ?? MIN_SESSION_MINUTES,
      priorityScore,
      paperChunkMatches,
      paperCitations,
      recommendation: getRecommendation(topic.strength),
    }),
  );

  return {
    budgetMinutes,
    scheduledMinutes: items.reduce((total, item) => total + item.minutes, 0),
    unscheduledTopics: rankedTopics.length - items.length,
    items,
  };
}

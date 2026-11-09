import type { StoredMaterial } from "@/lib/materials";
import type { SourceChunk } from "@/lib/materials";

export type RetrievedChunk = SourceChunk & {
  materialName: string;
  score: number;
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "and",
  "are",
  "because",
  "before",
  "between",
  "can",
  "does",
  "for",
  "from",
  "have",
  "into",
  "its",
  "more",
  "most",
  "not",
  "of",
  "on",
  "the",
  "their",
  "this",
  "through",
  "under",
  "using",
  "what",
  "when",
  "where",
  "which",
  "with",
]);

function tokenize(value: string): string[] {
  return (
    value
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((term) => term.length > 1 && !STOP_WORDS.has(term)) ?? []
  );
}

function countTerms(terms: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const term of terms) {
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return counts;
}

export function retrieveRelevantChunks(
  materials: StoredMaterial[],
  topic: string,
  limit = 8,
): RetrievedChunk[] {
  const queryTerms = [...new Set(tokenize(topic))];
  if (queryTerms.length === 0 || limit < 1) return [];

  const candidates = materials.flatMap((material) =>
    material.chunks.map((chunk) => ({
      chunk,
      materialName: material.name,
      bodyTerms: tokenize(chunk.text),
      sectionTerms: tokenize(chunk.section),
    })),
  );
  if (candidates.length === 0) return [];

  const documentFrequency = new Map<string, number>();
  for (const candidate of candidates) {
    const termsInChunk = new Set([...candidate.bodyTerms, ...candidate.sectionTerms]);
    for (const term of queryTerms) {
      if (termsInChunk.has(term)) {
        documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
      }
    }
  }

  const averageLength =
    candidates.reduce((sum, candidate) => sum + candidate.bodyTerms.length, 0) /
    candidates.length;

  const ranked = candidates
    .map((candidate) => {
      const bodyCounts = countTerms(candidate.bodyTerms);
      const sectionCounts = countTerms(candidate.sectionTerms);
      const lengthRatio = averageLength > 0 ? candidate.bodyTerms.length / averageLength : 1;
      let score = 0;

      for (const term of queryTerms) {
        const frequency = documentFrequency.get(term) ?? 0;
        if (frequency === 0) continue;

        const inverseFrequency = Math.log(
          1 + (candidates.length - frequency + 0.5) / (frequency + 0.5),
        );
        const bodyFrequency = bodyCounts.get(term) ?? 0;
        if (bodyFrequency > 0) {
          score +=
            inverseFrequency *
            ((bodyFrequency * 2.2) / (bodyFrequency + 1.2 * (0.25 + 0.75 * lengthRatio)));
        }

        score += inverseFrequency * (sectionCounts.get(term) ?? 0) * 2.5;
      }

      const normalizedTopic = topic.trim().toLocaleLowerCase();
      if (candidate.chunk.section.toLocaleLowerCase().includes(normalizedTopic)) {
        score += 4;
      }

      return {
        ...candidate.chunk,
        materialName: candidate.materialName,
        score,
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);

  return ranked.slice(0, limit);
}

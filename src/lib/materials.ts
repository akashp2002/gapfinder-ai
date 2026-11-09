export type SourceChunk = {
  id: string;
  section: string;
  citation: string;
  text: string;
};

export type MaterialSourceKind = "study_material" | "syllabus" | "past_paper";

export type StoredMaterial = {
  id: string;
  name: string;
  fileType: "pdf" | "text";
  sourceKind?: MaterialSourceKind;
  uploadedAt: string;
  characterCount: number;
  pageCount: number | null;
  chunks: SourceChunk[];
};

export type TextSegment = {
  label: string;
  text: string;
};

const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 120;
const HEADING_PATTERN =
  /^(?:#{1,6}\s+.{1,120}|(?:chapter|section|unit|topic)\s+[\w.-]+(?:\s*[:.-]\s*|\s+).{1,100})$/i;

export function splitTextIntoSections(text: string): TextSegment[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const sections: TextSegment[] = [];
  let currentLabel = "Full text";
  let currentLines: string[] = [];
  let hasHeading = false;

  const saveSection = () => {
    const sectionText = currentLines.join("\n").trim();
    if (sectionText) sections.push({ label: currentLabel, text: sectionText });
    currentLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && HEADING_PATTERN.test(trimmed)) {
      saveSection();
      currentLabel = trimmed.replace(/^#{1,6}\s+/, "").slice(0, 120);
      hasHeading = true;
    } else {
      currentLines.push(line);
    }
  }

  saveSection();

  if (!hasHeading) {
    const fullText = sections.map((section) => section.text).join("\n\n").trim();
    return fullText ? [{ label: "Full text", text: fullText }] : [];
  }

  return sections;
}

export function createSourceChunks(
  fileName: string,
  segments: TextSegment[],
): SourceChunk[] {
  const chunks: SourceChunk[] = [];

  for (const segment of segments) {
    const normalized = segment.text.replace(/\s+/g, " ").trim();
    if (!normalized) continue;

    let start = 0;
    while (start < normalized.length) {
      let end = Math.min(start + CHUNK_SIZE, normalized.length);
      if (end < normalized.length) {
        const boundary = normalized.lastIndexOf(" ", end);
        if (boundary > start + CHUNK_SIZE * 0.7) end = boundary;
      }

      const chunkText = normalized.slice(start, end).trim();
      if (chunkText) {
        chunks.push({
          id: crypto.randomUUID(),
          section: segment.label,
          citation: `${fileName} · ${segment.label}`,
          text: chunkText,
        });
      }

      if (end >= normalized.length) break;
      start = Math.max(start + 1, end - CHUNK_OVERLAP);
    }
  }

  return chunks;
}

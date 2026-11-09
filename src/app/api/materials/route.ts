import { PDFParse } from "pdf-parse";
import { NextResponse } from "next/server";
import {
  createSourceChunks,
  splitTextIntoSections,
  type MaterialSourceKind,
  type StoredMaterial,
  type TextSegment,
} from "@/lib/materials";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_PDF_PAGES = 120;
const MAX_EXTRACTED_CHARACTERS = 700_000;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Choose a PDF or text file to upload.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorResponse("Choose a PDF, TXT, or Markdown file.", 400);
  }

  const sourceKindValue = formData.get("sourceKind");
  let sourceKind: MaterialSourceKind;
  if (sourceKindValue === null) {
    sourceKind = "study_material";
  } else if (
    sourceKindValue === "study_material" ||
    sourceKindValue === "syllabus" ||
    sourceKindValue === "past_paper"
  ) {
    sourceKind = sourceKindValue;
  } else {
    return errorResponse("Choose a valid source type.", 400);
  }

  if (file.size === 0) {
    return errorResponse("That file is empty.", 400);
  }
  if (file.size > MAX_FILE_BYTES) {
    return errorResponse("Files must be 4 MB or smaller.", 413);
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  const fileType = extension === "pdf" ? "pdf" : "text";
  if (fileType === "text" && extension !== "txt" && extension !== "md") {
    return errorResponse("Only PDF, TXT, and Markdown files are supported.", 415);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let segments: TextSegment[];
  let pageCount: number | null = null;
  let characterCount: number;

  if (fileType === "pdf") {
    const signature = new TextDecoder().decode(bytes.subarray(0, 5));
    if (signature !== "%PDF-") {
      return errorResponse("This file does not look like a valid PDF.", 415);
    }

    const parser = new PDFParse({
      data: bytes,
      isEvalSupported: false,
      stopAtErrors: true,
    });

    try {
      const result = await parser.getText();
      if (result.total > MAX_PDF_PAGES) {
        return errorResponse("PDFs must contain 120 pages or fewer.", 413);
      }

      segments = result.pages.map((page) => ({
        label: `Page ${page.num}`,
        text: page.text,
      }));
      characterCount = result.text.length;
      pageCount = result.total;
    } catch (error) {
      console.error("PDF text extraction failed.", error);
      return errorResponse(
        "We couldn't read this PDF. Try another file or export it as a text-based PDF.",
        422,
      );
    } finally {
      await parser.destroy();
    }
  } else {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return errorResponse("Text files must use UTF-8 encoding.", 415);
    }

    characterCount = text.length;
    segments = splitTextIntoSections(text);
  }

  if (characterCount > MAX_EXTRACTED_CHARACTERS) {
    return errorResponse("Extracted text is too long to process (700,000 characters maximum).", 413);
  }

  const chunks = createSourceChunks(file.name, segments);
  if (chunks.length === 0) {
    return errorResponse(
      "No readable text was found. Scanned PDFs need OCR before they can be used.",
      422,
    );
  }

  const name = file.name
    .replace(/[\u0000-\u001f]/g, "")
    .split(/[\\/]/)
    .pop()
    ?.slice(0, 160);

  const material: StoredMaterial = {
    id: crypto.randomUUID(),
    name: name || `Study material.${extension}`,
    fileType,
    sourceKind,
    uploadedAt: new Date().toISOString(),
    characterCount,
    pageCount,
    chunks,
  };

  return NextResponse.json({ material }, { status: 201 });
}

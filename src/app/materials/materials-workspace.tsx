"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  deleteMaterial,
  listMaterials,
  saveMaterial,
} from "@/lib/material-store";
import type { MaterialSourceKind, StoredMaterial } from "@/lib/materials";

type UploadResponse = {
  material?: StoredMaterial;
  error?: string;
};

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const SOURCE_KIND_LABELS: Record<MaterialSourceKind, string> = {
  study_material: "Notes / textbook",
  syllabus: "Syllabus",
  past_paper: "Past paper",
};

function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function MaterialsWorkspace() {
  const [materials, setMaterials] = useState<StoredMaterial[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceKind, setSourceKind] =
    useState<MaterialSourceKind>("study_material");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    listMaterials()
      .then((savedMaterials) => {
        if (active) setMaterials(savedMaterials);
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Saved materials could not be loaded.",
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

  function chooseFile(file: File | undefined) {
    setErrorMessage("");
    setSuccessMessage("");
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setSelectedFile(null);
      setErrorMessage("Files must be 4 MB or smaller.");
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedFile) {
      setErrorMessage("Choose a PDF, TXT, or Markdown file first.");
      return;
    }

    setIsUploading(true);
    try {
      const body = new FormData();
      body.append("file", selectedFile);
      body.append("sourceKind", sourceKind);

      const response = await fetch("/api/materials", {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as UploadResponse;

      if (!response.ok || !payload.material) {
        throw new Error(payload.error ?? "The material could not be processed.");
      }

      const material = payload.material;
      await saveMaterial(material);
      setMaterials((current) => [material, ...current]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccessMessage(
        `Added ${material.name}. ${material.chunks.length} cited source sections are ready.`,
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Upload failed. Check your connection and try again.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(material: StoredMaterial) {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await deleteMaterial(material.id);
      setMaterials((current) =>
        current.filter((savedMaterial) => savedMaterial.id !== material.id),
      );
      setSuccessMessage(`${material.name} was removed from this browser.`);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "The material could not be removed.",
      );
    }
  }

  return (
    <main className="materials-shell">
      <header className="materials-topbar">
        <Link className="brand" href="/" aria-label="GapFinder home">
          <span className="brand-mark">g</span>
          <span>gapfinder<span className="brand-period">.</span></span>
        </Link>
        <Link className="back-link" href="/">← Back to overview</Link>
      </header>

      <div className="materials-content">
        <div className="materials-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-dot" /> YOUR STUDY LIBRARY</p>
            <h1>Bring your material.</h1>
            <p className="welcome-copy">
              GapFinder uses your own notes and chapters as the source for future quizzes and explanations.
            </p>
          </div>
          <span className="source-count">{materials.length} {materials.length === 1 ? "SOURCE" : "SOURCES"}</span>
        </div>

        <section className="upload-panel" aria-labelledby="upload-heading">
          <div className="upload-panel-heading">
            <div>
              <div className="section-kicker">STEP 1 · ADD A SOURCE</div>
              <h2 id="upload-heading">Upload study material</h2>
            </div>
            <span className="supported-files">PDF · TXT · MD</span>
          </div>

          <form onSubmit={handleUpload}>
            <div className="source-kind-field">
              <label className="field-label" htmlFor="source-kind">What are you uploading?</label>
              <select
                className="count-select"
                disabled={isLoading || isUploading}
                id="source-kind"
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  if (
                    value === "study_material" ||
                    value === "syllabus" ||
                    value === "past_paper"
                  ) {
                    setSourceKind(value);
                  }
                }}
                value={sourceKind}
              >
                {Object.entries(SOURCE_KIND_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <label
              className={`dropzone${selectedFile ? " has-file" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                chooseFile(event.dataTransfer.files[0]);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                disabled={isLoading || isUploading}
                onChange={(event) => chooseFile(event.currentTarget.files?.[0])}
              />
              <span className="upload-symbol" aria-hidden="true">↑</span>
              <span className="dropzone-title">
                {selectedFile ? selectedFile.name : "Drop a file here, or browse"}
              </span>
              <span className="dropzone-help">
                {selectedFile
                  ? `${formatBytes(selectedFile.size)} · Ready to extract`
                  : "Text-based PDFs and UTF-8 notes, up to 4 MB"}
              </span>
            </label>

            <div className="upload-actions">
              <p>Scanned image-only PDFs need OCR before they can be read.</p>
              <button
                className="primary-button"
                type="submit"
                disabled={isLoading || isUploading || !selectedFile}
              >
                {isUploading ? "Reading material..." : "Upload and extract"}
                {!isUploading && <span aria-hidden="true">→</span>}
              </button>
            </div>
          </form>

          {errorMessage && <p className="notice error-notice" role="alert">{errorMessage}</p>}
          {successMessage && <p className="notice success-notice" role="status">{successMessage}</p>}
          <p className="privacy-note">
            Demo privacy: source text is extracted on upload and saved in this browser only. It is not sent to an AI model in this step.
          </p>
        </section>

        <section className="library-section" aria-labelledby="library-heading">
          <div className="library-heading">
            <div>
              <div className="section-kicker">YOUR SOURCES</div>
              <h2 id="library-heading">Study library</h2>
            </div>
            <span className="library-caption">Cited extracts are prepared for retrieval.</span>
          </div>

          {isLoading ? (
            <div className="library-empty">Loading saved materials…</div>
          ) : materials.length === 0 ? (
            <div className="library-empty">
              <span className="empty-mark" aria-hidden="true">↳</span>
              <strong>Your library is ready for its first source.</strong>
              <span>Add a syllabus, chapter, or set of notes to get started.</span>
            </div>
          ) : (
            <div className="material-list">
              {materials.map((material) => (
                <article className="material-card" key={material.id}>
                  <div className="material-card-heading">
                    <span className="file-mark">{material.fileType === "pdf" ? "PDF" : "TXT"}</span>
                    <div className="material-details">
                      <strong>{material.name}</strong>
                      <span>
                        {formatDate(material.uploadedAt)} · {material.characterCount.toLocaleString()} characters
                        {material.pageCount !== null ? ` · ${material.pageCount} pages` : ""}
                        {" · "}{SOURCE_KIND_LABELS[material.sourceKind ?? "study_material"]}
                        {" · "}{material.chunks.length} source chunks
                      </span>
                    </div>
                    <button
                      className="remove-material"
                      type="button"
                      aria-label={`Remove ${material.name}`}
                      onClick={() => void handleDelete(material)}
                    >
                      Remove
                    </button>
                  </div>
                  <details className="material-preview">
                    <summary>Preview cited extracts</summary>
                    <div className="extract-list">
                      {material.chunks.slice(0, 3).map((chunk) => (
                        <div className="extract" key={chunk.id}>
                          <span>{chunk.citation}</span>
                          <p>{chunk.text.slice(0, 260)}{chunk.text.length > 260 ? "…" : ""}</p>
                        </div>
                      ))}
                      {material.chunks.length > 3 && (
                        <p className="more-extracts">
                          And {material.chunks.length - 3} more source chunks.
                        </p>
                      )}
                    </div>
                  </details>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="page-footer">
          <span>Source-grounded learning starts with your material.</span>
          <Link href="/">Return to your diagnosis <span aria-hidden="true">→</span></Link>
        </footer>
      </div>
    </main>
  );
}

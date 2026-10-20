"use client";

import { useEffect, useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import {
  Download,
  RotateCw,
  LoaderCircle,
  FileCheck2,
} from "lucide-react";

type RotatePdfToolProps = {
  file: File | null;
};

type RotationAngle = 90 | 180 | 270;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function RotatePdfTool({ file }: RotatePdfToolProps) {
  const [angle, setAngle] = useState<RotationAngle>(90);
  const [pageMode, setPageMode] = useState<"all" | "selected">("all");
  const [pageRange, setPageRange] = useState("");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [outputSize, setOutputSize] = useState<number | null>(null);

  useEffect(() => {
    setAngle(90);
    setPageMode("all");
    setPageRange("");
    setPageCount(null);
    setError("");
    setSuccess("");
    setOutputSize(null);

    setDownloadUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      return "";
    });

    if (!file) return;

    let cancelled = false;

    async function readPageCount() {
      try {
        const bytes = await file!.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);

        if (!cancelled) {
          setPageCount(pdf.getPageCount());
        }
      } catch {
        if (!cancelled) {
          setError(
            "Unable to read this PDF. Please check that it is valid and not password-protected."
          );
        }
      }
    }

    void readPageCount();

    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  function parsePageRange(
    value: string,
    totalPages: number
  ): number[] {
    const normalized = value.replace(/\s+/g, "");

    if (!normalized) {
      throw new Error("Enter the page numbers or ranges to rotate.");
    }

    const pages = new Set<number>();
    const parts = normalized.split(",");

    for (const part of parts) {
      if (!part) {
        throw new Error("Please check your page range format.");
      }

      const match = part.match(/^(\d+)(?:-(\d+))?$/);

      if (!match) {
        throw new Error(
          'Use a format such as "1-3,5,8-10".'
        );
      }

      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : start;

      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 1 ||
        end < 1 ||
        start > totalPages ||
        end > totalPages
      ) {
        throw new Error(
          `Page numbers must be between 1 and ${totalPages}.`
        );
      }

      if (start > end) {
        throw new Error(
          "In each range, the starting page must not exceed the ending page."
        );
      }

      for (let page = start; page <= end; page++) {
        if (pages.has(page)) {
          throw new Error(
            `Page ${page} appears more than once. Remove duplicate pages or ranges.`
          );
        }

        pages.add(page);
      }
    }

    return [...pages].sort((a, b) => a - b);
  }

  async function rotatePDF() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");
    setOutputSize(null);

    try {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      const pages = pdf.getPages();
      const totalPages = pages.length;

      let indexes: number[];

      if (pageMode === "all") {
        indexes = pages.map((_, index) => index);
      } else {
        const selectedPages = parsePageRange(
          pageRange,
          totalPages
        );

        indexes = selectedPages.map((page) => page - 1);
      }

      for (const index of indexes) {
        const currentPage = pages[index];
        const currentAngle =
          ((currentPage.getRotation().angle % 360) + 360) % 360;

        currentPage.setRotation(
          degrees((currentAngle + angle) % 360)
        );
      }

      const outputBytes = await pdf.save({
        useObjectStreams: true,
      });

      const outputBuffer = new ArrayBuffer(outputBytes.byteLength);
      new Uint8Array(outputBuffer).set(outputBytes);

      const blob = new Blob([outputBuffer], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);

      setDownloadUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return url;
      });

      setOutputSize(blob.size);
      setSuccess(
        `Successfully rotated ${indexes.length} ${
          indexes.length === 1 ? "page" : "pages"
        } by ${angle}°.`
      );
    } catch (rotateError) {
      setError(
        rotateError instanceof Error
          ? rotateError.message
          : "Unable to rotate this PDF. Please try another file."
      );
    } finally {
      setProcessing(false);
    }
  }

  function downloadPDF() {
    if (!downloadUrl) return;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "rotated-document.pdf";

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <RotateCw size={23} aria-hidden="true" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Rotate PDF pages
          </h3>

          <p className="mt-1 text-sm leading-6 text-gray-600">
            Rotate every page or specify the pages you want to change.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-semibold text-gray-800">
          Rotation angle
        </label>

        <div className="grid grid-cols-3 gap-2">
          {([90, 180, 270] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setAngle(value);
                setDownloadUrl((previousUrl) => {
                  if (previousUrl) URL.revokeObjectURL(previousUrl);
                  return "";
                });
                setOutputSize(null);
                setSuccess("");
                setError("");
              }}
              className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                angle === value
                  ? "border-red-600 bg-red-50 text-red-700"
                  : "border-gray-200 text-gray-700 hover:border-red-300"
              }`}
            >
              {value}°
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-semibold text-gray-800">
          Pages to rotate
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setPageMode("all");
              setError("");
              setSuccess("");
              setDownloadUrl((previousUrl) => {
                if (previousUrl) URL.revokeObjectURL(previousUrl);
                return "";
              });
            }}
            className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
              pageMode === "all"
                ? "border-red-600 bg-red-50 text-red-700"
                : "border-gray-200 text-gray-700 hover:border-red-300"
            }`}
          >
            All pages
          </button>

          <button
            type="button"
            onClick={() => {
              setPageMode("selected");
              setError("");
              setSuccess("");
              setDownloadUrl((previousUrl) => {
                if (previousUrl) URL.revokeObjectURL(previousUrl);
                return "";
              });
            }}
            className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
              pageMode === "selected"
                ? "border-red-600 bg-red-50 text-red-700"
                : "border-gray-200 text-gray-700 hover:border-red-300"
            }`}
          >
            Selected pages
          </button>
        </div>

        {pageMode === "selected" && (
          <div className="mt-4">
            <label
              htmlFor="rotate-page-range"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Page numbers or ranges
            </label>

            <input
              id="rotate-page-range"
              type="text"
              value={pageRange}
              onChange={(event) => {
                setPageRange(event.target.value);
                setError("");
                setSuccess("");
                setDownloadUrl((previousUrl) => {
                  if (previousUrl) URL.revokeObjectURL(previousUrl);
                  return "";
                });
              }}
              placeholder="Example: 1-3,5,8-10"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />

            <p className="mt-2 text-xs text-gray-500">
              {pageCount !== null
                ? `This PDF has ${pageCount} pages.`
                : "Reading PDF page count..."}
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={rotatePDF}
        disabled={!file || processing || pageCount === null}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {processing ? (
          <>
            <LoaderCircle
              size={19}
              className="animate-spin"
              aria-hidden="true"
            />
            Rotating PDF...
          </>
        ) : (
          <>
            <RotateCw size={19} aria-hidden="true" />
            Rotate PDF
          </>
        )}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          {success}
        </p>
      )}

      {downloadUrl && (
        <button
          type="button"
          onClick={downloadPDF}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-800 transition hover:bg-gray-50"
        >
          <Download size={19} aria-hidden="true" />
          Download rotated PDF
        </button>
      )}

      {outputSize !== null && (
        <p className="mt-3 text-center text-xs text-gray-500">
          Output size: {(outputSize / (1024 * 1024)).toFixed(2)} MB
        </p>
      )}

      <p className="mt-4 text-xs leading-5 text-gray-500">
        Processing takes place in your browser. Page rotation preserves the
        PDF's text and vector content where supported.
      </p>
    </section>
  );
}
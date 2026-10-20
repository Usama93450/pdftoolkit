
"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  FileText,
  Scissors,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type ExtractPdfPagesToolProps = {
  file: File | null;
};

function parsePageRanges(input: string, totalPages: number): number[] {
  const value = input.trim();

  if (!value) {
    throw new Error("Enter the page numbers you want to extract.");
  }

  const pages = new Set<number>();
  const parts = value.split(",").map((part) => part.trim());

  for (const part of parts) {
    if (!part) {
      throw new Error("Check your page numbers and ranges.");
    }

    const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);

    if (!match) {
      throw new Error('Use a format such as "2, 4, 7" or "3-5".');
    }

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;

    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
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
        `Invalid range "${part}". The first page must not exceed the last page.`
      );
    }

    for (let page = start; page <= end; page++) {
      pages.add(page);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

export function ExtractPdfPagesTool({
  file,
}: ExtractPdfPagesToolProps) {
  const [pageInput, setPageInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [totalPages, setTotalPages] = useState<number | null>(null);

  async function checkPageCount() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);

      setTotalPages(pdf.getPageCount());
    } catch {
      setError(
        "Unable to read this PDF. It may be damaged or password-protected."
      );
    }
  }

  async function extractPages() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    let downloadUrl: string | null = null;

    try {
      const sourceBytes = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(sourceBytes);
      const pageCount = sourcePdf.getPageCount();

      if (pageCount < 1) {
        throw new Error("This PDF does not contain any pages.");
      }

      const selectedPages = parsePageRanges(pageInput, pageCount);

      // pdf-lib uses zero-based page indexes.
      const pageIndexes = selectedPages.map((page) => page - 1);

      const outputPdf = await PDFDocument.create();

      const copiedPages = await outputPdf.copyPages(
        sourcePdf,
        pageIndexes
      );

      copiedPages.forEach((page) => {
        outputPdf.addPage(page);
      });

      const outputBytes = await outputPdf.save();

      const blob = new Blob(
        [new Uint8Array(outputBytes).buffer as ArrayBuffer],
        { type: "application/pdf" }
      );

      downloadUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      const baseName = file.name.replace(/\.pdf$/i, "") || "document";

      link.href = downloadUrl;
      link.download = `${baseName}-extracted-pages.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTotalPages(pageCount);

      setSuccess(
        `Successfully extracted ${selectedPages.length} ${
          selectedPages.length === 1 ? "page" : "pages"
        }. Your new PDF has been downloaded.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while extracting pages."
      );
    } finally {
      if (downloadUrl) {
        window.setTimeout(() => {
          URL.revokeObjectURL(downloadUrl!);
        }, 1000);
      }

      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <Scissors size={24} aria-hidden="true" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Extract PDF Pages
          </h2>

          <p className="mt-1 text-sm leading-6 text-gray-600">
            Select the pages you need and save them as a separate PDF.
          </p>
        </div>
      </div>

      {file ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            <FileText
              className="shrink-0 text-red-600"
              size={25}
              aria-hidden="true"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-800">
                {file.name}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={checkPageCount}
            disabled={loading}
            className="mt-4 text-sm font-semibold text-red-600 transition hover:text-red-700 disabled:opacity-50"
          >
            Check total pages
          </button>

          {totalPages !== null && (
            <p className="mt-2 text-sm text-gray-600">
              Total pages:{" "}
              <span className="font-semibold">{totalPages}</span>
            </p>
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
          Select a PDF using the upload area above to get started.
        </div>
      )}

      <div className="mt-6">
        <label
          htmlFor="extract-page-input"
          className="block text-sm font-semibold text-gray-800"
        >
          Pages to extract
        </label>

        <input
          id="extract-page-input"
          type="text"
          value={pageInput}
          onChange={(event) => {
            setPageInput(event.target.value);
            setError("");
            setSuccess("");
          }}
          placeholder="e.g. 2, 4, 7 or 3-5"
          disabled={!file || loading}
          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-400 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-gray-100"
        />

        <p className="mt-2 text-xs leading-5 text-gray-500">
          Separate individual pages with commas or enter a range such as
          3-5. Pages are extracted in ascending page order. Duplicate
          selections are automatically removed.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle
            className="mt-0.5 shrink-0"
            size={19}
            aria-hidden="true"
          />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mt-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          <CheckCircle2
            className="mt-0.5 shrink-0"
            size={19}
            aria-hidden="true"
          />
          <p>{success}</p>
        </div>
      )}

      <button
        type="button"
        onClick={extractPages}
        disabled={!file || loading}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            Extracting pages...
          </>
        ) : (
          <>
            <Download size={18} />
            Extract Pages & Download
          </>
        )}
      </button>

      <p className="mt-4 text-xs leading-5 text-gray-500">
        A new PDF is created in your browser. Your original PDF is not
        modified.
      </p>
    </section>
  );
}


"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  FileText,
  Trash2,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type DeletePdfPagesToolProps = {
  file: File | null;
};

function parsePageRanges(input: string, totalPages: number): number[] {
  const value = input.trim();

  if (!value) {
    throw new Error("Enter the page numbers you want to delete.");
  }

  const pages = new Set<number>();
  const parts = value.split(",").map((part) => part.trim());

  for (const part of parts) {
    if (!part) {
      throw new Error("Check your page numbers and ranges.");
    }

    const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);

    if (!match) {
      throw new Error(
        'Use a format such as "2, 4, 7" or "3-5".',
      );
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
        `Page numbers must be between 1 and ${totalPages}.`,
      );
    }

    if (start > end) {
      throw new Error(
        `Invalid range "${part}". The first page must not exceed the last page.`,
      );
    }

    for (let page = start; page <= end; page++) {
      pages.add(page);
    }
  }

  if (pages.size >= totalPages) {
    throw new Error(
      "You cannot delete every page. Keep at least one page in the PDF.",
    );
  }

  return Array.from(pages).sort((a, b) => a - b);
}

export function DeletePdfPagesTool({
  file,
}: DeletePdfPagesToolProps) {
  const [pageInput, setPageInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pageCount, setPageCount] = useState<number | null>(null);

  async function loadPageCount() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);

      setPageCount(pdf.getPageCount());
    } catch {
      setError(
        "Unable to read this PDF. It may be damaged or password-protected.",
      );
    }
  }

  async function deletePages() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const sourceBytes = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(sourceBytes);
      const totalPages = sourcePdf.getPageCount();

      if (totalPages < 2) {
        throw new Error(
          "This PDF has fewer than two pages, so no page can be deleted while keeping a valid document.",
        );
      }

      const pagesToDelete = parsePageRanges(pageInput, totalPages);
      const deletedSet = new Set(pagesToDelete);

      const pagesToKeep = Array.from(
        { length: totalPages },
        (_, index) => index,
      ).filter((index) => !deletedSet.has(index + 1));

      const outputPdf = await PDFDocument.create();

      const copiedPages = await outputPdf.copyPages(
        sourcePdf,
        pagesToKeep,
      );

      for (const page of copiedPages) {
        outputPdf.addPage(page);
      }

      const outputBytes = await outputPdf.save();

      const blobBuffer = new ArrayBuffer(outputBytes.byteLength);
      new Uint8Array(blobBuffer).set(outputBytes);

      const blob = new Blob([blobBuffer], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const baseName = file.name.replace(/\.pdf$/i, "") || "document";

      link.href = url;
      link.download = `${baseName}-pages-deleted.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      setPageCount(totalPages - pagesToDelete.length);
      setSuccess(
        `Successfully deleted ${pagesToDelete.length} ${
          pagesToDelete.length === 1 ? "page" : "pages"
        }. Your updated PDF has been downloaded.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while deleting pages.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <Trash2 size={24} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Delete PDF Pages
          </h2>

          <p className="mt-1 text-sm leading-6 text-gray-600">
            Remove unwanted pages and download a new PDF without them.
          </p>
        </div>
      </div>

      {file ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            <FileText className="shrink-0 text-red-600" size={25} />

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
            onClick={loadPageCount}
            className="mt-4 text-sm font-semibold text-red-600 transition hover:text-red-700"
          >
            Check total pages
          </button>

          {pageCount !== null && (
            <p className="mt-2 text-sm text-gray-600">
              Pages remaining after the last successful operation:{" "}
              <span className="font-semibold">{pageCount}</span>
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
          htmlFor="delete-page-input"
          className="block text-sm font-semibold text-gray-800"
        >
          Pages to delete
        </label>

        <input
          id="delete-page-input"
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
          Enter individual page numbers separated by commas, or a range such
          as 3-5. Page numbering starts at 1.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 shrink-0" size={19} />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mt-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          <CheckCircle2 className="mt-0.5 shrink-0" size={19} />
          <p>{success}</p>
        </div>
      )}

      <button
        type="button"
        onClick={deletePages}
        disabled={!file || loading}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            Processing PDF...
          </>
        ) : (
          <>
            <Download size={18} />
            Delete Pages & Download
          </>
        )}
      </button>

      <p className="mt-4 text-xs leading-5 text-gray-500">
        Your PDF is processed in your browser by this tool. The output is a
        new PDF; your original file is not modified.
      </p>
    </section>
  );
}

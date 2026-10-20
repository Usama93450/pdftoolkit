
"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  ArrowDownUp,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type ReorderPdfPagesToolProps = {
  file: File | null;
};

function parsePageOrder(input: string, totalPages: number): number[] {
  const value = input.trim();

  if (!value) {
    throw new Error(
      "Enter the new page order, for example: 3, 1, 2."
    );
  }

  const parts = value.split(",").map((part) => part.trim());

  if (parts.some((part) => !/^\d+$/.test(part))) {
    throw new Error(
      "Enter page numbers separated by commas, such as 3, 1, 2."
    );
  }

  const pages = parts.map(Number);

  if (pages.some((page) => !Number.isSafeInteger(page))) {
    throw new Error("One or more page numbers are invalid.");
  }

  if (pages.some((page) => page < 1 || page > totalPages)) {
    throw new Error(
      `Page numbers must be between 1 and ${totalPages}.`
    );
  }

  if (pages.length !== totalPages) {
    throw new Error(
      `Enter all ${totalPages} pages exactly once.`
    );
  }

  if (new Set(pages).size !== totalPages) {
    throw new Error(
      "Duplicate page numbers are not allowed. Each page must appear exactly once."
    );
  }

  return pages;
}

export function ReorderPdfPagesTool({
  file,
}: ReorderPdfPagesToolProps) {
  const [pageOrder, setPageOrder] = useState("");
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function checkPageCount() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setChecking(true);
    setError("");
    setSuccess("");

    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const count = pdf.getPageCount();

      if (count < 1) {
        throw new Error("This PDF does not contain any pages.");
      }

      setTotalPages(count);
      setPageOrder(
        Array.from({ length: count }, (_, index) => index + 1).join(", ")
      );
    } catch (err) {
      setError(
        err instanceof Error &&
          err.message === "This PDF does not contain any pages."
          ? err.message
          : "Unable to read this PDF. It may be damaged or password-protected."
      );
    } finally {
      setChecking(false);
    }
  }

  async function reorderPages() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    let downloadUrl: string | null = null;

    try {
      const sourcePdf = await PDFDocument.load(
        await file.arrayBuffer()
      );

      const count = sourcePdf.getPageCount();

      if (count < 1) {
        throw new Error("This PDF does not contain any pages.");
      }

      const pages = parsePageOrder(pageOrder, count);

      // PDF page numbers start at 1; pdf-lib indexes start at 0.
      const pageIndexes = pages.map((page) => page - 1);

      const outputPdf = await PDFDocument.create();

      const copiedPages = await outputPdf.copyPages(
        sourcePdf,
        pageIndexes
      );

      copiedPages.forEach((page) => outputPdf.addPage(page));

      const outputBytes = await outputPdf.save();

      const blob = new Blob(
        [new Uint8Array(outputBytes)],
        { type: "application/pdf" }
      );

      downloadUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      const baseName =
        file.name.replace(/\.pdf$/i, "") || "document";

      link.href = downloadUrl;
      link.download = `${baseName}-reordered.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTotalPages(count);
      setSuccess(
        "PDF pages reordered successfully. Your new PDF has been downloaded."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while reordering the PDF pages."
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
          <ArrowDownUp size={24} aria-hidden="true" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Reorder PDF Pages
          </h2>

          <p className="mt-1 text-sm leading-6 text-gray-600">
            Arrange every page in your preferred order and download a new PDF.
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
            disabled={loading || checking}
            className="mt-4 text-sm font-semibold text-red-600 transition hover:text-red-700 disabled:opacity-50"
          >
            {checking ? "Checking pages..." : "Load page order"}
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
          htmlFor="reorder-page-input"
          className="block text-sm font-semibold text-gray-800"
        >
          New page order
        </label>

        <input
          id="reorder-page-input"
          type="text"
          value={pageOrder}
          onChange={(event) => {
            setPageOrder(event.target.value);
            setError("");
            setSuccess("");
          }}
          placeholder="e.g. 3, 1, 2, 5, 4"
          disabled={!file || loading || checking}
          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-400 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-gray-100"
        />

        <p className="mt-2 text-xs leading-5 text-gray-500">
          Enter every page number exactly once, separated by commas.
          For a five-page PDF, use 3, 1, 2, 5, 4 to place page 3 first.
          Load the page order above to populate the default order.
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
        onClick={reorderPages}
        disabled={!file || loading || checking}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            Reordering pages...
          </>
        ) : (
          <>
            <Download size={18} />
            Reorder & Download PDF
          </>
        )}
      </button>

      <p className="mt-4 text-xs leading-5 text-gray-500">
        Processing happens in your browser. Your original PDF remains unchanged.
      </p>
    </section>
  );
}

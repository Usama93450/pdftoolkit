
"use client";

import { useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { Scissors, Download, LoaderCircle, FileText } from "lucide-react";

type SplitPdfToolProps = {
  file: File | null;
};

type PageRange = {
  start: number;
  end: number;
};

function parseRanges(value: string, pageCount: number): PageRange[] {
  const input = value.trim();

  if (!input) {
    throw new Error(
      "Enter page ranges, for example: 1-3, 4-6, 7-10."
    );
  }

  const parts = input.split(",").map((part) => part.trim());
  const ranges: PageRange[] = [];
  const usedPages = new Set<number>();

  for (const part of parts) {
    if (!part) {
      throw new Error("Please check your page ranges.");
    }

    const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);

    if (!match) {
      throw new Error(
        `Invalid range "${part}". Use a format such as 1-3, 4-6.`
      );
    }

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;

    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 1 ||
      end < start ||
      end > pageCount
    ) {
      throw new Error(
        `Range "${part}" is invalid. Your PDF has ${pageCount} pages.`
      );
    }

    for (let page = start; page <= end; page++) {
      if (usedPages.has(page)) {
        throw new Error(
          `Page ${page} appears in more than one range.`
        );
      }

      usedPages.add(page);
    }

    ranges.push({ start, end });
  }

  return ranges;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Allow the browser time to begin the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(filename: string) {
  return filename
    .replace(/\.pdf$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .trim() || "document";
}

export function SplitPdfTool({ file }: SplitPdfToolProps) {
  const [mode, setMode] = useState<"ranges" | "individual">("ranges");
  const [rangesInput, setRangesInput] = useState("1-3, 4-6");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [loadingPages, setLoadingPages] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function readPageCount() {
      setError("");
      setSuccess("");
      setPageCount(null);

      if (!file) {
        return;
      }

      if (file.type !== "application/pdf" &&
          !file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please select a PDF file.");
        return;
      }

      setLoadingPages(true);

      try {
        const bytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);

        if (!cancelled) {
          setPageCount(pdf.getPageCount());
        }
      } catch {
        if (!cancelled) {
          setError(
            "This PDF could not be opened. It may be damaged or password-protected."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingPages(false);
        }
      }
    }

    void readPageCount();

    return () => {
      cancelled = true;
    };
  }, [file]);

  async function splitPdf() {
    if (!file || pageCount === null) {
      setError("Please select a valid PDF file first.");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      const sourceBytes = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(sourceBytes);
      const zip = new JSZip();
      const baseName = safeFilename(file.name);

      if (mode === "ranges") {
        const ranges = parseRanges(rangesInput, pageCount);

        for (let i = 0; i < ranges.length; i++) {
          const range = ranges[i];
          const outputPdf = await PDFDocument.create();

          const pageIndexes = Array.from(
            { length: range.end - range.start + 1 },
            (_, index) => range.start - 1 + index
          );

          const copiedPages = await outputPdf.copyPages(
            sourcePdf,
            pageIndexes
          );

          copiedPages.forEach((page) => outputPdf.addPage(page));

          const outputBytes = await outputPdf.save();

          const rangeLabel =
            range.start === range.end
              ? `page-${range.start}`
              : `pages-${range.start}-${range.end}`;

          zip.file(
            `${baseName}-${rangeLabel}.pdf`,
            new Uint8Array(outputBytes)
          );
        }
      } else {
        for (let index = 0; index < pageCount; index++) {
          const outputPdf = await PDFDocument.create();
          const [page] = await outputPdf.copyPages(sourcePdf, [index]);

          outputPdf.addPage(page);

          const outputBytes = await outputPdf.save();
          const pageNumber = String(index + 1).padStart(3, "0");

          zip.file(
            `${baseName}-page-${pageNumber}.pdf`,
            new Uint8Array(outputBytes)
          );
        }
      }

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 3 },
      });

      downloadBlob(zipBlob, `${baseName}-split.zip`);

      setSuccess(
        mode === "ranges"
          ? "Your page ranges have been split. Your ZIP download is ready."
          : "Every page has been saved as a separate PDF. Your ZIP download is ready."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while splitting the PDF."
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
          <Scissors className="h-6 w-6" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Split PDF
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Extract custom page ranges or save every page as a separate PDF.
          </p>
        </div>
      </div>

      {!file && (
        <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
          Upload a PDF using the existing upload area above to get started.
        </div>
      )}

      {file && (
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-gray-50 p-4">
          <FileText className="h-5 w-5 shrink-0 text-orange-600" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">
              {file.name}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {loadingPages
                ? "Reading PDF pages..."
                : pageCount !== null
                  ? `${pageCount} ${pageCount === 1 ? "page" : "pages"}`
                  : "Page count unavailable"}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6">
        <p className="mb-3 text-sm font-semibold text-gray-900">
          Choose splitting method
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setMode("ranges");
              setError("");
              setSuccess("");
            }}
            className={`rounded-xl border p-4 text-left transition ${
              mode === "ranges"
                ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                : "border-gray-200 hover:border-gray-400"
            }`}
          >
            <span className="block text-sm font-bold text-gray-900">
              Custom page ranges
            </span>
            <span className="mt-1 block text-sm text-gray-600">
              Choose which pages go into each PDF.
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("individual");
              setError("");
              setSuccess("");
            }}
            className={`rounded-xl border p-4 text-left transition ${
              mode === "individual"
                ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                : "border-gray-200 hover:border-gray-400"
            }`}
          >
            <span className="block text-sm font-bold text-gray-900">
              Every page separately
            </span>
            <span className="mt-1 block text-sm text-gray-600">
              Create one PDF for every page.
            </span>
          </button>
        </div>
      </div>

      {mode === "ranges" && (
        <div className="mt-5">
          <label
            htmlFor="split-ranges"
            className="mb-2 block text-sm font-semibold text-gray-900"
          >
            Page ranges
          </label>

          <input
            id="split-ranges"
            type="text"
            value={rangesInput}
            onChange={(event) => {
              setRangesInput(event.target.value);
              setError("");
              setSuccess("");
            }}
            placeholder="Example: 1-3, 4-6, 7-10"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />

          <p className="mt-2 text-xs leading-5 text-gray-500">
            Separate ranges with commas. For example, 1-3, 4-6, 7 creates
            three PDFs. Page numbers start at 1. Each page can only appear
            in one range.
          </p>
        </div>
      )}

      {mode === "individual" && pageCount !== null && (
        <p className="mt-5 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          This will create {pageCount} separate PDF files, one for each page,
          and package them into a single ZIP download.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {success}
        </p>
      )}

      <button
        type="button"
        onClick={splitPdf}
        disabled={
          !file ||
          pageCount === null ||
          loadingPages ||
          processing
        }
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {processing || loadingPages ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : (
          <Download className="h-5 w-5" />
        )}

        {loadingPages
          ? "Reading PDF..."
          : processing
            ? "Splitting PDF..."
            : "Split PDF and Download ZIP"}
      </button>

      <p className="mt-3 text-center text-xs leading-5 text-gray-500">
        Processing happens in your browser. Your PDF is not uploaded to a server
        by this component.
      </p>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  Download,
  FileText,
  LoaderCircle,
  ScanText,
} from "lucide-react";

// PDF.js needs a worker matching the installed pdfjs-dist version.
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

type PdfToTextToolProps = {
  file: File | null;
};

type ExtractedPage = {
  pageNumber: number;
  text: string;
};

export function PdfToTextTool({ file }: PdfToTextToolProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pages, setPages] = useState<ExtractedPage[]>([]);
  const [preview, setPreview] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  useEffect(() => {
    setProcessing(false);
    setError("");
    setSuccess("");
    setPages([]);
    setPreview("");
    setDownloadUrl("");
  }, [file]);

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  async function extractText() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");
    setPages([]);
    setPreview("");
    setDownloadUrl("");

    let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;

    try {
      const buffer = await file.arrayBuffer();

      loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
      });

      const pdf = await loadingTask.promise;
      const extractedPages: ExtractedPage[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();

        const pageText = content.items
          .map((item) => {
            if (!("str" in item)) {
              return "";
            }

            return item.str + (item.hasEOL ? "\n" : " ");
          })
          .join("")
          .replace(/[ \t]+\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        extractedPages.push({
          pageNumber,
          text: pageText,
        });

        page.cleanup();
      }

      await loadingTask.destroy();
      loadingTask = null;

      const fullText = extractedPages
        .map(
          (page) =>
            `--- Page ${page.pageNumber} ---\n\n${
              page.text || "[No selectable text found on this page.]"
            }`
        )
        .join("\n\n");

      setPages(extractedPages);
      setPreview(fullText);

      if (!fullText.trim() || extractedPages.every((page) => !page.text)) {
        setSuccess(
          "The PDF was read, but no selectable text was found. If it contains scanned pages, OCR is needed to recognize the text."
        );
      } else {
        setSuccess(
          `Text extracted from ${pdf.numPages} ${
            pdf.numPages === 1 ? "page" : "pages"
          }.`
        );
      }
    } catch (extractError) {
      console.error("PDF text extraction error:", extractError);

      setError(
        "Unable to extract text from this PDF. Check that the file is valid and not password-protected, then try again."
      );

      if (loadingTask) {
        try {
          await loadingTask.destroy();
        } catch {
          // Ignore cleanup errors.
        }
      }
    } finally {
      setProcessing(false);
    }
  }

  function downloadText() {
    if (!preview.trim()) {
      setError("There is no extracted text to download.");
      return;
    }

    const blob = new Blob([preview], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${file?.name.replace(/\.pdf$/i, "") || "document"}-text.txt`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  const characterCount = preview.length;
  const pageCount = pages.length;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <ScanText size={23} aria-hidden="true" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Extract PDF text
          </h3>

          <p className="mt-1 text-sm leading-6 text-gray-600">
            Extract selectable text from your PDF, preview it, and download
            the result as a plain text file.
          </p>
        </div>
      </div>

      {file && (
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
          <FileText
            size={21}
            className="shrink-0 text-red-600"
            aria-hidden="true"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800">
              {file.name}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={extractText}
        disabled={!file || processing}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {processing ? (
          <>
            <LoaderCircle
              size={19}
              className="animate-spin"
              aria-hidden="true"
            />
            Extracting text...
          </>
        ) : (
          <>
            <ScanText size={19} aria-hidden="true" />
            Extract Text
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

      {pages.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-500">Pages processed</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {pageCount}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-500">Characters extracted</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {characterCount.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {preview && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="pdf-text-preview"
              className="text-sm font-semibold text-gray-800"
            >
              Extracted text preview
            </label>

            <span className="text-xs text-gray-500">
              {characterCount.toLocaleString()} characters
            </span>
          </div>

          <textarea
            id="pdf-text-preview"
            readOnly
            value={preview}
            rows={12}
            className="w-full resize-y rounded-xl border border-gray-300 bg-gray-50 p-4 text-sm leading-6 text-gray-800 outline-none focus:border-red-500"
          />

          <button
            type="button"
            onClick={downloadText}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-800 transition hover:bg-gray-50"
          >
            <Download size={19} aria-hidden="true" />
            Download TXT file
          </button>
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-gray-500">
        Text extraction runs in your browser. Scanned PDFs containing only
        images require OCR, which is not included in this version.
      </p>
    </section>
  );
}

"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Hash,
} from "lucide-react";

type AddPageNumbersToolProps = {
  file: File | null;
};

type NumberPosition =
  | "bottom-center"
  | "bottom-left"
  | "bottom-right"
  | "top-center"
  | "top-left"
  | "top-right";

const positionOptions: { label: string; value: NumberPosition }[] = [
  { label: "Bottom center", value: "bottom-center" },
  { label: "Bottom left", value: "bottom-left" },
  { label: "Bottom right", value: "bottom-right" },
  { label: "Top center", value: "top-center" },
  { label: "Top left", value: "top-left" },
  { label: "Top right", value: "top-right" },
];

export function AddPageNumbersTool({
  file,
}: AddPageNumbersToolProps) {
  const [position, setPosition] =
    useState<NumberPosition>("bottom-center");
  const [startNumber, setStartNumber] = useState("1");
  const [fontSize, setFontSize] = useState("12");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function addPageNumbers() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    const firstNumber = Number(startNumber);
    const selectedFontSize = Number(fontSize);

    if (
      !startNumber.trim() ||
      !Number.isSafeInteger(firstNumber) ||
      firstNumber < 1
    ) {
      setError("Starting number must be a positive whole number.");
      return;
    }

    if (
      !fontSize.trim() ||
      !Number.isFinite(selectedFontSize) ||
      selectedFontSize < 6 ||
      selectedFontSize > 36
    ) {
      setError("Font size must be between 6 and 36.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    let downloadUrl: string | null = null;

    try {
      const sourceBytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(sourceBytes);
      const pages = pdf.getPages();

      if (pages.length === 0) {
        throw new Error("This PDF does not contain any pages.");
      }

      if (!Number.isSafeInteger(firstNumber + pages.length - 1)) {
        throw new Error(
          "The starting number is too large for this document."
        );
      }

      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const margin = 24;
      const textColor = rgb(0.2, 0.2, 0.2);

      pages.forEach((page, index) => {
        const pageNumber = String(firstNumber + index);
        const { width, height } = page.getSize();

        const textWidth = font.widthOfTextAtSize(
          pageNumber,
          selectedFontSize
        );

        let x = margin;
        let y = margin;

        if (position.endsWith("center")) {
          x = (width - textWidth) / 2;
        } else if (position.endsWith("right")) {
          x = width - margin - textWidth;
        }

        if (position.startsWith("top")) {
          y = height - margin - selectedFontSize;
        }

        if (width <= 2 * margin || height <= 2 * margin) {
          throw new Error(
            "One or more pages are too small to place page numbers safely."
          );
        }

        page.drawText(pageNumber, {
          x: Math.max(0, x),
          y: Math.max(0, y),
          size: selectedFontSize,
          font,
          color: textColor,
        });
      });

      const outputBytes = await pdf.save();
      const blob = new Blob([new Uint8Array(outputBytes)], {
        type: "application/pdf",
      });

      downloadUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      const baseName =
        file.name.replace(/\.pdf$/i, "") || "document";

      link.href = downloadUrl;
      link.download = `${baseName}-numbered.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setSuccess(
        `Successfully added page numbers to ${pages.length} ${
          pages.length === 1 ? "page" : "pages"
        }. Your numbered PDF has been downloaded.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while adding page numbers."
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
          <Hash size={24} aria-hidden="true" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Add Page Numbers
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Number every page of your PDF and download a new document.
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
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
          Select a PDF using the upload area above to get started.
        </div>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="page-number-position"
            className="block text-sm font-semibold text-gray-800"
          >
            Number position
          </label>
          <select
            id="page-number-position"
            value={position}
            onChange={(event) =>
              setPosition(event.target.value as NumberPosition)
            }
            disabled={!file || loading}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            {positionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="page-number-start"
            className="block text-sm font-semibold text-gray-800"
          >
            Starting number
          </label>
          <input
            id="page-number-start"
            type="number"
            min="1"
            step="1"
            value={startNumber}
            onChange={(event) => {
              setStartNumber(event.target.value);
              setError("");
              setSuccess("");
            }}
            disabled={!file || loading}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-gray-100"
          />
        </div>

        <div>
          <label
            htmlFor="page-number-font-size"
            className="block text-sm font-semibold text-gray-800"
          >
            Font size
          </label>
          <select
            id="page-number-font-size"
            value={fontSize}
            onChange={(event) => {
              setFontSize(event.target.value);
              setError("");
              setSuccess("");
            }}
            disabled={!file || loading}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value="8">8 pt — Small</option>
            <option value="10">10 pt</option>
            <option value="12">12 pt — Medium</option>
            <option value="14">14 pt</option>
            <option value="16">16 pt — Large</option>
            <option value="18">18 pt</option>
            <option value="24">24 pt</option>
            <option value="36">36 pt — Extra large</option>
          </select>
          <p className="mt-2 text-xs text-gray-500">
            Choose a font size between 6 and 36 points.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-semibold text-gray-800">
          Numbering preview
        </p>
        <p className="mt-1 text-sm text-gray-600">
          {`Your pages will be numbered ${startNumber || "1"}, ${
            Number(startNumber) + 1
          }, ${Number(startNumber) + 2}, and so on.`}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Numbers are placed approximately 24 points from the selected edge.
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
        onClick={addPageNumbers}
        disabled={!file || loading}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            Adding page numbers...
          </>
        ) : (
          <>
            <Download size={18} />
            Add Numbers & Download
          </>
        )}
      </button>

      <p className="mt-4 text-xs leading-5 text-gray-500">
        A new numbered PDF is created in your browser. Your original PDF
        is not modified.
      </p>
    </section>
  );
}

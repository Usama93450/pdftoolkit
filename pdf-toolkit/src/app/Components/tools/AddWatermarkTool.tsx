
"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import {
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Stamp,
} from "lucide-react";

type AddWatermarkToolProps = {
  file: File | null;
};

type WatermarkPosition =
  | "center"
  | "diagonal"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

const positionOptions: { label: string; value: WatermarkPosition }[] = [
  { label: "Center", value: "center" },
  { label: "Diagonal center", value: "diagonal" },
  { label: "Top left", value: "top-left" },
  { label: "Top right", value: "top-right" },
  { label: "Bottom left", value: "bottom-left" },
  { label: "Bottom right", value: "bottom-right" },
];

export function AddWatermarkTool({ file }: AddWatermarkToolProps) {
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [position, setPosition] =
    useState<WatermarkPosition>("diagonal");
  const [fontSize, setFontSize] = useState("48");
  const [opacity, setOpacity] = useState(0.25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function addWatermark() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    const text = watermarkText.trim();
    const size = Number(fontSize);

    if (!text) {
      setError("Enter the text you want to use as a watermark.");
      return;
    }

    if (text.length > 100) {
      setError("Watermark text must not exceed 100 characters.");
      return;
    }

    if (
      !fontSize.trim() ||
      !Number.isFinite(size) ||
      size < 10 ||
      size > 72
    ) {
      setError("Font size must be between 10 and 72.");
      return;
    }

    if (!Number.isFinite(opacity) || opacity < 0.05 || opacity > 1) {
      setError("Opacity must be between 5% and 100%.");
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

      const font = await pdf.embedFont(StandardFonts.HelveticaBold);
      const textWidth = font.widthOfTextAtSize(text, size);
      const textHeight = font.heightAtSize(size);

      pages.forEach((page) => {
        const { width, height } = page.getSize();
        let x = (width - textWidth) / 2;
        let y = (height - textHeight) / 2;
        let rotation = 0;

        switch (position) {
          case "diagonal":
            x = (width - textWidth) / 2;
            y = (height - textHeight) / 2;
            rotation = 45;
            break;

          case "top-left":
            x = 24;
            y = height - textHeight - 24;
            break;

          case "top-right":
            x = width - textWidth - 24;
            y = height - textHeight - 24;
            break;

          case "bottom-left":
            x = 24;
            y = 24;
            break;

          case "bottom-right":
            x = width - textWidth - 24;
            y = 24;
            break;

          case "center":
          default:
            break;
        }

        if (width <= 0 || height <= 0) {
          throw new Error("The PDF contains a page with invalid dimensions.");
        }

        // Keep edge-positioned watermarks inside the page where possible.
        if (position !== "center" && position !== "diagonal") {
          x = Math.max(8, Math.min(x, width - textWidth - 8));
          y = Math.max(8, Math.min(y, height - textHeight - 8));
        }

        page.drawText(text, {
          x,
          y,
          size,
          font,
          color: rgb(0.35, 0.35, 0.35),
          opacity,
          rotate: degrees(rotation),
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
      link.download = `${baseName}-watermarked.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setSuccess(
        `Watermark added successfully to ${pages.length} ${
          pages.length === 1 ? "page" : "pages"
        }. Your watermarked PDF has been downloaded.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while adding the watermark."
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
          <Stamp size={24} aria-hidden="true" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Add Watermark to PDF
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Add a text watermark to your PDF pages with adjustable position,
            size, and transparency.
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

      <div className="mt-6">
        <label
          htmlFor="watermark-text"
          className="block text-sm font-semibold text-gray-800"
        >
          Watermark text
        </label>
        <input
          id="watermark-text"
          type="text"
          value={watermarkText}
          maxLength={100}
          onChange={(event) => {
            setWatermarkText(event.target.value);
            setError("");
            setSuccess("");
          }}
          placeholder="e.g. CONFIDENTIAL"
          disabled={!file || loading}
          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-400 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-gray-100"
        />
        <p className="mt-2 text-xs text-gray-500">
          {watermarkText.length}/100 characters
        </p>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="watermark-position"
            className="block text-sm font-semibold text-gray-800"
          >
            Position
          </label>
          <select
            id="watermark-position"
            value={position}
            onChange={(event) => {
              setPosition(event.target.value as WatermarkPosition);
              setError("");
              setSuccess("");
            }}
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
            htmlFor="watermark-font-size"
            className="block text-sm font-semibold text-gray-800"
          >
            Font size
          </label>
          <select
            id="watermark-font-size"
            value={fontSize}
            onChange={(event) => {
              setFontSize(event.target.value);
              setError("");
              setSuccess("");
            }}
            disabled={!file || loading}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value="10">10 pt — Small</option>
            <option value="16">16 pt</option>
            <option value="24">24 pt</option>
            <option value="36">36 pt</option>
            <option value="48">48 pt — Large</option>
            <option value="60">60 pt</option>
            <option value="72">72 pt — Extra large</option>
          </select>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="watermark-opacity"
            className="text-sm font-semibold text-gray-800"
          >
            Watermark opacity
          </label>
          <span className="text-sm font-semibold text-gray-600">
            {Math.round(opacity * 100)}%
          </span>
        </div>
        <input
          id="watermark-opacity"
          type="range"
          min="0.05"
          max="1"
          step="0.05"
          value={opacity}
          onChange={(event) => {
            setOpacity(Number(event.target.value));
            setError("");
            setSuccess("");
          }}
          disabled={!file || loading}
          className="mt-3 w-full accent-red-600 disabled:cursor-not-allowed"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>More transparent</span>
          <span>More visible</span>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
        <p className="text-sm font-semibold text-gray-800">
          Watermark preview
        </p>
        <div className="mt-3 flex min-h-36 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white p-4">
          <span
            className="max-w-full break-words text-center font-bold text-gray-600"
            style={{
              fontSize: `${Math.min(Number(fontSize), 36)}px`,
              opacity,
              transform:
                position === "diagonal" ? "rotate(-35deg)" : "none",
            }}
          >
            {watermarkText.trim() || "YOUR WATERMARK"}
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          This is an approximate preview. The downloaded PDF uses the selected
          position, font size, and opacity.
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
        onClick={addWatermark}
        disabled={!file || loading}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            Adding watermark...
          </>
        ) : (
          <>
            <Download size={18} />
            Add Watermark & Download
          </>
        )}
      </button>

      <p className="mt-4 text-xs leading-5 text-gray-500">
        A new watermarked PDF is created in your browser. Your original PDF
        is not modified.
      </p>
    </section>
  );
}

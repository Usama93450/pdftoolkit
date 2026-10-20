
"use client";

import { useRef, useState } from "react";
import {
  FileImage,
  FileText,
  Upload,
  X,
  RotateCw,
  ArrowUp,
  ArrowDown,
  Download,
  CheckCircle2,
  LoaderCircle,
  ScanText,
  Image as ImageIcon,
  RotateCcw,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

type CleanupMode = "original" | "grayscale" | "black-white";
type PaperSize = "a4" | "letter" | "image";

type DocumentPage = {
  id: string;
  name: string;
  preview: string;
  rotation: number;
};

const MAX_FILES = 30;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error(`Could not read ${file.name}.`));
      }
    };

    reader.onerror = () => {
      reject(new Error(`Could not read ${file.name}.`));
    };

    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("An image could not be opened. Try another image."));
    image.src = src;
  });
}

async function preparePageImage(
  page: DocumentPage,
  cleanup: CleanupMode,
  threshold: number
): Promise<HTMLCanvasElement> {
  const image = await loadImage(page.preview);

  const rotation = ((page.rotation % 360) + 360) % 360;
  const sideways = rotation === 90 || rotation === 270;

  const canvas = document.createElement("canvas");
  canvas.width = sideways ? image.naturalHeight : image.naturalWidth;
  canvas.height = sideways ? image.naturalWidth : image.naturalHeight;

  const context = canvas.getContext("2d", {
    willReadFrequently: cleanup === "black-white",
  });

  if (!context) {
    throw new Error("Your browser could not process an image.");
  }

  // Keep the output background white.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((rotation * Math.PI) / 180);

  if (cleanup === "grayscale") {
    context.filter = "grayscale(100%) contrast(1.12)";
  }

  context.drawImage(
    image,
    -image.naturalWidth / 2,
    -image.naturalHeight / 2
  );

  context.filter = "none";
  context.setTransform(1, 0, 0, 1, 0, 0);

  if (cleanup === "black-white") {
    const imageData = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

    const pixels = imageData.data;

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];

      // Perceived brightness, suitable for basic document cleanup.
      const brightness =
        0.299 * red + 0.587 * green + 0.114 * blue;

      const value = brightness >= threshold ? 255 : 0;

      pixels[index] = value;
      pixels[index + 1] = value;
      pixels[index + 2] = value;
      pixels[index + 3] = 255;
    }

    context.putImageData(imageData, 0, 0);
  }

  return canvas;
}

export default function HandwrittenToPdfTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [cleanup, setCleanup] = useState<CleanupMode>("original");
  const [paperSize, setPaperSize] = useState<PaperSize>("a4");
  const [threshold, setThreshold] = useState(175);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleFiles(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!files.length) return;

    setError("");
    setSuccess("");
    setStatus("");

    const availableSlots = MAX_FILES - pages.length;

    if (availableSlots <= 0) {
      setError(`You can add up to ${MAX_FILES} pages per PDF.`);
      return;
    }

    const selectedFiles = files.slice(0, availableSlots);

    if (files.length > availableSlots) {
      setError(
        `Only ${availableSlots} more page(s) can be added. The limit is ${MAX_FILES} images.`
      );
    }

    const validFiles: File[] = [];

    for (const file of selectedFiles) {
      if (!file.type.startsWith("image/")) {
        setError((current) =>
          [current, `${file.name} is not a supported image file.`]
            .filter(Boolean)
            .join(" ")
        );
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError((current) =>
          [
            current,
            `${file.name} exceeds the 20 MB per-image limit.`,
          ]
            .filter(Boolean)
            .join(" ")
        );
        continue;
      }

      validFiles.push(file);
    }

    try {
      const importedPages = await Promise.all(
        validFiles.map(async (file, index) => ({
          id: `${Date.now()}-${index}-${Math.random()
            .toString(36)
            .slice(2)}`,
          name: file.name,
          preview: await readFileAsDataUrl(file),
          rotation: 0,
        }))
      );

      setPages((current) => [...current, ...importedPages]);
    } catch {
      setError(
        "Some images could not be loaded. Please try uploading them again."
      );
    }
  }

  function movePage(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= pages.length) return;

    setPages((current) => {
      const updated = [...current];
      [updated[index], updated[targetIndex]] = [
        updated[targetIndex],
        updated[index],
      ];
      return updated;
    });

    setSuccess("");
  }

  function rotatePage(id: string, direction: 1 | -1) {
    setPages((current) =>
      current.map((page) =>
        page.id === id
          ? {
              ...page,
              rotation: (page.rotation + direction * 90 + 360) % 360,
            }
          : page
      )
    );

    setSuccess("");
  }

  function removePage(id: string) {
    setPages((current) => current.filter((page) => page.id !== id));
    setSuccess("");
    setError("");
  }

  function resetTool() {
    setPages([]);
    setCleanup("original");
    setPaperSize("a4");
    setThreshold(175);
    setStatus("");
    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function createPdf() {
    if (pages.length === 0 || busy) return;

    setBusy(true);
    setError("");
    setSuccess("");
    setStatus("Preparing your document...");

    try {
      const pdf = await PDFDocument.create();

      for (let index = 0; index < pages.length; index += 1) {
        setStatus(
          `Processing page ${index + 1} of ${pages.length}...`
        );

        const canvas = await preparePageImage(
          pages[index],
          cleanup,
          threshold
        );

        const jpegData = canvas.toDataURL("image/jpeg", 0.94);
        const jpegBytes = await fetch(jpegData).then((response) =>
          response.arrayBuffer()
        );

        const embeddedImage = await pdf.embedJpg(jpegBytes);

        let pageWidth: number;
        let pageHeight: number;

        if (paperSize === "image") {
          // Create a page that follows the processed image's proportions.
          const scale = Math.min(
            0.75,
            1440 / Math.max(canvas.width, canvas.height)
          );

          pageWidth = Math.max(1, canvas.width * scale);
          pageHeight = Math.max(1, canvas.height * scale);
        } else {
          const baseSize =
            paperSize === "a4"
              ? { width: 595.28, height: 841.89 }
              : { width: 612, height: 792 };

          const landscape = canvas.width > canvas.height;

          pageWidth = landscape
            ? baseSize.height
            : baseSize.width;

          pageHeight = landscape
            ? baseSize.width
            : baseSize.height;
        }

        const pdfPage = pdf.addPage([pageWidth, pageHeight]);

        const margin = paperSize === "image" ? 0 : 24;
        const availableWidth = pageWidth - margin * 2;
        const availableHeight = pageHeight - margin * 2;

        const scale = Math.min(
          availableWidth / embeddedImage.width,
          availableHeight / embeddedImage.height
        );

        const imageWidth = embeddedImage.width * scale;
        const imageHeight = embeddedImage.height * scale;

        pdfPage.drawImage(embeddedImage, {
          x: (pageWidth - imageWidth) / 2,
          y: (pageHeight - imageHeight) / 2,
          width: imageWidth,
          height: imageHeight,
        });
      }

      setStatus("Finalizing your PDF...");

      const pdfBytes = await pdf.save();
      const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
      new Uint8Array(pdfBuffer).set(pdfBytes);
      const blob = new Blob([pdfBuffer], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "handwritten-document.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      setStatus("");
      setSuccess(
        `Your PDF is ready! ${pages.length} page(s) were converted successfully.`
      );
    } catch (caughtError) {
      console.error("Handwritten document conversion failed:", caughtError);

      setStatus("");
      setError(
        "The PDF could not be created. Try a smaller image or upload the image again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7">
      {/* Tool header */}
      <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-red-50 blur-3xl"
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/20">
            <FileImage size={31} strokeWidth={1.7} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-red-700">
                Document converter
              </span>
              <span className="text-xs text-gray-500">
                Browser-based processing
              </span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
              Handwritten Document to PDF
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
              Turn photos of handwritten notes, assignments, letters,
              and scanned pages into a single PDF. Arrange, rotate,
              and clean up your pages before exporting.
            </p>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-gray-100 pt-5 text-xs text-gray-500 sm:text-sm">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-red-600" />
            Up to {MAX_FILES} images
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-red-600" />
            Three cleanup modes
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-red-600" />
            No account required by this tool
          </span>
        </div>
      </div>

      {/* Upload area */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Upload your handwritten pages
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose photos or scans in the order you want to add them.
            </p>
          </div>

          {pages.length > 0 && (
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
              <FileText size={14} />
              {pages.length} / {MAX_FILES} pages
            </span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="hidden"
          id="handwritten-pdf-upload"
        />

        <label
          htmlFor="handwritten-pdf-upload"
          className="group flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/70 px-5 py-8 text-center transition hover:border-red-400 hover:bg-red-50/40 sm:min-h-56"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-white text-red-600 shadow-sm transition group-hover:border-red-200 group-hover:shadow-md">
            <Upload size={25} />
          </span>

          <span className="mt-4 text-base font-bold text-gray-900">
            Click to upload handwritten pages
          </span>

          <span className="mt-2 text-sm leading-6 text-gray-500">
            Select multiple images · JPG, PNG, WebP and other
            browser-supported image formats
          </span>

          <span className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition group-hover:bg-red-700">
            Choose images
          </span>
        </label>

        <p className="mt-3 text-xs leading-5 text-gray-500">
          Maximum 20 MB per image. For the clearest results, photograph
          each page in good lighting and keep the paper flat.
        </p>
      </div>

      {/* Page preview and order */}
      {pages.length > 0 && (
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Your document pages
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Adjust the order and orientation before exporting.
              </p>
            </div>

            <button
              type="button"
              onClick={resetTool}
              disabled={busy}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-semibold text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
            >
              <RotateCcw size={15} />
              Clear all
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {pages.map((page, index) => (
              <article
                key={page.id}
                className="group min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-red-200 hover:shadow-md"
              >
                <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gray-100 p-3 sm:h-56">
                  <img
                    src={page.preview}
                    alt={`Preview of ${page.name}`}
                    className="max-h-full max-w-full rounded-sm object-contain shadow-sm transition duration-200"
                    style={{
                      transform: `rotate(${page.rotation}deg)`,
                    }}
                  />

                  <span className="absolute left-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-lg bg-gray-950/80 px-2 text-xs font-bold text-white">
                    {index + 1}
                  </span>

                  <button
                    type="button"
                    onClick={() => removePage(page.id)}
                    disabled={busy}
                    aria-label={`Remove ${page.name}`}
                    title="Remove page"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-3">
                  <p
                    className="truncate text-xs font-semibold text-gray-800"
                    title={page.name}
                  >
                    {page.name}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-1">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => movePage(index, -1)}
                        disabled={busy || index === 0}
                        aria-label={`Move ${page.name} up`}
                        title="Move earlier"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowUp size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => movePage(index, 1)}
                        disabled={busy || index === pages.length - 1}
                        aria-label={`Move ${page.name} down`}
                        title="Move later"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowDown size={15} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => rotatePage(page.id, 1)}
                      disabled={busy}
                      aria-label={`Rotate ${page.name} clockwise`}
                      title="Rotate clockwise"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <RotateCw size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Document settings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <ScanText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Image cleanup</h3>
              <p className="text-sm text-gray-500">
                Choose how your handwriting should look.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(
              [
                {
                  value: "original",
                  title: "Original",
                  description: "Keep the original colors",
                },
                {
                  value: "grayscale",
                  title: "Grayscale",
                  description: "Neutral black and gray",
                },
                {
                  value: "black-white",
                  title: "Black & White",
                  description: "High-contrast document",
                },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setCleanup(option.value);
                  setSuccess("");
                }}
                className={`rounded-xl border p-3 text-left transition ${
                  cleanup === option.value
                    ? "border-red-500 bg-red-50 ring-2 ring-red-100"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-gray-900">
                    {option.title}
                  </span>
                  {cleanup === option.value && (
                    <CheckCircle2
                      size={16}
                      className="shrink-0 text-red-600"
                    />
                  )}
                </span>
                <span className="mt-1 block text-xs leading-5 text-gray-500">
                  {option.description}
                </span>
              </button>
            ))}
          </div>

          {cleanup === "black-white" && (
            <div className="mt-5 rounded-xl bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="document-threshold"
                  className="text-sm font-semibold text-gray-800"
                >
                  Black & white threshold
                </label>
                <span className="text-sm font-bold tabular-nums text-red-700">
                  {threshold}
                </span>
              </div>

              <input
                id="document-threshold"
                type="range"
                min="80"
                max="230"
                step="5"
                value={threshold}
                onChange={(event) =>
                  setThreshold(Number(event.target.value))
                }
                className="mt-4 w-full accent-red-600"
              />

              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>Darker result</span>
                <span>Lighter result</span>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs leading-5 text-gray-500">
            Tip: Black & White works best on clear handwriting against
            light paper. If faint strokes disappear, try Grayscale or
            lower the threshold.
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <ImageIcon size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">PDF page size</h3>
              <p className="text-sm text-gray-500">
                Choose the page dimensions for your document.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {(
              [
                {
                  value: "a4",
                  title: "A4",
                  description: "Standard document size",
                },
                {
                  value: "letter",
                  title: "US Letter",
                  description: "Common US document size",
                },
                {
                  value: "image",
                  title: "Fit to image",
                  description: "Match each page to its image proportions",
                },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setPaperSize(option.value);
                  setSuccess("");
                }}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                  paperSize === option.value
                    ? "border-red-500 bg-red-50/70 ring-2 ring-red-100"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    paperSize === option.value
                      ? "border-red-600"
                      : "border-gray-300"
                  }`}
                >
                  {paperSize === option.value && (
                    <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-gray-900">
                    {option.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-gray-500">
                    {option.description}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <FileText
                size={18}
                className="mt-0.5 shrink-0 text-gray-500"
              />
              <p className="text-xs leading-5 text-gray-600">
                Pages will be exported in the order shown above.
                Images are fitted inside standard page margins when
                using A4 or US Letter.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status and errors */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm leading-6 text-green-800"
        >
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Export */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Your PDF is almost ready
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-gray-500">
              {pages.length > 0
                ? `${pages.length} page(s) selected. Your handwritten pages will be combined into one PDF.`
                : "Upload one or more handwritten pages to get started."}
            </p>
          </div>

          <button
            type="button"
            onClick={createPdf}
            disabled={pages.length === 0 || busy}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2.5 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/15 transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
          >
            {busy ? (
              <LoaderCircle size={19} className="animate-spin" />
            ) : (
              <Download size={19} />
            )}
            {busy ? "Creating PDF..." : "Convert to PDF"}
          </button>
        </div>

        {busy && (
          <div
            role="status"
            className="mt-5 rounded-xl bg-gray-50 p-4"
          >
            <div className="flex items-center gap-3">
              <LoaderCircle
                size={18}
                className="animate-spin text-red-600"
              />
              <p className="text-sm font-medium text-gray-700">
                {status}
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-red-600" />
            </div>
          </div>
        )}

        <p className="mt-4 text-xs leading-5 text-gray-500">
          Your images are processed in your browser by this tool.
          The resulting PDF contains image pages, so the handwriting
          is not searchable or editable text.
        </p>
      </div>
    </div>
  );
}

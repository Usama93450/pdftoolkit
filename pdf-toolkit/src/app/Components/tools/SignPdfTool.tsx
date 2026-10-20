
"use client";

import { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  Download,
  Eraser,
  FileSignature,
  ImagePlus,
  LoaderCircle,
  PenLine,
  Type,
  Upload,
} from "lucide-react";

type SignPdfToolProps = {
  file: File | null;
};

type SignatureMode = "draw" | "type" | "upload";

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 180;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];

  if (!base64) {
    throw new Error("The signature image could not be read.");
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function imageFileToPng(file: File): Promise<string> {
  const sourceUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to read the signature image."));
      }
    };

    reader.onerror = () =>
      reject(new Error("Unable to read the signature image."));

    reader.readAsDataURL(file);
  });

  return new Promise<string>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Unable to process the signature image."));
          return;
        }

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);

        resolve(canvas.toDataURL("image/png"));
      } catch {
        reject(new Error("Unable to convert the signature image to PNG."));
      }
    };

    image.onerror = () =>
      reject(new Error("This signature image format is not supported."));

    image.src = sourceUrl;
  });
}

export function SignPdfTool({ file }: SignPdfToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasDrawingRef = useRef(false);

  const [mode, setMode] = useState<SignatureMode>("draw");
  const [typedSignature, setTypedSignature] = useState("");
  const [uploadedSignature, setUploadedSignature] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [leftPercent, setLeftPercent] = useState(55);
  const [bottomPercent, setBottomPercent] = useState(8);
  const [widthPercent, setWidthPercent] = useState(25);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [outputSize, setOutputSize] = useState<number | null>(null);

  function clearCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    hasDrawingRef.current = false;
    setSignatureDataUrl("");
  }

  function drawTypedSignature(value: string) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (!value.trim()) {
      setSignatureDataUrl("");
      return;
    }

    context.fillStyle = "#111827";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "italic 64px cursive";

    // Reduce the font size for longer signatures.
    let fontSize = 64;

    while (
      fontSize > 24 &&
      context.measureText(value).width > canvas.width - 40
    ) {
      fontSize -= 2;
      context.font = `italic ${fontSize}px cursive`;
    }

    context.fillText(value, canvas.width / 2, canvas.height / 2);

    setSignatureDataUrl(canvas.toDataURL("image/png"));
  }

  useEffect(() => {
    if (mode === "type") {
      drawTypedSignature(typedSignature);
    } else if (mode === "upload") {
      setSignatureDataUrl(uploadedSignature);
    }
    // The canvas ref is stable; this effect synchronizes the selected mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, typedSignature, uploadedSignature]);

  useEffect(() => {
    let cancelled = false;

    setPageCount(0);
    setPageNumber(1);
    setError("");
    setSuccess("");
    setOutputSize(null);

    setDownloadUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      return "";
    });

    if (!file) return;

    async function readPageCount() {
      try {
        const bytes = new Uint8Array(await file!.arrayBuffer());
        const pdf = await PDFDocument.load(bytes);

        if (!cancelled) {
          setPageCount(pdf.getPageCount());
        }
      } catch {
        if (!cancelled) {
          setError("Unable to read this PDF. Please select a valid PDF file.");
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

  function canvasPoint(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;

    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function handlePointerDown(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    if (mode !== "draw") return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);

    const point = canvasPoint(event);

    drawingRef.current = true;
    hasDrawingRef.current = true;

    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineWidth = 3.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111827";
    context.lineTo(point.x + 0.1, point.y + 0.1);
    context.stroke();
  }

  function handlePointerMove(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    if (mode !== "draw" || !drawingRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    event.preventDefault();

    const point = canvasPoint(event);

    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function handlePointerUp(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    if (!drawingRef.current) return;

    drawingRef.current = false;

    const canvas = canvasRef.current;

    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    if (mode === "draw" && hasDrawingRef.current && canvas) {
      setSignatureDataUrl(canvas.toDataURL("image/png"));
    }
  }

  async function handleSignatureUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const uploadedFile = event.target.files?.[0];

    if (!uploadedFile) return;

    setError("");

    try {
      if (!uploadedFile.type.startsWith("image/")) {
        throw new Error("Please upload an image file for your signature.");
      }

      const png = await imageFileToPng(uploadedFile);

      setUploadedSignature(png);
      setMode("upload");
      setSignatureDataUrl(png);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to load the signature image."
      );
    } finally {
      event.target.value = "";
    }
  }

  async function signPdf() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    if (!signatureDataUrl) {
      setError("Please draw, type, or upload a signature first.");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      const pdfBytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await PDFDocument.load(pdfBytes);
      const pages = pdf.getPages();

      if (pageNumber < 1 || pageNumber > pages.length) {
        throw new Error("Please choose a valid page number.");
      }

      const signatureBytes = dataUrlToBytes(signatureDataUrl);
      const signatureImage = await pdf.embedPng(signatureBytes);
      const page = pages[pageNumber - 1];
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();

      const signatureWidth = Math.min(
        pageWidth * (widthPercent / 100),
        pageWidth
      );

      const signatureHeight =
        signatureWidth * (signatureImage.height / signatureImage.width);

      if (
        signatureHeight > pageHeight ||
        !Number.isFinite(signatureHeight) ||
        signatureHeight <= 0
      ) {
        throw new Error(
          "The signature is too tall for this page. Reduce its width or upload a shorter signature."
        );
      }

      // Position percentages are measured across the remaining available space.
      const x = (pageWidth - signatureWidth) * (leftPercent / 100);
      const y = (pageHeight - signatureHeight) * (bottomPercent / 100);

      page.drawImage(signatureImage, {
        x,
        y,
        width: signatureWidth,
        height: signatureHeight,
        opacity: 1,
      });

      const outputBytes = await pdf.save();
      const blob = new Blob([outputBytes as BlobPart], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);

      setDownloadUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return url;
      });

      setOutputSize(blob.size);
      setSuccess(
        `Signature added to page ${pageNumber}. All other pages have been preserved.`
      );
    } catch (signError) {
      console.error("Sign PDF error:", signError);

      setError(
        signError instanceof Error
          ? signError.message
          : "Unable to sign this PDF. Please try another file."
      );
    } finally {
      setProcessing(false);
    }
  }

  function downloadSignedPdf() {
    if (!downloadUrl) return;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "signed-document.pdf";

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  const availableWidth = 100 - widthPercent;

  return (
    <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <FileSignature size={23} aria-hidden="true" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sign PDF</h3>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Create or upload a signature, position it on a page, and download
            your signed PDF.
          </p>
        </div>
      </div>

      {file && (
        <div className="mt-5 rounded-xl bg-gray-50 p-4">
          <p className="truncate text-sm font-semibold text-gray-800">
            {file.name}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {formatBytes(file.size)}
            {pageCount > 0 ? ` · ${pageCount} pages` : ""}
          </p>
        </div>
      )}

      <div className="mt-6">
        <h4 className="font-semibold text-gray-900">1. Create your signature</h4>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setMode("draw")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium ${
              mode === "draw"
                ? "border-red-600 bg-red-50 text-red-700"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <PenLine size={17} aria-hidden="true" />
            Draw
          </button>

          <button
            type="button"
            onClick={() => setMode("type")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium ${
              mode === "type"
                ? "border-red-600 bg-red-50 text-red-700"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Type size={17} aria-hidden="true" />
            Type
          </button>

          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium ${
              mode === "upload"
                ? "border-red-600 bg-red-50 text-red-700"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <ImagePlus size={17} aria-hidden="true" />
            Upload
          </button>
        </div>

        {mode === "type" && (
          <div className="mt-4">
            <label
              htmlFor="typed-signature"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Type your name
            </label>
            <input
              id="typed-signature"
              type="text"
              maxLength={80}
              value={typedSignature}
              onChange={(event) => setTypedSignature(event.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
            <p className="mt-2 text-xs text-gray-500">
              Your browser&apos;s cursive font is used to create the signature.
            </p>
          </div>
        )}

        {mode === "upload" && (
          <div className="mt-4">
            <label
              htmlFor="signature-image"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Upload size={18} aria-hidden="true" />
              Choose signature image
            </label>
            <input
              id="signature-image"
              type="file"
              accept="image/*"
              onChange={handleSignatureUpload}
              className="sr-only"
            />
            <p className="mt-2 text-xs text-gray-500">
              Transparent PNG images are recommended for the cleanest result.
            </p>
          </div>
        )}

        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
          <div className="flex items-center justify-between gap-3 bg-gray-50 px-4 py-3">
            <p className="text-sm font-medium text-gray-700">
              {mode === "draw"
                ? "Draw in the area below"
                : mode === "type"
                  ? "Typed signature preview"
                  : "Uploaded signature preview"}
            </p>

            {mode === "draw" && (
              <button
                type="button"
                onClick={clearCanvas}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600"
              >
                <Eraser size={16} aria-hidden="true" />
                Clear
              </button>
            )}
          </div>

          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            aria-label="Signature drawing area"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`block h-auto w-full touch-none bg-white ${
              mode === "draw" ? "cursor-crosshair" : "hidden"
            }`}
          />

          {mode !== "draw" && signatureDataUrl && (
            <div className="flex min-h-36 items-center justify-center bg-white p-4">
              <img
                src={signatureDataUrl}
                alt="Signature preview"
                className="max-h-36 max-w-full object-contain"
              />
            </div>
          )}

          {mode !== "draw" && !signatureDataUrl && (
            <div className="flex min-h-36 items-center justify-center bg-white p-4 text-sm text-gray-400">
              {mode === "type"
                ? "Type your name above to preview it."
                : "Upload an image to preview your signature."}
            </div>
          )}
        </div>
      </div>

      <div className="mt-7">
        <h4 className="font-semibold text-gray-900">2. Position your signature</h4>
        <p className="mt-1 text-sm text-gray-500">
          Choose a page and adjust the position and width before applying it.
        </p>

        <div className="mt-4">
          <label
            htmlFor="signature-page"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            PDF page number
          </label>
          <input
            id="signature-page"
            type="number"
            min={1}
            max={Math.max(pageCount, 1)}
            value={pageNumber}
            onChange={(event) => {
              const value = Number(event.target.value);
              setPageNumber(
                Number.isFinite(value)
                  ? Math.min(Math.max(1, Math.floor(value)), Math.max(pageCount, 1))
                  : 1
              );
            }}
            disabled={!pageCount}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-red-500 disabled:bg-gray-100"
          />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="signature-left"
              className="text-sm font-medium text-gray-700"
            >
              Horizontal position
            </label>
            <span className="text-sm text-gray-500">{leftPercent}%</span>
          </div>
          <input
            id="signature-left"
            type="range"
            min={0}
            max={100}
            value={leftPercent}
            onChange={(event) => setLeftPercent(Number(event.target.value))}
            className="mt-2 w-full accent-red-600"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>Left</span>
            <span>Right</span>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="signature-bottom"
              className="text-sm font-medium text-gray-700"
            >
              Vertical position
            </label>
            <span className="text-sm text-gray-500">{bottomPercent}%</span>
          </div>
          <input
            id="signature-bottom"
            type="range"
            min={0}
            max={100}
            value={bottomPercent}
            onChange={(event) => setBottomPercent(Number(event.target.value))}
            className="mt-2 w-full accent-red-600"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>Bottom</span>
            <span>Top</span>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="signature-width"
              className="text-sm font-medium text-gray-700"
            >
              Signature width
            </label>
            <span className="text-sm text-gray-500">{widthPercent}%</span>
          </div>
          <input
            id="signature-width"
            type="range"
            min={10}
            max={60}
            value={widthPercent}
            onChange={(event) => setWidthPercent(Number(event.target.value))}
            className="mt-2 w-full accent-red-600"
          />
          <p className="mt-1 text-xs text-gray-500">
            Width is relative to the PDF page; the signature&apos;s proportions
            are preserved.
          </p>
        </div>

        {signatureDataUrl && (
          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="mb-3 text-sm font-medium text-gray-700">
              Approximate placement preview
            </p>

            <div className="relative mx-auto aspect-[0.707] w-full max-w-64 overflow-hidden border border-gray-300 bg-white shadow-sm">
              <div
                className="absolute flex items-end justify-center overflow-hidden"
                style={{
                  left: `${(leftPercent / 100) * availableWidth}%`,
                  bottom: `${bottomPercent * 0.75}%`,
                  width: `${widthPercent}%`,
                  height: "auto",
                  aspectRatio: "3 / 1",
                }}
              >
                <img
                  src={signatureDataUrl}
                  alt="Signature placement"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              This is a placement guide, not a live preview of the actual PDF.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={signPdf}
        disabled={!file || !signatureDataUrl || processing || !pageCount}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {processing ? (
          <>
            <LoaderCircle
              size={19}
              className="animate-spin"
              aria-hidden="true"
            />
            Signing PDF...
          </>
        ) : (
          <>
            <FileSignature size={19} aria-hidden="true" />
            Apply Signature to PDF
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
        <div
          role="status"
          className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          <p className="font-semibold">{success}</p>
          {outputSize !== null && (
            <p className="mt-1">Signed PDF size: {formatBytes(outputSize)}</p>
          )}
        </div>
      )}

      {downloadUrl && (
        <button
          type="button"
          onClick={downloadSignedPdf}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-800 transition hover:bg-gray-50"
        >
          <Download size={19} aria-hidden="true" />
          Download Signed PDF
        </button>
      )}

      <p className="mt-4 text-xs leading-5 text-gray-500">
        Your PDF is processed in your browser. This tool inserts a signature
        image; it does not create a certificate-backed digital signature or
        independently verify the signer&apos;s identity.
      </p>
    </section>
  );
}

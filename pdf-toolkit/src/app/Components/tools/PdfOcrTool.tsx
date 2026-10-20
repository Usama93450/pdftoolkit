
"use client";

import { useRef, useState } from "react";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  ScanText,
  Upload,
  FileText,
  Download,
  LoaderCircle,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export function PdfOcrTool() {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("eng");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setError("");
    setStatus("");
    setExtractedText("");
    setProgress(0);

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setFile(null);
      setError("Please select a valid PDF file.");
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  }

  function removeFile() {
    if (isProcessing) return;

    setFile(null);
    setExtractedText("");
    setProgress(0);
    setStatus("");
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function runOcr() {
    if (!file || isProcessing) return;

    setIsProcessing(true);
    setProgress(0);
    setExtractedText("");
    setError("");
    setStatus("Loading PDF...");

    let worker: Awaited<ReturnType<typeof createWorker>> | null =
      null;

    let loadingTask:
      | ReturnType<typeof pdfjsLib.getDocument>
      | null = null;

    try {
      const arrayBuffer = await file.arrayBuffer();

      loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
      });

      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      if (totalPages < 1) {
        throw new Error("This PDF contains no pages.");
      }

      setStatus("Loading OCR engine and language data...");

      worker = await createWorker(language);

      let combinedText = "";

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        setStatus(`Recognizing text on page ${pageNumber} of ${totalPages}...`);

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Could not create a canvas for PDF rendering.");
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        try {
          await page.render({
            canvas,
            canvasContext: context,
            viewport,
          }).promise;

          const result = await worker.recognize(canvas);

          combinedText +=
            `\n--- Page ${pageNumber} ---\n\n` +
            result.data.text.trim() +
            "\n";

          setExtractedText(combinedText.trim());
          setProgress(Math.round((pageNumber / totalPages) * 100));
        } finally {
          canvas.width = 0;
          canvas.height = 0;
          page.cleanup();
        }
      }

      setExtractedText(combinedText.trim());
      setProgress(100);
      setStatus("OCR completed successfully.");
    } catch (err) {
      console.error("PDF OCR error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "OCR failed. Please try another PDF."
      );

      setStatus("");
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (workerError) {
          console.error("Could not terminate OCR worker:", workerError);
        }
      }

      if (loadingTask) {
        try {
          await loadingTask.destroy();
        } catch (pdfError) {
          console.error("Could not close PDF:", pdfError);
        }
      }

      setIsProcessing(false);
    }
  }

  function downloadText() {
    if (!extractedText) return;

    const blob = new Blob([extractedText], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const baseName = file?.name.replace(/\.pdf$/i, "") || "document";

    link.href = url;
    link.download = `${baseName}-ocr.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-xl bg-purple-100 p-3 text-purple-700">
            <ScanText size={26} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              PDF OCR
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Recognize text in scanned PDFs and image-based documents.
            </p>
          </div>
        </div>

        {!file ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex min-h-48 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center transition hover:border-purple-500 hover:bg-purple-50"
          >
            <Upload className="mb-3 text-purple-600" size={34} />

            <span className="font-semibold text-gray-900">
              Select a PDF file
            </span>

            <span className="mt-2 text-sm text-gray-500">
              Choose a scanned or image-only PDF
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <FileText className="shrink-0 text-purple-600" size={30} />

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-gray-900">
                {file.name}
              </p>
              <p className="text-sm text-gray-500">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>

            <button
              type="button"
              onClick={removeFile}
              disabled={isProcessing}
              aria-label="Remove PDF"
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-200 disabled:opacity-40"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="mt-5">
          <label
            htmlFor="ocr-language"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Recognition language
          </label>

          <select
            id="ocr-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            disabled={isProcessing}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
          >
            <option value="eng">English</option>
            <option value="urd">Urdu</option>
            <option value="ara">Arabic</option>
            <option value="fra">French</option>
            <option value="deu">German</option>
            <option value="spa">Spanish</option>
          </select>

          <p className="mt-2 text-xs text-gray-500">
            Language data may need to download the first time you use a
            language. Recognition quality depends on scan clarity.
          </p>
        </div>

        {isProcessing && (
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-gray-700">
                <LoaderCircle className="animate-spin" size={16} />
                {status}
              </span>
              <span className="font-semibold text-purple-700">
                {progress}%
              </span>
            </div>

            <div
              className="h-2 overflow-hidden rounded-full bg-gray-200"
              role="progressbar"
              aria-label="OCR progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="h-full rounded-full bg-purple-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <span>{error}</span>
          </div>
        )}

        {!isProcessing && status && !error && (
          <p className="mt-4 flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 size={18} />
            {status}
          </p>
        )}

        <button
          type="button"
          onClick={runOcr}
          disabled={!file || isProcessing}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <LoaderCircle className="animate-spin" size={19} />
              Recognizing Text...
            </>
          ) : (
            <>
              <ScanText size={19} />
              Start OCR
            </>
          )}
        </button>
      </div>

      {extractedText && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Recognized Text
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Review the extracted text before downloading.
              </p>
            </div>

            <button
              type="button"
              onClick={downloadText}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
            >
              <Download size={17} />
              Download TXT
            </button>
          </div>

          <textarea
            value={extractedText}
            onChange={(event) => setExtractedText(event.target.value)}
            rows={14}
            aria-label="Recognized OCR text"
            className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
          />
        </div>
      )}
    </div>
  );
}

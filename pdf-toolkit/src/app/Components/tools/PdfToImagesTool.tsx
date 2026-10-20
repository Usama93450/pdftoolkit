"use client";

import { useEffect, useState } from "react";
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  Download,
  FileImage,
  Images,
  LoaderCircle,
  Package,
} from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

type PdfPageImage = {
  pageNumber: number;
  blob: Blob;
  url: string;
};

type PdfToImagesToolProps = {
  file: File | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PdfToImagesTool({ file }: PdfToImagesToolProps) {
  const [pages, setPages] = useState<PdfPageImage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [zipProcessing, setZipProcessing] = useState(false);

  // Release generated preview URLs when results change or the component unmounts.
  useEffect(() => {
    return () => {
      pages.forEach((page) => URL.revokeObjectURL(page.url));
    };
  }, [pages]);

  // Clear results when the selected PDF changes.
  useEffect(() => {
    setPages([]);
    setError("");
    setSuccess("");
    setProgress("");
  }, [file]);

  async function convertPdfToImages() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a valid PDF file.");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");
    setProgress("Opening PDF...");

    const generatedPages: PdfPageImage[] = [];

    try {
      const data = new Uint8Array(await file.arrayBuffer());

      const loadingTask = pdfjsLib.getDocument({ data });
      const pdf = await loadingTask.promise;

      if (pdf.numPages < 1) {
        throw new Error("This PDF does not contain any pages.");
      }

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        setProgress(`Converting page ${pageNumber} of ${pdf.numPages}...`);

        const page = await pdf.getPage(pageNumber);

        // Scale controls the image resolution; 1.5 balances clarity and memory.
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Your browser could not create a canvas.");
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        await page.render({
          canvas,
          canvasContext: context,
          viewport,
        }).promise;

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (result) => {
              if (result) {
                resolve(result);
              } else {
                reject(
                  new Error(`Could not create an image for page ${pageNumber}.`)
                );
              }
            },
            "image/png"
          );
        });

        generatedPages.push({
          pageNumber,
          blob,
          url: URL.createObjectURL(blob),
        });

        // Release the canvas memory after exporting the page.
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }

      setPages(generatedPages);
      setSuccess(
        `Successfully converted ${generatedPages.length} ${
          generatedPages.length === 1 ? "page" : "pages"
        } into PNG images.`
      );
      setProgress("");
    } catch (conversionError) {
      generatedPages.forEach((page) => URL.revokeObjectURL(page.url));

      console.error("PDF to Images error:", conversionError);

      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "Unable to convert this PDF. Please try another file."
      );

      setProgress("");
    } finally {
      setProcessing(false);
    }
  }

  function downloadPage(page: PdfPageImage) {
    downloadBlob(page.blob, `page-${page.pageNumber}.png`);
  }

  async function downloadAllPages() {
    if (pages.length === 0) return;

    setZipProcessing(true);
    setError("");

    try {
      const zip = new JSZip();

      pages.forEach((page) => {
        zip.file(`page-${page.pageNumber}.png`, page.blob);
      });

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      downloadBlob(zipBlob, "pdf-pages.zip");
    } catch (zipError) {
      console.error("ZIP creation error:", zipError);

      setError(
        zipError instanceof Error
          ? zipError.message
          : "Unable to create the ZIP file."
      );
    } finally {
      setZipProcessing(false);
    }
  }

  const totalImageSize = pages.reduce(
    (total, page) => total + page.blob.size,
    0
  );

  return (
    <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <Images size={23} aria-hidden="true" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Convert PDF to Images
          </h3>

          <p className="mt-1 text-sm leading-6 text-gray-600">
            Convert every page of your PDF into a PNG image. Preview the
            results, download individual pages, or download them together as a
            ZIP file.
          </p>
        </div>
      </div>

      {file && (
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-gray-50 p-4">
          <FileImage
            size={22}
            className="shrink-0 text-red-600"
            aria-hidden="true"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800">
              {file.name}
            </p>
            <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={convertPdfToImages}
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
            Converting PDF...
          </>
        ) : (
          <>
            <Images size={19} aria-hidden="true" />
            Convert to PNG Images
          </>
        )}
      </button>

      {progress && (
        <p className="mt-3 text-center text-sm text-gray-600" role="status">
          {progress}
        </p>
      )}

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
          <p className="mt-1">
            Total image size: {formatBytes(totalImageSize)}
          </p>
        </div>
      )}

      {pages.length > 0 && (
        <div className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-semibold text-gray-900">Converted pages</h4>
              <p className="mt-1 text-sm text-gray-500">
                {pages.length} PNG {pages.length === 1 ? "image" : "images"}
              </p>
            </div>

            <button
              type="button"
              onClick={downloadAllPages}
              disabled={zipProcessing}
              className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {zipProcessing ? (
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Package size={18} aria-hidden="true" />
              )}
              {zipProcessing ? "Creating ZIP..." : "Download All as ZIP"}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {pages.map((page) => (
              <article
                key={page.pageNumber}
                className="overflow-hidden rounded-xl border border-gray-200"
              >
                <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-3">
                  <p className="text-sm font-semibold text-gray-800">
                    Page {page.pageNumber}
                  </p>

                  <button
                    type="button"
                    onClick={() => downloadPage(page)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                  >
                    <Download size={16} aria-hidden="true" />
                    Download PNG
                  </button>
                </div>

                <div className="bg-gray-100 p-3">
                  <img
                    src={page.url}
                    alt={`Preview of PDF page ${page.pageNumber}`}
                    className="mx-auto h-auto max-h-[480px] max-w-full rounded-md bg-white object-contain shadow-sm"
                  />
                </div>

                <p className="px-3 py-2 text-xs text-gray-500">
                  {formatBytes(page.blob.size)}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}

      <p className="mt-5 text-xs leading-5 text-gray-500">
        Pages are rendered in your browser at 1.5× scale. Very large PDFs may
        require significant memory. Text is exported as pixels in PNG images,
        not as editable text.
      </p>
    </section>
  );
}
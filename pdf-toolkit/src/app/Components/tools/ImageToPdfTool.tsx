"use client";

import { useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  Download,
  FileImage,
  FileCheck2,
  LoaderCircle,
  Images,
} from "lucide-react";

type ImageToPdfToolProps = {
  files: File[];
};

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN = 24;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function embedImage(
  pdf: PDFDocument,
  file: File
) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = file.type.toLowerCase();

  if (type === "image/jpeg" || type === "image/jpg") {
    return pdf.embedJpg(bytes);
  }

  if (type === "image/png") {
    return pdf.embedPng(bytes);
  }

  // Convert other browser-supported image formats to JPEG.
  // A white background prevents transparent pixels from becoming black.
  const bitmap = await createImageBitmap(file);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error(`Unable to process image: ${file.name}`);
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error(`Unable to convert image: ${file.name}`));
          }
        },
        "image/jpeg",
        0.92
      );
    });

    const convertedBytes = new Uint8Array(await blob.arrayBuffer());
    return await pdf.embedJpg(convertedBytes);
  } finally {
    bitmap.close();
  }
}

export function ImageToPdfTool({ files }: ImageToPdfToolProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [outputSize, setOutputSize] = useState<number | null>(null);

  useEffect(() => {
    setError("");
    setSuccess("");
    setOutputSize(null);

    setDownloadUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      return "";
    });
  }, [files]);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  async function convertToPdf() {
    if (files.length === 0) {
      setError("Please select at least one image.");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");
    setOutputSize(null);

    try {
      const pdf = await PDFDocument.create();

      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`${file.name} is not a supported image file.`);
        }

        const image = await embedImage(pdf, file);
        const imageWidth = image.width;
        const imageHeight = image.height;

        if (!imageWidth || !imageHeight) {
          throw new Error(`Unable to read the dimensions of ${file.name}.`);
        }

        // Use portrait or landscape A4 based on the image orientation.
        const isLandscape = imageWidth > imageHeight;
        const pageWidth = isLandscape ? A4_HEIGHT : A4_WIDTH;
        const pageHeight = isLandscape ? A4_WIDTH : A4_HEIGHT;

        const availableWidth = pageWidth - PAGE_MARGIN * 2;
        const availableHeight = pageHeight - PAGE_MARGIN * 2;

        // A single scale factor preserves the original aspect ratio.
        const scale = Math.min(
          availableWidth / imageWidth,
          availableHeight / imageHeight
        );

        const renderedWidth = imageWidth * scale;
        const renderedHeight = imageHeight * scale;

        const page = pdf.addPage([pageWidth, pageHeight]);

        page.drawImage(image, {
          x: (pageWidth - renderedWidth) / 2,
          y: (pageHeight - renderedHeight) / 2,
          width: renderedWidth,
          height: renderedHeight,
        });
      }

      const pdfBytes = await pdf.save();
      const pdfArrayBuffer = new ArrayBuffer(pdfBytes.byteLength);
      new Uint8Array(pdfArrayBuffer).set(pdfBytes);
      const blob = new Blob([pdfArrayBuffer], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);

      setDownloadUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return url;
      });

      setOutputSize(blob.size);
      setSuccess(
        `Successfully converted ${files.length} ${
          files.length === 1 ? "image" : "images"
        } into a ${files.length === 1 ? "one-page" : "multi-page"} PDF.`
      );
    } catch (conversionError) {
      console.error("Image to PDF error:", conversionError);

      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "Unable to convert these images. Please try different image files."
      );
    } finally {
      setProcessing(false);
    }
  }

  function downloadPdf() {
    if (!downloadUrl) return;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "images-document.pdf";

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <Images size={23} aria-hidden="true" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Convert images to PDF
          </h3>

          <p className="mt-1 text-sm leading-6 text-gray-600">
            Combine your selected images into one PDF. Each image gets its own
            page, with its proportions preserved.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-gray-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600">Selected images</span>
          <span className="text-sm font-semibold text-gray-900">
            {files.length}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600">Combined image size</span>
          <span className="text-sm font-semibold text-gray-900">
            {formatBytes(totalSize)}
          </span>
        </div>

        {outputSize !== null && (
          <>
            <div className="my-3 border-t border-gray-200" />

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-600">Output PDF size</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatBytes(outputSize)}
              </span>
            </div>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-3"
            >
              <FileImage
                size={20}
                className="shrink-0 text-red-600"
                aria-hidden="true"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatBytes(file.size)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={convertToPdf}
        disabled={files.length === 0 || processing}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {processing ? (
          <>
            <LoaderCircle
              size={19}
              className="animate-spin"
              aria-hidden="true"
            />
            Converting images...
          </>
        ) : (
          <>
            <FileCheck2 size={19} aria-hidden="true" />
            Convert to PDF
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

      {downloadUrl && (
        <button
          type="button"
          onClick={downloadPdf}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-800 transition hover:bg-gray-50"
        >
          <Download size={19} aria-hidden="true" />
          Download PDF
        </button>
      )}

      <p className="mt-4 text-xs leading-5 text-gray-500">
        Processing runs in your browser. Image formats must be supported by
        your browser; unsupported or damaged images may fail to convert.
      </p>
    </section>
  );
}
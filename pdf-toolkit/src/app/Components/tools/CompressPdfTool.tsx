"use client";

import { useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Download, FileCheck2, FileDown, LoaderCircle } from "lucide-react";

type CompressPdfToolProps = {
  file: File | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function CompressPdfTool({ file }: CompressPdfToolProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [downloadUrl, setDownloadUrl] = useState("");

  useEffect(() => {
    setError("");
    setSuccess("");
    setOriginalSize(null);
    setCompressedSize(null);

    setDownloadUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }

      return "";
    });
  }, [file]);

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  async function compressPDF() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");
    setOriginalSize(null);
    setCompressedSize(null);

    try {
      const originalBytes = await file.arrayBuffer();

      const pdfDocument = await PDFDocument.load(originalBytes);

      // Rewrite the PDF with object streams. This can reduce structural
      // overhead while preserving text and vector content where possible.
      const outputBytes = await pdfDocument.save({
        useObjectStreams: true,
      });

      const blobBytes = new Uint8Array(outputBytes.length);
      blobBytes.set(outputBytes);

      const outputBlob = new Blob([blobBytes.buffer], {
        type: "application/pdf",
      });

      const newDownloadUrl = URL.createObjectURL(outputBlob);

      setOriginalSize(file.size);
      setCompressedSize(outputBlob.size);

      setDownloadUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }

        return newDownloadUrl;
      });

      if (outputBlob.size < file.size) {
        const reduction = ((file.size - outputBlob.size) / file.size) * 100;

        setSuccess(
          `PDF optimized successfully. File size reduced by ${reduction.toFixed(1)}%.`
        );
      } else if (outputBlob.size === file.size) {
        setSuccess(
          "PDF processed successfully, but its file size did not change."
        );
      } else {
        setSuccess(
          "PDF processed successfully, but the output is larger than the original. You can still download it, or keep your original file."
        );
      }
    } catch (compressionError) {
      console.error("PDF compression error:", compressionError);

      setError(
        "Unable to process this PDF. It may be damaged, password-protected, or use features that this browser-based processor cannot handle."
      );
    } finally {
      setProcessing(false);
    }
  }

  function downloadPDF() {
    if (!downloadUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "optimized-document.pdf";

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  const sizeDifference =
    originalSize !== null && compressedSize !== null
      ? originalSize - compressedSize
      : null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <FileDown size={23} aria-hidden="true" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Optimize PDF
          </h3>

          <p className="mt-1 text-sm leading-6 text-gray-600">
            Rebuild the PDF to reduce structural overhead while preserving
            selectable text and vector content where possible.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-gray-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600">Original file size</span>
          <span className="text-sm font-semibold text-gray-900">
            {file ? formatBytes(file.size) : "—"}
          </span>
        </div>

        {originalSize !== null && compressedSize !== null && (
          <>
            <div className="my-3 border-t border-gray-200" />

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-600">Output file size</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatBytes(compressedSize)}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-4">
              <span className="text-sm text-gray-600">
                {sizeDifference !== null && sizeDifference > 0
                  ? "Space saved"
                  : sizeDifference === 0
                    ? "Size change"
                    : "Size increase"}
              </span>

              <span
                className={`text-sm font-semibold ${
                  sizeDifference !== null && sizeDifference > 0
                    ? "text-green-700"
                    : "text-gray-700"
                }`}
              >
                {sizeDifference !== null && sizeDifference > 0
                  ? formatBytes(sizeDifference)
                  : sizeDifference === 0
                    ? "No change"
                    : formatBytes(Math.abs(sizeDifference ?? 0))}
              </span>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={compressPDF}
        disabled={!file || processing}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {processing ? (
          <>
            <LoaderCircle size={19} className="animate-spin" aria-hidden="true" />
            Optimizing PDF...
          </>
        ) : (
          <>
            <FileCheck2 size={19} aria-hidden="true" />
            Optimize PDF
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
          onClick={downloadPDF}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-800 transition hover:bg-gray-50"
        >
          <Download size={19} aria-hidden="true" />
          Download optimized PDF
        </button>
      )}

      <p className="mt-4 text-xs leading-5 text-gray-500">
        Processing happens in your browser. This optimization does not
        rasterize pages or intentionally remove selectable text. It may not
        significantly reduce PDFs that contain large embedded images.
      </p>
    </section>
  );
}
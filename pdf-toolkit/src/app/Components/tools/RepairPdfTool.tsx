"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { AlertCircle, CheckCircle2, FileWarning, LoaderCircle, Wrench } from "lucide-react";

type RepairPdfToolProps = {
  file: File | null;
};

export function RepairPdfTool({ file }: RepairPdfToolProps) {
  const [isRepairing, setIsRepairing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info" | "">("");

  const handleRepair = async () => {
    if (!file) {
      setMessageType("error");
      setMessage("Please upload a PDF file first.");
      return;
    }

    setIsRepairing(true);
    setMessage("");
    setMessageType("");

    try {
      const inputBytes = new Uint8Array(await file.arrayBuffer());

      // pdf-lib can recover some structurally damaged PDFs when it can still
      // parse their objects. ignoreEncryption does not decrypt protected files.
      const sourcePdf = await PDFDocument.load(inputBytes, {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
        updateMetadata: false,
      });

      const pageCount = sourcePdf.getPageCount();
      if (pageCount === 0) {
        throw new Error("No recoverable pages were found in this PDF.");
      }

      // Rebuild the document by copying all readable pages into a fresh PDF.
      const repairedPdf = await PDFDocument.create();
      const copiedPages = await repairedPdf.copyPages(
        sourcePdf,
        sourcePdf.getPageIndices()
      );

      for (const page of copiedPages) {
        repairedPdf.addPage(page);
      }

      if (repairedPdf.getPageCount() === 0) {
        throw new Error("The document could be opened, but no pages could be recovered.");
      }

      const repairedBytes = await repairedPdf.save();
      const outputBuffer = new ArrayBuffer(repairedBytes.byteLength);
      new Uint8Array(outputBuffer).set(repairedBytes);
      const outputBlob = new Blob([outputBuffer], { type: "application/pdf" });
      const downloadUrl = URL.createObjectURL(outputBlob);
      const anchor = document.createElement("a");
      const baseName = file.name.replace(/\.pdf$/i, "") || "document";

      anchor.href = downloadUrl;
      anchor.download = `${baseName}-repaired.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);

      setMessageType("success");
      setMessage(
        `A rebuilt PDF was created with ${repairedPdf.getPageCount()} page(s). Please open and review the downloaded file to confirm its contents.`
      );
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";

      let helpfulMessage =
        "This PDF could not be repaired. It may be severely corrupted or contain unsupported features.";

      if (/encrypted|password/i.test(rawMessage)) {
        helpfulMessage =
          "This PDF appears to be password-protected or encrypted. Unlock it with the correct password first, then try again.";
      } else if (/header|pdf|parse|endobj|eof|invalid|object/i.test(rawMessage)) {
        helpfulMessage =
          "The PDF structure could not be read reliably. Try downloading the original file again or opening and re-saving it in a PDF reader.";
      } else if (/recoverable pages/i.test(rawMessage)) {
        helpfulMessage = rawMessage;
      }

      setMessageType("error");
      setMessage(helpfulMessage);
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
          <Wrench className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Repair PDF</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Attempt to rebuild a PDF that has minor structural damage. Your
            original file is not modified.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-2">
          <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <p className="text-sm leading-6 text-amber-900">
            Recovery is best-effort. Severely damaged, truncated, encrypted, or
            unsupported PDFs may not be recoverable. Always check the output
            before relying on it.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-800">Selected file</p>
        <p className="mt-1 break-all text-sm text-gray-600">
          {file ? file.name : "Upload a PDF using the uploader above."}
        </p>
        {file && (
          <p className="mt-1 text-xs text-gray-500">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleRepair}
        disabled={!file || isRepairing}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {isRepairing ? (
          <>
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Attempting repair...
          </>
        ) : (
          <>
            <Wrench className="h-5 w-5" />
            Repair and Download
          </>
        )}
      </button>

      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 flex items-start gap-2 rounded-xl border p-4 text-sm leading-6 ${
            messageType === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : messageType === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-gray-200 bg-gray-50 text-gray-700"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <p>{message}</p>
        </div>
      )}
    </section>
  );
}

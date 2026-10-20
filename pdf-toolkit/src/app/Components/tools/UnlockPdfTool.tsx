
"use client";

import { useState } from "react";
import { decryptPDF, isEncrypted } from "@pdfsmaller/pdf-decrypt";
import {
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UnlockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

type UnlockPdfToolProps = {
  file: File | null;
};

export function UnlockPdfTool({ file }: UnlockPdfToolProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function unlockPdf() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    if (!password) {
      setError("Enter the current PDF password.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    let downloadUrl: string | null = null;

    try {
      if (file.size === 0) {
        throw new Error("The selected file is empty.");
      }

      const pdfBytes = new Uint8Array(await file.arrayBuffer());

      // Detect encryption before attempting to decrypt.
      const encryptionInfo = await isEncrypted(pdfBytes);

      if (!encryptionInfo.encrypted) {
        throw new Error(
          "This PDF does not appear to be password-encrypted. No changes were made."
        );
      }

      // Requires a valid user or owner password.
      const decryptedBytes = await decryptPDF(pdfBytes, password);

      if (!(decryptedBytes instanceof Uint8Array) || decryptedBytes.length === 0) {
        throw new Error("The decrypted PDF output is empty or invalid.");
      }

      const blob = new Blob([new Uint8Array(decryptedBytes)], {
        type: "application/pdf",
      });

      downloadUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      const baseName =
        file.name.replace(/\.pdf$/i, "") || "document";

      link.href = downloadUrl;
      link.download = `${baseName}-unlocked.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setSuccess(
        "The PDF has been decrypted and your download has started. Open the downloaded file to confirm it no longer requires a password."
      );

      setPassword("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "";

      if (/incorrect password|invalid password|wrong password/i.test(message)) {
        setError(
          "The password is incorrect. Check it and try again."
        );
      } else if (/unsupported encryption/i.test(message)) {
        setError(
          "This PDF uses an encryption method that this tool does not support."
        );
      } else if (/not encrypted/i.test(message)) {
        setError(
          "This PDF is not password-encrypted. No changes were made."
        );
      } else {
        setError(
          message
            ? `Unable to unlock this PDF: ${message}`
            : "Something went wrong while unlocking the PDF."
        );
      }
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
          <UnlockKeyhole size={24} aria-hidden="true" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Unlock PDF
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Remove password encryption from a PDF when you know its current
            password.
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
          Select a password-protected PDF using the upload area above.
        </div>
      )}

      <div className="mt-6">
        <label
          htmlFor="unlock-pdf-password"
          className="block text-sm font-semibold text-gray-800"
        >
          Current PDF password
        </label>

        <div className="relative mt-2">
          <input
            id="unlock-pdf-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
              setSuccess("");
            }}
            autoComplete="current-password"
            placeholder="Enter the existing password"
            disabled={!file || loading}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-12 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-400 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-gray-100"
          />

          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            disabled={!file || loading}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 hover:text-gray-800 disabled:opacity-50"
          >
            {showPassword ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck
            className="mt-0.5 shrink-0 text-blue-700"
            size={21}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Your password is required
            </p>
            <p className="mt-1 text-sm leading-5 text-blue-800">
              This tool does not crack or bypass passwords. Use a password
              you know or are authorized to use. Decryption is performed in
              your browser.
            </p>
          </div>
        </div>
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
        onClick={unlockPdf}
        disabled={!file || loading}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            Unlocking PDF...
          </>
        ) : (
          <>
            <Download size={18} />
            Unlock PDF & Download
          </>
        )}
      </button>

      <p className="mt-4 text-xs leading-5 text-gray-500">
        Your original file remains unchanged. Keep the original in a safe
        place until you verify the unlocked copy.
      </p>
    </section>
  );
}

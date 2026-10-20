
"use client";

import { useState } from "react";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt";
import {
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

type ProtectPdfToolProps = {
  file: File | null;
};

export function ProtectPdfTool({ file }: ProtectPdfToolProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function protectPdf() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    if (password.length > 127) {
      setError("Password must not exceed 127 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
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

      if (
        file.type &&
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
      ) {
        throw new Error("Please select a valid PDF file.");
      }

      const sourceBytes = new Uint8Array(await file.arrayBuffer());

      // Encrypt the PDF with an opening password using AES-256.
      // The owner password is set to the same value for this simple workflow.
      const encryptedBytes = await encryptPDF(sourceBytes, password, {
        ownerPassword: password,
        algorithm: "AES-256",
        allowPrinting: true,
        allowModifying: true,
        allowCopying: true,
        allowAnnotating: true,
        allowFillingForms: true,
        allowExtraction: true,
        allowAssembly: true,
        allowHighQualityPrint: true,
      });

      const blob = new Blob(
        [new Uint8Array(encryptedBytes).buffer as ArrayBuffer],
        { type: "application/pdf" }
      );

      downloadUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      const baseName =
        file.name.replace(/\.pdf$/i, "") || "document";

      link.href = downloadUrl;
      link.download = `${baseName}-protected.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setSuccess(
        "Password protection has been applied and your PDF download has started. Open the downloaded file and verify that it asks for your password."
      );

      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? `Unable to protect this PDF: ${err.message}`
          : "Something went wrong while protecting the PDF."
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
          <LockKeyhole size={24} aria-hidden="true" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Protect PDF with Password
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Encrypt your PDF so a password is required to open it.
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
          htmlFor="protect-pdf-password"
          className="block text-sm font-semibold text-gray-800"
        >
          Password to open the PDF
        </label>

        <div className="relative mt-2">
          <input
            id="protect-pdf-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
              setSuccess("");
            }}
            autoComplete="new-password"
            maxLength={127}
            placeholder="Enter a strong password"
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

        <p className="mt-2 text-xs text-gray-500">
          Use at least 8 characters. A longer, unique password is recommended.
        </p>
      </div>

      <div className="mt-5">
        <label
          htmlFor="protect-pdf-confirm-password"
          className="block text-sm font-semibold text-gray-800"
        >
          Confirm password
        </label>

        <div className="relative mt-2">
          <input
            id="protect-pdf-confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setError("");
              setSuccess("");
            }}
            autoComplete="new-password"
            maxLength={127}
            placeholder="Re-enter your password"
            disabled={!file || loading}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-12 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-400 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-gray-100"
          />

          <button
            type="button"
            onClick={() =>
              setShowConfirmPassword((value) => !value)
            }
            disabled={!file || loading}
            aria-label={
              showConfirmPassword
                ? "Hide confirmation password"
                : "Show confirmation password"
            }
            className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 hover:text-gray-800 disabled:opacity-50"
          >
            {showConfirmPassword ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck
            className="mt-0.5 shrink-0 text-green-700"
            size={21}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold text-green-900">
              Password encryption
            </p>
            <p className="mt-1 text-sm leading-5 text-green-800">
              This tool uses AES-256 encryption. Your selected password is
              required to open the resulting PDF in compatible PDF readers.
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
        onClick={protectPdf}
        disabled={!file || loading}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            Encrypting PDF...
          </>
        ) : (
          <>
            <Download size={18} />
            Protect PDF & Download
          </>
        )}
      </button>

      <p className="mt-4 text-xs leading-5 text-gray-500">
        Processing is performed in your browser. Your original PDF is not
        modified. Keep your password safe; if you lose it, you may not be
        able to open the protected document.
      </p>
    </section>
  );
}

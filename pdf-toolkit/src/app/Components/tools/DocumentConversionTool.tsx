
"use client";

import { useRef, useState } from "react";
import {
  Download,
  FileUp,
  LoaderCircle,
  ShieldCheck,
  X,
} from "lucide-react";

type Props = {
  toolSlug: string;
  title: string;
  description: string;
};

type ConversionConfig = {
  accept: string;
  label: string;
  output: string;
};

const conversionConfig: Record<string, ConversionConfig> = {
  "pdf-to-word": {
    accept: ".pdf,application/pdf",
    label: "PDF document",
    output: ".docx",
  },
  "pdf-to-powerpoint": {
    accept: ".pdf,application/pdf",
    label: "PDF document",
    output: ".pptx",
  },
  "pdf-to-excel": {
    accept: ".pdf,application/pdf",
    label: "PDF document",
    output: ".xlsx",
  },
  "word-to-pdf": {
    accept:
      ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    label: "Word document",
    output: ".pdf",
  },
  "powerpoint-to-pdf": {
    accept:
      ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    label: "PowerPoint presentation",
    output: ".pdf",
  },
  "excel-to-pdf": {
    accept:
      ".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    label: "Excel workbook",
    output: ".pdf",
  },

  // PDF to HTML
  "pdf-to-html": {
    accept: ".pdf,application/pdf",
    label: "PDF document",
    output: ".html",
  },

  // HTML to PDF
  "html-to-pdf": {
    accept: ".html,.htm,text/html",
    label: "HTML document",
    output: ".pdf",
  },
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const API_BASE = (
  process.env.NEXT_PUBLIC_CONVERSION_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

export function DocumentConversionTool({
  toolSlug,
  title,
  description,
}: Props) {
  const config = conversionConfig[toolSlug];

  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function selectFile(candidate?: File) {
    setError("");
    setSuccess("");

    if (!candidate) return;

    if (!config) {
      setFile(null);
      setError("This conversion tool is not configured.");
      return;
    }

    if (candidate.size === 0) {
      setFile(null);
      setError("The selected file is empty. Please choose another file.");
      return;
    }

    if (candidate.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("Please choose a file smaller than 50 MB.");
      return;
    }

    const lowerName = candidate.name.toLowerCase();

    const allowedExtensions = config.accept
      .split(",")
      .filter((item) => item.startsWith("."))
      .map((item) => item.toLowerCase());

    const isAllowed = allowedExtensions.some((extension) =>
      lowerName.endsWith(extension)
    );

    if (!isAllowed) {
      setFile(null);
      setError(
        `Please select a supported ${config.label.toLowerCase()} file.`
      );
      return;
    }

    setFile(candidate);
  }

  async function convertFile() {
    if (!file || !config || processing) return;

    setProcessing(true);
    setError("");
    setSuccess("");

    let downloadUrl: string | null = null;

    try {
      const body = new FormData();
      body.append("file", file);

      // The same backend endpoint handles all configured conversions.
      // toolSlug determines which conversion the backend executes.
      const response = await fetch(
        `${API_BASE}/convert/${toolSlug}`,
        {
          method: "POST",
          body,
        }
      );

      if (!response.ok) {
        let message =
          "Conversion failed. Please check your file and try again.";

        try {
          const contentType =
            response.headers.get("content-type") || "";

          if (contentType.includes("application/json")) {
            const payload = await response.json();

            if (typeof payload.detail === "string") {
              message = payload.detail;
            } else if (Array.isArray(payload.detail)) {
              message = payload.detail
                .map((item: { msg?: string }) => item.msg || "")
                .filter(Boolean)
                .join(" ");
            }
          } else {
            const textMessage = await response.text();

            if (textMessage.trim()) {
              message = textMessage;
            }
          }
        } catch {
          // Keep the default error message if the response
          // cannot be read.
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error(
          "The conversion returned an empty file. Please try another document."
        );
      }

      // Prefer the filename returned by FastAPI.
      const disposition =
        response.headers.get("content-disposition") || "";

      const encodedName = disposition.match(
        /filename\*=UTF-8''([^;]+)/i
      )?.[1];

      const plainName = disposition.match(
        /filename="?([^";]+)"?/i
      )?.[1];

      const fallbackBase =
        file.name.replace(/\.[^.]+$/, "") ||
        "converted-document";

      let outputName = `${fallbackBase}${config.output}`;

      try {
        if (encodedName) {
          outputName = decodeURIComponent(encodedName);
        } else if (plainName) {
          outputName = plainName;
        }
      } catch {
        // Use the generated filename if decoding fails.
      }

      // Ensure the downloaded file has the expected extension.
      if (
        !outputName.toLowerCase().endsWith(config.output)
      ) {
        outputName = `${fallbackBase}${config.output}`;
      }

      downloadUrl = URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = outputName;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setSuccess(
        `Conversion completed successfully. Your ${config.output} file has been downloaded.`
      );
    } catch (conversionError) {
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "Conversion failed. Please try again."
      );
    } finally {
      if (downloadUrl) {
        window.setTimeout(() => {
          URL.revokeObjectURL(downloadUrl!);
        }, 1000);
      }

      setProcessing(false);
    }
  }

  if (!config) {
    return (
      <section className="mx-auto w-full max-w-3xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-semibold text-slate-900">
          {title}
        </h2>

        <p className="mt-3 text-sm text-red-600">
          This conversion tool is not configured. Please check
          the tool slug in DocumentConversionTool.tsx.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-900">
          {title}
        </h2>

        <p className="mt-2 text-slate-600">
          {description}
        </p>
      </div>

      <div
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging
            ? "border-red-500 bg-red-50"
            : "border-slate-300 bg-slate-50"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);

          if (!processing) {
            selectFile(event.dataTransfer.files[0]);
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={config.accept}
          className="hidden"
          disabled={processing}
          onChange={(event) => {
            selectFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        <FileUp
          className="mx-auto mb-3 h-9 w-9 text-red-600"
          aria-hidden="true"
        />

        <p className="font-medium text-slate-800">
          Drop your file here, or
        </p>

        <button
          type="button"
          disabled={processing}
          onClick={() => inputRef.current?.click()}
          className="mt-2 font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          browse files
        </button>

        <p className="mt-3 text-sm text-slate-500">
          Supported format: {config.accept
            .split(",")
            .filter((item) => item.startsWith("."))
            .join(", ")}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          Maximum file size: 50 MB
        </p>
      </div>

      {file && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <FileUp
              className="h-5 w-5 shrink-0 text-red-600"
              aria-hidden="true"
            />

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {file.name}
              </p>

              <p className="text-xs text-slate-500">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Remove selected file"
            disabled={processing}
            onClick={() => {
              setFile(null);
              setError("");
              setSuccess("");
            }}
            className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          <ShieldCheck
            className="mt-0.5 h-5 w-5 shrink-0"
            aria-hidden="true"
          />
          <span>{success}</span>
        </p>
      )}

      <button
        type="button"
        onClick={convertFile}
        disabled={!file || processing}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {processing ? (
          <LoaderCircle
            className="h-5 w-5 animate-spin"
            aria-hidden="true"
          />
        ) : (
          <Download
            className="h-5 w-5"
            aria-hidden="true"
          />
        )}

        {processing
          ? "Converting..."
          : `Convert and download ${config.output}`}
      </button>

      <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
          aria-hidden="true"
        />

        <p>
          Upload only documents you are authorized to process.
          Your file is sent to the configured conversion server
          for processing.
        </p>
      </div>
    </section>
  );
}

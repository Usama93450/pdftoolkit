
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Languages,
  FileText,
  Upload,
  Download,
  LoaderCircle,
  ShieldCheck,
  X,
  AlertCircle,
  CheckCircle2,
  ScanText,
} from "lucide-react";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const API_BASE = (
  process.env.NEXT_PUBLIC_CONVERSION_API_URL ||
  "https://pdftoolkit-production-dada.up.railway.app"
).replace(/\/$/, "");

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_TARGET_LANGUAGES = 10;
const MAX_PDF_PAGES = 50;

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

type Language = {
  code: string;
  name: string;
};

type LanguagesResponse = {
  languages?: Language[];
  provider_available?: boolean;
};

type PdfExtractionResult = {
  pages: string[];
  usedOcr: boolean;
};

const FALLBACK_LANGUAGES: Language[] = [
  { code: "en", name: "English" },
  { code: "ur", name: "Urdu" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "tr", name: "Turkish" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ru", name: "Russian" },
  { code: "bn", name: "Bengali" },
  { code: "id", name: "Indonesian" },
  { code: "fa", name: "Persian" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "uk", name: "Ukrainian" },
  { code: "vi", name: "Vietnamese" },
  { code: "th", name: "Thai" },
  { code: "sw", name: "Swahili" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "mr", name: "Marathi" },
  { code: "gu", name: "Gujarati" },
  { code: "pa", name: "Punjabi" },
  { code: "ro", name: "Romanian" },
  { code: "el", name: "Greek" },
  { code: "sv", name: "Swedish" },
  { code: "cs", name: "Czech" },
];

const OCR_LANGUAGE_MAP: Record<string, string> = {
  en: "eng",
  ur: "urd",
  ar: "ara",
  hi: "hin",
  es: "spa",
  fr: "fra",
  de: "deu",
  it: "ita",
  pt: "por",
  tr: "tur",
  zh: "chi_sim",
  "zh-CN": "chi_sim",
  ja: "jpn",
  ko: "kor",
  ru: "rus",
  bn: "ben",
  id: "ind",
  fa: "fas",
  nl: "nld",
  pl: "pol",
  uk: "ukr",
  vi: "vie",
  th: "tha",
  sw: "swa",
  ta: "tam",
  te: "tel",
  mr: "mar",
  gu: "guj",
  pa: "pan",
  ro: "ron",
  el: "ell",
  sv: "swe",
  cs: "ces",
};

function sanitizeLanguages(value: unknown): Language[] {
  if (!Array.isArray(value)) return [];

  const unique = new Map<string, Language>();

  for (const item of value) {
    if (
      !item ||
      typeof item !== "object" ||
      !("code" in item) ||
      !("name" in item)
    ) {
      continue;
    }

    const code =
      typeof item.code === "string" ? item.code.trim() : "";
    const name =
      typeof item.name === "string" ? item.name.trim() : "";

    if (!code || !name) continue;

    const normalizedCode = code.toLowerCase();

    if (!unique.has(normalizedCode)) {
      unique.set(normalizedCode, { code, name });
    }
  }

  return Array.from(unique.values());
}

function formatApiError(
  payload: unknown,
  fallback: string
): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const detail = (payload as { detail?: unknown }).detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item: unknown) => {
        if (!item || typeof item !== "object") return "";

        const entry = item as {
          loc?: unknown[];
          msg?: string;
        };

        const location = Array.isArray(entry.loc)
          ? entry.loc.slice(1).map(String).join(".")
          : "";

        const message =
          typeof entry.msg === "string"
            ? entry.msg
            : "Invalid value";

        return location ? `${location}: ${message}` : message;
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(" | ");
    }
  }

  return fallback;
}

function getOcrLanguage(sourceLanguage: string): string {
  if (sourceLanguage === "auto") {
    // Tesseract does not automatically identify an unknown language
    // with this configuration. English is the default for auto.
    return "eng";
  }

  return (
    OCR_LANGUAGE_MAP[sourceLanguage] ||
    OCR_LANGUAGE_MAP[sourceLanguage.toLowerCase()] ||
    "eng"
  );
}

async function extractPdfTextForTranslation(
  file: File,
  sourceLanguage: string,
  onStatus: (message: string) => void
): Promise<PdfExtractionResult> {
  let loadingTask:
    | ReturnType<typeof pdfjsLib.getDocument>
    | null = null;

  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

  try {
    onStatus("Opening PDF...");

    const buffer = await file.arrayBuffer();

    loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
    });

    const pdf = await loadingTask.promise;

    if (pdf.numPages < 1) {
      throw new Error("The PDF contains no pages.");
    }

    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Error(
        `Translation supports up to ${MAX_PDF_PAGES} pages.`
      );
    }

    const pages: string[] = [];
    const pagesNeedingOcr: number[] = [];

    onStatus("Checking for selectable text...");

    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber++
    ) {
      const page = await pdf.getPage(pageNumber);

      try {
        const textContent = await page.getTextContent();

        const text = textContent.items
          .map((item) =>
            "str" in item && typeof item.str === "string"
              ? item.str
              : ""
          )
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        pages.push(text);

        // Pages with little or no selectable text are candidates for OCR.
        if (text.replace(/\s/g, "").length < 30) {
          pagesNeedingOcr.push(pageNumber - 1);
        }
      } finally {
        page.cleanup();
      }
    }

    if (pagesNeedingOcr.length === 0) {
      return {
        pages,
        usedOcr: false,
      };
    }

    onStatus(
      `Preparing OCR for ${pagesNeedingOcr.length} scanned page(s)...`
    );

    const ocrLanguage = getOcrLanguage(sourceLanguage);

    onStatus(
      `Loading OCR language data (${ocrLanguage})...`
    );

    worker = await createWorker(ocrLanguage);

    for (
      let index = 0;
      index < pagesNeedingOcr.length;
      index++
    ) {
      const pageIndex = pagesNeedingOcr[index];
      const pageNumber = pageIndex + 1;

      onStatus(
        `Recognizing scanned page ${index + 1} of ${pagesNeedingOcr.length}...`
      );

      const page = await pdf.getPage(pageNumber);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Could not create a canvas for OCR.");
      }

      try {
        const viewport = page.getViewport({ scale: 1.5 });

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        await page.render({
          canvas,
          canvasContext: context,
          viewport,
        }).promise;

        const result = await worker.recognize(canvas);
        const recognizedText = result.data.text.trim();

        if (recognizedText) {
          // Keep the extracted text for other pages and replace only
          // the page that needed OCR.
          pages[pageIndex] = recognizedText;
        }
      } finally {
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    }

    if (!pages.some((page) => page.trim())) {
      throw new Error(
        "No readable text could be extracted. Try a clearer PDF or select the correct original language."
      );
    }

    return {
      pages,
      usedOcr: true,
    };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (error) {
        console.error("Could not terminate OCR worker:", error);
      }
    }

    if (loadingTask) {
      try {
        await loadingTask.destroy();
      } catch (error) {
        console.error("Could not close PDF:", error);
      }
    }
  }
}

export function TranslatePdfTool() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguages, setTargetLanguages] = useState<string[]>(["en"]);
  const [languages, setLanguages] =
    useState<Language[]>(FALLBACK_LANGUAGES);

  const [loadingLanguages, setLoadingLanguages] = useState(true);
  const [providerAvailable, setProviderAvailable] =
    useState<boolean | null>(null);

  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLanguages() {
      try {
        const response = await fetch(
          `${API_BASE}/translation-languages`
        );

        if (!response.ok) {
          throw new Error("Could not load supported languages.");
        }

        const data =
          (await response.json()) as LanguagesResponse;

        if (!active) return;

        const availableLanguages = sanitizeLanguages(
          data.languages
        );

        if (availableLanguages.length > 0) {
          setLanguages(availableLanguages);

          setTargetLanguages((previous) => {
            const supportedCodes = new Set(
              availableLanguages.map((language) => language.code)
            );

            const valid = previous
              .filter((code) => supportedCodes.has(code))
              .slice(0, MAX_TARGET_LANGUAGES);

            if (valid.length > 0) return valid;

            const english = availableLanguages.find(
              (language) => language.code.toLowerCase() === "en"
            );

            return [
              english?.code ?? availableLanguages[0].code,
            ];
          });
        }

        setProviderAvailable(
          typeof data.provider_available === "boolean"
            ? data.provider_available
            : null
        );
      } catch (caught) {
        console.error("Could not load translation languages:", caught);

        if (active) {
          setProviderAvailable(false);
        }
      } finally {
        if (active) {
          setLoadingLanguages(false);
        }
      }
    }

    void loadLanguages();

    return () => {
      active = false;
    };
  }, []);

  function selectFile(candidate?: File) {
    setError("");
    setSuccess("");

    if (!candidate) return;

    if (
      !candidate.name.toLowerCase().endsWith(".pdf") &&
      candidate.type !== "application/pdf"
    ) {
      setFile(null);
      setError("Please select a valid PDF file.");
      return;
    }

    if (candidate.size === 0) {
      setFile(null);
      setError("The selected PDF file is empty.");
      return;
    }

    if (candidate.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("The maximum supported file size is 50 MB.");
      return;
    }

    setFile(candidate);
  }

  function toggleTargetLanguage(code: string) {
    if (processing || code === sourceLanguage) return;

    setError("");
    setSuccess("");

    setTargetLanguages((previous) => {
      if (previous.includes(code)) {
        return previous.filter((item) => item !== code);
      }

      if (previous.length >= MAX_TARGET_LANGUAGES) {
        setError(
          `You can select a maximum of ${MAX_TARGET_LANGUAGES} target languages.`
        );
        return previous;
      }

      return [...previous, code];
    });
  }

  async function translatePdf() {
    if (processing) return;

    if (!file) {
      setError("Please upload a PDF file first.");
      return;
    }

    if (targetLanguages.length === 0) {
      setError("Select at least one target language.");
      return;
    }

    if (
      sourceLanguage !== "auto" &&
      targetLanguages.includes(sourceLanguage)
    ) {
      setError(
        "The original language cannot also be a target language."
      );
      return;
    }

    setProcessing(true);
    setProcessingStatus("Preparing your document...");
    setError("");
    setSuccess("");

    try {
      const extraction = await extractPdfTextForTranslation(
        file,
        sourceLanguage,
        setProcessingStatus
      );

      const formData = new FormData();

      formData.append("file", file);
      formData.append("source_language", sourceLanguage);
      formData.append(
        "target_languages",
        JSON.stringify(targetLanguages)
      );

      // Send all page text when OCR was needed on any page.
      // The backend checks that the page count matches the uploaded PDF.
      if (extraction.usedOcr) {
        setProcessingStatus("Preparing recognized text...");

        formData.append(
          "ocr_pages",
          JSON.stringify(extraction.pages)
        );
      }

      setProcessingStatus("Translating your document...");

      const response = await fetch(`${API_BASE}/translate-pdf`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message =
          `Translation failed (HTTP ${response.status}).`;

        try {
          const payload: unknown = await response.json();
          message = formatApiError(payload, message);
        } catch {
          // Retain the HTTP status message for non-JSON responses.
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error(
          "The translation service returned an empty file."
        );
      }

      const contentType = (
        response.headers.get("content-type") || blob.type
      ).toLowerCase();

      const isZip =
        contentType.includes("application/zip") ||
        contentType.includes("application/x-zip-compressed");

      const isPdf = contentType.includes("application/pdf");

      if (!isZip && !isPdf) {
        throw new Error(
          "The server returned an unexpected file type. Expected a PDF or ZIP archive."
        );
      }

      if (targetLanguages.length === 1 && !isPdf) {
        throw new Error(
          "The server should return a PDF when only one target language is selected."
        );
      }

      if (targetLanguages.length > 1 && !isZip) {
        throw new Error(
          "The server should return a ZIP archive when multiple target languages are selected."
        );
      }

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      const baseName =
        file.name
          .replace(/\.pdf$/i, "")
          .replace(/[^a-zA-Z0-9_-]/g, "_") || "document";

      anchor.href = objectUrl;
      anchor.download = isZip
        ? `${baseName}-translated-documents.zip`
        : `${baseName}-translated-${targetLanguages[0]}.pdf`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 2000);

      setSuccess(
        `${extraction.usedOcr ? "OCR and translation completed." : "Translation completed."} ${
          isZip
            ? `Your documents for ${targetLanguages.length} languages are downloading as a ZIP archive.`
            : "Your translated PDF download has started."
        }`
      );
    } catch (caught) {
      console.error("PDF translation failed:", caught);

      const message =
        caught instanceof Error
          ? caught.message
          : "An unexpected translation error occurred.";

      setError(
        message.includes("Failed to fetch")
          ? "Cannot connect to the translation API. Check that FastAPI and the translation service are running."
          : message
      );
    } finally {
      setProcessing(false);
      setProcessingStatus("");
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <Languages size={25} aria-hidden="true" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Translate PDF
          </h2>

          <p className="mt-1 text-sm leading-6 text-gray-600">
            Translate PDF text into one or several languages.
            Scanned documents are processed with OCR automatically.
          </p>
        </div>
      </div>

      {providerAvailable === false && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />

          <p>
            The translation provider could not be confirmed as
            available. Check your backend and translation service
            configuration if translation fails.
          </p>
        </div>
      )}

      <div
        className={`mt-6 rounded-2xl border-2 border-dashed p-6 text-center transition sm:p-9 ${
          dragging
            ? "border-red-500 bg-red-50"
            : "border-gray-300 bg-gray-50 hover:border-red-300"
        }`}
        onDragOver={(event) => {
          event.preventDefault();

          if (!processing) {
            setDragging(true);
          }
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);

          if (!processing) {
            selectFile(event.dataTransfer.files?.[0]);
          }
        }}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-red-600 shadow-sm">
          <Upload size={25} aria-hidden="true" />
        </div>

        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          Upload your PDF
        </h3>

        <p className="mt-2 text-sm text-gray-500">
          Drag and drop your document here, or choose it from your device.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          disabled={processing}
          onChange={(event) => {
            selectFile(event.currentTarget.files?.[0]);
            event.currentTarget.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={processing}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload size={17} aria-hidden="true" />
          Choose PDF
        </button>

        <p className="mt-3 text-xs text-gray-400">
          PDF files only · Maximum size 50 MB
        </p>
      </div>

      {file && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-gray-200 p-4">
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

          <button
            type="button"
            disabled={processing}
            onClick={() => {
              setFile(null);
              setError("");
              setSuccess("");
              setProcessingStatus("");
            }}
            aria-label="Remove selected PDF"
            className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="mt-6">
        <label
          htmlFor="translate-source"
          className="mb-2 block text-sm font-semibold text-gray-800"
        >
          Original language
        </label>

        <select
          id="translate-source"
          value={sourceLanguage}
          disabled={processing}
          onChange={(event) => {
            const nextSource = event.target.value;

            setSourceLanguage(nextSource);

            setTargetLanguages((previous) =>
              previous.filter((code) => code !== nextSource)
            );

            setError("");
            setSuccess("");
          }}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 disabled:bg-gray-100"
        >
          <option value="auto">Detect automatically</option>

          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </select>

        {sourceLanguage === "auto" && (
          <p className="mt-2 text-xs leading-5 text-gray-500">
            For scanned PDFs, select the actual original language
            when possible. OCR uses English when automatic detection
            is selected.
          </p>
        )}
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-800">
            Translate into
          </h3>

          <span className="text-xs text-gray-500">
            {targetLanguages.length}/{MAX_TARGET_LANGUAGES} selected
          </span>
        </div>

        {loadingLanguages && (
          <p className="mt-2 text-sm text-gray-500">
            Loading supported languages...
          </p>
        )}

        <div className="mt-3 grid max-h-72 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-gray-200 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {languages.map((language) => {
            const checked = targetLanguages.includes(language.code);

            const isSource =
              sourceLanguage !== "auto" &&
              sourceLanguage.toLowerCase() ===
                language.code.toLowerCase();

            const limitReached =
              targetLanguages.length >= MAX_TARGET_LANGUAGES;

            return (
              <label
                key={language.code}
                className={`flex items-center gap-3 rounded-lg border p-3 text-sm transition ${
                  checked
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-transparent bg-gray-50 text-gray-700 hover:border-gray-200"
                } ${
                  processing ||
                  isSource ||
                  (!checked && limitReached)
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={
                    processing ||
                    isSource ||
                    (!checked && limitReached)
                  }
                  onChange={() =>
                    toggleTargetLanguage(language.code)
                  }
                  className="h-4 w-4 accent-red-600"
                />

                <span>{language.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {processing && (
        <div
          role="status"
          aria-live="polite"
          className="mt-5 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800"
        >
          <LoaderCircle
            className="shrink-0 animate-spin"
            size={20}
            aria-hidden="true"
          />

          <span>{processingStatus || "Processing PDF..."}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
        >
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />

          <p>{error}</p>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mt-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800"
        >
          <CheckCircle2
            size={19}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />

          <p>{success}</p>
        </div>
      )}

      <button
        type="button"
        onClick={translatePdf}
        disabled={
          !file ||
          processing ||
          targetLanguages.length === 0 ||
          (sourceLanguage !== "auto" &&
            targetLanguages.some(
              (code) =>
                code.toLowerCase() === sourceLanguage.toLowerCase()
            ))
        }
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
      >
        {processing ? (
          <>
            <LoaderCircle
              className="animate-spin"
              size={18}
              aria-hidden="true"
            />
            Processing PDF...
          </>
        ) : (
          <>
            <Download size={18} aria-hidden="true" />
            Translate PDF &amp; Download
          </>
        )}
      </button>

      <div className="mt-6 flex items-start gap-3 rounded-xl bg-gray-50 p-4">
        <ScanText
          size={20}
          className="mt-0.5 shrink-0 text-red-600"
          aria-hidden="true"
        />

        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Automatic OCR for scanned PDFs
          </h3>

          <p className="mt-1 text-sm leading-6 text-gray-600">
            Selectable text is extracted directly. Pages with little
            selectable text are processed using Tesseract OCR in your
            browser. The recognized text is then sent to your configured
            translation service. The output is a newly generated PDF;
            the original layout, tables, and images may not be preserved.
            Avoid uploading confidential documents unless the translation
            service's data-handling terms are acceptable to you.
          </p>
        </div>
      </div>
    </section>
  );
}

export default TranslatePdfTool;

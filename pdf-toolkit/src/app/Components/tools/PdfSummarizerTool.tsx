"use client";

import { FormEvent, useState } from "react";
import {
  FileText,
  Sparkles,
  Upload,
  MessageCircle,
  LoaderCircle,
  Send,
  RotateCcw,
} from "lucide-react";

const API_BASE = (
  process.env.NEXT_PUBLIC_CONVERSION_API_URL ||
  "https://pdftoolkit-production-dada.up.railway.app"
).replace(/\/$/, "");

type SummaryResponse = {
  document_id: string;
  filename: string;
  pages: number;
  chunks: number;
  summary: string;
  model: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  pages?: number[];
};

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.detail || data.message || "The request could not be completed.";
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

export default function PdfSummarizerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [length, setLength] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SummaryResponse | null>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  async function handleSummarize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Please choose a PDF file first.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      setError("The maximum file size is 30 MB.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setMessages([]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("length", length);

      const response = await fetch(
        `${API_BASE}/ai/pdf-summarizer/summarize`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = (await response.json()) as SummaryResponse;
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to summarize this PDF. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!result || !question.trim() || asking) return;

    const askedQuestion = question.trim();

    setMessages((previous) => [
      ...previous,
      { role: "user", content: askedQuestion },
    ]);
    setQuestion("");
    setAsking(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/ai/pdf-summarizer/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: result.document_id,
          question: askedQuestion,
        }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data: { answer: string; pages: number[] } =
        await response.json();

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.answer,
          pages: data.pages,
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to answer that question."
      );
    } finally {
      setAsking(false);
    }
  }

  function resetTool() {
    setFile(null);
    setResult(null);
    setMessages([]);
    setQuestion("");
    setError("");
    setLength("medium");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <Sparkles size={28} />
          </div>

          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">
            AI-powered document assistant
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            AI PDF Summarizer
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600">
            Turn long PDFs into clear summaries, then ask questions about
            the document. Powered by a local AI model with no paid API key.
          </p>
        </div>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
          {!result && (
            <form onSubmit={handleSummarize} className="space-y-6">
              <label
                htmlFor="pdf-upload"
                className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center transition hover:border-red-400 hover:bg-red-50/40"
              >
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm">
                  <Upload size={27} />
                </span>

                <span className="text-lg font-semibold text-gray-900">
                  {file ? file.name : "Choose your PDF"}
                </span>

                <span className="mt-2 text-sm text-gray-500">
                  Click to browse · PDF files up to 30 MB
                </span>

                {file && (
                  <span className="mt-2 text-xs text-gray-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                )}

                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    setError("");
                  }}
                />
              </label>

              <div>
                <label
                  htmlFor="summary-length"
                  className="mb-2 block text-sm font-semibold text-gray-800"
                >
                  Summary length
                </label>

                <select
                  id="summary-length"
                  value={length}
                  onChange={(event) => setLength(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                >
                  <option value="short">Short — quick overview</option>
                  <option value="medium">Medium — key ideas and details</option>
                  <option value="long">Long — detailed summary</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!file || loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="animate-spin" size={19} />
                    Reading and summarizing PDF…
                  </>
                ) : (
                  <>
                    <Sparkles size={19} />
                    Generate AI Summary
                  </>
                )}
              </button>

              {loading && (
                <p className="text-center text-sm leading-6 text-gray-500">
                  The model runs locally on your computer. Large documents
                  can take several minutes, especially without a dedicated GPU.
                  Keep the backend and Ollama running.
                </p>
              )}
            </form>
          )}

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
            >
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-7">
              <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <FileText size={22} />
                  </span>

                  <div className="min-w-0">
                    <h2 className="break-words font-semibold text-gray-900">
                      {result.filename}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {result.pages} pages · {result.chunks} text sections ·{" "}
                      {result.model}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetTool}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  <RotateCcw size={16} />
                  New PDF
                </button>
              </div>

              <article>
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="text-red-600" size={21} />
                  <h2 className="text-xl font-bold text-gray-900">
                    Your summary
                  </h2>
                </div>

                <div className="whitespace-pre-wrap break-words rounded-2xl bg-gray-50 p-5 text-sm leading-7 text-gray-800 sm:p-7 sm:text-base">
                  {result.summary}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(result.summary);
                  }}
                  className="mt-3 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Copy summary
                </button>
              </article>

              <section className="border-t border-gray-200 pt-7">
                <div className="mb-4 flex items-center gap-2">
                  <MessageCircle className="text-red-600" size={21} />
                  <h2 className="text-xl font-bold text-gray-900">
                    Ask questions about this PDF
                  </h2>
                </div>

                <p className="mb-5 text-sm leading-6 text-gray-600">
                  Ask about key points, definitions, dates, conclusions, or
                  details in the uploaded document.
                </p>

                <div
                  aria-live="polite"
                  className="mb-5 space-y-4"
                >
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`rounded-2xl p-4 sm:p-5 ${
                        message.role === "user"
                          ? "ml-6 bg-red-50 text-gray-900 sm:ml-16"
                          : "mr-3 border border-gray-200 bg-white text-gray-800 sm:mr-10"
                      }`}
                    >
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                        {message.role === "user" ? "You" : "PDF Assistant"}
                      </p>

                      <p className="whitespace-pre-wrap break-words text-sm leading-7">
                        {message.content}
                      </p>

                      {message.role === "assistant" &&
                        message.pages &&
                        message.pages.length > 0 && (
                          <p className="mt-3 text-xs text-gray-500">
                            Relevant PDF pages:{" "}
                            {message.pages.join(", ")}
                          </p>
                        )}
                    </div>
                  ))}

                  {asking && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <LoaderCircle className="animate-spin" size={17} />
                      Searching the PDF and preparing an answer…
                    </div>
                  )}
                </div>

                <form
                  onSubmit={handleAsk}
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask a question about your PDF…"
                    maxLength={2000}
                    className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />

                  <button
                    type="submit"
                    disabled={!question.trim() || asking}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    <Send size={17} />
                    Ask
                  </button>
                </form>
              </section>
            </div>
          )}
        </section>

        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-6 text-gray-500">
          This version processes text-based PDFs. AI responses can be
          inaccurate, so verify important details against the original
          document. Uploaded text is retained temporarily in backend memory
          for follow-up questions.
        </p>
      </div>
    </main>
  );
}
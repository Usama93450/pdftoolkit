
"use client";

import { PDFDocument } from "pdf-lib";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import {
  FileText,
  Upload,
  ShieldCheck,
  X,
} from "lucide-react";

import { Navbar } from "../../Components/Navbar";
import { Footer } from "../../Components/Footer";
import HandwrittenToPdfTool from "@/app/Components/tools/HandwrittenToPdfTool";
import { TranslatePdfTool } from "../../Components/tools/PdfTranslator";
import { PdfOcrTool } from "../../Components/tools/PdfOcrTool";
import { SplitPdfTool } from "../../Components/tools/SplitPdfTool";
import { CompressPdfTool } from "../../Components/tools/CompressPdfTool";
import { RotatePdfTool } from "../../Components/tools/RotatePdfTool";
import { PdfToTextTool } from "../../Components/tools/PdfToTextTool";
import { ImageToPdfTool } from "../../Components/tools/ImageToPdfTool";
import { PdfToImagesTool } from "../../Components/tools/PdfToImagesTool";
import { SignPdfTool } from "../../Components/tools/SignPdfTool";
import { DeletePdfPagesTool } from "../../Components/tools/DeletePdfPagesTool";
import { ExtractPdfPagesTool } from "../../Components/tools/ExtractPdfPagesTool";
import { ReorderPdfPagesTool } from "../../Components/tools/ReorderPdfPagesTool";
import { AddPageNumbersTool } from "../../Components/tools/AddPageNumbersTool";
import { AddWatermarkTool } from "../../Components/tools/AddWatermarkTool";
import { ProtectPdfTool } from "../../Components/tools/ProtectPdfTool";
import { UnlockPdfTool } from "../../Components/tools/UnlockPdfTool";
import { RepairPdfTool } from "../../Components/tools/RepairPdfTool";
import { DocumentConversionTool } from "../../Components/tools/DocumentConversionTool";

type ToolDetail = {
  title: string;
  description: string;
  accept: string;
};

const toolDetails: Record<string, ToolDetail> = {
  "merge-pdf": {
    title: "Merge PDF",
    description:
      "Combine multiple PDF files into a single document in the order you choose.",
    accept: ".pdf,application/pdf",
  },

  "split-pdf": {
    title: "Split PDF",
    description:
      "Separate a PDF into custom page ranges or save every page as an individual PDF.",
    accept: ".pdf,application/pdf",
  },

  "compress-pdf": {
    title: "Compress PDF",
    description:
      "Reduce PDF file size while preserving as much document quality as possible.",
    accept: ".pdf,application/pdf",
  },

  "image-to-pdf": {
    title: "Image to PDF",
    description: "Convert your images into a single PDF document.",
    accept: "image/*",
  
  },
  
  "pdf-to-images": {
    title: "PDF to Images",
    description: "Convert PDF pages into image files.",
    accept: ".pdf,application/pdf",
  },

  "pdf-to-text": {
    title: "PDF to Text",
    description: "Extract readable text from a PDF document.",
    accept: ".pdf,application/pdf",
  },

  "rotate-pdf": {
    title: "Rotate PDF",
    description: "Rotate PDF pages to the correct orientation.",
    accept: ".pdf,application/pdf",
  },

  "sign-pdf": {
    title: "Sign PDF",
    description: "Prepare your PDF document for signing.",
    accept: ".pdf,application/pdf",
  },

  "pdf-ocr": {
    title: "PDF OCR",
    description:
      "Recognize and extract text from scanned PDFs and image-based documents.",
    accept: ".pdf,application/pdf",
  },

  "delete-pdf-pages": {
    title: "Delete PDF Pages",
    description:
      "Remove selected pages from a PDF and download the updated document.",
    accept: ".pdf,application/pdf",
  },

  "extract-pdf-pages": {
    title: "Extract PDF Pages",
    description:
      "Extract selected pages from a PDF and download them as a separate document.",
    accept: ".pdf,application/pdf",
  },

  "reorder-pdf-pages": {
    title: "Reorder PDF Pages",
    description:
      "Rearrange PDF pages in a custom order and download a new PDF.",
    accept: ".pdf,application/pdf",
  },

  "add-page-numbers": {
    title: "Add Page Numbers",
    description:
      "Add page numbers to a PDF with customizable position and starting number.",
    accept: ".pdf,application/pdf",
  },

  "add-watermark": {
    title: "Add Watermark to PDF",
    description: "Add a customizable text watermark to PDF pages.",
    accept: ".pdf,application/pdf",
  },

  "protect-pdf": {
    title: "Protect PDF with Password",
    description:
      "Encrypt a PDF with a password required to open the document.",
    accept: ".pdf,application/pdf",
  },

  "unlock-pdf": {
    title: "Unlock PDF",
    description:
      "Remove PDF password encryption using the correct existing password.",
    accept: ".pdf,application/pdf",
  },

  "repair-pdf": {
    title: "Repair PDF",
    description:
      "Attempt to recover readable pages from a damaged PDF and rebuild the document.",
    accept: ".pdf,application/pdf",
  },

  "pdf-to-word": {
    title: "PDF to Word",
    description:
      "Convert PDF text and layout into an editable Word document. Complex layouts may need manual review.",
    accept: ".pdf,application/pdf",
  },

  "pdf-to-powerpoint": {
    title: "PDF to PowerPoint",
    description:
      "Turn each PDF page into a PowerPoint slide while preserving the page appearance.",
    accept: ".pdf,application/pdf",
  },

  "pdf-to-excel": {
    title: "PDF to Excel",
    description:
      "Extract tables and selectable text from a PDF into an Excel workbook.",
    accept: ".pdf,application/pdf",
  },

  "word-to-pdf": {
    title: "Word to PDF",
    description:
      "Convert a Word document into a shareable PDF file.",
    accept:
      ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },

  "powerpoint-to-pdf": {
    title: "PowerPoint to PDF",
    description:
      "Convert PowerPoint slides into a PDF document.",
    accept:
      ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },

  "excel-to-pdf": {
    title: "Excel to PDF",
    description:
      "Convert an Excel workbook into a PDF document.",
    accept:
      ".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },

  "translate-pdf": {
    title: "Translate PDF",
    description:
      "Translate readable PDF text into one or several languages and download the translated document.",
    accept: ".pdf,application/pdf",
  },
  
  "pdf-to-html": {
    title: "PDF to HTML",
    description:
      "Convert PDF pages into a standalone HTML document with selectable text and approximate page layout.",
    accept: ".pdf,application/pdf",
  },

  "html-to-pdf": {
    title: "HTML to PDF",
    description:
      "Convert an HTML document into a downloadable PDF using the backend rendering engine.",
    accept: ".html,.htm,text/html",
  },

};

const DOCUMENT_CONVERSION_TOOLS = [
  "pdf-to-word",
  "pdf-to-powerpoint",
  "pdf-to-excel",
  "word-to-pdf",
  "powerpoint-to-pdf",
  "excel-to-pdf",
  "pdf-to-html",
  "html-to-pdf",
];

function ToolContent() {
  const params = useParams<{ tool: string }>();
  const toolSlug = params.tool;
  const tool = toolDetails[toolSlug];

  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isImageTool = toolSlug === "image-to-pdf";
  if (params.tool === "handwritten-to-pdf") {
  return <HandwrittenToPdfTool />;
}
  const isMergeTool = toolSlug === "merge-pdf";
  const isSplitTool = toolSlug === "split-pdf";
  const isCompressTool = toolSlug === "compress-pdf";
  const isRotateTool = toolSlug === "rotate-pdf";
  const isPdfToTextTool = toolSlug === "pdf-to-text";
  const isPdfToImagesTool = toolSlug === "pdf-to-images";
  const isSignTool = toolSlug === "sign-pdf";
  const isPdfOcrTool = toolSlug === "pdf-ocr";
  const isDeletePdfPagesTool = toolSlug === "delete-pdf-pages";
  const isExtractPdfPagesTool = toolSlug === "extract-pdf-pages";
  const isReorderPdfPagesTool = toolSlug === "reorder-pdf-pages";
  const isAddPageNumbersTool = toolSlug === "add-page-numbers";
  const isAddWatermarkTool = toolSlug === "add-watermark";
  const isProtectPdfTool = toolSlug === "protect-pdf";
  const isUnlockPdfTool = toolSlug === "unlock-pdf";
  const isRepairPdfTool = toolSlug === "repair-pdf";
  const isTranslatePdfTool = toolSlug === "translate-pdf";

  const isDocumentConversionTool =
    DOCUMENT_CONVERSION_TOOLS.includes(toolSlug);

  const usesDedicatedInterface =
    isPdfOcrTool ||
    isTranslatePdfTool ||
    isDocumentConversionTool;

  const hasSelectedFile = files.length > 0;

  if (!tool) {
    return (
      <>
        <Navbar />

        <main className="mx-auto min-h-[60vh] max-w-4xl px-5 py-20 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <FileText size={28} aria-hidden="true" />
          </div>

          <h1 className="mt-5 text-3xl font-bold text-gray-900">
            Tool not found
          </h1>

          <p className="mt-3 text-gray-600">
            The requested PDF tool does not exist.
          </p>

          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700"
          >
            Return home
          </Link>
        </main>

        <Footer />
      </>
    );
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || processing) {
      return;
    }

    const incomingFiles = Array.from(fileList);

    const validFiles = incomingFiles.filter((file) => {
      if (isImageTool) {
        return file.type.startsWith("image/");
      }

      return (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      );
    });

    const invalidCount = incomingFiles.length - validFiles.length;

    if (invalidCount > 0) {
      setError(
        isImageTool
          ? "Please select valid image files."
          : "Please select valid PDF files."
      );
    } else {
      setError("");
    }

    if (validFiles.length === 0) {
      return;
    }

    setSuccess("");

    setFiles((previousFiles) => {
      if (isMergeTool || isImageTool) {
        const combined = [...previousFiles, ...validFiles];

        // Avoid adding the same file repeatedly.
        return combined.filter(
          (file, index, allFiles) =>
            allFiles.findIndex(
              (candidate) =>
                candidate.name === file.name &&
                candidate.size === file.size &&
                candidate.lastModified === file.lastModified
            ) === index
        );
      }

      return [validFiles[0]];
    });
  }

  function removeFile(indexToRemove: number) {
    if (processing) return;

    setFiles((previousFiles) =>
      previousFiles.filter((_, index) => index !== indexToRemove)
    );

    setError("");
    setSuccess("");
  }

  function clearFiles() {
    if (processing) return;

    setFiles([]);
    setError("");
    setSuccess("");
  }

  async function mergePDFs() {
    if (processing) return;

    if (files.length < 2) {
      setError("Please select at least two PDF files to merge.");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      const mergedPDF = await PDFDocument.create();

      for (const file of files) {
        const fileBytes = await file.arrayBuffer();
        const sourcePDF = await PDFDocument.load(fileBytes);

        const copiedPages = await mergedPDF.copyPages(
          sourcePDF,
          sourcePDF.getPageIndices()
        );

        copiedPages.forEach((page) => {
          mergedPDF.addPage(page);
        });
      }

      const mergedBytes = await mergedPDF.save();

      const pdfBlob = new Blob(
        [new Uint8Array(mergedBytes).buffer as ArrayBuffer],
        { type: "application/pdf" }
      );

      const downloadUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement("a");

      downloadLink.href = downloadUrl;
      downloadLink.download = "merged-document.pdf";

      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 1000);

      setSuccess("Your PDF files have been merged successfully.");
    } catch (mergeError) {
      console.error("PDF merge error:", mergeError);

      setError(
        "Unable to merge these PDFs. Please check that the files are valid and not password-protected."
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-4xl">
          {/* Tool heading */}
          <div className="mb-8 text-center">
            <Link
              href="/"
              className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-red-600"
            >
              <span aria-hidden="true">←</span>
              Back to home
            </Link>

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <FileText size={32} aria-hidden="true" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {tool.title}
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-gray-600">
              {tool.description}
            </p>
          </div>

          {/* Dedicated tool interfaces */}
          {isPdfOcrTool && <PdfOcrTool />}

          {isTranslatePdfTool && <TranslatePdfTool />}

          {isDocumentConversionTool && (
            <DocumentConversionTool
              toolSlug={toolSlug}
              title={tool.title}
              description={tool.description}
            />
          )}

          {/* Shared upload interface for browser-based PDF tools */}
          {!usesDedicatedInterface && (
            <>
              <section
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition sm:p-10 ${
                  dragging
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 bg-white hover:border-red-300"
                } ${
                  processing
                    ? "pointer-events-none opacity-70"
                    : ""
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
                    addFiles(event.dataTransfer.files);
                  }
                }}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                  <Upload size={26} aria-hidden="true" />
                </div>

                <h2 className="mt-4 text-lg font-semibold text-gray-900">
                  Drag and drop your{" "}
                  {isImageTool ? "images" : "PDF file"}
                  {isMergeTool || isImageTool ? "s" : ""} here
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Or select files from your device.
                </p>

                <input
                  ref={inputRef}
                  type="file"
                  accept={tool.accept}
                  multiple={isMergeTool || isImageTool}
                  disabled={processing}
                  className="sr-only"
                  onChange={(event) => {
                    addFiles(event.currentTarget.files);
                    event.currentTarget.value = "";
                  }}
                />

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={processing}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Upload size={18} aria-hidden="true" />
                  Choose {isImageTool ? "Images" : "PDF File"}
                  {isMergeTool || isImageTool ? "s" : ""}
                </button>

                <p className="mt-4 text-xs text-gray-500">
                  {isImageTool
                    ? "Select supported image files to create your PDF."
                    : "Please select a valid PDF document."}
                </p>
              </section>

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  role="status"
                  className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-700"
                >
                  {success}
                </div>
              )}

              {hasSelectedFile && (
                <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Selected files ({files.length})
                    </h2>

                    <button
                      type="button"
                      onClick={clearFiles}
                      disabled={processing}
                      className="text-sm font-medium text-gray-500 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear all
                    </button>
                  </div>

                  <ul className="mt-4 space-y-3">
                    {files.map((file, index) => (
                      <li
                        key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                        className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-200 p-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                          <FileText size={20} aria-hidden="true" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800">
                            {file.name}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          disabled={processing}
                          aria-label={`Remove ${file.name}`}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <X size={18} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  {/* Merge PDF */}
                  {isMergeTool && (
                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={mergePDFs}
                        disabled={processing || files.length < 2}
                        className="w-full rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {processing
                          ? "Merging PDFs..."
                          : "Merge PDF Files"}
                      </button>

                      <p className="mt-2 text-center text-xs text-gray-500">
                        Select at least two PDF files to continue.
                      </p>
                    </div>
                  )}

                  {/* Split PDF */}
                  {isSplitTool && (
                    <div className="mt-5">
                      <SplitPdfTool file={files[0] ?? null} />
                    </div>
                  )}

                  {/* Compress PDF */}
                  {isCompressTool && (
                    <div className="mt-5">
                      <CompressPdfTool file={files[0] ?? null} />
                    </div>
                  )}

                  {/* Rotate PDF */}
                  {isRotateTool && (
                    <div className="mt-5">
                      <RotatePdfTool file={files[0] ?? null} />
                    </div>
                  )}

                  {/* PDF to Text */}
                  {isPdfToTextTool && (
                    <div className="mt-5">
                      <PdfToTextTool file={files[0] ?? null} />
                    </div>
                  )}

                  {/* Image to PDF */}
                  {isImageTool && (
                    <div className="mt-5">
                      <ImageToPdfTool files={files} />
                    </div>
                  )}

                  {/* PDF to Images */}
                  {isPdfToImagesTool && (
                    <div className="mt-5">
                      <PdfToImagesTool file={files[0] ?? null} />
                    </div>
                  )}

                  {/* Sign PDF */}
                  {isSignTool && (
                    <div className="mt-5">
                      <SignPdfTool file={files[0] ?? null} />
                    </div>
                  )}

                  {/* Delete PDF Pages */}
                  {isDeletePdfPagesTool && (
                    <div className="mt-5">
                      <DeletePdfPagesTool file={files[0] ?? null} />
                    </div>
                  )}

                  {/* Extract PDF Pages */}
                  {isExtractPdfPagesTool && (
                    <div className="mt-5">
                      <ExtractPdfPagesTool file={files[0] ?? null} />
                    </div>
                  )}

                  {/* Reorder PDF Pages */}
                  {isReorderPdfPagesTool && (
                    <div className="mt-5">
                      <ReorderPdfPagesTool file={files[0] ?? null} />
                    </div>
                  )}

                  {/* Add Page Numbers */}
                  {isAddPageNumbersTool && (
                    <div className="mt-5">
                      <AddPageNumbersTool file={files[0] ?? null} />
                    </div>
                  )}

                  {/* Add Watermark */}
                  {isAddWatermarkTool && (
                    <div className="mt-5">
                      <AddWatermarkTool file={files[0] ?? null} />
                    </div>
                  )}

                  {/* Protect PDF */}
                  {isProtectPdfTool && (
                    <div className="mt-5">
                      <ProtectPdfTool file={files[0] ?? null} />
                    </div>
                  )}

                  {/* Unlock PDF */}
                  {isUnlockPdfTool && (
                    <div className="mt-5">
                      <UnlockPdfTool file={files[0] ?? null} />
                    </div>
                  )}

                  {/* Repair PDF */}
                  {isRepairPdfTool && (
                    <div className="mt-5">
                      <RepairPdfTool file={files[0] ?? null} />
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {/* Privacy notice */}
          <div className="mt-8 flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
            <ShieldCheck
              size={22}
              className="mt-0.5 shrink-0 text-green-600"
              aria-hidden="true"
            />

            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Your files deserve care
              </h3>

              <p className="mt-1 text-sm leading-6 text-gray-600">
                {isTranslatePdfTool
                  ? "PDF translation sends extracted text to the translation provider configured by your backend. Review that provider's data-handling policy before translating confidential documents. Complex formatting may not be preserved."
                  : isDocumentConversionTool
                    ? "Document conversion sends your selected file to your configured backend. Make sure you trust the service processing your documents, especially when files contain sensitive information."
                    : isPdfOcrTool
                      ? "OCR may use external recognition engines or language data. Check the OCR tool's processing method and avoid sensitive documents unless you are comfortable with its data handling."
                      : "Files are handled by the selected tool. Depending on the operation, processing may occur in your browser or through an external service. Review the tool's behavior before using confidential documents."}
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default function ToolPage() {
  return (
    <Suspense
      fallback={
        <>
          <Navbar />

          <main className="flex min-h-[60vh] items-center justify-center bg-gray-50 px-4">
            <p className="text-sm text-gray-600">
              Loading PDF tool...
            </p>
          </main>

          <Footer />
        </>
      }
    >
      <ToolContent />
    </Suspense>
  );
}

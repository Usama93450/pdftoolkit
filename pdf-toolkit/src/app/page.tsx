"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import {
  ArrowDownUp,
  ArrowRight,
  CheckCircle,
  FileImage,
  FileSearch,
  FileText,
  FileSpreadsheet,
  Presentation,
  Hash,
  Image as ImageIcon,
  Languages,
  Layers,
  LockKeyhole,
  Minimize2,
  PenLine,
  Scissors,
  Search,
  ShieldCheck,
  Stamp,
  Trash2,
  UnlockKeyhole,
  Wrench,
  Zap,
  Sparkles,
   FileText as IconDocument,
  ShieldCheck as IconShield,
  Sparkles as IconSparkles,
} from "lucide-react";

import { Navbar } from "./Components/Navbar";
import { Footer } from "./Components/Footer";

type PdfTool = {
  title: string;
  slug: string;
  description: string;
  icon: typeof FileText;
  category: string;
  color: string;
};

const tools: PdfTool[] = [
  {
    title: "Merge PDF",
    slug: "merge-pdf",
    description: "Combine multiple PDF files into one document.",
    icon: Layers,
    category: "Organize PDF",
    color: "bg-red-50 text-red-600",
  },
  {
    title: "Split PDF",
    slug: "split-pdf",
    description: "Separate a PDF into custom page ranges or individual files.",
    icon: Scissors,
    category: "Organize PDF",
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Delete PDF Pages",
    slug: "delete-pdf-pages",
    description: "Remove unwanted pages from a PDF document.",
    icon: Trash2,
    category: "Organize PDF",
    color: "bg-red-50 text-red-600",
  },
  {
    title: "Extract PDF Pages",
    slug: "extract-pdf-pages",
    description: "Save selected pages as a separate PDF document.",
    icon: Scissors,
    category: "Organize PDF",
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Reorder PDF Pages",
    slug: "reorder-pdf-pages",
    description: "Arrange PDF pages in any order you choose.",
    icon: ArrowDownUp,
    category: "Organize PDF",
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Image to PDF",
    slug: "image-to-pdf",
    description: "Turn images into a single PDF document.",
    icon: ImageIcon,
    category: "Convert PDF",
    color: "bg-purple-50 text-purple-600",
  },
  {
    title: "PDF to Images",
    slug: "pdf-to-images",
    description: "Convert PDF pages into image files.",
    icon: FileImage,
    category: "Convert PDF",
    color: "bg-green-50 text-green-600",
  },
  {
    title: "PDF to Text",
    slug: "pdf-to-text",
    description: "Extract selectable text from PDF documents.",
    icon: FileSearch,
    category: "Convert PDF",
    color: "bg-amber-50 text-amber-600",
  },
  {
    title: "PDF OCR",
    slug: "pdf-ocr",
    description: "Recognize text in scanned PDFs and image-based documents.",
    icon: Search,
    category: "Convert PDF",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    title: "Translate PDF",
    slug: "translate-pdf",
    description:
      "Translate PDF text into one or multiple languages and download the results.",
    icon: Languages,
    category: "Convert PDF",
    color: "bg-red-50 text-red-600",
  },
  {
    title: "Rotate PDF",
    slug: "rotate-pdf",
    description: "Correct the orientation of PDF pages.",
    icon: FileText,
    category: "Edit PDF",
    color: "bg-pink-50 text-pink-600",
  },
  {
    title: "Sign PDF",
    slug: "sign-pdf",
    description: "Add a signature to your PDF document.",
    icon: PenLine,
    category: "Edit PDF",
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    title: "Add Page Numbers",
    slug: "add-page-numbers",
    description: "Add customizable page numbers to a PDF.",
    icon: Hash,
    category: "Edit PDF",
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Add Watermark",
    slug: "add-watermark",
    description: "Label PDF pages with a custom text watermark.",
    icon: Stamp,
    category: "Edit PDF",
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Compress PDF",
    slug: "compress-pdf",
    description: "Reduce PDF file size for easier sharing.",
    icon: Minimize2,
    category: "Optimize PDF",
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Protect PDF",
    slug: "protect-pdf",
    description:
      "Password-protect a PDF so a password is required to open it.",
    icon: LockKeyhole,
    category: "PDF Security",
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Unlock PDF",
    slug: "unlock-pdf",
    description: "Remove PDF password protection using the correct password.",
    icon: UnlockKeyhole,
    category: "PDF Security",
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Repair PDF",
    slug: "repair-pdf",
    description: "Attempt to recover and rebuild a damaged PDF document.",
    icon: Wrench,
    category: "Repair PDF",
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "PDF to Word",
    slug: "pdf-to-word",
    description: "Convert PDF content into an editable Word document.",
    icon: FileText,
    category: "Document Conversion",
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "PDF to PowerPoint",
    slug: "pdf-to-powerpoint",
    description: "Create PowerPoint slides from PDF pages.",
    icon: Presentation,
    category: "Document Conversion",
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "PDF to Excel",
    slug: "pdf-to-excel",
    description: "Extract PDF tables and text into an Excel workbook.",
    icon: FileSpreadsheet,
    category: "Document Conversion",
    color: "bg-green-50 text-green-600",
  },
  {
    title: "Word to PDF",
    slug: "word-to-pdf",
    description: "Convert Word documents into PDF files.",
    icon: FileText,
    category: "Document Conversion",
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "PowerPoint to PDF",
    slug: "powerpoint-to-pdf",
    description: "Export PowerPoint presentations as PDF documents.",
    icon: Presentation,
    category: "Document Conversion",
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Excel to PDF",
    slug: "excel-to-pdf",
    description: "Convert Excel workbooks into PDF documents.",
    icon: FileSpreadsheet,
    category: "Document Conversion",
    color: "bg-green-50 text-green-600",
  },
  {
    title: "PDF to HTML",
    slug: "pdf-to-html",
    description: "Convert PDF text and page structure into an HTML document.",
    icon: FileText,
    category: "Convert PDF",
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "HTML to PDF",
    slug: "html-to-pdf",
    description: "Turn HTML documents into downloadable PDF files.",
    icon: FileText,
    category: "Convert PDF",
    color: "bg-red-50 text-red-600",
  },

  // AI PDF Tools
  {
    title: "AI PDF Summarizer",
    slug: "pdf-summarizer",
    description:
      "Summarize lengthy PDF documents and ask questions about their content using local AI.",
    icon: Sparkles,
    category: "AI PDF Tools",
    color: "bg-violet-50 text-violet-700",
  },
  
{
  title: "Edit PDF",
  slug: "edit-pdf",
  description:
    "Add text, images, shapes, highlights, and freehand annotations to your PDF.",
  icon: PenLine,
  category: "Edit PDF",
  color: "bg-red-50 text-red-600",
},
{
  title: "Handwritten Document to PDF",
  slug: "handwritten-to-pdf",
  description:
    "Convert handwritten notes and scanned pages into a clean PDF.",
  icon: FileImage,
  category: "Convert PDF",
  color: "red",
},
];

const categoryFilters = [
  "All tools",
  "Organize PDF",
  "Convert PDF",
  "Edit PDF",
  "Optimize PDF",
  "PDF Security",
  "Repair PDF",
  "Document Conversion",
  "AI PDF Tools",
];

const categoryOrder = [
  "Organize PDF",
  "Convert PDF",
  "Edit PDF",
  "Optimize PDF",
  "PDF Security",
  "Repair PDF",
  "Document Conversion",
  "AI PDF Tools",
];

const categoryDescriptions: Record<string, string> = {
  "Organize PDF": "Merge, split, extract, remove, and rearrange PDF pages.",
  "Convert PDF": "Convert PDFs and images, extract text, or translate documents.",
  "Edit PDF": "Rotate, sign, number, and watermark your documents.",
  "Optimize PDF": "Reduce PDF file size for easier sharing.",
  "PDF Security": "Protect PDFs or unlock them with the correct password.",
  "Repair PDF": "Try rebuilding PDFs with readable but damaged structures.",
  "Document Conversion":
    "Move between PDF, Word, PowerPoint, and Excel formats.",
  "AI PDF Tools":
    "Use locally running AI to summarize documents and explore their contents.",
};

const benefits = [
  {
    icon: Zap,
    title: "Simple workflow",
    description:
      "Find the right tool and complete your document task in a few clear steps.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy-conscious",
    description:
      "Understand how your files are processed, with browser-based processing where supported.",
  },
  {
    icon: FileText,
    title: "Everyday essentials",
    description:
      "Bring common PDF tasks together in one organized, easy-to-use website.",
  },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All tools");

  const filteredTools = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();

    return tools.filter((tool) => {
      const searchableText =
        `${tool.title} ${tool.description} ${tool.category} ${tool.slug}`.toLowerCase();

      const matchesSearch =
        searchTerm.length === 0 || searchableText.includes(searchTerm);

      const matchesCategory =
        activeCategory === "All tools" || tool.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [query, activeCategory]);

  const groupedTools = useMemo(
    () =>
      categoryOrder
        .map((category) => ({
          category,
          tools: filteredTools.filter((tool) => tool.category === category),
        }))
        .filter((group) => group.tools.length > 0),
    [filteredTools]
  );

  function scrollToTools() {
    document.getElementById("tools")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function selectCategory(category: string) {
    setActiveCategory(category);
    scrollToTools();
  }

  function clearFilters() {
    setQuery("");
    setActiveCategory("All tools");
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      {/* Hero section */}
      <section className="relative isolate overflow-hidden border-b border-gray-100 bg-gradient-to-b from-red-50/60 via-white to-white px-4 pb-10 pt-14 sm:px-6 sm:pb-14 sm:pt-20 lg:px-8 lg:pt-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 top-8 -z-10 h-72 w-72 rounded-full bg-red-100/40 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 top-0 -z-10 h-80 w-80 rounded-full bg-rose-100/40 blur-3xl"
        />

        <div className="mx-auto max-w-7xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-100 bg-white/90 px-4 py-2 text-xs font-semibold tracking-wide text-red-700 shadow-sm sm:mb-6 sm:text-sm">
            <Zap size={15} className="text-red-600" aria-hidden="true" />
            Everything you need for your PDFs
          </div>

          <h1 className="mx-auto max-w-5xl text-4xl font-extrabold leading-[1.12] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl xl:text-7xl">
            Every PDF tool you need,
            <span className="mt-1 block text-red-600">all in one place.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-gray-600 sm:mt-6 sm:text-lg sm:leading-8 lg:text-xl">
            Work smarter with your documents. Merge, split, compress, convert,
            edit, secure, translate, and repair PDFs with simple, easy-to-use
            tools.
          </p>

          {/* Search */}
          <div className="mx-auto mt-8 max-w-3xl sm:mt-10">
            <div className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg shadow-gray-200/60 transition-all duration-200 hover:border-gray-300 focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-100/70 sm:p-2.5 sm:pl-5">
              <Search
                size={22}
                aria-hidden="true"
                className="ml-1 shrink-0 text-gray-400 transition-colors group-focus-within:text-red-600 sm:ml-0"
              />

              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") scrollToTools();
                }}
                placeholder="Search tools: merge, translate, convert, protect..."
                aria-label="Search PDF tools"
                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 sm:py-3.5 sm:text-base"
              />

              {query.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="shrink-0 rounded-lg px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                >
                  Clear
                </button>
              )}

              <button
                type="button"
                onClick={scrollToTools}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200 sm:px-6 sm:py-3.5"
              >
                <span className="hidden sm:inline">Find a tool</span>
                <span className="sm:hidden">Search</span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-500 sm:gap-x-7 sm:text-sm">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck
                  size={15}
                  className="text-green-600"
                  aria-hidden="true"
                />
                Privacy-conscious
              </span>

              <span className="inline-flex items-center gap-1.5">
                <CheckCircle
                  size={15}
                  className="text-green-600"
                  aria-hidden="true"
                />
                Simple to use
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Zap
                  size={15}
                  className="text-red-500"
                  aria-hidden="true"
                />
                Everyday PDF workflows
              </span>
            </div>
          </div>

          {/* Category filters */}
          <div className="mt-10 sm:mt-12">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
              Explore tools by category
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
              {categoryFilters.map((category) => {
                const isActive = activeCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => selectCategory(category)}
                    className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100 sm:px-5 sm:text-[15px] ${
                      isActive
                        ? "border-gray-900 bg-gray-900 text-white hover:bg-gray-800"
                        : "border-gray-200 bg-white/90 text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Tool directory */}
      <section
        id="tools"
        aria-labelledby="tools-heading"
        className="scroll-mt-24 px-5 py-12 sm:px-8 sm:py-16"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold text-red-600">
                EXPLORE THE TOOLKIT
              </p>

              <h2
                id="tools-heading"
                className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
              >
                {query.trim()
                  ? `Search results for “${query.trim()}”`
                  : activeCategory === "All tools"
                    ? "Tools for every PDF task"
                    : activeCategory}
              </h2>

              <p className="mt-2 text-sm text-gray-500 sm:text-base">
                Select a tool card to open that tool.
              </p>
            </div>

            <span
              className="text-sm text-gray-500"
              aria-live="polite"
              aria-atomic="true"
            >
              {filteredTools.length}{" "}
              {filteredTools.length === 1 ? "tool" : "tools"} found
            </span>
          </div>

          {filteredTools.length > 0 ? (
            <div className="space-y-12">
              {groupedTools.map(({ category, tools: categoryTools }) => {
                const headingId = `heading-${category
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`;

                return (
                  <section key={category} aria-labelledby={headingId}>
                    <div className="mb-5 flex flex-col gap-2 border-b border-gray-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3
                          id={headingId}
                          className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl"
                        >
                          {category}
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-gray-500">
                          {categoryDescriptions[category]}
                        </p>
                      </div>

                      <span className="text-xs font-medium text-gray-400">
                        {categoryTools.length}{" "}
                        {categoryTools.length === 1 ? "tool" : "tools"}
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {categoryTools.map((tool) => {
                        const Icon = tool.icon;

                        return (
                          <Link
                            key={tool.slug}
                            href={`/tools/${tool.slug}`}
                            className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-red-200 hover:shadow-xl hover:shadow-red-100/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100"
                          >
                            <div
                              className={`flex h-12 w-12 items-center justify-center rounded-xl ${tool.color}`}
                            >
                              <Icon
                                size={24}
                                strokeWidth={1.8}
                                aria-hidden="true"
                              />
                            </div>

                            <p className="mt-5 text-xs font-semibold text-gray-400">
                              {tool.category}
                            </p>

                            <h4 className="mt-1 text-lg font-bold text-gray-900 transition-colors group-hover:text-red-700">
                              {tool.title}
                            </h4>

                            <p className="mt-2 flex-1 text-sm leading-6 text-gray-500">
                              {tool.description}
                            </p>

                            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-600 transition group-hover:gap-3">
                              Open tool
                              <ArrowRight size={16} aria-hidden="true" />
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-12 text-center">
              <Search
                className="mx-auto text-gray-400"
                size={30}
                aria-hidden="true"
              />

              <h3 className="mt-3 font-semibold">
                No matching tools found
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Try another search term or choose a different category.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 rounded-lg px-3 py-2 font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100"
              >
                Show all tools
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Benefits section */}
      
<section
  id="how-it-works"
  className="relative isolate scroll-mt-24 overflow-hidden border-y border-gray-200 bg-white px-5 py-20 sm:px-8 sm:py-28 lg:py-32"
>
  {/* Background decoration */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
  >
    <div className="absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-red-50/80 blur-3xl" />
    <div className="absolute -bottom-48 -left-24 h-80 w-80 rounded-full bg-gray-100/80 blur-3xl" />
    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_0.7px,transparent_0.7px)] [background-size:24px_24px] opacity-40" />
  </div>

  <div className="mx-auto max-w-7xl">
    {/* Section introduction */}
    <div className="mx-auto max-w-3xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-white/90 px-4 py-2 shadow-sm shadow-red-900/[0.03]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.17em] text-red-700 sm:text-xs">
          A smarter way to work with PDFs
        </span>
      </div>

      <h2 className="mt-6 text-4xl font-bold leading-[1.12] tracking-[-0.045em] text-gray-950 sm:text-5xl lg:text-6xl">
        Your documents.
        <br className="hidden sm:block" />{" "}
        <span className="relative inline-block text-red-600">
          Your workflow,
          <span
            aria-hidden="true"
            className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-red-200/80 sm:-bottom-2"
          />
        </span>{" "}
        simplified.
      </h2>

      <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-gray-600 sm:text-lg">
        Everything you need to manage your PDFs in one place.
        Work through everyday document tasks with tools designed
        to make the process clearer, faster, and easier.
      </p>
    </div>

    {/* Benefit cards */}
    <div className="mt-14 grid gap-5 sm:mt-20 md:grid-cols-3 md:gap-6">
      {benefits.map((benefit, index) => {
        const Icon = benefit.icon;

        const cardDetails = [
          {
            number: "01",
            label: "EFFORTLESS WORKFLOW",
            accent: "from-red-500/10 via-red-50/40 to-transparent",
          },
          {
            number: "02",
            label: "BUILT AROUND YOU",
            accent: "from-gray-200/70 via-gray-50/60 to-transparent",
          },
          {
            number: "03",
            label: "READY WHEN YOU ARE",
            accent: "from-red-500/[0.08] via-white to-transparent",
          },
        ];

        const detail = cardDetails[index % cardDetails.length];

        return (
          <article
            key={benefit.title}
            className="group relative flex min-h-[310px] flex-col overflow-hidden rounded-3xl border border-gray-200/90 bg-white p-7 shadow-[0_4px_24px_rgba(17,24,39,0.035)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-red-200 hover:shadow-[0_22px_55px_rgba(127,29,29,0.09)] sm:p-8 lg:p-9"
          >
            {/* Soft card accent */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-br ${detail.accent} opacity-80 transition-opacity duration-300 group-hover:opacity-100`}
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-5 top-2 select-none text-[5.5rem] font-black leading-none tracking-[-0.09em] text-gray-100/80 transition-colors duration-300 group-hover:text-red-50 sm:right-7 sm:text-7xl"
            >
              {detail.number}
            </div>

            <div className="relative flex items-start justify-between gap-4">
              <div className="flex h-[62px] w-[62px] items-center justify-center rounded-2xl border border-red-100 bg-white text-red-600 shadow-sm shadow-red-900/[0.04] transition-all duration-300 group-hover:border-red-600 group-hover:bg-red-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-red-600/20">
                <Icon
                  size={28}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </div>

              <span className="mt-1 rounded-full border border-gray-200/80 bg-white/80 px-2.5 py-1.5 text-[9px] font-bold tracking-[0.12em] text-gray-500 sm:text-[10px]">
                {detail.label}
              </span>
            </div>

            <h3 className="relative mt-8 text-xl font-bold leading-snug tracking-tight text-gray-900 transition-colors duration-300 group-hover:text-red-700 sm:text-2xl">
              {benefit.title}
            </h3>

            <p className="relative mt-4 flex-1 text-sm leading-7 text-gray-600 sm:text-[15px]">
              {benefit.description}
            </p>

            <div className="relative mt-7 flex items-center gap-3 border-t border-gray-100 pt-5">
              <span
                aria-hidden="true"
                className="h-1 w-8 rounded-full bg-red-600 transition-all duration-300 group-hover:w-12"
              />
              <span className="text-xs font-semibold tracking-wide text-gray-500 transition-colors group-hover:text-gray-800">
                Designed for everyday work
              </span>
            </div>
          </article>
        );
      })}
    </div>

    {/* Closing statement */}
    <div className="mt-12 flex flex-col items-center justify-center gap-3 text-center sm:mt-16 sm:flex-row sm:gap-4">
      <div className="flex -space-x-2" aria-hidden="true">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-red-50 text-red-600">
          <IconDocument />
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-gray-600">
          <IconShield />
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-red-100 text-red-700">
          <IconSparkles />
        </span>
      </div>

      <p className="text-sm leading-6 text-gray-600">
        <span className="font-semibold text-gray-900">
          One place for your PDF tasks.
        </span>{" "}
        Less friction, more focus.
      </p>
    </div>
  </div>
</section>


      {/* Privacy section */}
      <section
        id="privacy"
        className="scroll-mt-24 px-5 py-14 sm:px-8 sm:py-16"
      >
        <div className="mx-auto max-w-7xl">
          <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-red-200 hover:shadow-xl hover:shadow-red-900/5 sm:p-8 lg:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-red-50 opacity-70 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
            />

            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-red-500 to-red-700 transition-transform duration-300 group-hover:scale-x-100"
            />

            <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4 sm:gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition-all duration-300 group-hover:border-red-600 group-hover:bg-red-600 group-hover:text-white sm:h-14 sm:w-14">
                  <ShieldCheck
                    size={27}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
                      Your files deserve care.
                    </h2>

                    <span className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                      Privacy matters
                    </span>
                  </div>

                  <p className="max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
                    Your documents deserve transparency and responsible
                    handling. Processing methods can differ by tool, so review
                    how files are handled before uploading sensitive documents.
                  </p>

                  <Link
                    href="/#tools"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-600 transition-colors duration-200 hover:text-red-800"
                  >
                    Explore our PDF tools
                    <span
                      aria-hidden="true"
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </Link>
                </div>
              </div>

              <div className="hidden shrink-0 items-center justify-center sm:flex">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 transition-all duration-300 group-hover:border-red-100 group-hover:bg-red-50">
                  <ShieldCheck
                    size={42}
                    strokeWidth={1.3}
                    className="text-gray-400 transition-colors duration-300 group-hover:text-red-600"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

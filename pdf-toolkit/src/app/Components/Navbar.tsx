
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  FileText,
  Home,
  Layers,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Info,
  Search,
  Menu,
  X,
  ChevronDown,
  ArrowRight,
  Scissors,
  FileImage,
  FileSpreadsheet,
  Presentation,
  Minimize2,
  RotateCw,
  PenLine,
  LockKeyhole,
  UnlockKeyhole,
  Wrench,
  Hash,
  Stamp,
  FileSearch,
  Languages,
  LogIn,
  UserPlus,
  CheckCircle,
} from "lucide-react";

type ToolItem = {
  name: string;
  slug: string;
  description: string;
};

type ToolCategory = {
  name: string;
  description: string;
  icon: typeof FileText;
  tools: ToolItem[];
};

const toolCategories: ToolCategory[] = [
  {
    name: "Organize",
    description: "Manage and arrange PDF pages",
    icon: Layers,
    tools: [
      {
        name: "Merge PDF",
        slug: "merge-pdf",
        description: "Combine multiple PDFs into one file",
      },
      {
        name: "Split PDF",
        slug: "split-pdf",
        description: "Separate a PDF into smaller files",
      },
      {
        name: "Delete PDF Pages",
        slug: "delete-pdf-pages",
        description: "Remove unwanted pages",
      },
      {
        name: "Extract PDF Pages",
        slug: "extract-pdf-pages",
        description: "Save selected pages",
      },
      {
        name: "Reorder PDF Pages",
        slug: "reorder-pdf-pages",
        description: "Rearrange pages in your document",
      },
      {
        name: "Rotate PDF",
        slug: "rotate-pdf",
        description: "Rotate pages to the correct direction",
      },
      
      {
        name: "Edit PDF",
        slug: "edit-pdf",
        description: "Add text, images, shapes, and annotations to a PDF",
      },

    ],
  },
  {
    name: "Convert",
    description: "Convert documents between formats",
    icon: RefreshCw,
    tools: [
      {
        name: "PDF to Word",
        slug: "pdf-to-word",
        description: "Convert PDF files to Word documents",
      },
      {
        name: "PDF to PowerPoint",
        slug: "pdf-to-powerpoint",
        description: "Convert PDF files to presentations",
      },
      {
        name: "PDF to Excel",
        slug: "pdf-to-excel",
        description: "Convert PDF tables to spreadsheets",
      },
      {
        name: "Word to PDF",
        slug: "word-to-pdf",
        description: "Convert Word documents to PDF",
      },
      {
        name: "PowerPoint to PDF",
        slug: "powerpoint-to-pdf",
        description: "Convert presentations to PDF",
      },
      {
        name: "Excel to PDF",
        slug: "excel-to-pdf",
        description: "Convert spreadsheets to PDF",
      },
      {
        name: "Image to PDF",
        slug: "image-to-pdf",
        description: "Create a PDF from images",
      },
      {
        name: "PDF to Images",
        slug: "pdf-to-images",
        description: "Export PDF pages as images",
      },
      {
        name: "PDF to HTML",
        slug: "pdf-to-html",
        description: "Convert a PDF to HTML",
      },
      {
        name: "HTML to PDF",
        slug: "html-to-pdf",
        description: "Convert HTML files to PDF",
      },
    ],
  },
  {
    name: "AI",
    description: "Work smarter with document intelligence",
    icon: Sparkles,
    tools: [
      {
        name: "AI PDF Summarizer",
        slug: "pdf-summarizer",
        description: "Summarize lengthy PDF documents",
      },
      {
        name: "PDF Translator",
        slug: "translate-pdf",
        description: "Translate PDF documents",
      },
      {
        name: "PDF to Text",
        slug: "pdf-to-text",
        description: "Extract readable text from PDFs",
      },
      {
        name: "PDF OCR",
        slug: "pdf-ocr",
        description: "Recognize text in scanned PDFs",
      },
    ],
  },
  {
    name: "Security",
    description: "Protect and manage your documents",
    icon: ShieldCheck,
    tools: [
      {
        name: "Protect PDF",
        slug: "protect-pdf",
        description: "Add password protection to PDFs",
      },
      {
        name: "Unlock PDF",
        slug: "unlock-pdf",
        description: "Remove supported PDF restrictions",
      },
      {
        name: "Sign PDF",
        slug: "sign-pdf",
        description: "Add your signature to a PDF",
      },
    ],
  },
  {
    name: "Optimize",
    description: "Customize and improve your PDFs",
    icon: PenLine,
    tools: [
      {
        name: "Compress PDF",
        slug: "compress-pdf",
        description: "Reduce PDF file size",
      },
      {
        name: "Add Page Numbers",
        slug: "add-page-numbers",
        description: "Number pages automatically",
      },
      {
        name: "Add Watermark",
        slug: "add-watermark",
        description: "Add text or branding to pages",
      },
      {
        name: "Repair PDF",
        slug: "repair-pdf",
        description: "Try to repair a damaged PDF",
      },
    ],
  },
];

const allTools = toolCategories.flatMap((category) => category.tools);

export  function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);

  const navbarRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredTools = searchQuery.trim()
    ? allTools
        .filter((tool) =>
          `${tool.name} ${tool.description} ${tool.slug}`
            .toLowerCase()
            .includes(searchQuery.trim().toLowerCase())
        )
        .slice(0, 7)
    : [];

  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveCategory(null);
    setSearchOpen(false);
    setMobileToolsOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (navbarRef.current && !navbarRef.current.contains(target)) {
        setActiveCategory(null);
        setMobileMenuOpen(false);
      }

      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveCategory(null);
        setMobileMenuOpen(false);
        setSearchOpen(false);
        setMobileToolsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const closeMenus = () => {
    setActiveCategory(null);
    setMobileMenuOpen(false);
    setMobileToolsOpen(false);
    setSearchOpen(false);
  };

  const openTool = (slug: string) => {
    closeMenus();
    setSearchQuery("");
    router.push(`/tools/${slug}`);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const query = searchQuery.trim();

    if (!query) {
      searchInputRef.current?.focus();
      return;
    }

    const exactMatch = allTools.find(
      (tool) =>
        tool.name.toLowerCase() === query.toLowerCase() ||
        tool.slug.toLowerCase() === query.toLowerCase()
    );

    const firstMatch =
      exactMatch ||
      allTools.find((tool) =>
        `${tool.name} ${tool.description} ${tool.slug}`
          .toLowerCase()
          .includes(query.toLowerCase())
      );

    if (firstMatch) {
      openTool(firstMatch.slug);
      return;
    }

    closeMenus();
    router.push(`/?search=${encodeURIComponent(query)}#tools`);
  };

  const isToolActive = (slug: string) => pathname === `/tools/${slug}`;

  const isCategoryActive = (category: ToolCategory) =>
    category.tools.some((tool) => isToolActive(tool.slug));

  return (
    <header
      ref={navbarRef}
      className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Main navbar */}
        <div className="flex min-h-[76px] items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            onClick={closeMenus}
            aria-label="PDF Toolkit homepage"
            className="flex shrink-0 items-center gap-2.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm shadow-red-200">
              <FileText size={23} strokeWidth={2.2} />
            </span>

            <span className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
              PDF
              <span className="text-red-600">Toolkit</span>
            </span>
          </Link>

          {/* Desktop category navigation */}
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 xl:flex"
          >
            <Link
              href="/"
              onClick={closeMenus}
              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                pathname === "/"
                  ? "bg-red-50 text-red-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-red-600"
              }`}
            >
              <Home size={16} />
              Home
            </Link>

            {toolCategories.map((category) => {
              const CategoryIcon = category.icon;
              const isOpen = activeCategory === category.name;
              const isActive = isCategoryActive(category);

              return (
                <div className="relative" key={category.name}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    onClick={() => {
                      setActiveCategory(isOpen ? null : category.name);
                      setSearchOpen(false);
                    }}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                      isOpen || isActive
                        ? "bg-red-50 text-red-600"
                        : "text-gray-700 hover:bg-gray-50 hover:text-red-600"
                    }`}
                  >
                    <CategoryIcon size={16} />
                    {category.name}
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="absolute left-0 top-full z-50 mt-3 w-[350px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60">
                      <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
                            <CategoryIcon size={19} />
                          </span>

                          <div>
                            <p className="font-bold text-gray-900">
                              {category.name}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {category.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="max-h-[360px] overflow-y-auto p-2">
                        {category.tools.map((tool) => (
                          <button
                            type="button"
                            key={tool.slug}
                            onClick={() => openTool(tool.slug)}
                            className={`group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                              isToolActive(tool.slug)
                                ? "bg-red-50"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-white text-gray-500 transition group-hover:border-red-100 group-hover:text-red-600">
                              <FileText size={17} />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span
                                className={`block text-sm font-semibold ${
                                  isToolActive(tool.slug)
                                    ? "text-red-600"
                                    : "text-gray-800 group-hover:text-red-600"
                                }`}
                              >
                                {tool.name}
                              </span>
                              <span className="mt-1 block text-xs leading-5 text-gray-500">
                                {tool.description}
                              </span>
                            </span>

                            <ArrowRight
                              size={15}
                              className="mt-1 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-red-500"
                            />
                          </button>
                        ))}
                      </div>

                      <div className="border-t border-gray-100 p-3">
                        <Link
                          href="/#tools"
                          onClick={closeMenus}
                          className="flex items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                        >
                          Explore all PDF tools
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <Link
              href="/#privacy"
              onClick={closeMenus}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-red-600"
            >
              <Info size={16} />
              About
            </Link>
          </nav>

          {/* Desktop search and authentication */}
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <div ref={searchRef} className="relative">
              <form
                onSubmit={handleSearchSubmit}
                className={`flex items-center rounded-xl border transition-all ${
                  searchOpen
                    ? "border-red-300 bg-white ring-4 ring-red-50"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
              >
                <Search
                  size={17}
                  className="ml-3 shrink-0 text-gray-400"
                />

                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onFocus={() => {
                    setSearchOpen(true);
                    setActiveCategory(null);
                  }}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Find a tool"
                  aria-label="Search PDF tools"
                  className="w-[120px] bg-transparent px-2.5 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:w-[165px] transition-all"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    aria-label="Clear search"
                    className="mr-2 rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </form>

              {searchOpen && searchQuery.trim() && (
                <div className="absolute right-0 top-full z-50 mt-2 w-[340px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                  {filteredTools.length > 0 ? (
                    <>
                      <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                        Matching tools
                      </p>

                      {filteredTools.map((tool) => (
                        <button
                          key={tool.slug}
                          type="button"
                          onClick={() => openTool(tool.slug)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-red-50"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                            <FileText size={17} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-gray-800">
                              {tool.name}
                            </span>
                            <span className="mt-1 block truncate text-xs text-gray-500">
                              {tool.description}
                            </span>
                          </span>
                          <ArrowRight
                            size={15}
                            className="shrink-0 text-gray-400"
                          />
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="px-4 py-5 text-center">
                      <Search
                        size={24}
                        className="mx-auto mb-2 text-gray-300"
                      />
                      <p className="text-sm font-semibold text-gray-700">
                        No matching tools found
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Try a different name or keyword.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link
              href="/login"
              onClick={closeMenus}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-red-600"
            >
              <LogIn size={16} />
              Login
            </Link>

            <Link
              href="/signup"
              onClick={closeMenus}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-red-200 transition hover:bg-red-700 active:scale-[0.98]"
            >
              <UserPlus size={16} />
              Sign Up
            </Link>
          </div>

          {/* Mobile controls */}
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <button
              type="button"
              aria-label="Search PDF tools"
              onClick={() => {
                setSearchOpen(!searchOpen);
                setMobileMenuOpen(false);
                setActiveCategory(null);
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                searchOpen
                  ? "bg-red-50 text-red-600"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Search size={21} />
            </button>

            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                setSearchOpen(false);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-800 transition hover:bg-red-50 hover:text-red-600"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile search panel */}
        {searchOpen && (
          <div className="border-t border-gray-100 py-4 lg:hidden">
            <div ref={searchRef}>
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 focus-within:border-red-300 focus-within:ring-4 focus-within:ring-red-50"
              >
                <Search size={18} className="shrink-0 text-gray-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search PDF tools..."
                  aria-label="Search PDF tools"
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                >
                  Search
                </button>
              </form>

              {searchQuery.trim() && (
                <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white p-1">
                  {filteredTools.length ? (
                    filteredTools.map((tool) => (
                      <button
                        type="button"
                        key={tool.slug}
                        onClick={() => openTool(tool.slug)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-red-50"
                      >
                        <FileText
                          size={18}
                          className="shrink-0 text-red-500"
                        />
                        <span className="flex-1 text-sm font-semibold text-gray-800">
                          {tool.name}
                        </span>
                        <ArrowRight
                          size={15}
                          className="text-gray-400"
                        />
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-4 text-sm text-gray-500">
                      No matching tools found.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile navigation menu */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-100 py-4 lg:hidden">
            <div className="space-y-1">
              <Link
                href="/"
                onClick={closeMenus}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${
                  pathname === "/"
                    ? "bg-red-50 text-red-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Home size={18} />
                Home
              </Link>

              <button
                type="button"
                aria-expanded={mobileToolsOpen}
                onClick={() => setMobileToolsOpen(!mobileToolsOpen)}
                className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-red-600"
              >
                <span className="flex items-center gap-3">
                  <Layers size={18} />
                  Browse PDF tools
                </span>
                <ChevronDown
                  size={17}
                  className={`transition-transform ${
                    mobileToolsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {mobileToolsOpen && (
                <div className="ml-3 space-y-2 border-l-2 border-red-100 py-2 pl-3">
                  {toolCategories.map((category) => {
                    const CategoryIcon = category.icon;
                    const isOpen = activeCategory === category.name;

                    return (
                      <div key={category.name}>
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() =>
                            setActiveCategory(isOpen ? null : category.name)
                          }
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                            isOpen || isCategoryActive(category)
                              ? "bg-red-50 text-red-600"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <CategoryIcon size={17} />
                            {category.name}
                          </span>
                          <ChevronDown
                            size={15}
                            className={`transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {isOpen && (
                          <div className="ml-3 mt-1 space-y-1 border-l border-gray-200 pl-3">
                            {category.tools.map((tool) => (
                              <button
                                key={tool.slug}
                                type="button"
                                onClick={() => openTool(tool.slug)}
                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                                  isToolActive(tool.slug)
                                    ? "bg-red-50 font-semibold text-red-600"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-red-600"
                                }`}
                              >
                                <FileText
                                  size={15}
                                  className="shrink-0"
                                />
                                <span>{tool.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <Link
                href="/#privacy"
                onClick={closeMenus}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-red-600"
              >
                <Info size={18} />
                About
              </Link>
            </div>

            {/* Mobile authentication buttons */}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
              <Link
                href="/login"
                onClick={closeMenus}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <LogIn size={17} />
                Login
              </Link>

              <Link
                href="/signup"
                onClick={closeMenus}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
              >
                <UserPlus size={17} />
                Sign Up
              </Link>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl bg-gray-50 p-3">
              <CheckCircle
                size={17}
                className="mt-0.5 shrink-0 text-green-600"
              />
              <p className="text-xs leading-5 text-gray-500">
                Simple tools for organizing, converting, editing, and securing
                your PDF documents.
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
    
  );
}

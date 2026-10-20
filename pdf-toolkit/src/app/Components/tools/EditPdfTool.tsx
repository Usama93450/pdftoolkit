
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  FileText,
  Upload,
  Type,
  Square,
  Highlighter,
  Pencil,
  ImagePlus,
  Undo2,
  Redo2,
  Download,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Trash2,
  MousePointer2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  X,
  Check,
  Bold,
  Italic,
  Maximize2,
  FilePlus2,
} from "lucide-react";

type Tool = "select" | "text" | "rectangle" | "highlight" | "draw";

type Point = { x: number; y: number };

type Annotation = {
  id: string;
  page: number;
  type: "text" | "rectangle" | "highlight" | "draw" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  color: string;
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
  points?: Point[];
  imageData?: string;
  imageType?: "png" | "jpg";
};

type PdfPage = {
  getViewport: (options: { scale: number }) => {
    width: number;
    height: number;
  };
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
    transform?: number[];
  }) => { promise: Promise<void>; cancel: () => void };
};

type PdfJsDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

type Interaction = {
  id: string;
  mode: "move" | "resize";
  start: Point;
  original: Annotation;
  snapshot: Annotation[];
};

const MAX_PDF_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const COLORS = [
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#111827",
  "#facc15",
];

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function colorToRgb(hex: string) {
  const value = Number.parseInt(hex.replace("#", ""), 16);

  return rgb(
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function EditPdfTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const drawingRef = useRef(false);
  const drawingPointsRef = useRef<Point[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [pdf, setPdf] = useState<PdfJsDocument | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(100);

  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState("#dc2626");
  const [fontSize, setFontSize] = useState(18);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [past, setPast] = useState<Annotation[][]>([]);
  const [future, setFuture] = useState<Annotation[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentPageAnnotations = annotations.filter(
    (item) => item.page === pageNumber
  );

  const selectedAnnotation =
    annotations.find((item) => item.id === selectedId) ?? null;

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const commit = useCallback(
    (next: Annotation[]) => {
      setPast((items) => [...items, annotations]);
      setFuture([]);
      setAnnotations(next);
      setSuccess("");
    },
    [annotations]
  );

  const undo = useCallback(() => {
    if (!past.length) return;

    setFuture((items) => [...items, annotations]);
    setAnnotations(past[past.length - 1]);
    setPast((items) => items.slice(0, -1));
    setSelectedId(null);
    setSuccess("");
    setError("");
  }, [annotations, past]);

  const redo = useCallback(() => {
    if (!future.length) return;

    setPast((items) => [...items, annotations]);
    setAnnotations(future[future.length - 1]);
    setFuture((items) => items.slice(0, -1));
    setSelectedId(null);
    setSuccess("");
    setError("");
  }, [annotations, future]);

  useEffect(() => {
    function handleKeys(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const editingText =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (editingText) return;

      const key = event.key.toLowerCase();
      const modifier = event.ctrlKey || event.metaKey;

      if (modifier && key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (
        modifier &&
        (key === "y" || (key === "z" && event.shiftKey))
      ) {
        event.preventDefault();
        redo();
      } else if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedId
      ) {
        event.preventDefault();
        commit(annotations.filter((item) => item.id !== selectedId));
        setSelectedId(null);
      } else if (event.key === "Escape") {
        setSelectedId(null);
        setTool("select");
      }
    }

    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [annotations, selectedId, commit, undo, redo]);

  async function loadPdf(selectedFile: File) {
    setError("");
    setSuccess("");

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a PDF file.");
      return;
    }

    if (!selectedFile.size || selectedFile.size > MAX_PDF_BYTES) {
      setError("Please select a non-empty PDF smaller than 50 MB.");
      return;
    }

    setLoading(true);

    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

      const bytes = new Uint8Array(await selectedFile.arrayBuffer());
      const loaded = await pdfjs.getDocument({ data: bytes }).promise;

      setFile(selectedFile);
      setPdf(loaded as unknown as PdfJsDocument);
      setPageCount(loaded.numPages);
      setPageNumber(1);
      setZoom(100);
      setAnnotations([]);
      setPast([]);
      setFuture([]);
      setSelectedId(null);
      setDrawingPoints([]);
    } catch (cause) {
      console.error("Could not open PDF:", cause);
      setError(
        "Could not open this PDF. It may be encrypted, damaged, or unsupported."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;

    async function renderPage() {
      if (!pdf || !canvasRef.current) return;

      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;

        const original = page.getViewport({ scale: 1 });
        const scale = (Math.min(1.2, 820 / original.width) * zoom) / 100;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) throw new Error("Canvas is not available.");

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.ceil(viewport.width * pixelRatio);
        canvas.height = Math.ceil(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        setPageSize({ width: viewport.width, height: viewport.height });

        const task = page.render({
          canvasContext: context,
          viewport,
          transform:
            pixelRatio === 1
              ? undefined
              : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });

        renderTask = task;
        await task.promise;
      } catch (cause) {
        if (!cancelled) {
          console.error("Page render error:", cause);
          setError("Unable to render this page.");
        }
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
      try {
        renderTask?.cancel();
      } catch {
        // A render can finish while navigation is changing.
      }
    };
  }, [pdf, pageNumber, zoom]);

  function eventPoint(event: ReactPointerEvent<SVGElement>): Point {
    const bounds = event.currentTarget.getBoundingClientRect();

    return {
      x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
      y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1),
    };
  }

  function addAnnotation(annotation: Omit<Annotation, "id">) {
    const next = [...annotations, { ...annotation, id: newId() }];
    commit(next);
    setSelectedId(next[next.length - 1].id);
    setError("");
  }

  function placeAnnotation(event: ReactPointerEvent<SVGSVGElement>) {
    if (tool === "select" || tool === "draw") return;

    const point = eventPoint(event);

    if (tool === "text") {
      const text = window.prompt("Enter the text to add:");

      if (text?.trim()) {
        addAnnotation({
          page: pageNumber,
          type: "text",
          x: point.x,
          y: point.y,
          width: 0.3,
          height: 0.06,
          text: text.trim(),
          color,
          fontSize,
          bold,
          italic,
        });
      }

      return;
    }

    if (tool === "rectangle" || tool === "highlight") {
      addAnnotation({
        page: pageNumber,
        type: tool,
        x: point.x,
        y: point.y,
        width: 0.22,
        height: tool === "highlight" ? 0.035 : 0.09,
        color,
        fontSize,
      });
    }
  }

  function startDraw(event: ReactPointerEvent<SVGSVGElement>) {
    if (tool !== "draw") return;

    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;

    const point = eventPoint(event);
    drawingPointsRef.current = [point];
    setDrawingPoints([point]);
  }

  function continueDraw(event: ReactPointerEvent<SVGSVGElement>) {
    if (tool !== "draw" || !drawingRef.current) return;

    const point = eventPoint(event);
    drawingPointsRef.current = [...drawingPointsRef.current, point];
    setDrawingPoints(drawingPointsRef.current);
  }

  function finishDraw() {
    if (!drawingRef.current) return;

    drawingRef.current = false;
    const points = drawingPointsRef.current;

    if (points.length > 1) {
      addAnnotation({
        page: pageNumber,
        type: "draw",
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        points,
        color,
        fontSize,
      });
    }

    drawingPointsRef.current = [];
    setDrawingPoints([]);
  }

  function startInteraction(
    event: ReactPointerEvent<SVGElement>,
    annotation: Annotation,
    mode: "move" | "resize"
  ) {
    if (tool !== "select") return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    setSelectedId(annotation.id);

    interactionRef.current = {
      id: annotation.id,
      mode,
      start: eventPoint(event),
      original: { ...annotation },
      snapshot: annotations,
    };
  }

  function continueInteraction(event: ReactPointerEvent<SVGElement>) {
    const interaction = interactionRef.current;
    if (!interaction || !pageSize.width || !pageSize.height) return;

    const current = eventPoint(event);
    const dx = current.x - interaction.start.x;
    const dy = current.y - interaction.start.y;
    const original = interaction.original;

    setAnnotations((items) =>
      items.map((item) => {
        if (item.id !== interaction.id) return item;

        if (interaction.mode === "move") {
          return {
            ...item,
            x: clamp(original.x + dx, 0, 1 - original.width),
            y: clamp(original.y + dy, 0, 1 - original.height),
          };
        }

        return {
          ...item,
          width: clamp(original.width + dx, 0.015, 1 - original.x),
          height: clamp(original.height + dy, 0.015, 1 - original.y),
        };
      })
    );
  }

  function finishInteraction() {
    const interaction = interactionRef.current;
    if (!interaction) return;

    interactionRef.current = null;

    setPast((items) => [...items, interaction.snapshot]);
    setFuture([]);
    setSuccess("");
  }

  function addImage(event: React.ChangeEvent<HTMLInputElement>) {
    const imageFile = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!imageFile) return;

    if (!["image/png", "image/jpeg"].includes(imageFile.type)) {
      setError("Choose a PNG or JPEG image.");
      return;
    }

    if (imageFile.size > MAX_IMAGE_BYTES) {
      setError("Choose an image smaller than 10 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("Could not read the image.");
        return;
      }

      addAnnotation({
        page: pageNumber,
        type: "image",
        x: 0.3,
        y: 0.3,
        width: 0.3,
        height: 0.2,
        color,
        fontSize,
        imageData: reader.result,
        imageType: imageFile.type === "image/png" ? "png" : "jpg",
      });

      setTool("select");
    };

    reader.onerror = () => setError("Could not read the image.");
    reader.readAsDataURL(imageFile);
  }

  function updateSelected(changes: Partial<Annotation>) {
    if (!selectedId) return;

    commit(
      annotations.map((item) =>
        item.id === selectedId ? { ...item, ...changes } : item
      )
    );
  }

  function deleteSelected() {
    if (!selectedId) return;
    commit(annotations.filter((item) => item.id !== selectedId));
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selectedAnnotation) return;

    const duplicate: Annotation = {
      ...selectedAnnotation,
      id: newId(),
      x: clamp(selectedAnnotation.x + 0.025, 0, 0.95),
      y: clamp(selectedAnnotation.y + 0.025, 0, 0.95),
    };

    commit([...annotations, duplicate]);
    setSelectedId(duplicate.id);
  }

  function clearAllEdits() {
    if (!annotations.length) return;

    if (!window.confirm("Remove all edits from this document?")) return;

    commit([]);
    setSelectedId(null);
  }

  async function savePdf() {
    if (!file || saving) return;

    if (!annotations.length) {
      setError("Add at least one edit before downloading.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const sourceBytes = new Uint8Array(await file.arrayBuffer());
      const document = await PDFDocument.load(sourceBytes);
      const pages = document.getPages();

      const regularFont = await document.embedFont(StandardFonts.Helvetica);
      const boldFont = await document.embedFont(StandardFonts.HelveticaBold);
      const italicFont = await document.embedFont(StandardFonts.HelveticaOblique);
      const boldItalicFont = await document.embedFont(
        StandardFonts.HelveticaBoldOblique
      );

      for (const item of annotations) {
        const page = pages[item.page - 1];
        if (!page) continue;

        const { width, height } = page.getSize();
        const x = item.x * width;
        const top = item.y * height;
        const w = item.width * width;
        const h = item.height * height;
        const fill = colorToRgb(item.color);

        if (item.type === "text" && item.text) {
          const font = item.bold
            ? item.italic
              ? boldItalicFont
              : boldFont
            : item.italic
              ? italicFont
              : regularFont;

          const size = item.fontSize;

          page.drawText(item.text, {
            x,
            y: height - top - size,
            size,
            font,
            color: fill,
            maxWidth: Math.max(10, width - x - 5),
            lineHeight: size * 1.2,
          });
        }

        if (item.type === "rectangle") {
          page.drawRectangle({
            x,
            y: height - top - h,
            width: Math.min(w, width - x),
            height: Math.min(h, height - top),
            borderColor: fill,
            borderWidth: 2,
          });
        }

        if (item.type === "highlight") {
          page.drawRectangle({
            x,
            y: height - top - h,
            width: Math.min(w, width - x),
            height: Math.min(h, height - top),
            color: fill,
            opacity: 0.28,
          });
        }

        if (item.type === "draw" && item.points) {
          for (let index = 1; index < item.points.length; index++) {
            const start = item.points[index - 1];
            const end = item.points[index];

            page.drawLine({
              start: {
                x: start.x * width,
                y: height - start.y * height,
              },
              end: {
                x: end.x * width,
                y: height - end.y * height,
              },
              thickness: 2.5,
              color: fill,
            });
          }
        }

        if (item.type === "image" && item.imageData) {
          const response = await fetch(item.imageData);
          const imageBytes = await response.arrayBuffer();

          const image =
            item.imageType === "png"
              ? await document.embedPng(imageBytes)
              : await document.embedJpg(imageBytes);

          const drawWidth = Math.min(w, width - x);
          const drawHeight = Math.min(
            drawWidth * (image.height / image.width),
            height - top
          );

          page.drawImage(image, {
            x,
            y: height - top - drawHeight,
            width: drawWidth,
            height: drawHeight,
          });
        }
      }

      const result = await document.save();
      const output = new Blob([new Uint8Array(result).buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const baseName = file.name.replace(/\.pdf$/i, "") || "document";

      downloadBlob(output, `${baseName}-edited.pdf`);
      setSuccess("Your edited PDF has been downloaded.");
    } catch (cause) {
      console.error("PDF export error:", cause);
      setError(
        "Could not export this PDF. It may be encrypted or contain unsupported features."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetEditor() {
    setFile(null);
    setPdf(null);
    setPageNumber(1);
    setPageCount(0);
    setPageSize({ width: 0, height: 0 });
    setAnnotations([]);
    setPast([]);
    setFuture([]);
    setSelectedId(null);
    setTool("select");
    setError("");
    setSuccess("");
  }

  const visibleAnnotations = [
    ...currentPageAnnotations,
    ...(drawingPoints.length > 1
      ? [
          {
            id: "active-drawing",
            page: pageNumber,
            type: "draw" as const,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            points: drawingPoints,
            color,
            fontSize,
          },
        ]
      : []),
  ];

  const toolButton = (
    value: Tool,
    label: string,
    Icon: typeof Type
  ) => (
    <button
      key={value}
      type="button"
      onClick={() => setTool(value)}
      title={label}
      aria-label={label}
      aria-pressed={tool === value}
      className={`flex min-w-[64px] flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
        tool === value
          ? "bg-red-50 text-red-700 ring-1 ring-red-200"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <Icon size={20} />
      {label}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {!file ? (
        <div className="p-5 sm:p-10">
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const droppedFile = event.dataTransfer.files?.[0];
              if (droppedFile) void loadPdf(droppedFile);
            }}
            className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 py-12 text-center transition hover:border-red-300 hover:bg-red-50/30 sm:px-10"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <FilePlus2 size={31} />
            </div>

            <h2 className="mt-5 text-2xl font-extrabold text-gray-900">
              Your PDF editing workspace
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-500">
              Add and style text, insert images, draw shapes, highlight content,
              and move your annotations on the page.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(event) => {
                const selected = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (selected) void loadPdf(selected);
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-7 py-3.5 font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle size={19} className="animate-spin" />
              ) : (
                <Upload size={19} />
              )}
              {loading ? "Opening PDF..." : "Choose PDF file"}
            </button>

            <p className="mt-4 text-xs text-gray-500">
              PDF only · Maximum file size 50 MB
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Editor title bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <FileText size={21} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-gray-900">
                  {file.name}
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {pageCount} page{pageCount === 1 ? "" : "s"} ·{" "}
                  {annotations.length} edit{annotations.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className="rounded-lg p-2.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
              >
                <Undo2 size={18} />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                title="Redo (Ctrl+Y)"
                className="rounded-lg p-2.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
              >
                <Redo2 size={18} />
              </button>
              <button
                type="button"
                onClick={resetEditor}
                disabled={saving}
                title="Choose another PDF"
                className="ml-1 rounded-lg p-2.5 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Main editing tools */}
          <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-white p-2 sm:px-4">
            {toolButton("select", "Select", MousePointer2)}
            {toolButton("text", "Text", Type)}
            {toolButton("rectangle", "Shape", Square)}
            {toolButton("highlight", "Highlight", Highlighter)}
            {toolButton("draw", "Draw", Pencil)}

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex min-w-[64px] flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              <ImagePlus size={20} />
              Image
            </button>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={addImage}
            />

            <div className="mx-1 hidden h-9 w-px bg-gray-200 md:block" />

            <div className="ml-auto flex items-center gap-1 rounded-xl bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setZoom((value) => Math.max(50, value - 10))}
                disabled={zoom <= 50}
                title="Zoom out"
                className="rounded-lg p-2 text-gray-600 hover:bg-white disabled:opacity-30"
              >
                <ZoomOut size={18} />
              </button>
              <button
                type="button"
                onClick={() => setZoom(100)}
                title="Reset zoom"
                className="min-w-12 rounded-lg px-1 py-2 text-xs font-bold text-gray-700 hover:bg-white"
              >
                {zoom}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((value) => Math.min(150, value + 10))}
                disabled={zoom >= 150}
                title="Zoom in"
                className="rounded-lg p-2 text-gray-600 hover:bg-white disabled:opacity-30"
              >
                <ZoomIn size={18} />
              </button>
            </div>
          </div>

          {/* Color and typography controls */}
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Style
            </span>

            <div className="flex items-center gap-1.5">
              {COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => {
                    setColor(swatch);
                    if (selectedAnnotation) {
                      updateSelected({ color: swatch });
                    }
                  }}
                  title={swatch}
                  aria-label={`Choose color ${swatch}`}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition ${
                    color === swatch
                      ? "border-gray-800 ring-2 ring-white"
                      : "border-white shadow-sm"
                  }`}
                  style={{ backgroundColor: swatch }}
                >
                  {color === swatch && (
                    <Check
                      size={13}
                      className={
                        swatch === "#facc15" ? "text-gray-900" : "text-white"
                      }
                    />
                  )}
                </button>
              ))}

              <label
                title="Custom color"
                className="ml-1 flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-white"
              >
                <input
                  type="color"
                  value={color}
                  onChange={(event) => {
                    const value = event.target.value;
                    setColor(value);
                    if (selectedAnnotation) {
                      updateSelected({ color: value });
                    }
                  }}
                  className="h-10 w-10 cursor-pointer border-0 bg-transparent p-0"
                  aria-label="Custom annotation color"
                />
              </label>
            </div>

            {(tool === "text" || selectedAnnotation?.type === "text") && (
              <>
                <div className="hidden h-7 w-px bg-gray-200 sm:block" />

                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                  Size
                  <select
                    value={selectedAnnotation?.type === "text"
                      ? selectedAnnotation.fontSize
                      : fontSize}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setFontSize(value);
                      if (selectedAnnotation?.type === "text") {
                        updateSelected({ fontSize: value });
                      }
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm outline-none focus:border-red-300"
                  >
                    {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48].map(
                      (size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    const next = !(selectedAnnotation?.type === "text"
                      ? selectedAnnotation.bold
                      : bold);
                    setBold(next);
                    if (selectedAnnotation?.type === "text") {
                      updateSelected({ bold: next });
                    }
                  }}
                  title="Bold"
                  aria-pressed={
                    selectedAnnotation?.type === "text"
                      ? !!selectedAnnotation.bold
                      : bold
                  }
                  className={`rounded-lg border p-2 ${
                    (selectedAnnotation?.type === "text"
                      ? selectedAnnotation.bold
                      : bold)
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Bold size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = !(selectedAnnotation?.type === "text"
                      ? selectedAnnotation.italic
                      : italic);
                    setItalic(next);
                    if (selectedAnnotation?.type === "text") {
                      updateSelected({ italic: next });
                    }
                  }}
                  title="Italic"
                  aria-pressed={
                    selectedAnnotation?.type === "text"
                      ? !!selectedAnnotation.italic
                      : italic
                  }
                  className={`rounded-lg border p-2 ${
                    (selectedAnnotation?.type === "text"
                      ? selectedAnnotation.italic
                      : italic)
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Italic size={16} />
                </button>
              </>
            )}
          </div>

          {/* Page navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPageNumber((value) => Math.max(1, value - 1))}
                disabled={pageNumber <= 1}
                aria-label="Previous page"
                className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>

              <span className="min-w-24 text-center text-sm font-semibold text-gray-700">
                Page {pageNumber} of {pageCount}
              </span>

              <button
                type="button"
                onClick={() =>
                  setPageNumber((value) => Math.min(pageCount, value + 1))
                }
                disabled={pageNumber >= pageCount}
                aria-label="Next page"
                className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-gray-500 sm:inline">
                {currentPageAnnotations.length} edit
                {currentPageAnnotations.length === 1 ? "" : "s"} on this page
              </span>
              <button
                type="button"
                onClick={clearAllEdits}
                disabled={!annotations.length}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-gray-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
              >
                <RotateCcw size={14} />
                Clear all
              </button>
            </div>
          </div>

          {/* Workspace and properties panel */}
          <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div
              ref={stageRef}
              className="min-w-0 overflow-auto bg-gray-100 p-4 sm:p-6"
            >
              <p className="mb-4 text-center text-xs text-gray-500">
                {tool === "select"
                  ? "Select an annotation to move or resize it. Use Delete to remove it."
                  : tool === "text"
                    ? "Click on the page to add text."
                    : tool === "draw"
                      ? "Press and drag on the page to draw."
                      : `Click on the page to add a ${tool === "highlight" ? "highlight" : "rectangle"}.`}
              </p>

              <div className="mx-auto w-fit max-w-full rounded-sm bg-white shadow-lg">
                <div
                  className="relative"
                  style={{
                    width: pageSize.width || undefined,
                    height: pageSize.height || undefined,
                  }}
                >
                  <canvas ref={canvasRef} className="block max-w-full" />

                  {pageSize.width > 0 && pageSize.height > 0 && (
                    <svg
                      viewBox={`0 0 ${pageSize.width} ${pageSize.height}`}
                      preserveAspectRatio="none"
                      className={`absolute inset-0 h-full w-full ${
                        tool === "select"
                          ? "cursor-default"
                          : tool === "text"
                            ? "cursor-text"
                            : "cursor-crosshair"
                      }`}
                      onPointerDown={startDraw}
                      onPointerMove={continueDraw}
                      onPointerUp={finishDraw}
                      onPointerCancel={finishDraw}
                      onClick={placeAnnotation}
                      onPointerLeave={() => {
                        if (tool === "draw") finishDraw();
                      }}
                    >
                      {visibleAnnotations.map((item) => {
                        const x = item.x * pageSize.width;
                        const y = item.y * pageSize.height;
                        const w = item.width * pageSize.width;
                        const h = item.height * pageSize.height;
                        const isSelected = item.id === selectedId;
                        const isActiveDraw = item.id === "active-drawing";

                        let path = "";
                        if (item.type === "draw" && item.points) {
                          path = item.points
                            .map((point, index) => {
                              const px = point.x * pageSize.width;
                              const py = point.y * pageSize.height;
                              return `${index === 0 ? "M" : "L"} ${px} ${py}`;
                            })
                            .join(" ");
                        }

                        return (
                          <g key={item.id}>
                            {item.type === "text" && (
                              <text
                                x={x}
                                y={y + item.fontSize * 0.9}
                                fill={item.color}
                                fontSize={item.fontSize}
                                fontWeight={item.bold ? "bold" : "normal"}
                                fontStyle={item.italic ? "italic" : "normal"}
                                pointerEvents="none"
                              >
                                {item.text}
                              </text>
                            )}

                            {item.type === "rectangle" && (
                              <rect
                                x={x}
                                y={y}
                                width={w}
                                height={h}
                                fill="none"
                                stroke={item.color}
                                strokeWidth={2}
                              />
                            )}

                            {item.type === "highlight" && (
                              <rect
                                x={x}
                                y={y}
                                width={w}
                                height={h}
                                fill={item.color}
                                fillOpacity={0.28}
                              />
                            )}

                            {item.type === "image" && item.imageData && (
                              <image
                                href={item.imageData}
                                x={x}
                                y={y}
                                width={w}
                                height={h}
                                preserveAspectRatio="xMidYMid meet"
                                pointerEvents="none"
                              />
                            )}

                            {item.type === "draw" && (
                              <path
                                d={path}
                                fill="none"
                                stroke={item.color}
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                pointerEvents="none"
                              />
                            )}

                            {!isActiveDraw &&
                              item.type !== "draw" &&
                              tool === "select" && (
                                <rect
                                  x={x}
                                  y={y}
                                  width={Math.max(w, 12)}
                                  height={Math.max(h, 12)}
                                  fill="transparent"
                                  stroke="transparent"
                                  className="cursor-move"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedId(item.id);
                                  }}
                                  onPointerDown={(event) =>
                                    startInteraction(event, item, "move")
                                  }
                                />
                              )}

                            {isSelected &&
                              tool === "select" &&
                              !isActiveDraw && (
                                <>
                                  <rect
                                    x={x - 2}
                                    y={y - 2}
                                    width={Math.max(w, 12) + 4}
                                    height={Math.max(h, 12) + 4}
                                    fill="none"
                                    stroke="#2563eb"
                                    strokeWidth={1.3}
                                    strokeDasharray="4 3"
                                    className="cursor-move"
                                    onPointerDown={(event) =>
                                      startInteraction(event, item, "move")
                                    }
                                  />
                                  <rect
                                    x={x + Math.max(w, 12) - 5}
                                    y={y + Math.max(h, 12) - 5}
                                    width={10}
                                    height={10}
                                    rx={2}
                                    fill="#2563eb"
                                    stroke="white"
                                    strokeWidth={1}
                                    className="cursor-nwse-resize"
                                    onPointerDown={(event) =>
                                      startInteraction(event, item, "resize")
                                    }
                                  />
                                </>
                              )}
                          </g>
                        );
                      })}

                      {/* Capture drag interactions across the whole page */}
                      <rect
                        x={0}
                        y={0}
                        width={pageSize.width}
                        height={pageSize.height}
                        fill="transparent"
                        pointerEvents="none"
                        onPointerMove={(event) => {
                          if (interactionRef.current) {
                            continueInteraction(event);
                          }
                        }}
                      />
                    </svg>
                  )}

                  {/* The SVG page handles drawing; this layer routes selected-object dragging. */}
                  {tool === "select" && selectedAnnotation && (
                    <div
                      className="absolute inset-0"
                      style={{ pointerEvents: "none" }}
                      onPointerMove={(event) => {
                        if (interactionRef.current && stageRef.current) {
                          const svg = stageRef.current.querySelector("svg");
                          if (svg) {
                            const rect = svg.getBoundingClientRect();
                            const syntheticPoint = {
                              x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
                              y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
                            };
                            const interaction = interactionRef.current;
                            const dx = syntheticPoint.x - interaction.start.x;
                            const dy = syntheticPoint.y - interaction.start.y;
                            const original = interaction.original;

                            setAnnotations((items) =>
                              items.map((item) => {
                                if (item.id !== interaction.id) return item;

                                return interaction.mode === "move"
                                  ? {
                                      ...item,
                                      x: clamp(original.x + dx, 0, 1 - original.width),
                                      y: clamp(original.y + dy, 0, 1 - original.height),
                                    }
                                  : {
                                      ...item,
                                      width: clamp(original.width + dx, 0.015, 1 - original.x),
                                      height: clamp(original.height + dy, 0.015, 1 - original.y),
                                    };
                              })
                            );
                          }
                        }
                      }}
                      onPointerUp={finishInteraction}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Properties panel */}
            <aside className="border-t border-gray-200 bg-white p-4 lg:border-l lg:border-t-0">
              <h3 className="text-sm font-extrabold text-gray-900">
                Properties
              </h3>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Select an annotation to manage its settings.
              </p>

              {selectedAnnotation ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Selected object
                    </p>
                    <p className="mt-1 font-bold capitalize text-gray-900">
                      {selectedAnnotation.type}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Page {selectedAnnotation.page}
                    </p>
                  </div>

                  {selectedAnnotation.type === "text" && (
                    <>
                      <label className="block text-xs font-semibold text-gray-600">
                        Text content
                        <textarea
                          value={selectedAnnotation.text ?? ""}
                          onChange={(event) =>
                            setAnnotations((items) =>
                              items.map((item) =>
                                item.id === selectedId
                                  ? { ...item, text: event.target.value }
                                  : item
                              )
                            )
                          }
                          onBlur={() => {
                            setPast((items) => [...items, past.length ? past[past.length - 1] : annotations]);
                          }}
                          rows={3}
                          className="mt-2 w-full resize-y rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal text-gray-800 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-50"
                        />
                      </label>

                      <label className="block text-xs font-semibold text-gray-600">
                        Font size
                        <input
                          type="number"
                          min={6}
                          max={96}
                          value={selectedAnnotation.fontSize}
                          onChange={(event) =>
                            updateSelected({
                              fontSize: clamp(Number(event.target.value) || 18, 6, 96),
                            })
                          }
                          className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-red-300"
                        />
                      </label>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateSelected({ bold: !selectedAnnotation.bold })
                          }
                          className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${
                            selectedAnnotation.bold
                              ? "border-red-200 bg-red-50 text-red-600"
                              : "border-gray-200 text-gray-600"
                          }`}
                        >
                          <Bold size={15} /> Bold
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSelected({ italic: !selectedAnnotation.italic })
                          }
                          className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${
                            selectedAnnotation.italic
                              ? "border-red-200 bg-red-50 text-red-600"
                              : "border-gray-200 text-gray-600"
                          }`}
                        >
                          <Italic size={15} /> Italic
                        </button>
                      </div>
                    </>
                  )}

                  <label className="block text-xs font-semibold text-gray-600">
                    Object color
                    <input
                      type="color"
                      value={selectedAnnotation.color}
                      onChange={(event) =>
                        updateSelected({ color: event.target.value })
                      }
                      className="mt-2 h-10 w-full cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={duplicateSelected}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                    >
                      <Copy size={15} /> Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={deleteSelected}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                    Drag the selected object to move it. Drag the blue corner
                    handle to resize it.
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center">
                  <Maximize2
                    size={24}
                    className="mx-auto text-gray-300"
                  />
                  <p className="mt-3 text-sm font-semibold text-gray-700">
                    Nothing selected
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Select an annotation on the page to edit its properties.
                  </p>
                </div>
              )}

              <div className="mt-5 border-t border-gray-100 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Page edits
                </h4>

                {currentPageAnnotations.length ? (
                  <div className="mt-2 space-y-1">
                    {currentPageAnnotations.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                          selectedId === item.id
                            ? "bg-red-50 font-semibold text-red-700"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {item.type === "text"
                            ? item.text || "Text"
                            : item.type === "image"
                              ? "Image"
                              : item.type}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs leading-5 text-gray-400">
                    No edits on this page yet.
                  </p>
                )}
              </div>
            </aside>
          </div>

          {/* Download footer */}
          <div className="flex flex-col gap-3 border-t border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs leading-5 text-gray-500">
              Your changes are not saved to the original file until you download.
            </p>

            <button
              type="button"
              onClick={savePdf}
              disabled={saving || !annotations.length}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {saving ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              {saving ? "Preparing PDF..." : "Download edited PDF"}
            </button>
          </div>
        </>
      )}

      {error && (
        <div
          role="alert"
          className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="m-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm leading-6 text-green-700"
        >
          {success}
        </div>
      )}
    </div>
  );
}

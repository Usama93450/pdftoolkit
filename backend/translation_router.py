
from __future__ import annotations

import io
import json
import logging
import os
import re
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

import fitz
import httpx
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

logger = logging.getLogger(__name__)
router = APIRouter(tags=["PDF Translation"])

MAX_FILE_SIZE = 50 * 1024 * 1024
MAX_PAGES = 50
MAX_TARGET_LANGUAGES = 10
MAX_OCR_TEXT_CHARS = 5_000_000
CHUNK_SIZE = 4000

TRANSLATE_URL = os.getenv(
    "LIBRETRANSLATE_URL",
    "http://127.0.0.1:5000",
).strip().rstrip("/")

TRANSLATE_API_KEY = os.getenv(
    "LIBRETRANSLATE_API_KEY",
    "",
).strip()

FALLBACK_LANGUAGES = [
    {"code": "en", "name": "English"},
    {"code": "ur", "name": "Urdu"},
    {"code": "ar", "name": "Arabic"},
    {"code": "hi", "name": "Hindi"},
    {"code": "es", "name": "Spanish"},
    {"code": "fr", "name": "French"},
    {"code": "de", "name": "German"},
    {"code": "it", "name": "Italian"},
    {"code": "pt", "name": "Portuguese"},
    {"code": "tr", "name": "Turkish"},
    {"code": "zh", "name": "Chinese"},
    {"code": "ja", "name": "Japanese"},
    {"code": "ko", "name": "Korean"},
    {"code": "ru", "name": "Russian"},
    {"code": "bn", "name": "Bengali"},
    {"code": "id", "name": "Indonesian"},
    {"code": "nl", "name": "Dutch"},
    {"code": "pl", "name": "Polish"},
    {"code": "uk", "name": "Ukrainian"},
    {"code": "vi", "name": "Vietnamese"},
    {"code": "fa", "name": "Persian"},
    {"code": "el", "name": "Greek"},
    {"code": "sv", "name": "Swedish"},
    {"code": "cs", "name": "Czech"},
]

LANGUAGE_CODE_PATTERN = re.compile(r"^[a-zA-Z_-]{2,20}$")


def get_font_path() -> str:
    """Find a Unicode TrueType font for generated PDFs."""
    candidates = [
        os.getenv("PDF_TRANSLATION_FONT", ""),
        os.getenv("PDF_UNICODE_FONT", ""),
        r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\tahoma.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]

    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return candidate

    raise HTTPException(
        status_code=500,
        detail=(
            "No Unicode TrueType font was found. Set PDF_TRANSLATION_FONT "
            "to the full path of a suitable .ttf font."
        ),
    )


def extract_pages(content: bytes) -> list[str]:
    """Extract selectable text from a PDF using PyMuPDF."""
    try:
        with fitz.open(stream=content, filetype="pdf") as pdf:
            if pdf.needs_pass:
                raise HTTPException(
                    status_code=400,
                    detail="This PDF is password-protected. Unlock it first.",
                )

            if pdf.page_count == 0:
                raise HTTPException(
                    status_code=400,
                    detail="The PDF contains no pages.",
                )

            if pdf.page_count > MAX_PAGES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Translation supports up to {MAX_PAGES} pages.",
                )

            pages = [
                page.get_text("text", sort=True).strip()
                for page in pdf
            ]

            if not any(page.strip() for page in pages):
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "No selectable text was found. OCR text is required "
                        "for this scanned PDF."
                    ),
                )

            return pages

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("PDF text extraction failed")
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid readable PDF.",
        ) from exc


def parse_ocr_pages(raw: str) -> list[str] | None:
    """Validate optional page-by-page text extracted by browser OCR."""
    if not raw or not raw.strip():
        return None

    try:
        value = json.loads(raw)
    except (json.JSONDecodeError, TypeError) as exc:
        raise HTTPException(
            status_code=400,
            detail="OCR text must be a valid JSON array of page strings.",
        ) from exc

    if not isinstance(value, list) or not value:
        raise HTTPException(
            status_code=400,
            detail="OCR text must contain an array of page strings.",
        )

    if len(value) > MAX_PAGES:
        raise HTTPException(
            status_code=400,
            detail=f"OCR supports up to {MAX_PAGES} pages.",
        )

    if not all(isinstance(page, str) for page in value):
        raise HTTPException(
            status_code=400,
            detail="Each OCR page must be a string.",
        )

    pages = [page.strip() for page in value]

    if sum(len(page) for page in pages) > MAX_OCR_TEXT_CHARS:
        raise HTTPException(
            status_code=413,
            detail="The extracted OCR text is too large to translate.",
        )

    if not any(page for page in pages):
        raise HTTPException(
            status_code=422,
            detail=(
                "OCR did not recognize readable text. Try a clearer scan "
                "or select the correct original language."
            ),
        )

    return pages


def split_text(text: str, limit: int = CHUNK_SIZE) -> list[str]:
    """Split long text into manageable translation requests."""
    chunks: list[str] = []
    remaining = text

    while len(remaining) > limit:
        split_at = remaining.rfind(" ", 0, limit + 1)

        if split_at < limit // 2:
            split_at = limit

        chunks.append(remaining[:split_at])
        remaining = remaining[split_at:].lstrip()

    if remaining:
        chunks.append(remaining)

    return chunks


async def fetch_languages(
    client: httpx.AsyncClient,
) -> list[dict[str, str]]:
    """Fetch the supported languages from LibreTranslate."""
    response = await client.get(f"{TRANSLATE_URL}/languages")
    response.raise_for_status()

    result = response.json()

    if not isinstance(result, list):
        raise ValueError(
            "Translation service returned an invalid language list."
        )

    languages = [
        {"code": item["code"], "name": item["name"]}
        for item in result
        if isinstance(item, dict)
        and isinstance(item.get("code"), str)
        and isinstance(item.get("name"), str)
    ]

    if not languages:
        raise ValueError(
            "Translation service returned no languages."
        )

    return languages


def parse_target_languages(raw: str) -> list[str]:
    """
    Parse target_languages from a multipart form field.

    The frontend normally sends a JSON-encoded array, such as:
        ["ur", "fr"]

    This also accepts a single code such as:
        ur

    Malformed JSON objects, numbers, empty arrays and invalid codes
    are rejected with a clear HTTP 400 response.
    """
    if not isinstance(raw, str) or not raw.strip():
        raise HTTPException(
            status_code=400,
            detail=(
                'target_languages must be a JSON array, '
                'such as ["ur","fr"].'
            ),
        )

    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        # Backward compatibility for a single plain language code.
        value = raw.strip()

    if isinstance(value, str):
        value = [value]

    if not isinstance(value, list) or not value:
        raise HTTPException(
            status_code=400,
            detail=(
                'target_languages must be a JSON array, '
                'such as ["ur","fr"].'
            ),
        )

    if len(value) > MAX_TARGET_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Select no more than {MAX_TARGET_LANGUAGES} languages."
            ),
        )

    targets: list[str] = []

    for item in value:
        if not isinstance(item, str):
            raise HTTPException(
                status_code=400,
                detail="Each target language must be a language code.",
            )

        code = item.strip()

        if not LANGUAGE_CODE_PATTERN.fullmatch(code):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid target language code: {code}",
            )

        if code.lower() == "auto":
            raise HTTPException(
                status_code=400,
                detail="Automatic detection cannot be a target language.",
            )

        if code not in targets:
            targets.append(code)

    if not targets:
        raise HTTPException(
            status_code=400,
            detail="Select at least one target language.",
        )

    return targets


async def translate_chunk(
    client: httpx.AsyncClient,
    text: str,
    target: str,
    source: str,
) -> str:
    """Translate one text chunk through LibreTranslate."""
    if not text.strip():
        return text

    payload: dict[str, str] = {
        "q": text,
        "source": source,
        "target": target,
        "format": "text",
    }

    if TRANSLATE_API_KEY:
        payload["api_key"] = TRANSLATE_API_KEY

    try:
        response = await client.post(
            f"{TRANSLATE_URL}/translate",
            json=payload,
        )
    except httpx.RequestError as exc:
        logger.exception(
            "LibreTranslate request failed. URL=%s/translate error=%r",
            TRANSLATE_URL,
            exc,
        )
        raise HTTPException(
            status_code=502,
            detail=(
                "Cannot connect to the translation service. "
                "Check LIBRETRANSLATE_URL and the LibreTranslate Railway logs."
            ),
        ) from exc

    if response.status_code == 429:
        raise HTTPException(
            status_code=429,
            detail="Translation rate limit reached. Try again later.",
        )

    if response.status_code in (401, 403):
        logger.error(
            "LibreTranslate rejected credentials: HTTP %s: %s",
            response.status_code,
            response.text[:500],
        )
        raise HTTPException(
            status_code=502,
            detail=(
                "The translation service rejected its API credentials. "
                "Check LIBRETRANSLATE_API_KEY."
            ),
        )

    if response.is_error:
        logger.error(
            "LibreTranslate error: HTTP %s: %s",
            response.status_code,
            response.text[:500],
        )
        raise HTTPException(
            status_code=502,
            detail=(
                "The translation service rejected the request. "
                "Check its logs and verify that both selected languages "
                "are supported."
            ),
        )

    try:
        result = response.json()
        translated = result["translatedText"]
    except (ValueError, KeyError, TypeError) as exc:
        logger.exception(
            "LibreTranslate returned an invalid translation response."
        )
        raise HTTPException(
            status_code=502,
            detail="The translation service returned an invalid response.",
        ) from exc

    if not isinstance(translated, str):
        raise HTTPException(
            status_code=502,
            detail="The translation service returned invalid translated text.",
        )

    return translated


async def translate_page(
    client: httpx.AsyncClient,
    text: str,
    target: str,
    source: str,
) -> str:
    """Translate a page in chunks to avoid excessively large requests."""
    if not text.strip():
        return ""

    translated_chunks: list[str] = []

    for chunk in split_text(text):
        translated_chunks.append(
            await translate_chunk(
                client=client,
                text=chunk,
                target=target,
                source=source,
            )
        )

    return "\n".join(translated_chunks)


def create_pdf(pages: list[str], target: str) -> bytes:
    """Create a new PDF containing translated text."""
    font_path = get_font_path()
    font_name = "PDFToolkitTranslationUnicode"

    try:
        if font_name not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(
                TTFont(font_name, font_path)
            )
    except Exception as exc:
        logger.exception("Could not register translation font")
        raise HTTPException(
            status_code=500,
            detail="Could not load the PDF translation font.",
        ) from exc

    output = io.BytesIO()

    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"Translated PDF - {target}",
        author="PDF Toolkit",
    )

    styles = getSampleStyleSheet()

    heading = ParagraphStyle(
        "PDFTranslationHeading",
        parent=styles["Title"],
        fontName=font_name,
        fontSize=15,
        leading=21,
        textColor=colors.HexColor("#B91C1C"),
        spaceAfter=12,
    )

    page_heading = ParagraphStyle(
        "PDFTranslationPageHeading",
        parent=styles["Heading2"],
        fontName=font_name,
        fontSize=11,
        leading=15,
        spaceAfter=8,
    )

    body = ParagraphStyle(
        "PDFTranslationBody",
        parent=styles["BodyText"],
        fontName=font_name,
        fontSize=9.5,
        leading=14,
        spaceAfter=5,
        wordWrap="CJK",
    )

    story = [
        Paragraph(
            f"Translated Document ({escape(target.upper())})",
            heading,
        ),
        Spacer(1, 5 * mm),
    ]

    for page_number, page_text in enumerate(pages, start=1):
        if page_number > 1:
            story.append(Spacer(1, 5 * mm))

        story.append(
            Paragraph(f"Page {page_number}", page_heading)
        )

        for line in page_text.splitlines():
            safe_line = escape(line) if line.strip() else "&#160;"
            story.append(Paragraph(safe_line, body))

    try:
        document.build(story)
    except Exception as exc:
        logger.exception("Could not generate translated PDF")
        raise HTTPException(
            status_code=500,
            detail=(
                "Could not generate the translated PDF. "
                "Check the font and translated text."
            ),
        ) from exc

    return output.getvalue()


@router.get("/translation-languages")
async def translation_languages():
    """Return languages supported by the configured translation service."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            languages = await fetch_languages(client)

        return {
            "languages": languages,
            "provider_available": True,
        }

    except (httpx.HTTPError, ValueError, TypeError) as exc:
        logger.warning(
            "Language discovery failed. URL=%s/languages error=%r",
            TRANSLATE_URL,
            exc,
        )

        return {
            "languages": FALLBACK_LANGUAGES,
            "provider_available": False,
        }


@router.post("/translate-pdf")
async def translate_pdf(
    file: UploadFile = File(...),
    source_language: str = Form("auto"),
    target_languages: str = Form(...),
    ocr_pages: str = Form(""),
):
    """Translate a PDF, using browser OCR text when supplied."""
    filename = file.filename or "document.pdf"

    try:
        if Path(filename).suffix.lower() != ".pdf":
            raise HTTPException(
                status_code=400,
                detail="Please upload a PDF file.",
            )

        content = await file.read(MAX_FILE_SIZE + 1)

        if not content:
            raise HTTPException(
                status_code=400,
                detail="The PDF is empty.",
            )

        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Maximum PDF upload size is 50 MB.",
            )

        # Validate the uploaded PDF and get its actual page count.
        try:
            with fitz.open(
                stream=content,
                filetype="pdf",
            ) as uploaded_pdf:
                if uploaded_pdf.needs_pass:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "This PDF is password-protected. Unlock it first."
                        ),
                    )

                if uploaded_pdf.page_count == 0:
                    raise HTTPException(
                        status_code=400,
                        detail="The PDF contains no pages.",
                    )

                if uploaded_pdf.page_count > MAX_PAGES:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Translation supports up to {MAX_PAGES} pages."
                        ),
                    )

                actual_page_count = uploaded_pdf.page_count

        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Uploaded PDF validation failed")
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid readable PDF.",
            ) from exc

        # Parse the JSON-encoded multipart form value.
        targets = parse_target_languages(target_languages)
        source = source_language.strip()

        if (
            source.lower() != "auto"
            and not LANGUAGE_CODE_PATTERN.fullmatch(source)
        ):
            raise HTTPException(
                status_code=400,
                detail="Invalid source language code.",
            )

        # Use OCR text if supplied; otherwise extract selectable PDF text.
        pages = parse_ocr_pages(ocr_pages)

        if pages is not None:
            if len(pages) != actual_page_count:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "The OCR page count does not match the uploaded PDF. "
                        "Please retry the translation."
                    ),
                )
        else:
            pages = extract_pages(content)

        stem = re.sub(
            r"[^A-Za-z0-9_-]+",
            "_",
            Path(filename).stem,
        )[:80].strip("_") or "translated_document"

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(90, connect=15)
        ) as client:
            languages = await fetch_languages(client)

            supported = {
                language["code"]
                for language in languages
            }

            unsupported = [
                code for code in targets
                if code not in supported
            ]

            if unsupported:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Your translation engine does not support: "
                        + ", ".join(unsupported)
                        + ". Choose languages returned by "
                        "/translation-languages."
                    ),
                )

            if source.lower() != "auto" and source not in supported:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "The selected source language is not supported "
                        "by your translation engine."
                    ),
                )

            outputs: list[tuple[str, bytes]] = []

            for target in targets:
                translated_pages: list[str] = []

                for page_text in pages:
                    translated_pages.append(
                        await translate_page(
                            client=client,
                            text=page_text,
                            target=target,
                            source=source,
                        )
                    )

                outputs.append(
                    (
                        target,
                        create_pdf(
                            translated_pages,
                            target,
                        ),
                    )
                )

        if len(outputs) == 1:
            target, pdf_bytes = outputs[0]

            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": (
                        f'attachment; filename="{stem}-translated-{target}.pdf"'
                    )
                },
            )

        archive = io.BytesIO()

        with zipfile.ZipFile(
            archive,
            mode="w",
            compression=zipfile.ZIP_DEFLATED,
        ) as zip_file:
            for target, pdf_bytes in outputs:
                zip_file.writestr(
                    f"{stem}-translated-{target}.pdf",
                    pdf_bytes,
                )

        return Response(
            content=archive.getvalue(),
            media_type="application/zip",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="{stem}-translated-documents.zip"'
                )
            },
        )

    except HTTPException:
        raise

    except httpx.HTTPError as exc:
        logger.exception(
            "Translation provider HTTP failure. URL=%s",
            TRANSLATE_URL,
        )
        raise HTTPException(
            status_code=502,
            detail=(
                "Could not communicate with the translation service. "
                "Check the LibreTranslate Railway deployment and backend logs."
            ),
        ) from exc

    except Exception as exc:
        logger.exception("Unexpected PDF translation failure")
        raise HTTPException(
            status_code=500,
            detail=(
                "Translation failed unexpectedly. "
                "Check the backend logs."
            ),
        ) from exc

    finally:
        await file.close()

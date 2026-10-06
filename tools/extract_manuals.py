import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import quote

from pypdf import PdfReader

from tools.models import ManualRecord, PageRecord


MANUAL_IDS = {
    "Airconditioner sizing Freshjet.pdf": "freshjet-sizing",
    "Aircondtioner - Generator selection.pdf": "generator-selection",
    "Awning Training - Update August 2026.pdf": "awning-training-2026-08",
    "Dual Hinge Refrigerators Training - Update August 2026.pdf": "dual-hinge-fridge-2026-08",
    "Error codes - RMD10.5XS.pdf": "rmd105xs-error-codes",
    "FJ 48v Training - 22-9-2026.pdf": "fj48v-training-2026-09",
    "FJZ ADB Com socket voltages.pdf": "fjz-adb-voltages",
    "FJZ ADB DISPLAY SOCKETS - CORRECT SOCKET FOR RTU.pdf": "fjz-adb-display-sockets",
    "FJZ Training - 13-9-2026.pdf": "fjz-training-2026-09",
    "MC101 MC102 Gas shutoff valve explained.pdf": "mc101-mc102-gas-valve",
    "NRX Range basic information.pdf": "nrx-basic-info",
    "Portable Refrigerator Training - 30-09-2026.pdf": "portable-fridge-training-2026-09",
    "RCD 10.5 update July 26 Master.pdf": "rcd105-update-2026-07",
    "RCD10.5XS power consumption.pdf": "rcd105xs-power-consumption",
    "RUA - settings not changeable.pdf": "rua-settings-locked",
    "RUC Defrost logic - Master.pdf": "ruc-defrost-logic",
    "RUC Defrost logic - Master1.pdf": "ruc-defrost-logic-copy",
    "RUC refrigerator range fuses.pdf": "ruc-fuses",
}


def normalise_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def extract_manual(path: Path, manual_id: str) -> tuple[ManualRecord, list[PageRecord]]:
    reader = PdfReader(path)
    manual = ManualRecord(
        id=manual_id,
        title=path.stem,
        filename=path.name,
        page_count=len(reader.pages),
        sha256=file_sha256(path),
    )
    encoded_filename = quote(path.name)
    pages: list[PageRecord] = []

    for page_number, page in enumerate(reader.pages, start=1):
        text = normalise_text(page.extract_text() or "")
        pages.append(
            PageRecord(
                id=f"{manual_id}-p{page_number}",
                manual_id=manual_id,
                page_number=page_number,
                text=text,
                excerpt=text[:240],
                source_url=f"./manuals/{encoded_filename}#page={page_number}",
                extraction_status="embedded-text",
                low_text=len(text) < 40,
            )
        )

    return manual, pages


def extract_folder(source: Path) -> tuple[list[ManualRecord], list[PageRecord]]:
    paths = sorted(source.glob("*.pdf"), key=lambda item: item.name.casefold())
    unknown = [path.name for path in paths if path.name not in MANUAL_IDS]
    if unknown:
        raise ValueError(f"No stable manual ID configured for: {', '.join(unknown)}")

    manuals: list[ManualRecord] = []
    pages: list[PageRecord] = []
    for path in paths:
        manual, manual_pages = extract_manual(path, MANUAL_IDS[path.name])
        manuals.append(manual)
        pages.extend(manual_pages)
    return manuals, pages


def write_catalogues(
    output: Path, manuals: list[ManualRecord], pages: list[PageRecord]
) -> None:
    output.mkdir(parents=True, exist_ok=True)
    (output / "manuals.json").write_text(
        json.dumps([manual.to_dict() for manual in manuals], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    (output / "pages.json").write_text(
        json.dumps([page.to_dict() for page in pages], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract page-level Dometic manual text.")
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--expect-files", type=int)
    parser.add_argument("--expect-pages", type=int)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    manuals, pages = extract_folder(args.source)
    if args.expect_files is not None and len(manuals) != args.expect_files:
        raise SystemExit(f"Expected {args.expect_files} manuals, found {len(manuals)}")
    if args.expect_pages is not None and len(pages) != args.expect_pages:
        raise SystemExit(f"Expected {args.expect_pages} pages, found {len(pages)}")

    write_catalogues(args.output, manuals, pages)
    low_text_pages = sum(page.low_text for page in pages)
    print(
        f"Extracted {len(manuals)} manuals, {len(pages)} pages, "
        f"{low_text_pages} low-text pages"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

import argparse
import json
from pathlib import Path

import pymupdf


def build_review_queue(
    pages: list[dict[str, object]], threshold: int = 40
) -> list[dict[str, object]]:
    return [
        page
        for page in pages
        if bool(page.get("lowText"))
        or ("lowText" not in page and len(str(page.get("text", "")).strip()) < threshold)
    ]


def render_review_queue(
    pages: list[dict[str, object]],
    manuals: list[dict[str, object]],
    source: Path,
    output: Path,
) -> int:
    output.mkdir(parents=True, exist_ok=True)
    manuals_by_id = {str(manual["id"]): manual for manual in manuals}
    rendered = 0

    for page in build_review_queue(pages):
        manual_id = str(page["manualId"])
        manual = manuals_by_id[manual_id]
        document = pymupdf.open(source / str(manual["filename"]))
        pdf_page = document[int(page["pageNumber"]) - 1]
        pixmap = pdf_page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5), alpha=False)
        pixmap.save(output / f"{page['id']}.png")
        document.close()
        rendered += 1

    return rendered


def main() -> int:
    parser = argparse.ArgumentParser(description="Render low-text PDF pages for review.")
    parser.add_argument("--pages", type=Path, required=True)
    parser.add_argument("--manuals", type=Path, required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    pages = json.loads(args.pages.read_text(encoding="utf-8"))
    manuals = json.loads(args.manuals.read_text(encoding="utf-8"))
    rendered = render_review_queue(pages, manuals, args.source, args.output)
    print(f"Rendered {rendered} low-text pages to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

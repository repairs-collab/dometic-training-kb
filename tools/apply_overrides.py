import argparse
import copy
import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path


REVIEWED_STATUSES = {"ocr", "manual-transcription", "visual-only", "excluded"}


@dataclass(frozen=True)
class PageOverride:
    manual_id: str
    page_number: int
    text: str
    status: str
    aliases: list[str]
    review_note: str

    @classmethod
    def from_dict(cls, value: dict[str, object]) -> "PageOverride":
        return cls(
            manual_id=str(value["manualId"]),
            page_number=int(value["pageNumber"]),
            text=str(value.get("text", "")),
            status=str(value["status"]),
            aliases=[str(alias) for alias in value.get("aliases", [])],
            review_note=str(value.get("reviewNote", "")),
        )

    def key(self) -> tuple[str, int]:
        return self.manual_id, self.page_number


def apply_overrides(
    pages: list[dict[str, object]], overrides: list[PageOverride]
) -> list[dict[str, object]]:
    override_by_key = {override.key(): override for override in overrides}
    merged = copy.deepcopy(pages)

    for page in merged:
        key = (str(page["manualId"]), int(page["pageNumber"]))
        override = override_by_key.get(key)
        if override is None:
            continue
        if override.status not in REVIEWED_STATUSES:
            raise ValueError(f"Unsupported override status: {override.status}")
        page["text"] = override.text
        page["excerpt"] = override.text[:240]
        page["extractionStatus"] = override.status
        page["aliases"] = override.aliases
        page["reviewNote"] = override.review_note

    return assign_duplicate_groups(merged)


def normalized_for_duplicate(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().casefold()


def assign_duplicate_groups(
    pages: list[dict[str, object]],
) -> list[dict[str, object]]:
    grouped_pages = copy.deepcopy(pages)
    by_text: dict[str, list[dict[str, object]]] = {}

    for page in grouped_pages:
        normalized = normalized_for_duplicate(str(page.get("text", "")))
        if len(normalized) >= 10:
            by_text.setdefault(normalized, []).append(page)

    for normalized, duplicates in by_text.items():
        if len(duplicates) < 2:
            continue
        group_id = f"duplicate-{hashlib.sha256(normalized.encode('utf-8')).hexdigest()[:12]}"
        canonical = duplicates[0]
        source_refs = [
            {"manualId": item["manualId"], "pageNumber": item["pageNumber"]}
            for item in duplicates
        ]
        canonical["alternateSourceRefs"] = source_refs
        for index, item in enumerate(duplicates):
            item["duplicateGroup"] = group_id
            if index > 0:
                item["duplicateOf"] = canonical["id"]
                item["searchTextExcluded"] = True

    return grouped_pages


def validate_review_coverage(
    pages: list[dict[str, object]], overrides: list[PageOverride]
) -> list[str]:
    reviewed = {override.key() for override in overrides if override.status in REVIEWED_STATUSES}
    errors = []
    for page in pages:
        key = (str(page["manualId"]), int(page["pageNumber"]))
        if bool(page.get("lowText")) and key not in reviewed:
            errors.append(f"page {page['id']} requires a reviewed low-text override")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply reviewed low-text page overrides.")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--overrides", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--require-reviewed-low-text", action="store_true")
    args = parser.parse_args()

    pages = json.loads(args.input.read_text(encoding="utf-8"))
    override_values = json.loads(args.overrides.read_text(encoding="utf-8"))
    overrides = [PageOverride.from_dict(value) for value in override_values]
    if args.require_reviewed_low_text:
        errors = validate_review_coverage(pages, overrides)
        if errors:
            raise SystemExit("\n".join(errors))

    merged = apply_overrides(pages, overrides)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(merged)} reviewed page records to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

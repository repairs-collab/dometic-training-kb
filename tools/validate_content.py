import json
from pathlib import Path


PRODUCT_CATEGORIES = {
    "air-conditioner",
    "upright-refrigerator",
    "portable-refrigerator",
    "awning",
    "cooker",
    "general",
}
ENTRY_KINDS = {
    "error-code",
    "symptom",
    "procedure",
    "part",
    "specification",
    "training",
    "safety",
}
ACCEPTANCE_TOPICS = (
    "RUC error 33",
    "awning leaking at stitching",
    "FJZ not turning on",
    "three flashes portable fridge",
    "RCD door not closing",
    "RUA settings locked",
    "FreshJet generator size",
    "RUC fuse location",
    "MC101 gas connections",
)


def duplicate_ids(kind: str, records: list[dict]) -> list[str]:
    seen: set[str] = set()
    errors: list[str] = []
    for record in records:
        record_id = str(record.get("id", "<missing-id>"))
        if record_id in seen:
            errors.append(f"{kind} id {record_id} is duplicated")
        seen.add(record_id)
    return errors


def validate_content(
    manuals: list[dict],
    pages: list[dict],
    knowledge: list[dict],
    aliases: dict,
) -> list[str]:
    errors: list[str] = []
    errors.extend(duplicate_ids("manual", manuals))
    errors.extend(duplicate_ids("page", pages))
    errors.extend(duplicate_ids("knowledge", knowledge))

    if len(manuals) != 18:
        errors.append(f"expected 18 manuals, found {len(manuals)}")
    if len(pages) != 217:
        errors.append(f"expected 217 pages, found {len(pages)}")
    if len(knowledge) < 45:
        errors.append(f"expected at least 45 knowledge entries, found {len(knowledge)}")

    manual_by_id = {str(manual.get("id")): manual for manual in manuals}
    for manual in manuals:
        manual_id = str(manual.get("id"))
        if manual.get("category") not in PRODUCT_CATEGORIES:
            errors.append(f"manual {manual_id} has invalid category")
        if not isinstance(manual.get("pageCount"), int) or manual["pageCount"] < 1:
            errors.append(f"manual {manual_id} must have a positive pageCount")

    for page in pages:
        page_id = str(page.get("id"))
        manual_id = str(page.get("manualId"))
        page_number = page.get("pageNumber")
        manual = manual_by_id.get(manual_id)
        if manual is None:
            errors.append(f"page {page_id} references unknown manual {manual_id}")
        elif not isinstance(page_number, int) or not 1 <= page_number <= manual["pageCount"]:
            errors.append(f"page {page_id} references page {page_number} outside {manual_id}")

    covered_categories: set[str] = set()
    covered_topics: set[str] = set()
    for entry in knowledge:
        entry_id = str(entry.get("id"))
        category = entry.get("category")
        if category not in PRODUCT_CATEGORIES:
            errors.append(f"knowledge {entry_id} has invalid category")
        else:
            covered_categories.add(category)
        if entry.get("kind") not in ENTRY_KINDS:
            errors.append(f"knowledge {entry_id} has invalid kind")
        if entry.get("hazards") and not entry.get("warnings"):
            errors.append(f"knowledge {entry_id} is hazardous and must include a warning")
        if not str(entry.get("summary", "")).strip():
            errors.append(f"knowledge {entry_id} must include a summary")
        if not str(entry.get("searchText", "")).strip():
            errors.append(f"knowledge {entry_id} must include searchText")

        source_refs = entry.get("sourceRefs")
        if not isinstance(source_refs, list) or not source_refs:
            errors.append(f"knowledge {entry_id} must include a source reference")
            continue
        for source_ref in source_refs:
            manual_id = str(source_ref.get("manualId"))
            page_number = source_ref.get("pageNumber")
            manual = manual_by_id.get(manual_id)
            if manual is None:
                errors.append(f"knowledge {entry_id} references unknown manual {manual_id}")
            elif not isinstance(page_number, int) or not 1 <= page_number <= manual["pageCount"]:
                errors.append(
                    f"knowledge {entry_id} references page {page_number} outside {manual_id}"
                )
        covered_topics.update(entry.get("acceptanceTopics", []))

    manual_categories = {manual.get("category") for manual in manuals}
    missing_categories = sorted(manual_categories - covered_categories)
    if missing_categories:
        errors.append(f"knowledge is missing categories: {', '.join(missing_categories)}")

    missing_topics = sorted(set(ACCEPTANCE_TOPICS) - covered_topics)
    if missing_topics:
        errors.append(f"knowledge is missing acceptance topics: {', '.join(missing_topics)}")

    if not isinstance(aliases, dict):
        errors.append("aliases must be an object")
    else:
        for key in ("phrases", "models"):
            if not isinstance(aliases.get(key), dict):
                errors.append(f"aliases.{key} must be an object")

    return errors


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    content = root / "content"
    values = {
        name: json.loads((content / name).read_text(encoding="utf-8"))
        for name in ("manuals.json", "pages.json", "knowledge.json", "aliases.json")
    }
    errors = validate_content(
        values["manuals.json"],
        values["pages.json"],
        values["knowledge.json"],
        values["aliases.json"],
    )
    if errors:
        print("\n".join(errors))
        return 1
    print(
        f"Validated {len(values['manuals.json'])} manuals, "
        f"{len(values['pages.json'])} pages and {len(values['knowledge.json'])} knowledge entries"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

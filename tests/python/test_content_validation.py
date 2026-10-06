import json
from pathlib import Path

from tools.validate_content import ACCEPTANCE_TOPICS, validate_content


ROOT = Path(__file__).resolve().parents[2]


def load(name: str):
    return json.loads((ROOT / "content" / name).read_text(encoding="utf-8"))


def test_reviewed_catalogues_are_complete_and_valid() -> None:
    manuals = load("manuals.json")
    pages = load("pages.json")
    knowledge = load("knowledge.json")
    aliases = load("aliases.json")

    assert len(manuals) == 18
    assert len({manual["id"] for manual in manuals}) == 18
    assert len(pages) == 217
    assert len(knowledge) >= 45
    assert not validate_content(manuals, pages, knowledge, aliases)


def test_every_acceptance_topic_has_a_curated_entry() -> None:
    knowledge = load("knowledge.json")
    covered_topics = {
        topic
        for entry in knowledge
        for topic in entry.get("acceptanceTopics", [])
    }

    assert covered_topics == set(ACCEPTANCE_TOPICS)


def test_hazardous_entry_requires_a_warning() -> None:
    manuals = [
        {
            "id": "manual-a",
            "title": "Manual A",
            "filename": "manual-a.pdf",
            "pageCount": 1,
            "category": "general",
            "productFamilies": [],
        }
    ]
    pages = [
        {
            "id": "manual-a-p1",
            "manualId": "manual-a",
            "pageNumber": 1,
            "category": "general",
            "productFamilies": [],
            "models": [],
            "text": "text",
            "excerpt": "text",
            "aliases": [],
            "sourceUrl": "./manuals/manual-a.pdf#page=1",
            "extractionStatus": "embedded-text",
        }
    ]
    knowledge = [
        {
            "id": "hazardous-test",
            "title": "Electrical test",
            "kind": "procedure",
            "category": "general",
            "productFamilies": [],
            "models": [],
            "codes": [],
            "symptoms": [],
            "aliases": [],
            "summary": "Test live voltage.",
            "steps": ["Bridge two live terminals."],
            "warnings": [],
            "hazards": ["electrical"],
            "parts": [],
            "specifications": [],
            "sourceRefs": [{"manualId": "manual-a", "pageNumber": 1}],
            "searchText": "electrical voltage test",
        }
    ]

    assert "knowledge hazardous-test is hazardous and must include a warning" in validate_content(
        manuals, pages, knowledge, {"phrases": {}, "models": {}}
    )


def test_source_page_must_be_within_manual_bounds() -> None:
    manuals = [
        {
            "id": "manual-a",
            "title": "Manual A",
            "filename": "manual-a.pdf",
            "pageCount": 1,
            "category": "general",
            "productFamilies": [],
        }
    ]
    pages = []
    knowledge = [
        {
            "id": "bad-source",
            "title": "Bad source",
            "kind": "training",
            "category": "general",
            "productFamilies": [],
            "models": [],
            "codes": [],
            "symptoms": [],
            "aliases": [],
            "summary": "Invalid reference.",
            "steps": [],
            "warnings": [],
            "hazards": [],
            "parts": [],
            "specifications": [],
            "sourceRefs": [{"manualId": "manual-a", "pageNumber": 2}],
            "searchText": "bad source",
        }
    ]

    assert "knowledge bad-source references page 2 outside manual-a" in validate_content(
        manuals, pages, knowledge, {"phrases": {}, "models": {}}
    )

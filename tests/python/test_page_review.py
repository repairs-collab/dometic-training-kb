from tools.apply_overrides import (
    PageOverride,
    apply_overrides,
    assign_duplicate_groups,
    validate_review_coverage,
)
from tools.review_pages import build_review_queue


def page(
    page_id: str,
    text: str,
    *,
    low_text: bool,
    manual_id: str = "manual-a",
    page_number: int = 1,
) -> dict[str, object]:
    return {
        "id": page_id,
        "manualId": manual_id,
        "pageNumber": page_number,
        "text": text,
        "excerpt": text,
        "aliases": [],
        "extractionStatus": "embedded-text",
        "lowText": low_text,
    }


def test_build_review_queue_includes_only_low_text_pages() -> None:
    pages = [
        page("manual-a-p1", "short", low_text=True),
        page("manual-a-p2", "long enough for direct extraction", low_text=False, page_number=2),
    ]

    assert [item["id"] for item in build_review_queue(pages)] == ["manual-a-p1"]


def test_apply_override_replaces_draft_text_and_status() -> None:
    pages = [page("manual-a-p1", "short", low_text=True)]
    overrides = [
        PageOverride(
            manual_id="manual-a",
            page_number=1,
            text="Reviewed error code table text",
            status="manual-transcription",
            aliases=["error table"],
            review_note="Checked against the rendered page.",
        )
    ]

    merged = apply_overrides(pages, overrides)

    assert merged[0]["text"] == "Reviewed error code table text"
    assert merged[0]["extractionStatus"] == "manual-transcription"
    assert merged[0]["aliases"] == ["error table"]
    assert merged[0]["reviewNote"] == "Checked against the rendered page."


def test_duplicate_normalized_pages_share_a_group() -> None:
    pages = [
        page("manual-a-p1", "Same   defrost logic", low_text=False),
        page(
            "manual-b-p1",
            "same defrost logic",
            low_text=False,
            manual_id="manual-b",
        ),
    ]

    grouped = assign_duplicate_groups(pages)

    assert grouped[0]["duplicateGroup"] == grouped[1]["duplicateGroup"]
    assert str(grouped[0]["duplicateGroup"]).startswith("duplicate-")


def test_low_text_page_without_override_fails_review_coverage() -> None:
    pages = [page("manual-a-p1", "short", low_text=True)]

    assert validate_review_coverage(pages, []) == [
        "page manual-a-p1 requires a reviewed low-text override"
    ]

import copy
import hashlib
import json
from pathlib import Path
from urllib.parse import unquote

import pytest

from tools.build_site_data import build_site_data


ROOT = Path(__file__).resolve().parents[2]


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_build_copies_validated_catalogues_and_unchanged_manuals(tmp_path: Path) -> None:
    source = ROOT / "source-manuals"
    before = {path.name: file_hash(path) for path in source.glob("*.pdf")}
    output = tmp_path / "public"

    result = build_site_data(ROOT / "content", source, output)

    assert result == {"manuals": 18, "pages": 217, "knowledge": 63, "pdfs": 18}
    assert len(list((output / "manuals").glob("*.pdf"))) == 18
    assert before == {path.name: file_hash(path) for path in source.glob("*.pdf")}
    assert len(
        json.loads((output / "data" / "manuals.json").read_text(encoding="utf-8"))
    ) == 18
    pages = json.loads((output / "data" / "pages.json").read_text(encoding="utf-8"))
    assert len(pages) == 217
    for page in pages:
        relative = unquote(page["sourceUrl"].split("#", 1)[0]).removeprefix("./")
        assert (output / relative).is_file()


def test_build_rejects_out_of_range_reference_before_writing(tmp_path: Path) -> None:
    content = tmp_path / "content"
    content.mkdir()
    for name in ("manuals.json", "pages.json", "knowledge.json", "aliases.json"):
        value = json.loads((ROOT / "content" / name).read_text(encoding="utf-8"))
        if name == "knowledge.json":
            value = copy.deepcopy(value)
            value[0]["sourceRefs"][0]["pageNumber"] = 999
        (content / name).write_text(json.dumps(value), encoding="utf-8")
    output = tmp_path / "public"

    with pytest.raises(ValueError, match="outside"):
        build_site_data(content, ROOT / "source-manuals", output)

    assert not output.exists()

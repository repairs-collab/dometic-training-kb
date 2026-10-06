import argparse
import hashlib
import json
import shutil
import tempfile
from pathlib import Path

from tools.validate_content import validate_content


CATALOGUE_NAMES = ("manuals.json", "pages.json", "knowledge.json", "aliases.json")


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_catalogues(content: Path) -> dict[str, object]:
    return {
        name: json.loads((content / name).read_text(encoding="utf-8"))
        for name in CATALOGUE_NAMES
    }


def enriched_pages(pages: list[dict], manuals: list[dict]) -> list[dict]:
    manual_by_id = {manual["id"]: manual for manual in manuals}
    values: list[dict] = []
    for original in pages:
        page = dict(original)
        manual = manual_by_id[page["manualId"]]
        if page.get("category") == "general":
            page["category"] = manual["category"]
        page["productFamilies"] = list(
            dict.fromkeys([*page.get("productFamilies", []), *manual["productFamilies"]])
        )
        values.append(page)
    return values


def write_json(path: Path, value: object) -> None:
    path.write_text(
        json.dumps(value, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def build_site_data(content: Path, source: Path, output: Path) -> dict[str, int]:
    catalogues = load_catalogues(content)
    manuals = catalogues["manuals.json"]
    pages = catalogues["pages.json"]
    knowledge = catalogues["knowledge.json"]
    aliases = catalogues["aliases.json"]
    if not isinstance(manuals, list) or not isinstance(pages, list) or not isinstance(knowledge, list):
        raise ValueError("manuals, pages and knowledge catalogues must be arrays")
    if not isinstance(aliases, dict):
        raise ValueError("aliases catalogue must be an object")

    errors = validate_content(manuals, pages, knowledge, aliases)
    if errors:
        raise ValueError("\n".join(errors))

    source_paths: list[tuple[dict, Path]] = []
    for manual in manuals:
        path = source / manual["filename"]
        if not path.is_file():
            raise ValueError(f"missing source manual: {manual['filename']}")
        expected_hash = manual.get("sha256")
        if expected_hash and file_hash(path) != expected_hash:
            raise ValueError(f"source manual hash changed: {manual['filename']}")
        source_paths.append((manual, path))

    output_parent = output.resolve().parent
    output_parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=f".{output.name}-", dir=output_parent))
    try:
        data_output = staging / "data"
        manual_output = staging / "manuals"
        data_output.mkdir()
        manual_output.mkdir()
        write_json(data_output / "manuals.json", manuals)
        write_json(data_output / "pages.json", enriched_pages(pages, manuals))
        write_json(data_output / "knowledge.json", sorted(knowledge, key=lambda item: item["id"]))
        write_json(data_output / "aliases.json", aliases)
        for manual, path in source_paths:
            destination = manual_output / manual["filename"]
            shutil.copy2(path, destination)
            if file_hash(destination) != manual.get("sha256"):
                raise ValueError(f"copied manual hash mismatch: {manual['filename']}")

        if output.exists():
            shutil.rmtree(output)
        staging.replace(output)
    except Exception:
        if staging.exists():
            shutil.rmtree(staging)
        raise

    return {
        "manuals": len(manuals),
        "pages": len(pages),
        "knowledge": len(knowledge),
        "pdfs": len(source_paths),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Build validated static site data.")
    parser.add_argument("--content", type=Path, default=Path("content"))
    parser.add_argument("--source", type=Path, default=Path("source-manuals"))
    parser.add_argument("--output", type=Path, default=Path("public"))
    args = parser.parse_args()
    result = build_site_data(args.content, args.source, args.output)
    print(
        f"Built {result['manuals']} manuals, {result['pages']} pages, "
        f"{result['knowledge']} knowledge entries and {result['pdfs']} PDFs"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

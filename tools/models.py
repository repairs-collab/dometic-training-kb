from dataclasses import asdict, dataclass, field


@dataclass(frozen=True)
class ManualRecord:
    id: str
    title: str
    filename: str
    page_count: int
    sha256: str
    category: str = "general"
    product_families: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, object]:
        record = asdict(self)
        record["pageCount"] = record.pop("page_count")
        record["productFamilies"] = record.pop("product_families")
        return record


@dataclass(frozen=True)
class PageRecord:
    id: str
    manual_id: str
    page_number: int
    text: str
    excerpt: str
    source_url: str
    extraction_status: str
    low_text: bool
    category: str = "general"
    product_families: list[str] = field(default_factory=list)
    models: list[str] = field(default_factory=list)
    aliases: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, object]:
        record = asdict(self)
        record["manualId"] = record.pop("manual_id")
        record["pageNumber"] = record.pop("page_number")
        record["sourceUrl"] = record.pop("source_url")
        record["extractionStatus"] = record.pop("extraction_status")
        record["lowText"] = record.pop("low_text")
        record["productFamilies"] = record.pop("product_families")
        return record

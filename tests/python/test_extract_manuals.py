from hashlib import sha256
from pathlib import Path

from reportlab.pdfgen import canvas

from tools.extract_manuals import extract_manual, normalise_text


def make_pdf(path: Path) -> None:
    document = canvas.Canvas(str(path))
    document.drawString(72, 720, "First   page text")
    document.showPage()
    document.drawString(72, 720, "Short")
    document.showPage()
    document.save()


def test_normalise_text_collapses_whitespace() -> None:
    assert normalise_text(" First\n\tpage   text ") == "First page text"


def test_extract_manual_returns_one_based_page_records(tmp_path: Path) -> None:
    pdf_path = tmp_path / "Fixture Manual.pdf"
    make_pdf(pdf_path)

    manual, pages = extract_manual(pdf_path, "fixture-manual")

    assert manual.page_count == 2
    assert manual.sha256 == sha256(pdf_path.read_bytes()).hexdigest()
    assert [page.page_number for page in pages] == [1, 2]
    assert pages[0].text == "First page text"
    assert pages[0].source_url == "./manuals/Fixture%20Manual.pdf#page=1"
    assert pages[1].low_text is True
    assert pages[1].id == "fixture-manual-p2"

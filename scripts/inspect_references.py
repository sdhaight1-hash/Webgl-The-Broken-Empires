"""Metadata-only inspection of user-supplied references. No copyrighted pages copied into logs."""
from pathlib import Path
import re
import struct

root = Path("ref docs")
pdf_path = root / "Core Rulebook.pdf"
map_path = root / "The_Broken_Empires_Gamemaster's_Map.png"
for path in (pdf_path, map_path):
    if not path.exists():
        raise SystemExit(f"Missing: {path}")
    print(f"SOURCE {path}: {path.stat().st_size:,} bytes")
import fitz
pdf = fitz.open(pdf_path)
print(f"BOOK page_count={len(pdf)}; bookmarks={len(pdf.get_toc())}")
print("BOOKMARK LIST (headings only, page numbers PDF-native):")
for depth, title, page in pdf.get_toc()[:160]:
    print(f"  {depth} | PDF p.{page} | {title.strip()[:110]}")
keywords = [
    "character creation", "creating a character", "create a character",
    "heritage", "culture", "career", "life events", "expertise", "talents",
    "skills", "success levels", "wounds", "weave", "rolls",
]
hits = {word: [] for word in keywords}
for page_idx, page in enumerate(pdf):
    text = page.get_text().lower()
    for word in keywords:
        if word in text:
            hits[word].append(page_idx + 1)
print("KEYWORD INDEX: term | occurrence count | first 18 PDF pages")
for word in keywords:
    print(f"  {word}: {len(hits[word])} pages; {hits[word][:18]}")
with map_path.open("rb") as f:
    sig = f.read(24)
if sig[:8] == b"\\x89PNG\\r\\n\\x1a\\n":
    width, height = struct.unpack(">II", sig[16:24])
    print(f"MAP PNG width={width}, height={height}, pixels={width*height:,}")
else:
    print(f"MAP first 8 bytes = {sig[:8]!r}; is_png=False")

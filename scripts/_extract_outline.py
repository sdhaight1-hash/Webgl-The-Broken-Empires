"""Inspect only PDF outline metadata (titles + positions); do not print book prose."""
import json
from pathlib import Path
import fitz

book = fitz.open(Path("ref docs")/"Core Rulebook.pdf")
outline = [{"level":level,"title":title.strip(),"page":page} for level,title,page in book.get_toc()]
counts={"total_pages":len(book),"bookmarks":len(outline),"pages_with_text":0,
        "pages_without_text":[]}
for i,page in enumerate(book):
    if page.get_text("text").strip():
        counts["pages_with_text"] += 1
    else:
        counts["pages_without_text"].append(i+1)
print("OUTLINE_JSON_START"+json.dumps({"metrics":counts,"outline":outline},ensure_ascii=False,separators=(',',':'))+"OUTLINE_JSON_END")

"""Print only compact candidate numeric table cells; no rulebook page prose."""
from pathlib import Path
import fitz,re
book=fitz.open(Path("ref docs")/"Core Rulebook.pdf")
for p in [486,487,488,489,490,491,492,493,494,495]:
    source=book[p-1].get_text("text",sort=True)
    lines=[line.strip() for line in source.splitlines()]
    candidates=[]
    for i,line in enumerate(lines):
        if not line or len(line)>42:continue
        if re.search(r'\b(?:\d{1,3}\s*[–-]\s*\d{1,3}|\d{1,3}%|50/50|likely|certain|impossible|extreme|expected|surprise|unexpected|yes|no)\b',line,re.I):
            candidates.append((i,line))
    print('AUDIT_PDF',p)
    for i,line in candidates[:22]:
        # Numeric table cells and short labels only. Avoid reproducing narrative passages.
        print(str(i)+':'+line[:42])

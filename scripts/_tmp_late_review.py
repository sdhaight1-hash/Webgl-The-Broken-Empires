"""Targeted rule review only. Never commit source text to the frontend."""
import fitz
from pathlib import Path
pages=[404,406,408,412,415,423,427,428,432,435,440,441,442,443,444,445,446,447,448,449,482,484,486,487,488,489,490,491,492,493,494,495,496,592,593,594,595,596,597,598,599,600,601,602,603,604,605,606,607,646,647,648,649,650]
doc=fitz.open(Path('ref docs')/'Core Rulebook.pdf')
for p in pages:
    text=doc[p-1].get_text('text',sort=True)
    print('PAGE_START '+str(p))
    print(text[:4000].replace('\n',' '))
    print('PAGE_END '+str(p))

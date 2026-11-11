"""Temporary targeted reading of owner-supplied PDF. No extracted content committed."""
from pathlib import Path
import fitz
import sys
import re
GROUPS = {
 "basics":[20,21,22,23,24,25,26,27,29,30,31,32,33,34,35,36,37,38,39,41,42,44,48,49,50,53,55,56,58],
 "characters":[74,75,77,80,82,83,84,85,86,88,90,91,92,93,94,95,96,97,98,99,102,106,107,108,109,110,111,112,113,114,115,116,118,119,120,124,125,126,128],
 "play":[130,131,132,133,134,135,144,145,150,151,152,153,154,158,165,166,170,173,174,175,176,177,178,180,183,186,192,200,203,204,205,206,210,215,216,222,226,232,252,253,254,256,258,259,261,263,266,272,274],
 "magic":[276,278,280,282,285,287,289,306,310,312,316,320,324,327,330,348,349,351,354,358,370,404,406,408,412,415],
}
group=sys.argv[1]
if group not in GROUPS: raise ValueError(group)
book=fitz.open(Path('ref docs')/'Core Rulebook.pdf')
for page in GROUPS[group]:
    raw=book[page-1].get_text('text',sort=True)
    raw=re.sub(r'\n{3,}','\n\n',raw)
    print(f"\n@@@ PAGE {page} BEGIN @@@")
    print(raw[:4800])
    print(f"\n@@@ PAGE {page} END @@@")

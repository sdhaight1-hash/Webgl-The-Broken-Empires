"""Audit the repository's CURRENT personal SRD against the Git LFS core PDF.

Print only diagnostic metrics, counts and short unmatched Talent names. Never
print source passages or include licensed source PDFs in artifacts.
"""
from collections import Counter, defaultdict
from pathlib import Path
import json, re, statistics, unicodedata
import fitz

ROOT = Path("ref docs")
SRC = ROOT / "Core Rulebook.pdf"
SRD = ROOT / "The_Broken_Empires_Personal_SRD.pdf"
LABEL = re.compile(r"Source PDF p\.\s*(\d+)", re.I)
FILTER = re.compile(r"PERSONAL TEXT EDITION|Source PDF p\.\s*\d+(?:\s*\(cont\.\))?|< PREVIOUS|NEXT >|^CONTENTS$", re.I | re.M)
TOKEN = re.compile(r"(?<![a-z0-9])[-+]?\d+(?:\.\d+)?%?|[a-z]+(?:'[a-z]+)?", re.I)
NUM = re.compile(r"(?<!\w)[-+]?\d+(?:\.\d+)?%?(?!\w)")

def normal(text):
    text = unicodedata.normalize("NFKD", text).lower()
    text = text.replace("’","'").replace("–","-").replace("—","-").replace("ﬁ","fi").replace("ﬂ","fl")
    text = re.sub(r"\s+"," ",text)
    return text

def tokens(text):
    return Counter(TOKEN.findall(normal(text)))

def recall(reference,copy):
    if not reference: return None
    return round(sum((reference & copy).values()) / sum(reference.values()), 4)

def numeric(text):
    # Ignore 1/2 digit page numbering elsewhere, but preserve rules thresholds.
    return Counter(NUM.findall(normal(text)))

src=fitz.open(SRC);srd=fitz.open(SRD)
assert SRC.read_bytes()[:4]==b'%PDF', "Git LFS source was not downloaded"
assert SRD.read_bytes()[:4]==b'%PDF', "SRD is not a real PDF"
text_by_source=defaultdict(list)
output_pages_by_source=defaultdict(list)
unmapped_pages=[]
links=0;out_of_bounds=0
for i,p in enumerate(srd):
    text=p.get_text("text",sort=True)
    matches=LABEL.findall(text[:350])
    if not matches:
        unmapped_pages.append(i+1);continue
    source_page=int(matches[0])
    if source_page<1 or source_page>len(src):continue
    cleaned=FILTER.sub('',text)
    text_by_source[source_page].append(cleaned)
    output_pages_by_source[source_page].append(i+1)
    if i in (20,30,70,100,400,700) or source_page in (22,26,37,44,49,55,91,132,145,490,491,492,493):
        ann=p.annots()
        if ann: links+=sum(1 for _ in ann)
    for block in p.get_text("dict")["blocks"]:
        if block.get("type")!=0:continue
        x0,y0,x1,y1=block["bbox"]
        if x0<-1 or y0<-2 or x1>p.rect.width+2 or y1>p.rect.height+2:
            out_of_bounds+=1

stats=[]
for source_page in range(1,len(src)+1):
    base=src[source_page-1].get_text("text",sort=True)
    formatted=" ".join(text_by_source.get(source_page,[]))
    source_words=tokens(base)
    output_words=tokens(formatted)
    n1=numeric(base)
    n2=numeric(formatted)
    stats.append({"page":source_page,"sourceChars":len(base),"srdChars":len(formatted),
                  "sourceTokens":sum(source_words.values()),
                  "tokenRecall":recall(source_words,output_words),
                  "numberRecall":recall(n1,n2),
                  "outputPages":len(output_pages_by_source.get(source_page,[]))})
meaningful=[x for x in stats if x["sourceTokens"]>=45 and x["page"]>=12]
def quartiles(values):
    values=sorted(values)
    if not values:return {}
    return {"min":values[0],"p10":values[int(len(values)*.1)],
      "median":values[len(values)//2],"p90":values[int(len(values)*.9)],"max":values[-1]}
recent=[
  {"page":s["page"],"wordRecall":s["tokenRecall"],"numberRecall":s["numberRecall"],
   "sourceTokens":s["sourceTokens"],"outputPages":s["outputPages"]}
  for s in meaningful if (s["tokenRecall"] is None or s["tokenRecall"]<.78)
]
recent.sort(key=lambda a:(a["wordRecall"] if a["wordRecall"] is not None else 0))
sample=[next(s for s in stats if s["page"]==p) for p in
        [22,26,37,44,45,46,47,48,49,50,51,52,53,54,55,56,57,91,132,145,490,491,492,493]]
table_metrics=[]
for p in [22,26,37,49,52,55,91,132,145,490,491,493]:
    source=src[p-1]
    source_table_count=len(source.find_tables().tables)
    copies=output_pages_by_source.get(p,[])
    export_table_count=sum(len(srd[i-1].find_tables().tables) for i in copies[:5])
    table_metrics.append({"sourcePage":p,"coreDetectedTables":source_table_count,
      "srdDetectedTables":export_table_count,"srdPages":len(copies)})
talent_audit={"count":0,"matchedInChapter":0,"notFound":[]}
names_file=Path("/tmp/tbe_talent_names.json")
if names_file.exists():
    talents=json.loads(names_file.read_text())
    source_talents=normal(" ".join(src[p-1].get_text("text",sort=True) for p in range(43,59)))
    source_srd=normal(" ".join(" ".join(text_by_source.get(p,[])) for p in range(43,59)))
    missing=[]
    for t in talents:
        name=normal(t["name"]).replace("...", "").replace("!", "").strip()
        if name and name in source_talents:
            talent_audit["matchedInChapter"]+=1
        else:
            missing.append({"name":t["name"],"srdHasName":name in source_srd,"listedPage":t["page"]})
    talent_audit["count"]=len(talents)
    talent_audit["notFound"]=missing[:35]
summary={
 "sourcePdfPages":len(src),"newSrdPages":len(srd),"mappedSourcePageCount":len(text_by_source),
 "srdUnmappedPages":len(unmapped_pages),"firstUnmapped":unmapped_pages[:12],
 "pagesWithMultipleReflowPages":sum(len(x)>1 for x in output_pages_by_source.values()),
 "pagesWithNoTextSource":sum(s["sourceTokens"]==0 for s in stats),
 "tokenRecall":quartiles([s["tokenRecall"] for s in meaningful if s["tokenRecall"] is not None]),
 "numberRecall":quartiles([s["numberRecall"] for s in meaningful if s["numberRecall"] is not None]),
 "pagesBelow78PctRecall":len(recent),"lowestRecallPages":recent[:25],
 "samplePages":sample,"sampledTableGeometry":table_metrics,
 "suspectedOutOfBoundsTextBlocks":out_of_bounds,"talentCatalogAudit":talent_audit
}
print("REPLACEMENT_SRD_COMPARISON="+json.dumps(summary,ensure_ascii=True))
# Deliberately an audit, not a CI pass/fail based on approximate glyph matching.
assert len(text_by_source)>600, "Source-page labels missing from new SRD"

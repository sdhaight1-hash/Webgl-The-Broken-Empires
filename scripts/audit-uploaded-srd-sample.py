"""Diagnostic comparison with the user-uploaded 1045-page SRD.
Only compact numeric/signature metadata from 23 designated SRD source pages
is included, not copyrighted source passages. This IS NOT full book parity.
"""
import fitz,collections,hashlib,re,unicodedata,json
SAMPLES=[
[22,340,'c031ed93',22,'729a22338a'],[23,560,'e1206593',51,'9c593ad63e'],
[24,548,'a1a06fbb',18,'068e4ec923'],[26,407,'818969bb',37,'62ded4f057'],
[30,452,'a8b06f1b',20,'a0998ca506'],[31,475,'49b067b6',9,'0f59ba634e'],
[37,410,'859e6f3b',27,'19eb5f4248'],[42,183,'a3a10e3b',2,'12af2f8840'],
[44,389,'48a66771',4,'7e3645afc9'],[46,536,'81b167db',17,'3a60e480b2'],
[52,508,'88b26fdb',27,'951ddf1c4d'],[55,367,'88232f5b',13,'14b51d3cf0'],
[91,460,'c9b26dd3',15,'adcbfb250c'],[132,392,'88b32f9b',18,'6b1b7ce272'],
[145,309,'99830f9f',41,'d9d9fd6d68'],[174,136,'791be95f',2,'849142da1a'],
[490,558,'80a9251b',45,'f5803a471a'],[491,680,'81a9651b',24,'7b7f5a83f6'],
[492,421,'55497e68',201,'7a13390923'],[493,591,'81b9e59b',8,'13989fa75d'],
[587,720,'818b6d1b',0,'e3b0c44298'],[614,248,'8a0c5190',50,'3898bae948'],
[615,242,'8a045190',50,'6a3e8d6695']]
def tok(t):
 t=unicodedata.normalize('NFKC',t).lower().replace('’',"'").replace('—','-').replace('–','-')
 return re.findall(r'[a-z0-9]+',t)
def sign(words):
 vec=[0]*32
 for word,count in collections.Counter(words).items():
  h=int.from_bytes(hashlib.blake2s(word.encode(),digest_size=4).digest(),'little')
  for i in range(32):vec[i]+=count if (h>>i)&1 else -count
 return int(''.join('1' if v>=0 else '0' for v in vec),2)
def numberhash(words):
 n=collections.Counter(w for w in words if w.isdecimal())
 s=';'.join(f'{k}:{v}' for k,v in sorted(n.items()))
 return hashlib.sha256(s.encode()).hexdigest()[:10],sum(n.values())
doc=fitz.open("ref docs/Core Rulebook.pdf")
assert len(doc)==663
records=[]
for n,want_count,want_sig,want_nums,want_hash in SAMPLES:
 page=doc[n-1]
 words=[]
 for b in page.get_text('blocks'):
  if 39<b[1]<741:words+=tok(b[4])
 sig=sign(words)
 nh,nc=numberhash(words)
 ham=(sig^int(want_sig,16)).bit_count()
 ratio=round(want_count/max(1,len(words)),3)
 records.append({"corePage":n,"sourceWords":len(words),"srdWords":want_count,
  "countRatio":ratio,"tokenSimhashDistance32":ham,
  "sourceNumbers":nc,"srdNumbers":want_nums,
  "numericMultisetIdentical":nh==want_hash})
print("UPLOAD_VS_CORE_RULEBOOK_SAMPLE="+json.dumps(records,separators=(',',':')))
print("NOTE: hash similarity and count matching are NOT semantic, tabular, paragraph-order or full-book validation.")

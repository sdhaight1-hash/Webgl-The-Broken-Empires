/** Browser-only reading-order reconstruction of PDF text runs.
 * No source material is embedded: callers provide text extracted from their local PDF.
 */
export type TextBlock = { kind: 'heading' | 'paragraph'; text: string };
export type PositionedRun = { text: string; x: number; y: number; fontSize: number; width?: number };
export type TextPage = { left: TextBlock[]; right: TextBlock[]; plainText: string; runCount: number; width: number; height: number; positioned: PositionedRun[] };
type Run = { str: string; x: number; y: number; width: number; height: number };
type Line = { text: string; x: number; y: number; height: number };

const median = (xs: number[]): number => {
  if (!xs.length) return 10;
  const values = [...xs].sort((a,b)=>a-b);
  return values[Math.floor(values.length/2)];
};

function lineGroups(runs: Run[]): Line[] {
  const sorted = [...runs].sort((a,b)=>b.y-a.y || a.x-b.x);
  const lines: { y:number; runs:Run[] }[] = [];
  for (const run of sorted) {
    const tolerance = Math.max(2, Math.min(3.8, run.height*.24));
    const nearby = lines.find(line=>Math.abs(line.y-run.y)<=tolerance);
    if (nearby) nearby.runs.push(run);
    else lines.push({y:run.y,runs:[run]});
  }
  return lines.sort((a,b)=>b.y-a.y).map(({y,runs:items})=>{
    const ordered = items.sort((a,b)=>a.x-b.x);
    let text = '';
    let rightEdge = 0;
    for (const item of ordered) {
      const str=item.str.trim();
      if(!str) continue;
      if(text && item.x-rightEdge>Math.max(.8,item.height*.16) && !text.endsWith(' '))text+=' ';
      text+=str;
      rightEdge=Math.max(rightEdge,item.x+item.width);
    }
    return {text:text.replace(/\s+/g,' ').trim(),x:Math.min(...ordered.map(i=>i.x)),y,height:median(items.map(i=>i.height))};
  }).filter(line=>line.text.length>0);
}

function blocksFor(runs: Run[]): TextBlock[] {
  const lines=lineGroups(runs);
  const baseline=median(lines.map(l=>l.height).filter(h=>h>0));
  const blocks:TextBlock[]=[];
  let draft:string[]=[];
  let previous:Line|null=null;
  const flush=()=>{if(draft.length){blocks.push({kind:'paragraph',text:draft.join(' ').replace(/\s+/g,' ').trim()});draft=[];}};
  for(const line of lines){
    const heading=line.height>baseline*1.22 && line.text.length<=150;
    const headingLike=/^(?:chapter\s+\d+|appendix\s+[a-e]|part\s+[ivx]+)/i.test(line.text) && line.text.length<105;
    if(heading || headingLike){
      flush();
      blocks.push({kind:'heading',text:line.text});
      previous=null;
      continue;
    }
    if(previous){
      const verticalGap=previous.y-line.y;
      const newParagraph=verticalGap>baseline*1.8 || line.x-previous.x>14;
      if(newParagraph)flush();
    }
    draft.push(line.text);
    previous=line;
  }
  flush();
  return blocks;
}

function isRun(item:unknown):item is {str:string;transform:number[];width?:number;height?:number}{
  if(!item || typeof item!=='object')return false;
  const r=item as Record<string,unknown>;
  return typeof r.str==='string' && Array.isArray(r.transform) && r.transform.length>=6
    && Number.isFinite(r.transform[4]) && Number.isFinite(r.transform[5]);
}

/** Two-column reading order follows the original PDF's left/right text streams.
 * Complex tables and spans may still require checking the original PDF.
 */
export function reconstructTextPage(items:readonly unknown[],pageWidth:number,pageHeight=792):TextPage {
  if(!Number.isFinite(pageWidth)||pageWidth<=0)throw new RangeError('Invalid PDF page width');
  if(!Number.isFinite(pageHeight)||pageHeight<=0)throw new RangeError('Invalid PDF page height');
  const runs:Run[]=[];
  for(const item of items){
    if(!isRun(item)||!item.str.trim())continue;
    runs.push({str:item.str,x:item.transform[4],y:item.transform[5],
      width:typeof item.width==='number'&&Number.isFinite(item.width)?item.width:0,
      height:typeof item.height==='number'&&item.height>0?item.height:10});
  }
  const division=pageWidth/2;
  const left=blocksFor(runs.filter(r=>r.x<division));
  const right=blocksFor(runs.filter(r=>r.x>=division));
  return {left,right,plainText:[...left,...right].map(b=>b.text).join('\n'),
    runCount:runs.length,width:pageWidth,height:pageHeight,
    // Spatial view keeps text positions for tables, while deliberately rendering
    // no PDF image, path, or embedded artwork data.
    positioned:runs.map(r=>({text:r.str,x:r.x,y:pageHeight-r.y,fontSize:r.height,width:r.width}))};
}

export function pageMatches(text:string,query:string):boolean {
  const terms=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return terms.length>0 && terms.every(word=>text.toLocaleLowerCase().includes(word));
}
export function pageSnippet(text:string,query:string):string{
  const first=query.toLocaleLowerCase().trim().split(/\s+/)[0];
  const i=Math.max(0,text.toLocaleLowerCase().indexOf(first));
  const start=Math.max(0,i-80),end=Math.min(text.length,start+230);
  return (start?'…':'')+text.slice(start,end).replace(/\s+/g,' ')+(end<text.length?'…':'');
}

import type {TextPage,PositionedRun} from './pdfText.ts';

/** Reconstructs a *reading document*, not a facsimile of PDF text coordinates.
 * All content comes from the reader-selected PDF at runtime. Nothing is
 * embedded or transmitted. Ambiguous page art and graphics remain excluded.
 */
export type StructuredBlock =
  | {kind:'heading';text:string}
  | {kind:'paragraph';text:string}
  | {kind:'table';rows:string[][];columnCount:number;header:boolean};

type Span={text:string;x:number;right:number;size:number};
type Line={y:number;x:number;size:number;segments:Span[];text:string};
type Detection={end:number;table:Extract<StructuredBlock,{kind:'table'}>;bottom:number};

const median=(values:number[],fallback=11)=>{
  if(!values.length)return fallback;
  const ordered=[...values].sort((a,b)=>a-b);
  return ordered[Math.floor(ordered.length/2)];
};

function joinWords(previous:string,next:string,gap:number):string {
  const text=next.trim();
  if(!previous)return text;
  if(!text)return previous;
  if(/\s$/.test(previous)||/^\s/.test(next))return previous.trimEnd()+' '+text;
  if(gap<=1.1)return previous+text;
  if(/^[,.;:!?%)\]}]/.test(text)||/[(\[{/]$/.test(previous))return previous+text;
  return previous+' '+text;
}

function makeLines(runs:readonly PositionedRun[]):Line[]{
  const valid=runs.filter(r=>r.text.trim()&&Number.isFinite(r.x)&&Number.isFinite(r.y)&&r.fontSize>0)
    .map(r=>({
      text:r.text,x:r.x,y:r.y,size:r.fontSize,
      right:r.x+(typeof r.width==='number'&&r.width>0?r.width:Math.max(1,r.text.length*r.fontSize*.48))
    }));
  valid.sort((a,b)=>a.y-b.y||a.x-b.x);
  const buckets:{y:number;items:(typeof valid)[number][]}[]=[];
  for(const run of valid){
    const last=buckets[buckets.length-1];
    if(last&&Math.abs(last.y-run.y)<=Math.max(1.6,Math.min(3.1,run.size*.22)))last.items.push(run);
    else buckets.push({y:run.y,items:[run]});
  }
  return buckets.map(b=>{
    const items=b.items.sort((a,b)=>a.x-b.x);
    const segments:Span[]=[];
    let current:Span|null=null;
    for(const item of items){
      const gap=current?item.x-current.right:0;
      // Table cells are typically separated by a substantial physical gap.
      // Runs within one cell (italic/bold fragments) are joined, never stretched.
      if(!current||gap>Math.max(6.5,item.size*.58)){
        current={text:item.text.trim(),x:item.x,right:item.right,size:item.size};
        segments.push(current);
      }else{
        current.text=joinWords(current.text,item.text,gap);
        current.right=Math.max(current.right,item.right);
        current.size=Math.max(current.size,item.size);
      }
    }
    return {y:b.y,x:items[0]?.x??0,size:median(items.map(v=>v.size)),segments,
      text:segments.map(s=>s.text).join(' ').replace(/\s+/g,' ').trim()};
  }).filter(l=>l.text);
}

function makeTable(lines:Line[],start:number,minColumns:number):Detection|null{
  const first=lines[start];
  if(!first||first.segments.length<minColumns)return null;
  // Header labels are often broken into more text fragments than the actual
  // number of data columns. Choose the modal multi-cell row as the template.
  const candidates=lines.slice(start,start+9).filter(l=>l.y-first.y<135&&
    l.segments.length>=minColumns&&l.segments.length<=8);
  const counts=new Map<number,number>();
  candidates.forEach(l=>counts.set(l.segments.length,(counts.get(l.segments.length)||0)+1));
  const modal=[...counts].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0]?.[0]||first.segments.length;
  const template=candidates.find(l=>l.segments.length===modal)||first;
  const anchors=template.segments.map(s=>s.x);
  if(anchors.length>8)return null;
  let aligned=1;
  let end=start;
  let previous=first;
  for(let i=start+1;i<lines.length&&i<start+65;i++){
    const line=lines[i];
    const gap=line.y-previous.y;
    if(gap>Math.max(46,line.size*4.2))break;
    const matched=line.segments.filter(s=>anchors.some(x=>Math.abs(x-s.x)<=Math.max(8,line.size*.9))).length;
    const matchesMain=line.segments.some(s=>Math.abs(s.x-anchors[0])<11);
    // Single-cell continuation lines belong to the preceding table row only if
    // they align to an existing cell. Nonmatching prose terminates the table.
    if(matched===0||(!matchesMain&&matched<2&&gap>line.size*1.8)){
      // A wrapped cell can be indented away from the column anchor for several
      // lines. Keep it only when a genuine data row resumes shortly afterward.
      const resumes=lines.slice(i+1,i+6).some(future=>
        future.y-line.y<90&&future.segments.filter(s=>
          anchors.some(x=>Math.abs(x-s.x)<=Math.max(11,future.size))).length>=2&&
        future.segments.some(s=>Math.abs(s.x-anchors[0])<18));
      if(!resumes)break;
    }
    if(matched>=Math.min(minColumns,anchors.length))aligned++;
    end=i;previous=line;
  }
  if(aligned<3||end-start<2)return null;
  const rows:string[][]=[];
  for(let i=start;i<=end;i++){
    const line=lines[i];
    const cells=Array.from({length:anchors.length},()=>'');
    for(const s of line.segments){
      let column=0,best=Infinity;
      anchors.forEach((x,j)=>{const distance=Math.abs(x-s.x);if(distance<best){best=distance;column=j;}});
      // Never discard an extracted text segment merely because a font or
      // alignment shift made the table-column inference uncertain.
      cells[column]=(cells[column]?' '+s.text:s.text);
    }
    const firstCell=!!cells[0]&&line.segments.some(s=>Math.abs(s.x-anchors[0])<18);
    if(!rows.length||firstCell){
      rows.push(cells);
    }else{
      const last=rows[rows.length-1];
      cells.forEach((value,j)=>{if(value)last[j]=appendLine(last[j],value);});
    }
  }
  const substantive=rows.filter(r=>r.filter(Boolean).length>=2);
  if(substantive.length<3)return null;
  const header=rows.length>1&&rows[0].filter(Boolean).length>=2&&
    rows[0].every(c=>!/\d/.test(c))&&rows.slice(1).some(r=>r.some(c=>/\d/.test(c)));
  return {end,table:{kind:'table',rows,columnCount:anchors.length,header},bottom:lines[end].y};
}

function appendLine(left:string,right:string):string{
  const a=left.trimEnd(),b=right.trimStart();
  if(!a)return b;
  // Join soft-wrap hyphenation but preserve an intentional dash between digits.
  if(/[a-zA-Z]-$/.test(a)&&/^[a-z]/.test(b))return a.slice(0,-1)+b;
  return a+' '+b;
}

function isHeading(line:Line,baseline:number,previous:Line|null):boolean{
  if(line.text.length>105||line.segments.length>2)return false;
  if(line.size>baseline*1.23)return true;
  if(/^(chapter\s+\d+|appendix\s+[a-z]|part\s+[ivx]+)/i.test(line.text))return true;
  const topGap=previous?line.y-previous.y:999;
  return topGap>baseline*2.3&&line.text.length<62&&line.size>=baseline*1.12;
}


/** Tables often start with a two-cell row (the example cell wraps). A later
 * row supplies the three stable column anchors. Recover immediately preceding
 * aligned rows without letting two-column prose *start* a table detection.
 */
function extendTableBackward(lines:Line[],index:number,detected:Detection):{start:number;table:Detection['table']}{
  const anchors=lines[index].segments.map(s=>s.x);
  let start=index;
  for(let j=index-1;j>=Math.max(0,index-5);j--){
    const line=lines[j],after=lines[j+1];
    if(after.y-line.y>Math.max(46,line.size*4.2))break;
    const alignedFirst=line.segments.some(s=>Math.abs(s.x-anchors[0])<18);
    const alignedLater=line.segments.some(s=>anchors.slice(1).some(x=>Math.abs(s.x-x)<18));
    // A 2+-cell data row or the continuation of its final table cell.
    if(line.segments.length>=2&&alignedFirst&&alignedLater){start=j;continue;}
    if(line.segments.length===1&&alignedLater&&!alignedFirst&&start<j+2){start=j;continue;}
    break;
  }
  if(start===index)return {start,table:detected.table};
  const rows:string[][]=[];
  for(let j=start;j<index;j++){
    const cells=Array.from({length:anchors.length},()=>'');
    for(const cell of lines[j].segments){
      let best=0,dist=Infinity;
      for(let k=0;k<anchors.length;k++){
        const d=Math.abs(anchors[k]-cell.x);
        if(d<dist){dist=d;best=k;}
      }
      cells[best]=appendLine(cells[best],cell.text);
    }
    const startsNew=lines[j].segments.some(s=>Math.abs(s.x-anchors[0])<18);
    if(!rows.length||startsNew)rows.push(cells);
    else cells.forEach((v,k)=>{if(v)rows[rows.length-1][k]=appendLine(rows[rows.length-1][k],v);});
  }
  const combined=[...rows,...detected.table.rows];
  const header=combined.length>1&&combined[0].filter(Boolean).length>=2&&
    combined[0].every(v=>!/\d/.test(v))&&combined.slice(1).some(row=>row.some(v=>/\d/.test(v)));
  return {start,table:{...detected.table,rows:combined,header}};
}

function convertLines(lines:Line[]):StructuredBlock[]{
  if(!lines.length)return [];
  const base=median(lines.map(l=>l.size));
  const detected=new Map<number,{end:number;table:Detection['table']}>();
  let occupiedUntil=-1;
  for(let i=0;i<lines.length;i++){
    if(i<=occupiedUntil)continue;
    const table=makeTable(lines,i,3);
    if(!table)continue;
    const earlier=extendTableBackward(lines,i,table);
    const start=Math.max(occupiedUntil+1,earlier.start);
    detected.set(start,{end:table.end,table:earlier.table});
    occupiedUntil=table.end;
    i=table.end;
  }
  const blocks:StructuredBlock[]=[];
  let paragraph='';
  let previous:Line|null=null;
  const flush=()=>{if(paragraph.trim())blocks.push({kind:'paragraph',text:paragraph.trim()});paragraph='';};
  for(let i=0;i<lines.length;i++){
    const table=detected.get(i);
    if(table){
      flush();
      blocks.push(table.table);
      i=table.end;
      previous=lines[i];continue;
    }
    const line=lines[i];
    if(isHeading(line,base,previous)){
      flush();blocks.push({kind:'heading',text:line.text});previous=null;continue;
    }
    if(previous){
      const gap=line.y-previous.y;
      const indent=line.x-previous.x;
      if(gap>Math.max(18,base*1.65)||indent>Math.max(18,base*1.7))flush();
    }
    paragraph=appendLine(paragraph,line.text);
    previous=line;
  }
  flush();
  return blocks;
}

function broadTableRanges(lines:Line[],width:number):{start:number;end:number;block:StructuredBlock}[]{
  const found:{start:number;end:number;block:StructuredBlock}[]=[];
  for(let i=0;i<lines.length;i++){
    if(lines[i].segments.length<3)continue;
    const table=makeTable(lines,i,3);
    if(!table)continue;
    const all=lines.slice(i,table.end+1);
    const xMin=Math.min(...all.map(l=>l.x));
    const xMax=Math.max(...all.flatMap(l=>l.segments.map(s=>s.right)));
    // A full-width table must genuinely cross the page gutter. Otherwise
    // detect tables in each column independently to avoid joining prose streams.
    if(xMax-xMin<width*.48||xMin>width*.35)continue;
    found.push({start:lines[i].y-3,end:table.bottom+3,block:table.table});
    i=table.end;
  }
  return found;
}

/** Stable reading-order blocks with explicit table rows/cells. */
export function structureTextPage(page:Pick<TextPage,'width'|'height'|'positioned'>):StructuredBlock[]{
  if(!Number.isFinite(page.width)||page.width<=0)throw new RangeError('Invalid page width');
  if(!Number.isFinite(page.height)||page.height<=0)throw new RangeError('Invalid page height');
  const source=page.positioned.filter(r=>r.y>Math.min(40,page.height*.05)&&r.y<page.height-30);
  if(!source.length)return [];
  const midpoint=page.width/2;
  const whole=makeLines(source);
  const spanning=broadTableRanges(whole,page.width);
  const output:StructuredBlock[]=[];
  let from=0;
  const addRegion=(top:number,bottom:number)=>{
    if(bottom<=top)return;
    const subset=source.filter(r=>r.y>=top&&r.y<bottom);
    // Explicit column separation prevents text on the same baseline in
    // distinct book columns from being erroneously concatenated.
    for(const stream of [subset.filter(r=>r.x<midpoint),subset.filter(r=>r.x>=midpoint)]){
      output.push(...convertLines(makeLines(stream)));
    }
  };
  for(const item of spanning){
    addRegion(from,item.start);
    output.push(item.block);
    from=item.end;
  }
  addRegion(from,page.height+1);
  return output;
}

export function blockText(block:StructuredBlock):string{
  return block.kind==='table'?block.rows.map(row=>row.join(' | ')).join('\n'):block.text;
}

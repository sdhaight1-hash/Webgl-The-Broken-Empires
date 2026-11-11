import { jsPDF } from 'jspdf';
import type { TextPage } from './pdfText.ts';
import {structureTextPage} from './srdLayout.ts';
import type {StructuredBlock} from './srdLayout.ts';
import type { SourceSection } from './sourceOutline.ts';

const PAGE_WIDTH=612;
const PAGE_HEIGHT=792;
const TOC_ROWS=34;
const MARGIN=42;

export type ExportProgress={completed:number;total:number};
export type ExportResult={blob:Blob;pageCount:number;tocPages:number;links:number};
export type ExportOptions={
  totalPages:number;
  sections:readonly SourceSection[];
  readPage:(page:number)=>Promise<TextPage>;
  onProgress?:(progress:ExportProgress)=>void;
  signal?:AbortSignal;
};

type Bookmark={children?:Bookmark[]};
type BookmarkAPI={
  root:Bookmark;
  add:(parent:Bookmark|null,title:string,options:{pageNumber:number})=>Bookmark;
};

function assertNotCancelled(signal?:AbortSignal){
  if(signal?.aborted)throw new Error('PDF export cancelled');
}

/** Standard PDF fonts lack full Unicode support. Transliterate punctuation safely. */
export function safePdfText(text:string):string {
  const punctuation:Record<string,string>={
    '\u2018':"'",'\u2019':"'",'\u201c':'"','\u201d':'"','\u2013':'-','\u2014':'--',
    '\u2026':'...','\u2022':'*','\u00a0':' ','\u200b':'','\u2122':'(TM)',
    '\u2192':'->','\u2190':'<-','\u2264':'<=','\u2265':'>=','\u2010':'-',
    '\u2011':'-','\u202f':' ','\u2044':'/','\u2212':'-'
  };
  return text.replace(/[\u2010-\u2022\u00a0\u200b\u2122\u2190-\u2192\u2264-\u2265\u202f\u2044\u2212]/g,
    ch=>punctuation[ch]??'?')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^\x20-\x7e\u00a1-\u00ff]/g,'?');
}

export function exportPageForSource(sourcePage:number,tocPages:number):number {
  if(!Number.isInteger(sourcePage)||sourcePage<1||!Number.isInteger(tocPages)||tocPages<1)
    throw new RangeError('Invalid PDF page');
  // Page 1: cover, pages 2..(tocPages+1): linked contents.
  return tocPages+sourcePage+1;
}

function fitTitle(pdf:jsPDF,title:string,maxWidth:number):string {
  let result=safePdfText(title);
  while(result.length>3 && pdf.getTextWidth(result)>maxWidth)result=result.slice(0,-2);
  return result===safePdfText(title)?result:result.slice(0,-1)+'...';
}

function renderCover(pdf:jsPDF,tocPages:number,sourcePages:number){
  pdf.setFillColor(22,38,46);
  pdf.rect(0,0,PAGE_WIDTH,PAGE_HEIGHT,'F');
  pdf.setFillColor(190,160,111);
  pdf.rect(MARGIN,109,44,3,'F');
  pdf.setTextColor(233,223,204);
  pdf.setFont('times','bold');pdf.setFontSize(33);
  pdf.text('THE BROKEN EMPIRES',MARGIN,159);
  pdf.setFont('times','italic');pdf.setFontSize(22);
  pdf.text('Personal text-only rules edition',MARGIN,193);
  pdf.setFont('helvetica','normal');pdf.setFontSize(12);
  pdf.setTextColor(183,201,202);
  pdf.text('Generated locally from your own PDF. Artwork is not included.',MARGIN,239);
  pdf.text(sourcePages+' source pages  /  '+tocPages+' linked contents pages',MARGIN,261);
  pdf.setDrawColor(95,123,123);pdf.line(MARGIN,291,PAGE_WIDTH-MARGIN,291);
  pdf.setFontSize(10);
  const disclaimer=[
    'Personal reference copy. This file is not an officially licensed SRD.',
    'Text positioning may differ from the source; some tables require verification.',
    'The original rulebook remains authoritative. Do not redistribute without permission.'
  ];
  disclaimer.forEach((line,i)=>pdf.text(line,MARGIN,325+i*20));
  pdf.setFont('helvetica','bold');pdf.setFontSize(13);pdf.setTextColor(241,206,144);
  pdf.text('OPEN LINKED CONTENTS',MARGIN,445);
  pdf.link(MARGIN,424,230,33,{pageNumber:2});
  pdf.setFont('helvetica','normal');pdf.setFontSize(10);pdf.setTextColor(168,188,190);
  pdf.text('All chapter links, bookmarks, and page navigation stay inside this PDF.',MARGIN,485);
}


/** The old exporter placed every PDF text fragment independently, which caused
 * overlapping paragraphs, tiny glyphs and flattened tables. Body pages are now
 * typeset from semantic blocks with explicit grid cells and automatic pagination.
 * Contents/bookmark links are resolved *after* pagination because source pages
 * may occupy more than one properly typeset output page.
 */
type PageRecord={outputPage:number;sourcePage:number;continued:boolean};
type LinkSpot={outputPage:number;sourceChapter:number;x:number;y:number;width:number;height:number};
type BodyState={y:number;outputPage:number;sourcePage:number};
const BODY_TOP=63;
const BODY_BOTTOM=735;
const BODY_WIDTH=PAGE_WIDTH-2*MARGIN;
const TABLE_LINE_HEIGHT=12;
const TEXT_LINE_HEIGHT=15.2;
const FONT_SIZE=11.4;

function renderContents(
  pdf:jsPDF,entries:readonly SourceSection[],tocPages:number,totalPages:number,
  pageMap:ReadonlyMap<number,number>
):number{
  const outline=(pdf as jsPDF&{outline:BookmarkAPI}).outline;
  outline.add(null,'Table of contents',{pageNumber:2});
  let chapter:Bookmark|null=null;
  let links=0;
  for(let pageIndex=0;pageIndex<tocPages;pageIndex++){
    pdf.setPage(pageIndex+2);
    pdf.setFillColor(247,244,236);pdf.rect(0,0,PAGE_WIDTH,PAGE_HEIGHT,'F');
    pdf.setTextColor(40,61,67);pdf.setFont('times','bold');pdf.setFontSize(23);
    pdf.text('CONTENTS',MARGIN,58);
    pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(100,111,109);
    pdf.text('Choose a section to jump to its reformatted text.',MARGIN,77);
    pdf.setDrawColor(185,173,150);pdf.line(MARGIN,89,PAGE_WIDTH-MARGIN,89);
    for(let i=0;i<TOC_ROWS;i++){
      const entry=entries[pageIndex*TOC_ROWS+i];
      if(!entry)break;
      const target=pageMap.get(entry.page);
      if(!target)continue;
      const y=113+i*18;
      const isChapter=entry.level===1;
      const x=isChapter?MARGIN:MARGIN+16;
      pdf.setFont('helvetica',isChapter?'bold':'normal');
      pdf.setFontSize(isChapter?10.8:10);
      pdf.setTextColor(isChapter?32:64,isChapter?61:76,isChapter?70:75);
      pdf.text(fitTitle(pdf,entry.title,443-(x-MARGIN)),x,y);
      pdf.setFont('helvetica','normal');pdf.setFontSize(9);
      pdf.setTextColor(99,105,102);
      pdf.text(String(entry.page),PAGE_WIDTH-MARGIN,y,{align:'right'});
      pdf.link(MARGIN,y-13,BODY_WIDTH,16,{pageNumber:target});
      links++;
      const title=safePdfText(entry.title);
      if(isChapter)chapter=outline.add(null,title,{pageNumber:target});
      else outline.add(chapter,title,{pageNumber:target});
    }
    pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(97,103,100);
    pdf.text('Contents '+(pageIndex+1)+' / '+tocPages,MARGIN,PAGE_HEIGHT-34);
    pdf.text('Source pages 1-'+totalPages,PAGE_WIDTH-MARGIN,PAGE_HEIGHT-34,{align:'right'});
    pdf.link(MARGIN,PAGE_HEIGHT-47,110,21,{pageNumber:1});
    links++;
  }
  return links;
}

function chapterTargets(sections:readonly SourceSection[],pageMap:ReadonlyMap<number,number>):Map<number,number>{
  const result=new Map<number,number>();
  for(const section of sections){
    if(section.level!==1)continue;
    const match=/^(\d{1,2})\s*[-:]/.exec(section.title);
    const target=pageMap.get(section.page);
    if(match&&target)result.set(Number(match[1]),target);
  }
  return result;
}

function stylePage(pdf:jsPDF,sourcePage:number,continued:boolean):void{
  pdf.setFillColor(251,249,244);pdf.rect(0,0,PAGE_WIDTH,PAGE_HEIGHT,'F');
  pdf.setTextColor(43,61,65);pdf.setFont('helvetica','bold');pdf.setFontSize(9);
  pdf.text('PERSONAL TEXT EDITION',MARGIN,24);
  pdf.setFont('helvetica','normal');pdf.setTextColor(105,114,111);
  pdf.text('Source PDF p. '+sourcePage+(continued?' (cont.)':''),PAGE_WIDTH-MARGIN,24,{align:'right'});
  pdf.setDrawColor(202,200,190);pdf.line(MARGIN,31,PAGE_WIDTH-MARGIN,31);
}
function beginSourcePage(
  pdf:jsPDF,sourcePage:number,records:PageRecord[],continued:boolean
):BodyState{
  pdf.addPage();
  const number=pdf.getNumberOfPages();
  stylePage(pdf,sourcePage,continued);
  records.push({outputPage:number,sourcePage,continued});
  return {y:BODY_TOP,outputPage:number,sourcePage};
}

function sourceTextLines(pdf:jsPDF,text:string,availableWidth:number,fontSize:number,font:'normal'|'bold'='normal'):string[]{
  pdf.setFont('times',font);pdf.setFontSize(fontSize);
  return pdf.splitTextToSize(safePdfText(text).replace(/\s+/g,' ').trim(),availableWidth) as string[];
}

function drawChapterSpots(pdf:jsPDF,line:string,x:number,y:number,size:number,outputPage:number,spots:LinkSpot[]){
  const pattern=/\bChapter\s+(\d{1,2})\b/gi;
  for(const match of line.matchAll(pattern)){
    const start=x+pdf.getTextWidth(line.slice(0,match.index));
    const width=pdf.getTextWidth(match[0]);
    if(start+width<=PAGE_WIDTH-MARGIN+1){
      spots.push({outputPage,sourceChapter:Number(match[1]),x:start,y:y-size,width,height:size*1.25});
    }
  }
}

function renderParagraph(
  pdf:jsPDF,block:Extract<StructuredBlock,{kind:'paragraph'}>,
  state:BodyState,records:PageRecord[],spots:LinkSpot[]
):BodyState{
  const lines=sourceTextLines(pdf,block.text,BODY_WIDTH,FONT_SIZE);
  for(const line of lines){
    if(state.y+TEXT_LINE_HEIGHT>BODY_BOTTOM)state=beginSourcePage(pdf,state.sourcePage,records,true);
    pdf.setPage(state.outputPage);
    pdf.setFont('times','normal');pdf.setFontSize(FONT_SIZE);
    pdf.setTextColor(33,38,39);
    pdf.text(line,MARGIN,state.y);
    drawChapterSpots(pdf,line,MARGIN,state.y,FONT_SIZE,state.outputPage,spots);
    state.y+=TEXT_LINE_HEIGHT;
  }
  state.y+=8;
  return state;
}
function renderHeading(
  pdf:jsPDF,block:Extract<StructuredBlock,{kind:'heading'}>,state:BodyState,records:PageRecord[],spots:LinkSpot[]
):BodyState{
  const lines=sourceTextLines(pdf,block.text,BODY_WIDTH,15.5,'bold');
  const needed=lines.length*20+19;
  if(state.y+needed>BODY_BOTTOM)state=beginSourcePage(pdf,state.sourcePage,records,true);
  state.y+=12;
  pdf.setFont('times','bold');pdf.setFontSize(15.5);pdf.setTextColor(45,74,75);
  for(const line of lines){
    pdf.text(line,MARGIN,state.y);
    drawChapterSpots(pdf,line,MARGIN,state.y,15.5,state.outputPage,spots);
    state.y+=20;
  }
  state.y+=7;
  return state;
}

function tableWidths(block:Extract<StructuredBlock,{kind:'table'}>):number[]{
  const raw=Array.from({length:block.columnCount},(_,j)=>{
    const sample=block.rows.map(row=>(row[j]||'').length).filter(Boolean);
    const mean=sample.reduce((a,b)=>a+Math.min(b,60),0)/Math.max(1,sample.length);
    const max=Math.max(0,...sample);
    return Math.max(11,Math.min(50,mean*.8+max*.24+7));
  });
  const sum=raw.reduce((a,b)=>a+b,0);
  return raw.map(x=>BODY_WIDTH*x/sum);
}

function renderTable(
  pdf:jsPDF,block:Extract<StructuredBlock,{kind:'table'}>,
  state:BodyState,records:PageRecord[]
):BodyState{
  if(!block.rows.length||block.columnCount<2)return state;
  const widths=tableWidths(block);
  const fontSize=9.5;
  const pad=5;
  const rows=block.rows.map(row=>row.slice(0,block.columnCount));
  if(state.y+42>BODY_BOTTOM)state=beginSourcePage(pdf,state.sourcePage,records,true);
  state.y+=7;
  const startY=state.y;
  for(let rowIndex=0;rowIndex<rows.length;rowIndex++){
    const cells=rows[rowIndex];
    const header=block.header&&rowIndex===0;
    const wrapped=cells.map((text,j)=>sourceTextLines(pdf,text||'',Math.max(12,widths[j]-pad*2),fontSize,header?'bold':'normal'));
    const rowMax=Math.max(1,...wrapped.map(lines=>lines.length));
    let offset=0;
    while(offset<rowMax){
      if(state.y+TABLE_LINE_HEIGHT+pad*2>BODY_BOTTOM){
        state=beginSourcePage(pdf,state.sourcePage,records,true);
        pdf.setFont('times','italic');pdf.setFontSize(8.5);pdf.setTextColor(96,106,105);
        pdf.text('Table continued from previous page',MARGIN,state.y);
        state.y+=15;
      }
      const capacity=Math.max(1,Math.floor((BODY_BOTTOM-state.y-pad*2)/TABLE_LINE_HEIGHT));
      const count=Math.min(rowMax-offset,capacity);
      const height=count*TABLE_LINE_HEIGHT+pad*2;
      let x=MARGIN;
      for(let col=0;col<block.columnCount;col++){
        pdf.setFillColor(header?219:rowIndex%2?250:244,header?231:rowIndex%2?248:244,header?229:rowIndex%2?242:236);
        pdf.setDrawColor(183,193,190);
        pdf.setLineWidth(.4);
        pdf.rect(x,state.y,widths[col],height,'FD');
        pdf.setFont('times',header?'bold':'normal');pdf.setFontSize(fontSize);
        pdf.setTextColor(34,45,45);
        const textLines=wrapped[col]||[];
        for(let j=0;j<count;j++){
          const part=textLines[offset+j];
          if(part)pdf.text(part,x+pad,state.y+pad+fontSize+j*TABLE_LINE_HEIGHT);
        }
        x+=widths[col];
      }
      state.y+=height;
      offset+=count;
    }
  }
  if(state.y===startY)state.y+=15;
  state.y+=14;
  return state;
}

function renderStructuredSource(
  pdf:jsPDF,page:TextPage,sourcePage:number,
  records:PageRecord[],spots:LinkSpot[]
):number{
  let state=beginSourcePage(pdf,sourcePage,records,false);
  const blocks=structureTextPage(page);
  if(!blocks.length){
    pdf.setFont('times','italic');pdf.setFontSize(10);pdf.setTextColor(102,113,111);
    pdf.text('No extractable text was found on this source page.',MARGIN,state.y+12);
    return 0;
  }
  for(const block of blocks){
    if(block.kind==='heading')state=renderHeading(pdf,block,state,records,spots);
    else if(block.kind==='table')state=renderTable(pdf,block,state,records);
    else state=renderParagraph(pdf,block,state,records,spots);
  }
  return blocks.filter(b=>b.kind==='table').length;
}

function renderFooters(
  pdf:jsPDF,records:readonly PageRecord[],pageMap:ReadonlyMap<number,number>,
  totalPages:number
):number{
  let links=0;
  for(const record of records){
    pdf.setPage(record.outputPage);
    pdf.setDrawColor(202,200,190);pdf.line(MARGIN,PAGE_HEIGHT-44,PAGE_WIDTH-MARGIN,PAGE_HEIGHT-44);
    pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(66,90,99);
    pdf.text('CONTENTS',MARGIN,PAGE_HEIGHT-28);
    pdf.link(MARGIN,PAGE_HEIGHT-42,90,24,{pageNumber:2});links++;
    const prev=pageMap.get(record.sourcePage-1);
    if(prev){
      pdf.text('< PREVIOUS',171,PAGE_HEIGHT-28);
      pdf.link(166,PAGE_HEIGHT-42,96,24,{pageNumber:prev});links++;
    }
    pdf.text('Source '+record.sourcePage+(record.continued?' (cont.)':''),330,PAGE_HEIGHT-28);
    const next=pageMap.get(record.sourcePage+1);
    if(record.sourcePage<totalPages&&next){
      pdf.text('NEXT >',PAGE_WIDTH-MARGIN,PAGE_HEIGHT-28,{align:'right'});
      pdf.link(PAGE_WIDTH-MARGIN-100,PAGE_HEIGHT-42,100,24,{pageNumber:next});links++;
    }
  }
  return links;
}

export async function buildHyperlinkedSrdPdf(options:ExportOptions):Promise<ExportResult>{
  const {totalPages,readPage,signal,onProgress}=options;
  if(!Number.isInteger(totalPages)||totalPages<1)throw new RangeError('Invalid source page count');
  const sections=options.sections.filter(s=>
    Number.isInteger(s.page)&&s.page>=1&&s.page<=totalPages&&s.title.trim().length>0
  );
  const tocPages=Math.max(1,Math.ceil(sections.length/TOC_ROWS));
  const pdf=new jsPDF({unit:'pt',format:[PAGE_WIDTH,PAGE_HEIGHT],compress:true});
  pdf.setProperties({
    title:'The Broken Empires - Personal Formatted Text Reference',
    subject:'Owner-generated art-free rules reading copy with real text tables',
    creator:"Wayfarer's Ledger - local PDF converter"
  });
  renderCover(pdf,tocPages,totalPages);
  for(let i=0;i<tocPages;i++)pdf.addPage(); // links are filled after pagination
  const records:PageRecord[]=[];
  const spots:LinkSpot[]=[];
  const pageMap=new Map<number,number>();
  let tables=0;
  for(let p=1;p<=totalPages;p++){
    assertNotCancelled(signal);
    const page=await readPage(p);
    assertNotCancelled(signal);
    pageMap.set(p,pdf.getNumberOfPages()+1);
    tables+=renderStructuredSource(pdf,page,p,records,spots);
    if(p%10===0||p===totalPages){
      onProgress?.({completed:p,total:totalPages});
      await new Promise<void>(resolve=>setTimeout(resolve,0));
    }
  }
  assertNotCancelled(signal);
  let links=1+renderContents(pdf,sections,tocPages,totalPages,pageMap);
  links+=renderFooters(pdf,records,pageMap,totalPages);
  const chapterMap=chapterTargets(sections,pageMap);
  for(const spot of spots){
    const target=chapterMap.get(spot.sourceChapter);
    if(!target)continue;
    pdf.setPage(spot.outputPage);
    pdf.link(spot.x,spot.y,spot.width,spot.height,{pageNumber:target});
    links++;
  }
  // Keep the count for diagnostics without copying source text.
  void tables;
  assertNotCancelled(signal);
  return {blob:pdf.output('blob'),pageCount:pdf.getNumberOfPages(),tocPages,links};
}

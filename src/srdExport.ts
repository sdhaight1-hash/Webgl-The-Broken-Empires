import { jsPDF } from 'jspdf';
import type { TextPage } from './pdfText.ts';
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
  return text.replace(/[\u2018-\u2022\u00a0\u200b\u2122\u2190-\u2192\u2264-\u2265\u202f\u2044\u2212]/g,
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

function renderContents(pdf:jsPDF,entries:readonly SourceSection[],tocPages:number,totalPages:number){
  const outline=(pdf as jsPDF&{outline:BookmarkAPI}).outline;
  outline.add(null,'Table of contents',{pageNumber:2});
  let chapter:Bookmark|null=null;
  let links=0;
  for(let pageIndex=0;pageIndex<tocPages;pageIndex++){
    pdf.addPage();
    pdf.setFillColor(247,244,236);pdf.rect(0,0,PAGE_WIDTH,PAGE_HEIGHT,'F');
    pdf.setTextColor(40,61,67);pdf.setFont('times','bold');pdf.setFontSize(23);
    pdf.text('CONTENTS',MARGIN,58);
    pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(100,111,109);
    pdf.text('Select a section to jump to its text page.',MARGIN,77);
    pdf.setDrawColor(185,173,150);pdf.line(MARGIN,89,PAGE_WIDTH-MARGIN,89);
    for(let i=0;i<TOC_ROWS;i++){
      const entry=entries[pageIndex*TOC_ROWS+i];
      if(!entry)break;
      const outputPage=exportPageForSource(entry.page,tocPages);
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
      pdf.link(MARGIN,y-13,PAGE_WIDTH-2*MARGIN,16,{pageNumber:outputPage});
      links++;
      const title=safePdfText(entry.title);
      if(isChapter)chapter=outline.add(null,title,{pageNumber:outputPage});
      else outline.add(chapter,title,{pageNumber:outputPage});
    }
    pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(97,103,100);
    pdf.text('Contents '+(pageIndex+1)+' / '+tocPages,MARGIN,PAGE_HEIGHT-34);
    pdf.text('Source pages 1-'+totalPages,PAGE_WIDTH-MARGIN,PAGE_HEIGHT-34,{align:'right'});
    pdf.link(MARGIN,PAGE_HEIGHT-47,110,21,{pageNumber:1});
  }
  return links;
}

function chaptersByNumber(sections:readonly SourceSection[],tocPages:number):Map<number,number> {
  const result=new Map<number,number>();
  for(const section of sections){
    if(section.level!==1)continue;
    const match=/^(\d{1,2})\s*[-:]/.exec(section.title);
    if(match)result.set(Number(match[1]),exportPageForSource(section.page,tocPages));
  }
  return result;
}

function renderSourcePage(
  pdf:jsPDF, page:TextPage, sourceNumber:number,totalPages:number,tocPages:number,
  chapterLinks:ReadonlyMap<number,number>
):number {
  pdf.addPage();
  pdf.setFillColor(251,249,244);pdf.rect(0,0,PAGE_WIDTH,PAGE_HEIGHT,'F');
  pdf.setTextColor(43,61,65);pdf.setFont('helvetica','bold');pdf.setFontSize(9);
  pdf.text('PERSONAL TEXT EDITION',MARGIN,24);
  pdf.setFont('helvetica','normal');pdf.setTextColor(105,114,111);
  pdf.text('Source PDF p. '+sourceNumber,PAGE_WIDTH-MARGIN,24,{align:'right'});
  pdf.setDrawColor(202,200,190);pdf.line(MARGIN,31,PAGE_WIDTH-MARGIN,31);

  const boxWidth=PAGE_WIDTH-2*MARGIN;
  const boxHeight=PAGE_HEIGHT-106;
  const scale=Math.min(boxWidth/page.width,boxHeight/page.height);
  const offsetX=MARGIN+(boxWidth-page.width*scale)/2;
  const offsetY=43+(boxHeight-page.height*scale)/2;
  pdf.setFont('times','normal');pdf.setTextColor(32,36,37);
  let crossRefs=0;
  let previousSize=-1;
  for(const run of page.positioned){
    if(!run.text.trim()||!Number.isFinite(run.x)||!Number.isFinite(run.y))continue;
    const size=Math.max(4,Math.min(30,run.fontSize*scale));
    const x=offsetX+run.x*scale;
    const y=offsetY+run.y*scale;
    if(x<0||y<32||x>PAGE_WIDTH||y>PAGE_HEIGHT-38)continue;
    if(Math.abs(size-previousSize)>.18){pdf.setFontSize(size);previousSize=size;}
    const line=safePdfText(run.text.replace(/\s+/g,' '));
    if(!line.trim())continue;
    pdf.text(line,x,y,{horizontalScale:Math.min(1,(PAGE_WIDTH-MARGIN-x)/Math.max(1,pdf.getTextWidth(line)))});
    // Safe, explicit "Chapter N" cross-references only. No guessed destinations.
    const chapters=/\bChapter\s+(\d{1,2})\b/gi;
    for(const match of line.matchAll(chapters)){
      const target=chapterLinks.get(Number(match[1]));
      if(!target)continue;
      const start=x+pdf.getTextWidth(line.slice(0,match.index));
      const width=pdf.getTextWidth(match[0]);
      if(start>=0 && start+width<PAGE_WIDTH-8){
        pdf.link(start,y-size,width,size*1.15,{pageNumber:target});
        crossRefs++;
      }
    }
  }
  pdf.setDrawColor(202,200,190);pdf.line(MARGIN,PAGE_HEIGHT-44,PAGE_WIDTH-MARGIN,PAGE_HEIGHT-44);
  pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(66,90,99);
  pdf.text('CONTENTS',MARGIN,PAGE_HEIGHT-28);
  pdf.link(MARGIN,PAGE_HEIGHT-42,90,24,{pageNumber:2});
  if(sourceNumber>1){
    pdf.text('< PREVIOUS',171,PAGE_HEIGHT-28);
    pdf.link(166,PAGE_HEIGHT-42,96,24,{pageNumber:exportPageForSource(sourceNumber-1,tocPages)});
  }
  pdf.text('Source '+sourceNumber,333,PAGE_HEIGHT-28);
  if(sourceNumber<totalPages){
    pdf.text('NEXT >',PAGE_WIDTH-MARGIN,PAGE_HEIGHT-28,{align:'right'});
    pdf.link(PAGE_WIDTH-MARGIN-100,PAGE_HEIGHT-42,100,24,{pageNumber:exportPageForSource(sourceNumber+1,tocPages)});
  }
  return crossRefs+1+(sourceNumber>1?1:0)+(sourceNumber<totalPages?1:0);
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
    title:'The Broken Empires - Personal Text Reference',
    subject:'User-generated text-only reading copy with internal section links',
    creator:'Wayfarer\\'s Ledger - local PDF converter'
  });
  renderCover(pdf,tocPages,totalPages);
  let links=1+renderContents(pdf,sections,tocPages,totalPages);
  const chapterLinks=chaptersByNumber(sections,tocPages);
  for(let p=1;p<=totalPages;p++){
    assertNotCancelled(signal);
    const page=await readPage(p);
    assertNotCancelled(signal);
    links+=renderSourcePage(pdf,page,p,totalPages,tocPages,chapterLinks);
    if(p%10===0||p===totalPages){
      onProgress?.({completed:p,total:totalPages});
      await new Promise<void>(resolve=>setTimeout(resolve,0));
    }
  }
  assertNotCancelled(signal);
  const blob=pdf.output('blob');
  return {blob,pageCount:1+tocPages+totalPages,tocPages,links};
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Columns2, Download, FileSearch, FileUp, ListTree, Minus, Plus, RotateCcw, ScanText, Search, X } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { SOURCE_OUTLINE } from './sourceOutline.ts';
import { PDF_PAGE_COUNT } from './bookIndex.ts';
import { reconstructTextPage, pageMatches, pageSnippet } from './pdfText.ts';
import type { TextBlock, TextPage } from './pdfText.ts';
import './personalSrd.css';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

type IndexStatus = 'idle' | 'running' | 'complete' | 'cancelled';
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));

/**
 * User-owned local PDF -> on-demand text-only reading interface.
 * The copyrighted text is never committed, fetched from a server, uploaded,
 * persisted, or included in the built app. The source PDF stays on this device.
 */
export function PersonalSrd({
  file, onFileChange, requestedPage, onOpenOriginal
}: {
  file:File|null;
  onFileChange:(file:File|null)=>void;
  requestedPage:number;
  onOpenOriginal:(page:number)=>void;
}) {
  const [page,setPage]=useState(requestedPage);
  const [document,setDocument]=useState<pdfjs.PDFDocumentProxy|null>(null);
  const [loadState,setLoadState]=useState<'empty'|'loading'|'ready'|'error'>('empty');
  const [loadError,setLoadError]=useState('');
  const [current,setCurrent]=useState<{page:number;value:TextPage}|null>(null);
  const [pageLoading,setPageLoading]=useState(false);
  const [fontSize,setFontSize]=useState(16);
  const [layout,setLayout]=useState<'flow'|'columns'|'geometry'>('flow');
  const [contentsQuery,setContentsQuery]=useState('');
  const [searchQuery,setSearchQuery]=useState('');
  const [indexStatus,setIndexStatus]=useState<IndexStatus>('idle');
  const [indexProgress,setIndexProgress]=useState(0);
  const [indexError,setIndexError]=useState('');
  const [exportStatus,setExportStatus]=useState<'idle'|'working'|'complete'|'cancelled'|'error'>('idle');
  const [exportProgress,setExportProgress]=useState(0);
  const [exportError,setExportError]=useState('');
  const exportController=useRef<AbortController|null>(null);
  const [cacheVersion,setCacheVersion]=useState(0);
  const cache=useRef(new Map<number,TextPage>());
  const cancelIndex=useRef(0);

  useEffect(()=>setPage(requestedPage),[requestedPage]);
  useEffect(()=>()=>{exportController.current?.abort();},[file]);

  useEffect(()=>{
    let disposed=false;
    let loadingTask:pdfjs.PDFDocumentLoadingTask|undefined;
    cancelIndex.current++;
    cache.current.clear();
    setCacheVersion(v=>v+1);
    setIndexStatus('idle');
    setIndexProgress(0);
    setCurrent(null);
    setDocument(null);
    setLoadError('');
    if(!file){setLoadState('empty');return;}
    setLoadState('loading');
    (async()=>{
      try{
        // PDF.js parses in its worker; only the selected local bytes are used.
        const buffer=await file.arrayBuffer();
        if(disposed)return;
        loadingTask=pdfjs.getDocument({data:new Uint8Array(buffer)});
        const doc=await loadingTask.promise;
        if(disposed){await loadingTask.destroy();return;}
        setDocument(doc);
        setLoadState('ready');
      }catch(e){
        if(!disposed){setLoadError(e instanceof Error?e.message:'Cannot read this PDF.');setLoadState('error');}
      }
    })();
    return()=>{
      disposed=true;
      cancelIndex.current++;
      if(loadingTask)void loadingTask.destroy();
    };
  },[file]);

  const getPageText=async(doc:pdfjs.PDFDocumentProxy,pageNumber:number):Promise<TextPage>=>{
    const cached=cache.current.get(pageNumber);
    if(cached)return cached;
    const sourcePage=await doc.getPage(pageNumber);
    try{
      const text=await sourcePage.getTextContent();
      const viewport=sourcePage.getViewport({scale:1});
      const parsed=reconstructTextPage(text.items,viewport.width,viewport.height);
      cache.current.set(pageNumber,parsed);
      return parsed;
    }finally{sourcePage.cleanup();}
  };

  const maxPage=document?.numPages||PDF_PAGE_COUNT;
  const selectedPage=clamp(page,1,maxPage);

  useEffect(()=>{
    if(!document)return;
    let disposed=false;
    setPageLoading(true);
    setCurrent(null);
    (async()=>{
      try{
        const value=await getPageText(document,selectedPage);
        if(!disposed){setCurrent({page:selectedPage,value});setCacheVersion(v=>v+1);}
      }catch(e){
        if(!disposed){setLoadError(e instanceof Error?e.message:'Could not extract text on this page.');}
      }finally{
        if(!disposed)setPageLoading(false);
      }
    })();
    return()=>{disposed=true;};
  },[document,selectedPage]);

  const startIndex=async()=>{
    if(!document||indexStatus==='running')return;
    const token=++cancelIndex.current;
    setIndexStatus('running');
    setIndexError('');
    setIndexProgress(0);
    try{
      for(let p=1;p<=document.numPages;p++){
        if(cancelIndex.current!==token)return;
        await getPageText(document,p);
        if(cancelIndex.current!==token)return;
        if(p%10===0||p===document.numPages){
          setIndexProgress(p);
          setCacheVersion(v=>v+1);
          await new Promise<void>(resolve=>setTimeout(resolve,0));
        }
      }
      if(cancelIndex.current===token)setIndexStatus('complete');
    }catch(e){
      if(cancelIndex.current===token){
        setIndexError(e instanceof Error?e.message:'Could not index the document.');
        setIndexStatus('cancelled');
      }
    }
  };
  const stopIndex=()=>{cancelIndex.current++;setIndexStatus('cancelled');};

  const cancelExport=()=>{
    exportController.current?.abort();
    setExportStatus('cancelled');
  };
  const exportLinkedPdf=async()=>{
    if(!document||exportStatus==='working'||indexStatus==='running')return;
    if(document.numPages!==PDF_PAGE_COUNT){
      setExportStatus('error');
      setExportError('The selected file has '+document.numPages+' pages; the chapter links require the 663-page Core Rulebook.');
      return;
    }
    const controller=new AbortController();
    exportController.current=controller;
    setExportStatus('working');
    setExportProgress(0);
    setExportError('');
    try{
      const {buildHyperlinkedSrdPdf}=await import('./srdExport.ts');
      const result=await buildHyperlinkedSrdPdf({
        totalPages:document.numPages,
        sections:SOURCE_OUTLINE,
        signal:controller.signal,
        readPage:p=>getPageText(document,p),
        onProgress:({completed})=>setExportProgress(completed)
      });
      if(controller.signal.aborted)return;
      const url=URL.createObjectURL(result.blob);
      const anchor=window.document.createElement('a');
      anchor.href=url;
      anchor.download='The_Broken_Empires_Personal_Text_Linked.pdf';
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
      setExportStatus('complete');
    }catch(e){
      if(controller.signal.aborted)setExportStatus('cancelled');
      else{
        setExportStatus('error');
        setExportError(e instanceof Error?e.message:'Failed to create the linked PDF.');
      }
    }finally{
      if(exportController.current===controller)exportController.current=null;
    }
  };

  const sourceHeadings=useMemo(()=>{
    const q=contentsQuery.toLocaleLowerCase().trim();
    return SOURCE_OUTLINE.filter(item=>item.page<=maxPage&&(!q||item.title.toLocaleLowerCase().includes(q)));
  },[contentsQuery,maxPage]);

  const matchingPages=useMemo(()=>{
    const q=searchQuery.trim();
    if(q.length<2)return [];
    return [...cache.current.entries()].filter(([,text])=>pageMatches(text.plainText,q))
      .sort(([a],[b])=>a-b)
      .map(([page,data])=>({page,snippet:pageSnippet(data.plainText,q)}));
  },[searchQuery,cacheVersion]);

  const section=[...SOURCE_OUTLINE].reverse().find(h=>h.page<=selectedPage);
  const chapter=[...SOURCE_OUTLINE].reverse().find(h=>h.page<=selectedPage&&h.level===1);
  const pageData=current?.page===selectedPage?current.value:null;

  const renderBlocks=(blocks:TextBlock[],prefix:string)=>blocks.map((b,i)=>b.kind==='heading'
    ? <h3 key={prefix+i} className="personal-srd-heading">{b.text}</h3>
    : <p key={prefix+i}>{b.text}</p>);

  const goto=(n:number)=>setPage(clamp(Math.round(n)||1,1,maxPage));

  return <div className="personal-srd-page">
    <header className="page-heading">
      <div className="eyebrow"><ScanText size={16}/> YOUR LOCAL RULES EDITION</div>
      <h1>Rules. <em>Without the art.</em></h1>
      <p>Read the entire extractable text of your own Core Rulebook in a clean, searchable interface. Nothing from the book is bundled into this public application.</p>
    </header>
    <div className="personal-srd-banner">
      <div><strong>Personal text-only edition</strong><span>This is a local reader generated from your PDF—not an openly licensed or published SRD. Original tables, symbols and complex layouts may need verification in the source.</span></div>
      <div className="personal-srd-export-actions">
        <button className="button button-gold button-small" disabled={loadState!=='ready'||exportStatus==='working'||indexStatus==='running'} onClick={()=>void exportLinkedPdf()}>
          <Download size={15}/>{exportStatus==='working'?'Generating PDF…':'Export linked PDF'}
        </button>
        <label className="button button-quiet button-small"><FileUp size={15}/>{file?'Change rulebook PDF':'Choose rulebook PDF'}<input type="file" accept=".pdf,application/pdf" className="hidden-input" onChange={e=>onFileChange(e.target.files?.[0]||null)}/></label>
      </div>
    </div>
    {exportStatus==='working'&&<div className="personal-srd-export-progress" role="status">
      <progress max={maxPage} value={exportProgress}/>
      <span>Building linked contents, bookmarks, and text pages: {exportProgress} / {maxPage}</span>
      <button className="button button-quiet button-small" onClick={cancelExport}><X size={14}/> Cancel</button>
    </div>}
    {exportStatus==='complete'&&<p className="personal-srd-export-note">The linked, text-only PDF was generated and its download started. Check the downloaded file before using its tables.</p>}
    {exportStatus==='cancelled'&&<p className="personal-srd-export-note">Export cancelled; you can start it again.</p>}
    {exportError&&exportStatus==='error'&&<p role="alert" className="reference-warning">{exportError}</p>}
    {!file?<section className="panel personal-srd-placeholder"><BookOpen size={52}/><h2>Open your rulebook</h2><p>Select your local <strong>ref docs/Core Rulebook.pdf</strong>. The book stays on your computer, and you can browse its text without images or art.</p><label className="button button-gold"><FileUp size={16}/> Select local PDF<input type="file" accept=".pdf,application/pdf" className="hidden-input" onChange={e=>onFileChange(e.target.files?.[0]||null)}/></label></section>:
    <div className="personal-srd-layout">
      <aside className="panel personal-srd-sidebar">
        <div className="eyebrow"><ListTree size={14}/> THE CONTENTS</div>
        <h3>Navigate the book</h3>
        <p className="muted">{SOURCE_OUTLINE.length} indexed headings · {maxPage} PDF pages</p>
        <label className="field"><span>Find a section</span><input type="search" placeholder="Combat, miracles, naval..." value={contentsQuery} onChange={e=>setContentsQuery(e.target.value)}/></label>
        <div className="personal-srd-toc">{sourceHeadings.map((entry,i)=><button key={entry.page+'-'+entry.title+'-'+i}
          className={(entry.page===selectedPage?'selected ':'')+(entry.level===1?'chapter':'')}
          onClick={()=>goto(entry.page)}>
          <span style={{paddingLeft:entry.level===1?0:13}}>{entry.level===1?'◆ ':''}{entry.title}</span><small>{entry.page}</small>
        </button>)}</div>
        <div className="personal-srd-search">
          <div className="eyebrow"><Search size={14}/> FIND ANY RULE</div>
          <p className="muted">For full-book search, index the PDF once. You can read pages while it processes.</p>
          <button className="button button-quiet button-small" disabled={loadState!=='ready'||indexStatus==='running'||exportStatus==='working'} onClick={()=>void startIndex()}>
            <FileSearch size={15}/>{indexStatus==='complete'?'Rebuild search index':indexStatus==='running'?'Indexing…':'Index all pages'}
          </button>
          {indexStatus==='running'&&<button className="button button-quiet button-small" onClick={stopIndex}><X size={15}/> Stop</button>}
          {indexStatus!=='idle'&&<div className="personal-srd-progress"><progress max={maxPage} value={indexProgress}/><small>{indexProgress} / {maxPage} pages · {indexStatus}</small></div>}
          {indexError&&<p role="alert" className="reference-warning">{indexError}</p>}
          <label className="field"><span>Search extracted text</span><input type="search" placeholder="e.g. Wound Die" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/></label>
          {searchQuery.trim().length>1&&<>
            <p className="muted">{matchingPages.length} matching pages among {cache.current.size} read/indexed pages.</p>
            <div className="personal-srd-hits">{matchingPages.slice(0,70).map(m=><button key={m.page} onClick={()=>goto(m.page)}><strong>PDF {m.page}</strong><span>{m.snippet}</span></button>)}</div>
            {matchingPages.length>70&&<p className="muted">Showing the first 70 pages. Refine your query for more.</p>}
          </>}
        </div>
      </aside>
      <section className="panel personal-srd-reader">
        <div className="personal-srd-reader-bar">
          <div><div className="eyebrow">{chapter?.title||'CORE RULEBOOK'}</div><h2>{section?.title||'Text-only edition'}</h2><small>PDF page {selectedPage} of {maxPage}</small></div>
          <button className="button button-quiet button-small" onClick={()=>onOpenOriginal(selectedPage)}><BookOpen size={15}/> Check original</button>
        </div>
        <div className="personal-srd-tools">
          <div className="personal-srd-paging">
            <button aria-label="Previous page" disabled={selectedPage<=1} onClick={()=>goto(selectedPage-1)}><ArrowLeft size={17}/></button>
            <label>Page <input aria-label="Go to PDF page" type="number" min={1} max={maxPage} value={selectedPage} onChange={e=>goto(Number(e.target.value))}/> / {maxPage}</label>
            <button aria-label="Next page" disabled={selectedPage>=maxPage} onClick={()=>goto(selectedPage+1)}><ArrowRight size={17}/></button>
          </div>
          <div className="personal-srd-display-tools">
            <button aria-label="Decrease text size" title="Smaller text" disabled={fontSize<=13} onClick={()=>setFontSize(s=>clamp(s-1,13,22))}><Minus size={16}/></button>
            <button aria-label="Increase text size" title="Larger text" disabled={fontSize>=22} onClick={()=>setFontSize(s=>clamp(s+1,13,22))}><Plus size={16}/></button>
            <button title="Toggle reading layout" onClick={()=>setLayout(m=>m==='flow'?'columns':m==='columns'?'geometry':'flow')}><Columns2 size={16}/><span>{layout==='flow'?'Reading flow':layout==='columns'?'Page columns':'Text positions'}</span></button>
            <button title="Reset reading options" aria-label="Reset reading options" onClick={()=>{setFontSize(16);setLayout('flow');}}><RotateCcw size={16}/></button>
          </div>
        </div>
        {loadState==='loading'?<div className="personal-srd-loading"><FileSearch size={30}/><p>Opening and parsing your local PDF…</p></div>:
        loadState==='error'?<div className="personal-srd-loading" role="alert"><p>{loadError}</p></div>:
        <div className={'personal-srd-paper '+(layout==='columns'?'show-columns':'')} style={{fontSize:fontSize+'px'}}>
          {document&&document.numPages!==PDF_PAGE_COUNT&&<p className="reference-warning">This PDF has {document.numPages} pages rather than the indexed {PDF_PAGE_COUNT}. Contents links may not align.</p>}
          {pageLoading||!pageData?<div className="personal-srd-loading">Extracting page text…</div>:
          pageData.runCount===0?<div className="personal-srd-no-text"><BookOpen size={35}/><h3>No selectable text on this page</h3><p>This page may contain only artwork or non-extractable material. Use the original PDF for its contents.</p></div>:
          layout==='geometry'?<svg className="personal-srd-spatial" viewBox={`0 0 ${pageData.width} ${pageData.height}`} role="img" aria-label="Spatial text-only view of this PDF page, without artwork">
            {pageData.positioned.map((run,i)=><text key={i} x={run.x} y={run.y} fontSize={run.fontSize} fill="currentColor">{run.text}</text>)}
          </svg>:
          <div className="personal-srd-text-grid">
            <div className="personal-srd-text-stream">{renderBlocks(pageData.left,'left-')}</div>
            <div className="personal-srd-text-stream">{renderBlocks(pageData.right,'right-')}</div>
          </div>}
          <footer className="personal-srd-page-footer"><span>Original text extracted only from your selected PDF</span><span>Page {selectedPage}</span></footer>
        </div>}
        <div className="personal-srd-bottom-nav">
          <button className="button button-quiet button-small" disabled={selectedPage<=1} onClick={()=>goto(selectedPage-1)}><ArrowLeft size={16}/> Previous</button>
          <span><CheckCircle2 size={15}/> {cache.current.size} pages processed this session</span>
          <button className="button button-quiet button-small" disabled={selectedPage>=maxPage} onClick={()=>goto(selectedPage+1)}>Next <ArrowRight size={16}/></button>
        </div>
        <p className="reference-footnote">Text extraction omits graphical art and page images, not necessarily every decorative glyph. The local exported PDF includes a clickable contents and chapter bookmarks but does not automatically license the material for redistribution. Use Text positions mode to inspect table alignment without artwork. PDF text fonts, footnotes, rotated labels and complex tables can still be imperfect; check the original PDF for adjudication. Extraction remains in browser memory only.</p>
      </section>
    </div>}
  </div>;
}

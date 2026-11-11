/** Manual CI validation of the user-owned full source. No book text is logged or stored. */
import fs from 'node:fs';
import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {reconstructTextPage} from '../src/pdfText.ts';
import {buildHyperlinkedSrdPdf,exportPageForSource} from '../src/srdExport.ts';
import {SOURCE_OUTLINE} from '../src/sourceOutline.ts';

GlobalWorkerOptions.workerSrc=new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',import.meta.url).href;

const sourceBytes=new Uint8Array(fs.readFileSync('ref docs/Core Rulebook.pdf'));
const inputTask=getDocument({data:sourceBytes,useSystemFonts:true,disableFontFace:true});
const input=await inputTask.promise;
if(input.numPages!==663)throw new Error('Unexpected source edition size: '+input.numPages);
let processed=0;
const result=await buildHyperlinkedSrdPdf({
  totalPages:input.numPages,
  sections:SOURCE_OUTLINE,
  readPage:async pageNo=>{
    const page=await input.getPage(pageNo);
    try{
      const text=await page.getTextContent();
      const view=page.getViewport({scale:1});
      processed++;
      return reconstructTextPage(text.items,view.width,view.height);
    }finally{page.cleanup();}
  },
  onProgress:({completed,total})=>{
    if(completed%100===0||completed===total)console.log('EXPORT_PROGRESS',completed,total);
  }
});
const outputTask=getDocument({data:new Uint8Array(await result.blob.arrayBuffer()),useSystemFonts:true,disableFontFace:true});
const output=await outputTask.promise;
const outline=await output.getOutline();
const countBookmarks=(nodes)=>nodes.reduce((count,node)=>count+1+countBookmarks(node.items||[]),0);
const bookmarkEntries=countBookmarks(outline||[]);
let clickableContents=0;
for(let i=2;i<2+result.tocPages;i++){
  const page=await output.getPage(i);
  const links=await page.getAnnotations();
  clickableContents+=links.filter(x=>x.subtype==='Link'&&x.dest).length;
}
const sourcePage=await output.getPage(exportPageForSource(490,result.tocPages));
const pageLinks=(await sourcePage.getAnnotations()).filter(x=>x.subtype==='Link'&&x.dest).length;
const lastSource=await output.getPage(result.pageCount);
const lastContents=(await lastSource.getAnnotations()).filter(x=>x.subtype==='Link'&&x.dest).length;
const summary={
  inputPages:input.numPages,processed,exportPages:output.numPages,
  contentsPages:result.tocPages,bookmarks:outline?.length||0,bookmarkEntries,
  clickableContents,pageLinks,lastContents,
  internalLinks:result.links,outputBytes:result.blob.size
};
console.log('SRD_EXPORT_AUDIT',JSON.stringify(summary));
await outputTask.destroy();
await inputTask.destroy();
if(summary.inputPages!==663||summary.processed!==663||summary.exportPages!==result.pageCount||
  summary.clickableContents<SOURCE_OUTLINE.length||summary.bookmarks<15||
  summary.bookmarkEntries<SOURCE_OUTLINE.length+1||
  summary.lastContents<2||summary.outputBytes<300_000){
  throw new Error('Full export audit failed structural acceptance checks');
}

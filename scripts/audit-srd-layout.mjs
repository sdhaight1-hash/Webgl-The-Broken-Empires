/** Geometry-only SRD validation. Never prints or saves source text or PDF bytes. */
import fs from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {reconstructTextPage} from '../src/pdfText.ts';
import {structureTextPage,blockText} from '../src/srdLayout.ts';
import {buildHyperlinkedSrdPdf} from '../src/srdExport.ts';

pdfjs.GlobalWorkerOptions.workerSrc=new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',import.meta.url).href;
const input=new Uint8Array(fs.readFileSync('ref docs/Core Rulebook.pdf'));
const task=pdfjs.getDocument({data:input,useSystemFonts:true,disableFontFace:true});
const doc=await task.promise;
const checks=[22,26,37,490,491,493];
const detail=[];
const pages=[];
for(const sourcePage of checks){
  const page=await doc.getPage(sourcePage);
  const items=await page.getTextContent();
  const viewport=page.getViewport({scale:1});
  const parsed=reconstructTextPage(items.items,viewport.width,viewport.height);
  const blocks=structureTextPage(parsed);
  const tables=blocks.filter(b=>b.kind==='table');
  const chars=parsed.positioned.reduce((sum,r)=>sum+r.text.trim().length,0);
  const structured=blocks.reduce((sum,b)=>sum+blockText(b).replace(/\s*[|]\s*/g,'').length,0);
  detail.push({sourcePage,textRuns:parsed.runCount,blocks:blocks.length,tables:tables.length,
    tableRows:tables.map(t=>t.rows.length),tableColumns:tables.map(t=>t.columnCount),
    retainedRatio:Math.round(100*structured/Math.max(1,chars))/100});
  pages.push(parsed);
  page.cleanup();
}
console.log('LAYOUT_SOURCE_AUDIT',JSON.stringify({pdfPages:doc.numPages,detail}));
const sections=[
  {level:1,title:'Core mechanics',page:1},
  {level:2,title:'Modifier table',page:1},
  {level:2,title:'Extended rolls table',page:2},
  {level:2,title:'Skills tables',page:3},
  {level:1,title:'Solo procedures',page:4}
];
const result=await buildHyperlinkedSrdPdf({totalPages:pages.length,sections,readPage:async p=>pages[p-1]});
const outputTask=pdfjs.getDocument({data:new Uint8Array(await result.blob.arrayBuffer())});
const output=await outputTask.promise;
const toc=await output.getPage(2);
const tocLinks=(await toc.getAnnotations()).filter(a=>a.subtype==='Link'&&a.dest).length;
let outOfBounds=0,pdfTextRuns=0,annotCount=0;
for(let i=3;i<=output.numPages;i++){
  const page=await output.getPage(i),view=page.getViewport({scale:1});
  const lines=await page.getTextContent();
  for(const item of lines.items){
    if(!('str' in item)||!item.str.trim())continue;
    pdfTextRuns++;
    const x=item.transform[4],y=view.height-item.transform[5];
    if(x<0||x>view.width+1||y<0||y>view.height+1)outOfBounds++;
  }
  annotCount+=(await page.getAnnotations()).filter(a=>a.subtype==='Link'&&a.dest).length;
}
const summary={outputPages:output.numPages,bookmarks:(await output.getOutline())?.length,
  tocLinks,annotCount,pdfTextRuns,outOfBounds,bytes:result.blob.size};
console.log('LAYOUT_RENDER_AUDIT',JSON.stringify(summary));
await outputTask.destroy();
await task.destroy();
if(doc.numPages!==663||outOfBounds>0||tocLinks<sections.length||pdfTextRuns<400)
  throw new Error('Semantic export fails navigation/content geometry acceptance');

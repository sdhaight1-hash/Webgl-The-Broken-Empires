import fs from 'node:fs';
import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {reconstructTextPage} from '../src/pdfText.ts';

GlobalWorkerOptions.workerSrc=new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',import.meta.url).href;
const bytes=new Uint8Array(fs.readFileSync('ref docs/Core Rulebook.pdf'));
const task=getDocument({data:bytes,useSystemFonts:true,disableFontFace:true});
const doc=await task.promise;
let readable=0,items=0,converted=0;
const empty=[];
for(let p=1;p<=doc.numPages;p++){
 const page=await doc.getPage(p);
 const text=await page.getTextContent();
 const viewport=page.getViewport({scale:1});
 const parsed=reconstructTextPage(text.items,viewport.width,viewport.height);
 const sourceItems=text.items.filter(item=>'str' in item&&typeof item.str==='string'&&item.str.trim()).length;
 if(sourceItems!==parsed.runCount)throw new Error('Text item mismatch on PDF page '+p);
 if(sourceItems){readable++;items+=sourceItems;converted+=parsed.plainText.length;}
 else empty.push(p);
 page.cleanup();
 if(p%100===0)console.log('AUDIT_PROGRESS',p+'/'+doc.numPages);
}
console.log('AUDIT_RESULT',JSON.stringify({pages:doc.numPages,readable,empty,textItems:items,convertedCharacters:converted}));
await task.destroy();
if(doc.numPages!==663||readable<650||items<10000)process.exitCode=1;

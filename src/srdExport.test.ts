import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHyperlinkedSrdPdf, exportPageForSource, safePdfText } from './srdExport.ts';
import type { TextPage } from './pdfText.ts';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

pdfjs.GlobalWorkerOptions.workerSrc=new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',import.meta.url).href;

function samplePage(number:number):TextPage {
  return {
    width:612,height:792,left:[],right:[],runCount:2,
    plainText:'Sample rules text for page '+number,
    positioned:[
      {text:'Rules page '+number,x:75,y:115,fontSize:15},
      {text:'Chapter 2 explains a separate action.',x:75,y:155,fontSize:11}
    ]
  };
}

test('output page mapping reserves cover and all contents pages',()=>{
  assert.equal(exportPageForSource(1,1),3);
  assert.equal(exportPageForSource(3,1),5);
  assert.equal(exportPageForSource(1,7),9);
  assert.throws(()=>exportPageForSource(0,1),RangeError);
  assert.throws(()=>exportPageForSource(1,0),RangeError);
});

test('safe PDF text transliterates typography unsupported by standard fonts',()=>{
  assert.equal(safePdfText('“Rules”—chapter 2…'),'"Rules"--chapter 2...');
  assert.equal(safePdfText('15 ≥ 10 → yes'),'15 >= 10 -> yes');
});

test('export contains clickable contents, bookmarks, page nav and chapter links',async()=>{
  const sections=[
    {level:1,title:'1 - Introduction',page:1},
    {level:2,title:'Checks',page:2},
    {level:1,title:'2 - Combat',page:3}
  ];
  const progress:number[]=[];
  const result=await buildHyperlinkedSrdPdf({
    totalPages:3,sections,
    readPage:async p=>samplePage(p),
    onProgress:({completed})=>progress.push(completed)
  });
  assert.equal(result.pageCount,5);
  assert.equal(result.tocPages,1);
  assert.ok(result.links>=10);
  assert.deepEqual(progress,[3]);
  assert.ok(result.blob.size>1500);

  const task=pdfjs.getDocument({data:new Uint8Array(await result.blob.arrayBuffer())});
  const pdf=await task.promise;
  try {
    assert.equal(pdf.numPages,5);
    const outline=await pdf.getOutline();
    assert.ok(outline&&outline.length>=3);
    assert.ok(outline!.some(b=>b.title==='2 - Combat'));
    const contents=await pdf.getPage(2);
    const tocAnnotations=await contents.getAnnotations();
    assert.ok(tocAnnotations.filter(a=>a.subtype==='Link'&&a.dest).length>=3);
    const destinations=await Promise.all(tocAnnotations.filter(a=>Array.isArray(a.dest)).map(async a=>
      (await pdf.getPageIndex(a.dest[0]))+1
    ));
    assert.ok([3,4,5].every(p=>destinations.includes(p)));
    const body=await pdf.getPage(3);
    const bodyLinks=await body.getAnnotations();
    assert.ok(bodyLinks.filter(a=>a.subtype==='Link'&&a.dest).length>=2);
    const bodyDestinations=await Promise.all(bodyLinks.filter(a=>Array.isArray(a.dest)).map(async a=>
      (await pdf.getPageIndex(a.dest[0]))+1
    ));
    assert.ok(bodyDestinations.includes(2)); // back to contents
    assert.ok(bodyDestinations.includes(4)); // next source page
    assert.ok(bodyDestinations.includes(5)); // Chapter 2 cross-reference
    const texts=await body.getTextContent();
    assert.ok(texts.items.some(item=>'str' in item&&item.str.includes('Chapter 2')));
  }finally{await task.destroy();}
});

test('aborted exports never produce a PDF',async()=>{
  const controller=new AbortController();
  controller.abort();
  await assert.rejects(
    buildHyperlinkedSrdPdf({
      totalPages:2,sections:[],readPage:async p=>samplePage(p),signal:controller.signal
    }),
    /cancelled/
  );
});

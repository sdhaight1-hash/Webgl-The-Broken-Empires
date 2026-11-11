import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHyperlinkedSrdPdf, safePdfText } from './srdExport.ts';
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

test('source map follows reflow pagination, not original page numbers',async()=>{
  const longPage={...samplePage(1),positioned:[
    {text:('A meaningful paragraph about an original test scene. ').repeat(700),x:65,y:120,fontSize:11,width:300}
  ]};
  const result=await buildHyperlinkedSrdPdf({
    totalPages:2,
    sections:[{level:1,title:'Test start',page:1},{level:1,title:'Later section',page:2}],
    readPage:async page=>page===1?longPage:samplePage(2)
  });
  assert.equal(result.sourcePageStarts[0],3);
  assert.ok(result.sourcePageStarts[1]>4);
  assert.equal(result.pageCount,result.sourcePageStarts[1]);
  const task=pdfjs.getDocument({data:new Uint8Array(await result.blob.arrayBuffer())});
  const doc=await task.promise;
  try{
    assert.equal(doc.numPages,result.pageCount);
    const contents=await doc.getPage(2);
    const links=(await contents.getAnnotations()).filter(a=>Array.isArray(a.dest));
    const targets=await Promise.all(links.map(async link=>(await doc.getPageIndex(link.dest[0]))+1));
    assert.ok(targets.includes(result.sourcePageStarts[0]));
    assert.ok(targets.includes(result.sourcePageStarts[1]));
  }finally{await task.destroy();}
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
  assert.deepEqual(result.sourcePageStarts,[3,4,5]);
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

test('table cells become proper aligned PDF table text, not stretched fragments',async()=>{
  const positioned=[
    ...['Test','Number','Result'].map((x,j)=>({text:x,x:[80,240,330][j],y:115,width:70,fontSize:11})),
    ...['One','1','Complete'].map((x,j)=>({text:x,x:[80,240,330][j],y:133,width:70,fontSize:11})),
    ...['Two','2','Pending'].map((x,j)=>({text:x,x:[80,240,330][j],y:151,width:70,fontSize:11})),
    ...['Three','3','Waiting'].map((x,j)=>({text:x,x:[80,240,330][j],y:169,width:70,fontSize:11}))
  ];
  const source={...samplePage(1),positioned};
  const result=await buildHyperlinkedSrdPdf({totalPages:1,sections:[],readPage:async()=>source});
  const task=pdfjs.getDocument({data:new Uint8Array(await result.blob.arrayBuffer())});
  const doc=await task.promise;
  try{
    const p=await doc.getPage(result.sourcePageStarts[0]);
    const text=(await p.getTextContent()).items.filter(item=>'str' in item);
    const cell=(word:string)=>text.find(item=>'str' in item&&item.str===word);
    const one=cell('One'),num=cell('1'),last=cell('Complete');
    assert.ok(one&&num&&last);
    assert.ok(one.transform[4]<num.transform[4]&&num.transform[4]<last.transform[4]);
    assert.ok(Math.abs(one.transform[5]-last.transform[5])<2);
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

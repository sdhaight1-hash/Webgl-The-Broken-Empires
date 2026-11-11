import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveCheck, makeCharacter, isCharacter, safeReadRoster } from './engine.ts';

test('roll-under success and tens-die success levels', () => {
  assert.equal(resolveCheck(52, 65).levels, 5);
  assert.equal(resolveCheck(6, 65).levels, 1);
  assert.equal(resolveCheck(68, 65).levels, 0);
  assert.equal(resolveCheck(68, 65).success, false);
});
test('automatic success and failure boundaries', () => {
  assert.equal(resolveCheck(5, 0).success, true);
  assert.equal(resolveCheck(6, 0).success, false);
  assert.equal(resolveCheck(98, 100).success, true);
  assert.equal(resolveCheck(99, 100).success, false);
  assert.equal(resolveCheck(100, 100).success, false);
});
test('matching dice are critical and success doubles gain 3 SL', () => {
  assert.equal(resolveCheck(44, 60).levels, 7);
  assert.equal(resolveCheck(66, 50).note, 'Critical failure');
  assert.equal(resolveCheck(55, 55).critical, true);
});
test('dice laboratory rejects invalid roll and targets', () => {
  assert.throws(() => resolveCheck(0, 50));
  assert.throws(() => resolveCheck(101, 50));
  assert.throws(() => resolveCheck(10, 125));
  assert.throws(() => resolveCheck(10, NaN));
});
test('character and saved roster have safe defaults', () => {
  const c = makeCharacter();
  assert.ok(isCharacter(c));
  assert.equal(safeReadRoster('bad json').length, 0);
  assert.equal(safeReadRoster(JSON.stringify([c, {id: 1}])).length, 1);
});

import { ARTICLE_BOOK_PAGES, BOOK_LINKS, CREATION_SEQUENCE, PDF_PAGE_COUNT } from './bookIndex.ts';
import { ARTICLES, CATEGORIES } from './rules.ts';
import { SOURCE_OUTLINE, BOOK_PAGES_WITH_TEXT } from './sourceOutline.ts';
import { reconstructTextPage, pageMatches, pageSnippet } from './pdfText.ts';

test('book index uses bounded 1-based PDF pages and unique chapter positions', () => {
  assert.equal(PDF_PAGE_COUNT,663);
  assert.equal(new Set(BOOK_LINKS.map(e=>e.page)).size,BOOK_LINKS.length);
  for(const {page} of BOOK_LINKS)assert.ok(page>=1&&page<=PDF_PAGE_COUNT);
});
test('twelve character creation stages follow verified PDF bookmark order', () => {
  assert.equal(CREATION_SEQUENCE.length,12);
  assert.deepEqual(CREATION_SEQUENCE.map(e=>e.page),[84,85,90,91,93,95,106,112,113,114,115,118]);
  assert.equal(ARTICLE_BOOK_PAGES.origins,82);
});

test('exact-value critical success and 99–100 automatic failure precedence', () => {
  assert.deepEqual([resolveCheck(65,65).success, resolveCheck(65,65).critical, resolveCheck(65,65).levels],[true,true,9]);
  assert.equal(resolveCheck(6,6).levels,4);
  assert.equal(resolveCheck(99,100).critical,false);
  assert.equal(resolveCheck(100,100).critical,false);
  assert.equal(resolveCheck(99,98).critical,true);
  assert.equal(resolveCheck(100,98).critical,true);
  assert.equal(resolveCheck(5,0).critical,false);
});
test('PDF-based codex lessons have valid pages, unique IDs, examples and quizzes', () => {
  assert.ok(ARTICLES.length>=75);
  assert.equal(new Set(ARTICLES.map(a=>a.id)).size,ARTICLES.length);
  assert.ok(CATEGORIES.includes('Core resolution'));
  for (const a of ARTICLES) {
    assert.equal(a.status,'core-rulebook');
    assert.ok(a.page>=1&&a.page<=PDF_PAGE_COUNT);
    assert.ok(a.details.length>=2);
    assert.ok(a.source.includes('thebrokenempiresrpg.com'));
    if(a.quiz){
      assert.ok(a.quiz.options.length>=2);
      assert.ok(a.quiz.correct>=0&&a.quiz.correct<a.quiz.options.length);
      assert.ok(a.quiz.explanation.length>10);
    }
  }
});
test('core lessons reference correct PDF creation and critical pages',()=>{
  assert.equal(ARTICLES.find(a=>a.id==='criticals')?.page,23);
  assert.equal(ARTICLES.find(a=>a.id==='aptitudes')?.page,90);
  assert.equal(ARTICLES.find(a=>a.id==='attributes')?.page,91);
});


test('all PDF bookmark sections have navigable page ranges',()=>{
  assert.equal(SOURCE_OUTLINE.length,207);
  assert.equal(BOOK_PAGES_WITH_TEXT,659);
  assert.ok(SOURCE_OUTLINE.every(s=>s.level>=1&&s.level<=3&&s.title.trim().length>0&&s.page>=1&&s.page<=PDF_PAGE_COUNT));
  assert.ok(SOURCE_OUTLINE.every((s,i)=>i===0||s.page>=SOURCE_OUTLINE[i-1].page));
  assert.ok(SOURCE_OUTLINE.some(s=>s.page===484 && s.title.includes('Solo Roleplaying')));
  assert.ok(SOURCE_OUTLINE.some(s=>s.page===592 && s.title.includes('Mass Combat')));
  assert.ok(SOURCE_OUTLINE.some(s=>s.page===600 && s.title.includes('Naval Combat')));
  assert.ok(SOURCE_OUTLINE.some(s=>s.page===661 && s.title.includes('Table Index')));
});
test('lesson coverage is distinguished from complete section indexing',()=>{
  const lessonPages=new Set(ARTICLES.map(a=>a.page));
  const indexedPages=new Set(SOURCE_OUTLINE.map(s=>s.page));
  assert.ok(lessonPages.size<indexedPages.size);
  assert.ok(ARTICLES.every(a=>a.page>=1&&a.page<=PDF_PAGE_COUNT));
});


test('later rulebook procedures remain source-indexed and guided',()=>{
  const topics=[
    ['enemy-difficulty',441],['ferocity',444],['solo-oracle',490],
    ['solo-scenes',493],['mass-units',592],['mass-morale',596],
    ['naval-setup',600],['naval-fire',602],['naval-boarding',603],
    ['personality-pairs',606],['treasure-type',646]
  ] as const;
  for (const [id,page] of topics) {
    const lesson=ARTICLES.find(a=>a.id===id);
    assert.equal(lesson?.page,page,id);
    assert.ok(lesson && lesson.details.length>=2);
    assert.ok(SOURCE_OUTLINE.some(section=>section.page<=page));
  }
});


test('text-first reader restores two-column reading order independently from PDF run order',()=>{
  const run=(str:string,x:number,y:number,width=50,height=10)=>({
    str, transform:[1,0,0,1,x,y], width, height
  });
  const extracted=reconstructTextPage([
    run('Right lower',330,500),run('Left lower',35,500),
    run('Right upper',330,600),run('Left upper',35,600),
    {type:'beginMarkedContent',id:'decorative-art'}, 
  ],612);
  assert.equal(extracted.runCount,4);
  assert.equal(extracted.left.map(b=>b.text).join(' | '),'Left upper | Left lower');
  assert.equal(extracted.right.map(b=>b.text).join(' | '),'Right upper | Right lower');
  assert.equal(extracted.plainText,'Left upper\nLeft lower\nRight upper\nRight lower');
});

test('text-only reconstruction preserves adjacent PDF fragments and ignores graphics',()=>{
  const run=(str:string,x:number,y:number,width:number)=>({
    str,transform:[1,0,0,1,x,y],width,height:10
  });
  const extracted=reconstructTextPage([
    run('Cap',20,600,17),run('tain',37,600,22),run('moves',72,600,30)
  ],612);
  assert.equal(extracted.plainText,'Captain moves');
  assert.equal(extracted.runCount,3);
  assert.deepEqual(reconstructTextPage([],612),{left:[],right:[],plainText:'',runCount:0});
  assert.throws(()=>reconstructTextPage([],0),RangeError);
});

test('text search requires all terms, is case insensitive, and returns short local snippets',()=>{
  const body='There is an opposed Wound Die roll before the target becomes impaired.';
  assert.equal(pageMatches(body,'wOuNd die'),true);
  assert.equal(pageMatches(body,'wound missing'),false);
  assert.equal(pageMatches(body,' '),false);
  assert.ok(pageSnippet(body,'wound').toLowerCase().includes('wound die'));
  assert.ok(pageSnippet(body,'wound').length<=233);
});

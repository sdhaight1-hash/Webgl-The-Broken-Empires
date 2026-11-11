import test from 'node:test';
import assert from 'node:assert/strict';
import {structureTextPage,blockText} from './srdLayout.ts';
import type {PositionedRun} from './pdfText.ts';

const run=(text:string,x:number,y:number,width:number,fontSize=11):PositionedRun=>
  ({text,x,y,width,fontSize});
const page=(positioned:PositionedRun[],width=612,height=792)=>({positioned,width,height});

test('narrative columns are read separately, not joined by shared baseline',()=>{
  const body=structureTextPage(page([
    run('The first part',70,98,80),run('of the story.',70,114,68),
    run('Other information',340,98,105),run('belongs to the next column.',340,114,156)
  ]));
  const words=body.map(blockText);
  assert.equal(words.length,2);
  assert.equal(words[0],'The first part of the story.');
  assert.equal(words[1],'Other information belongs to the next column.');
  assert.ok(body.every(block=>block.kind==='paragraph'));
});

test('three-column embedded table yields aligned rows and wrapped cells',()=>{
  const rows=[
    ['Difficulty','Modifier','Example'],
    ['Simple','+20','Check the rope'],
    ['Easy','+10','A short example'],
    ['Hard','-20','A longer example']
  ];
  const positioned=rows.flatMap((r,i)=>r.map((cell,j)=>run(cell,[325,402,456][j],220+i*17,[68,38,113][j])));
  positioned.push(run('with an additional line',456,288,115));
  const result=structureTextPage(page(positioned));
  const table=result.find(block=>block.kind==='table');
  assert.ok(table&&table.kind==='table');
  assert.equal(table.columnCount,3);
  assert.equal(table.rows.length,4);
  assert.deepEqual(table.rows[0],['Difficulty','Modifier','Example']);
  assert.ok(table.rows[3][2].includes('with an additional line'));
  assert.equal(table.header,true);
});

test('a wrapped first data row is recovered using later table anchors',()=>{
  const rows=[
    [run('Simple',324,190,49),run('+20',397,190,26)],
    [run('Easy',324,210,40),run('+10',397,210,26),run('Short description',456,210,93)],
    [run('Medium',324,230,49),run('+0',397,230,25),run('A standard situation',456,230,94)],
    [run('Hard',324,250,38),run('-20',397,250,28),run('Another description',456,250,100)]
  ];
  const body=structureTextPage(page(rows.flat()));
  const table=body.find(b=>b.kind==='table');
  assert.ok(table&&table.kind==='table');
  assert.equal(table.rows.length,4);
  assert.equal(table.rows[0][0],'Simple');
  assert.equal(table.rows[0][1],'+20');
});

test('full-page four-column table is not divided at the narrative gutter',()=>{
  const cols=[66,205,344,471];
  const rows=[
    ['Task','Skill','SL','Interval'],
    ['Forge armor','Craft','12','1 day'],
    ['Build gate','Craft','8','2 days'],
    ['Find clues','Insight','6','1 hour']
  ];
  const positioned=rows.flatMap((row,i)=>row.map((cell,j)=>run(cell,cols[j],120+i*18,[105,84,36,80][j])));
  positioned.push(run('A paragraph below.',72,360,120));
  const blocks=structureTextPage(page(positioned));
  assert.equal(blocks[0].kind,'table');
  if(blocks[0].kind==='table'){
    assert.equal(blocks[0].columnCount,4);
    assert.equal(blocks[0].rows.length,4);
  }
  assert.ok(blocks.some(b=>b.kind==='paragraph'&&b.text==='A paragraph below.'));
});

test('soft hyphenated wraps are joined while normal sentences preserve spaces',()=>{
  const blocks=structureTextPage(page([
    run('Recover from your injur-',80,110,200),
    run('ies with sufficient rest.',80,126,170),
    run('The second paragraph.',80,190,190)
  ]));
  const paragraphs=blocks.filter(b=>b.kind==='paragraph');
  assert.equal(paragraphs.length,2);
  assert.equal(paragraphs[0].text,'Recover from your injuries with sufficient rest.');
});

test('no table is fabricated from two aligned narrative columns',()=>{
  const input:Array<PositionedRun>=[];
  for(let i=0;i<7;i++){
    input.push(run('Left prose line '+i,80,120+i*16,200));
    input.push(run('Right prose line '+i,350,120+i*16,185));
  }
  assert.ok(structureTextPage(page(input)).every(b=>b.kind!=='table'));
});

test('triple-column editorial prose cannot become a fabricated rules table',()=>{
  const positioned:Array<PositionedRun>=[];
  for(let i=0;i<7;i++){
    positioned.push(run('Left narrative '+i,63,92+i*18,143));
    positioned.push(run('Inset quotation '+i,237,92+i*18,133));
    positioned.push(run('Right narrative '+i,413,92+i*18,136));
  }
  const blocks=structureTextPage(page(positioned));
  assert.ok(blocks.every(b=>b.kind==='paragraph'));
  assert.equal(blocks.length,3);
  assert.ok(blockText(blocks[0]).includes('Left narrative 6'));
  assert.ok(!blockText(blocks[0]).includes('Inset quotation'));
  assert.ok(blockText(blocks[1]).includes('Inset quotation 6'));
  assert.ok(blockText(blocks[2]).includes('Right narrative 6'));
});

test('named text-only reference tables remain tabular when header proves the structure',()=>{
  const cols=[70,250,420];
  const rows=[
    ['Language','Native To','Description'],
    ['Vestrian','Old Vestria','Local tongue'],
    ['Thessian','Thessia','Regional tongue'],
    ['Orcish','Orcs','Spoken language']
  ];
  const positioned=rows.flatMap((row,i)=>row.map((txt,j)=>run(txt,cols[j],110+i*19,113)));
  const blocks=structureTextPage(page(positioned));
  const table=blocks.find(b=>b.kind==='table');
  assert.ok(table&&table.kind==='table');
  assert.equal(table.rows.length,4);
  assert.deepEqual(table.rows[1],['Vestrian','Old Vestria','Local tongue']);
});

test('invalid page dimensions reject explicitly',()=>{
  assert.throws(()=>structureTextPage(page([],0)),RangeError);
  assert.throws(()=>structureTextPage(page([],612,0)),RangeError);
});

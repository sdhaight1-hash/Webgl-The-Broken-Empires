import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCharacter,isCharacter,safeReadRoster} from './engine.ts';
import {
  SKILL_COLUMNS,STRAND_NAMES,BODY_LOCATIONS,LOCATION_DETAIL,
  makeTbeSheet,readTbeSheet,isTbeSheet,blankWeapon,blankInventory,
  enteredInventoryEnc,enteredLethalWp
} from './tbeSheetData.ts';

test('the uploaded form is represented by five skill %/EX columns and ten Strands',()=>{
  assert.deepEqual(SKILL_COLUMNS.map(c=>c.title),['Combat','Adventuring','Social','Lore','Binds']);
  assert.deepEqual(SKILL_COLUMNS.map(c=>c.skills.length),[7,11,9,11,10]);
  assert.equal(STRAND_NAMES.length,10);
  assert.ok(SKILL_COLUMNS.find(c=>c.id==='social')?.skills.includes('Deceive'));
  assert.ok(SKILL_COLUMNS.find(c=>c.id==='adventuring')?.skills.includes('Willpower'));
  assert.ok(SKILL_COLUMNS.find(c=>c.id==='binds')?.skills.includes('Witness'));
  const names=SKILL_COLUMNS.flatMap(c=>[...c.skills]).map(s=>s.toLowerCase());
  assert.equal(names.length,new Set(names).size);
});

test('all six body locations have five independent editable wound records',()=>{
  const sheet=makeTbeSheet();
  assert.deepEqual(BODY_LOCATIONS.map(x=>x.die),['1–5','0','6','7','8','9']);
  assert.deepEqual(Object.keys(sheet.locations),BODY_LOCATIONS.map(x=>x.id));
  for(const {id} of BODY_LOCATIONS){
    assert.equal(sheet.locations[id].wounds.length,5);
    assert.ok(LOCATION_DETAIL[id].length>20);
  }
  assert.equal(sheet.weapons.length,4);
  assert.equal(sheet.goals.length,6);
  assert.equal(sheet.inventory.length,10);
  assert.ok(isTbeSheet(sheet));
});

test('source sheet roundtrips through the original roster JSON safely',()=>{
  const character=makeCharacter();
  const sheet=makeTbeSheet();
  sheet.sex='F';
  sheet.age='31';
  sheet.weapons[0]={...blankWeapon('w1'),name:'Longbow',range:'40'};
  sheet.locations.rightArm.wounds[0]={wp:'3',nonlethal:false,description:'Bruise',infection:false,recoveryBonus:''};
  sheet.goals[0]={text:'Rescue the caravan',shared:true};
  sheet.lifeEvents.origin='Raised near the shore';
  sheet.inventory[0]={...blankInventory('i1'),item:'Rations',enc:'1'};
  character.tbeSheet=sheet;
  assert.ok(isCharacter(character));
  const restored=safeReadRoster(JSON.stringify([character]));
  assert.equal(restored.length,1);
  assert.deepEqual(restored[0].tbeSheet,sheet);
});

test('legacy users never lose existing sheet data or need a forced migration',()=>{
  const previous=makeCharacter();
  previous.goal='Recover the relic';
  previous.history='A history from an earlier character';
  previous.equipment=[{id:'e1',text:'One cloak'}];
  delete previous.tbeSheet;
  assert.ok(isCharacter(previous));
  const view=readTbeSheet(previous);
  assert.equal(view.goals.length,6);
  assert.equal(previous.goal,'Recover the relic');
  assert.equal(previous.equipment[0].text,'One cloak');
  assert.equal(previous.tbeSheet,undefined);
});

test('invalid imported nested sheet objects are rejected rather than silently accepted',()=>{
  const character=makeCharacter(),sheet=makeTbeSheet();
  assert.ok(isTbeSheet(sheet));
  assert.ok(!isTbeSheet({...sheet,goals:[]}));
  assert.ok(!isTbeSheet({...sheet,locations:{...sheet.locations,head:{...sheet.locations.head,wounds:[]}}}));
  assert.ok(!isTbeSheet({...sheet,strands:{Air:''}}));
  assert.ok(!isTbeSheet({...sheet,inventory:[{id:'x',item:5,enc:'1'}]}));
  assert.ok(!isCharacter({...character,tbeSheet:{...sheet,weapons:[{name:'bad'}]}}));
  assert.equal(safeReadRoster(JSON.stringify([{...character,tbeSheet:{...sheet,goals:[]}}])).length,0);
});

test('derived entered ENC totals do not infer burden from missing or invalid inputs',()=>{
  const sheet=makeTbeSheet();
  sheet.inventory[0]={...sheet.inventory[0],item:'Axe',enc:'2'};
  sheet.inventory[1]={...sheet.inventory[1],item:'Rope',enc:'1.5'};
  assert.equal(enteredInventoryEnc(sheet),3.5);
  sheet.inventory[1].enc='?';
  assert.equal(enteredInventoryEnc(sheet),null);
  sheet.inventory[1].enc='';
  assert.equal(enteredInventoryEnc(sheet),2);
});

test('entered lethal WP counts only lethal wounds and never guesses a malformed value',()=>{
  const sheet=makeTbeSheet();
  sheet.locations.body.wounds[0]={wp:'3',nonlethal:false,description:'Gash',infection:false,recoveryBonus:''};
  sheet.locations.head.wounds[0]={wp:'2',nonlethal:true,description:'Concussion',infection:false,recoveryBonus:''};
  assert.equal(enteredLethalWp(sheet),3);
  sheet.locations.body.wounds[0].wp='not numeric';
  assert.equal(enteredLethalWp(sheet),null);
});

test('strands, piety, armor penalties, shield and fraying retain independent fields',()=>{
  const sheet=makeTbeSheet();
  sheet.strands.Air='2';
  sheet.startingPiety='4';
  sheet.armorPenalties.stealth='-10';
  sheet.shield={size:'Medium',ap:'2',shieldBonus:'1',enc:'3',split:true};
  sheet.fraying='8';
  assert.ok(isTbeSheet(sheet));
  const copy=JSON.parse(JSON.stringify(sheet));
  assert.equal(copy.strands.Air,'2');
  assert.equal(copy.armorPenalties.stealth,'-10');
  assert.equal(copy.shield.split,true);
  assert.equal(copy.fraying,'8');
});

// The general location comes from the attacker d100 ones die;
// the defender determines detail, or a fallback d10 when no defense was rolled.
import {locateHit,recordWound} from './hitLocation.ts';

test('attacker ones digit picks the six canonical general hit locations',()=>{
  assert.deepEqual([10,11,15,16,17,18,19,100].map(r=>locateHit(r,10).location),
    ['head','body','body','rightArm','leftArm','rightLeg','leftLeg','head']);
  assert.equal(locateHit(25,10).detail,'Groin');
  assert.equal(locateHit(16,3).detail,'Bicep');
  assert.equal(locateHit(18,10).detail,'Foot');
});

test('head eyes and ears use even-right, odd-left detailed die',()=>{
  assert.equal(locateHit(20,3).detail,'Left eye');
  assert.equal(locateHit(20,4).detail,'Right eye');
  assert.equal(locateHit(20,8).detail,'Right ear');
  assert.equal(locateHit(20,9).detail,'Left ear');
  assert.equal(locateHit(20,100).detail,'Neck');
  assert.equal(locateHit(16,1).detail,'Shoulder');
  assert.equal(locateHit(18,7).detail,'Knee');
});

test('hit location lookup rejects impossible die results',()=>{
  for(const value of [0,-2,101,1.5,NaN,Infinity]){
    assert.throws(()=>locateHit(value,10),RangeError);
    assert.throws(()=>locateHit(10,value),RangeError);
  }
});

test('quick wound entry records a detail without altering other wound slots',()=>{
  const original=makeTbeSheet(),hit=locateHit(16,9);
  const updated=recordWound(original,hit,4,'slash',false);
  assert.equal(updated.locations.rightArm.wounds[0].wp,'4');
  assert.equal(updated.locations.rightArm.wounds[0].description,'Hand — slash');
  assert.equal(updated.locations.rightArm.wounds[0].nonlethal,false);
  assert.equal(enteredLethalWp(updated),4);
  assert.equal(enteredLethalWp(original),0);
  assert.equal(original.locations.rightArm.wounds[0].description,'');
  assert.deepEqual(original.locations.leftArm,updated.locations.leftArm);
  const next=recordWound(updated,hit,2,'bash',true);
  assert.equal(next.locations.rightArm.wounds[1].nonlethal,true);
  assert.equal(enteredLethalWp(next),4);
});

test('quick wound entry never overwrites any occupied slot',()=>{
  let sheet=makeTbeSheet();
  const hit=locateHit(10,10);
  sheet.locations.head.wounds[0].recoveryBonus='2';
  sheet=recordWound(sheet,hit,2,'',false);
  assert.equal(sheet.locations.head.wounds[0].wp,'');
  assert.equal(sheet.locations.head.wounds[1].wp,'2');
  for(let i=0;i<3;i++)sheet=recordWound(sheet,hit,1,'',false);
  assert.throws(()=>recordWound(sheet,hit,1,'',false),/five wound slots/);
  assert.throws(()=>recordWound(makeTbeSheet(),hit,0,'',false),RangeError);
  assert.throws(()=>recordWound(makeTbeSheet(),hit,1.2,'',false),RangeError);
  assert.throws(()=>recordWound(makeTbeSheet(),hit,2,'x'.repeat(1101),false),RangeError);
});

test('import validation rejects malformed text fields independently',()=>{
  const sheet=makeTbeSheet();
  assert.equal(isTbeSheet({...sheet,sex:4}),false);
  assert.equal(isTbeSheet({...sheet,relationshipNpcs:null}),false);
  assert.equal(isTbeSheet({...sheet,threads:42}),false);
  assert.equal(isTbeSheet({...sheet,relationshipNpcs:'x'.repeat(4001)}),false);
  assert.equal(isTbeSheet({...sheet,threads:'x'.repeat(4001)}),false);
  assert.equal(isTbeSheet(sheet),true);
});

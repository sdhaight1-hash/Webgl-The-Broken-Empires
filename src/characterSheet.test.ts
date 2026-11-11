import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCharacter,isCharacter,safeReadRoster} from './engine.ts';
import {DEFAULT_ATTRIBUTES,DEFAULT_SUPPLIES,isSheetAttributes,isSheetSupplies} from './characterSheetState.ts';
import {allocatePoint,deriveAttributes,derivedSkill,rollSheetSkill,sheetAttributes,sheetSupplies,updateSheetSupply} from './characterSheetModel.ts';
import {makeSoloCampaign,appendCharacterSheetLog,readSoloCampaigns} from './soloEngine.ts';

test('new and legacy characters share source-backed zero-allocation defaults',()=>{
  const person=makeCharacter();
  assert.ok(isCharacter(person));
  assert.deepEqual(sheetAttributes(person),DEFAULT_ATTRIBUTES);
  assert.deepEqual(sheetSupplies(person),DEFAULT_SUPPLIES);
  assert.deepEqual([deriveAttributes(person).maxResolve,deriveAttributes(person).initiative,
    deriveAttributes(person).toughness,deriveAttributes(person).deathThreshold,
    deriveAttributes(person).lethality],[10,10,0,20,7]);
  const legacy={...person};delete legacy.attributes;delete legacy.supplies;
  assert.ok(isCharacter(legacy));
  assert.deepEqual(sheetAttributes(legacy),DEFAULT_ATTRIBUTES);
  assert.equal(safeReadRoster(JSON.stringify([legacy])).length,1);
});

test('attribute allocations recalculate the source example including two-point Toughness cost',()=>{
  const person=makeCharacter();
  person.attributes={...DEFAULT_ATTRIBUTES,resolvePoints:2,initiativePoints:1,toughnessPoints:2,resolveBonus:1};
  assert.deepEqual(deriveAttributes(person),{
    pointsUsed:5,pointsRemaining:0,maxResolve:15,initiative:11,effectiveInitiative:11,
    toughness:1,deathThreshold:20,lethality:7,availableResolve:15
  });
});

test('death threshold and lethality level are recalculated from current inputs',()=>{
  const person=makeCharacter();
  person.attributes={...DEFAULT_ATTRIBUTES,deathThresholdPoints:3,deathThresholdBonus:2,
    lethalityBonus:1,initiativeBonus:2,armorInitiativePenalty:4,spentResolve:4,fatigue:3};
  const d=deriveAttributes(person);
  assert.equal(d.deathThreshold,28);
  assert.equal(d.lethality,11); // ceil(28/3) + 1
  assert.equal(d.effectiveInitiative,8);
  assert.equal(d.availableResolve,3);
  person.attributes.spentResolve=19;
  assert.equal(deriveAttributes(person).availableResolve,0);
});

test('creation budget rejects overspend without mutating character',()=>{
  const a={...DEFAULT_ATTRIBUTES,resolvePoints:3,initiativePoints:2};
  assert.throws(()=>allocatePoint(a,'toughnessPoints',1),/five/);
  assert.throws(()=>allocatePoint(a,'resolvePoints',-1),RangeError);
  assert.equal(a.toughnessPoints,0);
  assert.equal(allocatePoint(a,'initiativePoints',1).initiativePoints,1);
});

test('skill Score is derived from base rating while modifiers change the target',()=>{
  const s={id:'s1',name:'Track',rating:65,note:'',modifier:20,expertiseLevel:3 as const};
  const d=derivedSkill(s);
  assert.deepEqual(d,{score:6,modifier:20,expertiseLevel:3,target:85,canRoll:true});
  const rolled=rollSheetSkill(s,6);
  assert.equal(rolled.check.success,true);
  assert.equal(rolled.check.levels,3);
  assert.equal(rolled.entry.sourcePage,23);
  assert.ok(rolled.entry.message.includes('Ex3'));
});

test('click rolls use existing critical engine and one-roll Resolve Favor',()=>{
  const s={id:'s1',name:'Stealth',rating:55,note:'',modifier:-10,expertiseLevel:1 as const};
  const rolled=rollSheetSkill(s,55,1);
  assert.equal(rolled.check.target,55);
  assert.equal(rolled.check.critical,true);
  assert.equal(rolled.check.levels,8);
  assert.ok(rolled.entry.message.includes('1 Resolve as Favor'));
  assert.throws(()=>rollSheetSkill(s,15,4),RangeError);
  assert.throws(()=>rollSheetSkill({...s,rating:100,modifier:5},15),RangeError);
});

test('new optional state rejects invalid saved sheet data, but preserves all legacy fields',()=>{
  const p=makeCharacter();
  assert.ok(isSheetAttributes(p.attributes));
  assert.ok(isSheetSupplies(p.supplies));
  assert.ok(!isSheetAttributes({...DEFAULT_ATTRIBUTES,resolvePoints:4,initiativePoints:4}));
  assert.ok(!isSheetSupplies({...DEFAULT_SUPPLIES,gear:7}));
  assert.ok(!isCharacter({...p,attributes:{...DEFAULT_ATTRIBUTES,resolveBonus:-100}}));
  assert.ok(!isCharacter({...p,skills:[{id:'bad',name:'Track',rating:60,note:'',expertiseLevel:8}]}));
  assert.ok(!isCharacter({...p,supplies:{...DEFAULT_SUPPLIES,ammo:9}}));
});

test('all four supply dice categories start unset and can be advanced independently',()=>{
  const p=makeCharacter();
  const next=updateSheetSupply(sheetSupplies(p),'ammo',12);
  assert.equal(next.ammo,12);
  assert.equal(next.gear,null);
  assert.equal(updateSheetSupply(next,'ammo',0).ammo,0);
  assert.throws(()=>updateSheetSupply(next,'gear',7 as never),RangeError);
});

test('sheet rolls append only to a solo campaign belonging to that character',()=>{
  const a=makeSoloCampaign('char-A'),b=makeSoloCampaign('char-B');
  const raw=JSON.stringify([a,b]);
  const saved=appendCharacterSheetLog(raw,b.id,'char-A',{
    message:'Track — d100 52 vs 65 · 5 SL',sourcePage:23,roll:52
  });
  assert.ok(saved);
  const result=readSoloCampaigns(saved);
  assert.equal(result[0].journal.length,1);
  assert.equal(result[0].journal[0].kind,'check');
  assert.equal(result[0].journal[0].sourcePage,23);
  assert.equal(result[1].journal.length,0);
  assert.equal(appendCharacterSheetLog(raw,b.id,'char-C',{message:'Check',sourcePage:23}),null);
  assert.throws(()=>appendCharacterSheetLog(raw,b.id,'char-B',{message:'Bad',sourcePage:700}),RangeError);
});

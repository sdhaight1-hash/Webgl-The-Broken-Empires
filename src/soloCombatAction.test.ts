import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCharacter} from './engine.ts';
import {beginSoloScene,isSoloCampaign,makeSoloCampaign,readSoloCampaigns} from './soloEngine.ts';
import {previewCombatRoll,previewCombatDamage,confirmCombatExchange,undoCombatExchange} from './soloCombatAction.ts';
import type {CombatDamageChoice,CombatRollRequest} from './soloCombatAction.ts';
import {enteredLethalWp,readTbeSheet} from './tbeSheetData.ts';
import {persistSoloSkillAction} from './soloSkillAction.ts';

function setup(){
  const hero=makeCharacter();
  hero.id='hero-1';
  hero.name='Arden';
  hero.skills=[{id:'melee',name:'Melee: Medium',rating:70,note:'',modifier:0,expertiseLevel:2}];
  let campaign=beginSoloScene(makeSoloCampaign(hero.id),'Gate encounter','East gate','An outlaw arrives.');
  campaign={...campaign,npcs:[{id:'foe',name:'Outlaw',role:'Bandit',disposition:'Hostile',details:'',tags:''}]};
  return {hero,campaign};
}
const attack:CombatRollRequest={
  opponentId:'foe',direction:'hero-attacks',heroSkillId:'melee',
  heroFavor:0,opponentRating:40,opponentModifier:0,opponentExpertise:1,
  heroRoll:35,opponentRoll:95
};
const defend:CombatRollRequest={
  ...attack,direction:'hero-defends',heroRoll:80,opponentRoll:24,
  opponentRating:55
};
const damage:CombatDamageChoice={
  baseDamage:8,degreeOfSuccess:0,armorAP:2,shieldAP:1,type:'external',
  applyShield:true,injury:'Slash',nonlethal:false
};

test('opposed exchange uses the verified opposed engine and attacker ones location',()=>{
  const {hero,campaign}=setup();
  const p=previewCombatRoll(hero,campaign,attack,'combat-1');
  assert.equal(p.attackerWon,true);
  assert.equal(p.winner,'left');
  assert.equal(p.degree,3);
  assert.equal(p.hit?.location,'body');
  assert.equal(p.hit?.detail,'Chest');
  assert.equal(p.heroRating,70);
  assert.equal(previewCombatDamage(p,damage)?.woundPoints,8);
  assert.equal(hero.tbeSheet,undefined);
  assert.equal(campaign.journal.length,1);
});

test('attacking an existing NPC records a wound and allows reversible journal history',()=>{
  const {hero,campaign}=setup();
  const p=previewCombatRoll(hero,campaign,attack,'combat-npc');
  const confirmed=confirmCombatExchange(hero,campaign,p,damage);
  assert.equal(confirmed.applied,true);
  assert.equal(confirmed.character.attributes?.spentResolve,0);
  assert.equal(confirmed.campaign.npcs[0].combatWounds?.length,1);
  const wound=confirmed.campaign.npcs[0].combatWounds?.[0];
  assert.equal(wound?.wp,8);
  assert.equal(wound?.location,'body');
  assert.equal(wound?.detail,'Chest');
  const entry=confirmed.campaign.journal.at(-1)!;
  assert.equal(entry.kind,'opposed');
  assert.equal(entry.combatAction?.target,'npc');
  assert.equal(entry.combatAction?.degree,3);
  assert.equal(entry.sourcePage,24);
  assert.equal(isSoloCampaign(confirmed.campaign),true);
  assert.deepEqual(readSoloCampaigns(JSON.stringify([confirmed.campaign]))[0].npcs,
    confirmed.campaign.npcs);
  assert.equal(confirmCombatExchange(confirmed.character,confirmed.campaign,p,damage).applied,false);
  const undid=undoCombatExchange(confirmed.character,confirmed.campaign,'combat-npc');
  assert.equal(undid.applied,true);
  assert.equal(undid.campaign.npcs[0].combatWounds?.length,0);
  assert.equal(undid.campaign.journal.at(-1)?.reversalOf,'combat-npc');
  assert.equal(undoCombatExchange(undid.character,undid.campaign,'combat-npc').applied,false);
  assert.equal(undid.campaign.journal.length,3);
  assert.ok(isSoloCampaign(undid.campaign));
});

test('defending hero applies source-backed AP arithmetic to an empty wound row',()=>{
  const {hero,campaign}=setup();
  const p=previewCombatRoll(hero,campaign,defend,'combat-hero');
  assert.equal(p.attackerWon,true);
  assert.equal(p.degree,2);
  assert.equal(p.hit?.location,'body');
  assert.equal(p.hit?.detail,'Groin');
  const applied=confirmCombatExchange(hero,campaign,p,{...damage,applyShield:false});
  const row=readTbeSheet(applied.character).locations.body.wounds[0];
  assert.equal(row.wp,'8');
  assert.equal(row.description,'Groin — Slash');
  assert.equal(enteredLethalWp(readTbeSheet(applied.character)),8);
  assert.equal(applied.campaign.journal.at(-1)?.combatAction?.slot,0);
  const undo=undoCombatExchange(applied.character,applied.campaign,'combat-hero');
  assert.equal(readTbeSheet(undo.character).locations.body.wounds[0].wp,'');
  assert.equal(readTbeSheet(undo.character).locations.body.wounds[0].description,'');
  assert.equal(enteredLethalWp(readTbeSheet(undo.character)),0);
});

test('missed attacks and zero-WP protection do not create wounds',()=>{
  const {hero,campaign}=setup();
  const miss=previewCombatRoll(hero,campaign,{...attack,heroRoll:99,opponentRoll:20,heroFavor:1},'miss');
  assert.equal(miss.attackerWon,false);
  assert.equal(miss.hit,null);
  assert.equal(previewCombatDamage(miss,damage),null);
  const missed=confirmCombatExchange(hero,campaign,miss,damage);
  assert.equal(missed.campaign.npcs[0].combatWounds?.length??0,0);
  assert.equal(missed.campaign.journal.at(-1)?.combatAction?.target,'none');
  assert.equal(missed.character.attributes?.spentResolve,1);
  const reverted=undoCombatExchange(missed.character,missed.campaign,'miss');
  assert.equal(reverted.character.attributes?.spentResolve,0);
  const hit=previewCombatRoll(hero,campaign,attack,'zero-wp');
  const blocked=confirmCombatExchange(hero,campaign,hit,{...damage,armorAP:50,shieldAP:0});
  assert.equal(blocked.campaign.npcs[0].combatWounds?.length??0,0);
  assert.equal(blocked.campaign.journal.at(-1)?.combatAction?.woundPoints,0);
});

test('internal damage bypasses AP and a nonlethal NPC wound stays nonlethal',()=>{
  const {hero,campaign}=setup();
  const p=previewCombatRoll(hero,campaign,attack,'internal');
  const input:CombatDamageChoice={...damage,type:'internal',baseDamage:3,injury:'Suffocation',nonlethal:true};
  assert.equal(previewCombatDamage(p,input)?.woundPoints,6);
  const result=confirmCombatExchange(hero,campaign,p,input);
  assert.equal(result.campaign.npcs[0].combatWounds?.[0].wp,6);
  assert.equal(result.campaign.npcs[0].combatWounds?.[0].nonlethal,true);
});

test('revalidation blocks stale skill, opponent or scene and invalid values',()=>{
  const {hero,campaign}=setup();
  const p=previewCombatRoll(hero,campaign,attack,'stale');
  assert.throws(()=>confirmCombatExchange({...hero,skills:[{...hero.skills[0],rating:71}]},
    campaign,p,damage),/changed/);
  assert.throws(()=>confirmCombatExchange(hero,{...campaign,activeSceneId:null},
    p,damage),/active scene/);
  assert.throws(()=>confirmCombatExchange(hero,{...campaign,npcs:[]},p,damage),/NPC opponent/);
  assert.throws(()=>confirmCombatExchange(hero,campaign,{...p,degree:8},damage),/changed/);
  assert.throws(()=>previewCombatRoll(hero,campaign,{...attack,opponentRating:101}),RangeError);
  assert.throws(()=>previewCombatRoll(hero,campaign,{...attack,opponentModifier:101}),RangeError);
  assert.throws(()=>previewCombatRoll(hero,campaign,{...attack,heroFavor:4}),RangeError);
  assert.throws(()=>previewCombatRoll(hero,campaign,{...attack,opponentRoll:101}),RangeError);
  assert.throws(()=>previewCombatRoll(hero,campaign,{...attack,heroRoll:0}),RangeError);
  assert.throws(()=>previewCombatDamage(p,{...damage,baseDamage:-1}),RangeError);
});

test('undo never overwrites edited hero wounds or later Resolve expenditure',()=>{
  const {hero,campaign}=setup();
  const p=previewCombatRoll(hero,campaign,{...defend,heroFavor:1},'safe-undo');
  const applied=confirmCombatExchange(hero,campaign,p,damage);
  assert.equal(applied.character.attributes?.spentResolve,1);
  assert.throws(()=>undoCombatExchange({...applied.character,
    attributes:{...applied.character.attributes!,spentResolve:2}},
    applied.campaign,'safe-undo'),/Resolve changed/);
  const changed={...applied.character,tbeSheet:{...applied.character.tbeSheet!,
    locations:{...applied.character.tbeSheet!.locations,body:{
      ...applied.character.tbeSheet!.locations.body,
      wounds:applied.character.tbeSheet!.locations.body.wounds.map((w,i)=>i===0?
        {...w,description:'Edited by player'}:w)}}}};
  assert.throws(()=>undoCombatExchange(changed,applied.campaign,'safe-undo'),/Wound was edited/);
});

test('existing wound rows are preserved and importing combat records validates shape',()=>{
  const {hero,campaign}=setup();
  const first=confirmCombatExchange(hero,campaign,
    previewCombatRoll(hero,campaign,defend,'wound-one'),damage);
  const second=confirmCombatExchange(first.character,first.campaign,
    previewCombatRoll(first.character,first.campaign,defend,'wound-two'),damage);
  const wounds=readTbeSheet(second.character).locations.body.wounds;
  assert.equal(wounds[0].wp,'8');
  assert.equal(wounds[1].wp,'8');
  const malformed={...second.campaign,journal:second.campaign.journal.map(e=>
    e.combatAction?{...e,combatAction:{...e.combatAction,woundPoints:-2}}:e)};
  assert.equal(isSoloCampaign(malformed),false);
  assert.ok(isSoloCampaign(second.campaign));
});

test('existing paired-save helper persists NPC combat and hero wound outcomes',()=>{
  const {hero,campaign}=setup();
  const r=confirmCombatExchange(hero,campaign,
    previewCombatRoll(hero,campaign,defend,'save-combat'),damage);
  const values=new Map<string,string>();
  const storage={getItem:(k:string)=>values.get(k)??null,
    setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}};
  persistSoloSkillAction(storage,[r.character],[r.campaign]);
  const saved=readSoloCampaigns(values.get('wayfarers-ledger-solo-v1')??null);
  assert.equal(saved[0].journal.at(-1)?.combatAction?.woundPoints,8);
  assert.equal(JSON.parse(values.get('wayfarers-ledger-roster-v1')??'[]')[0]
    .tbeSheet.locations.body.wounds[0].wp,'8');
});

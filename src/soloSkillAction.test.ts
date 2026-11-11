import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCharacter} from './engine.ts';
import {DEFAULT_ATTRIBUTES} from './characterSheetState.ts';
import {deriveAttributes} from './characterSheetModel.ts';
import {makeSoloCampaign,beginSoloScene,closeSoloScene,isSoloCampaign,readSoloCampaigns} from './soloEngine.ts';
import {
  previewSoloSkillAction,commitSoloSkillAction,persistSoloSkillAction,ROSTER_STORAGE_KEY
} from './soloSkillAction.ts';
import {SOLO_STORAGE_KEY} from './soloEngine.ts';

function setup(){
  const hero=makeCharacter();
  hero.id='hero-1';
  hero.name='Arden';
  hero.skills=[{id:'skill-1',name:'Stealth',rating:55,note:'',modifier:-10,expertiseLevel:2}];
  const campaign=beginSoloScene(makeSoloCampaign(hero.id),'The watchtower','Gate','The guards are alert.');
  return {hero,campaign};
}

test('preview is deterministic and does not spend resources or write to the campaign',()=>{
  const {hero,campaign}=setup();
  const pending=previewSoloSkillAction(hero,campaign,'skill-1',1,55,'action-1');
  assert.equal(pending.roll,55);
  assert.equal(pending.target,55);
  assert.equal(pending.success,true);
  assert.equal(pending.critical,true);
  assert.equal(pending.sourcePage,23);
  assert.equal(pending.sceneId,campaign.activeSceneId);
  assert.equal(pending.expertise,2);
  assert.equal(deriveAttributes(hero).availableResolve,10);
  assert.equal(campaign.journal.length,1);
});

test('confirm spends exactly the chosen Favor and writes one structured scene log',()=>{
  const {hero,campaign}=setup();
  const pending=previewSoloSkillAction(hero,campaign,'skill-1',2,32,'action-2');
  const result=commitSoloSkillAction(hero,campaign,pending);
  assert.equal(result.applied,true);
  assert.equal(result.character.attributes?.spentResolve,2);
  assert.equal(hero.attributes?.spentResolve,0);
  assert.equal(result.campaign.journal.length,2);
  const log=result.campaign.journal.at(-1)!;
  assert.equal(log.kind,'check');
  assert.equal(log.sceneId,campaign.activeSceneId);
  assert.equal(log.sourcePage,23);
  assert.equal(log.roll,32);
  assert.equal(log.skillAction?.id,'action-2');
  assert.equal(log.skillAction?.favor,2);
  assert.equal(log.skillAction?.target,65);
  assert.equal(log.skillAction?.levels,pending.levels);
  assert.ok(isSoloCampaign(result.campaign));
  assert.equal(readSoloCampaigns(JSON.stringify([result.campaign])).length,1);
  const again=commitSoloSkillAction(result.character,result.campaign,pending);
  assert.equal(again.applied,false);
  assert.deepEqual(again.character,result.character);
  assert.deepEqual(again.campaign,result.campaign);
});

test('unconfirmed previews never mutate anything, including Favor zero',()=>{
  const {hero,campaign}=setup();
  previewSoloSkillAction(hero,campaign,'skill-1',0,34,'discarded');
  assert.equal(hero.attributes?.spentResolve,0);
  assert.equal(campaign.journal.length,1);
  const applied=commitSoloSkillAction(hero,campaign,previewSoloSkillAction(hero,campaign,'skill-1',0,34,'no-cost'));
  assert.equal(applied.character.attributes?.spentResolve,0);
  assert.equal(applied.campaign.journal.length,2);
});

test('unsupported targets, missing scenes, mismatched characters and insufficient Resolve are blocked',()=>{
  const {hero,campaign}=setup();
  assert.throws(()=>previewSoloSkillAction(hero,makeSoloCampaign(hero.id),'skill-1',0,30),/active scene/);
  assert.throws(()=>previewSoloSkillAction(hero,{...campaign,characterId:'other'},'skill-1',0,30),/not assigned/);
  assert.throws(()=>previewSoloSkillAction(hero,campaign,'missing',0,30),/no longer exists/);
  assert.throws(()=>previewSoloSkillAction(hero,campaign,'skill-1',4,30),/0–3/);
  assert.throws(()=>previewSoloSkillAction(hero,campaign,'skill-1',0,101),RangeError);
  assert.throws(()=>previewSoloSkillAction({...hero,skills:[{...hero.skills[0],rating:100,modifier:1}]},campaign,'skill-1',0,30),/0–100/);
  const exhausted={...hero,attributes:{...DEFAULT_ATTRIBUTES,spentResolve:10}};
  assert.throws(()=>previewSoloSkillAction(exhausted,campaign,'skill-1',1,30),/Not enough/);
});

test('confirmed action rejects stale skills, scenes, campaigns, resolve and tampered results',()=>{
  const {hero,campaign}=setup();
  const pending=previewSoloSkillAction(hero,campaign,'skill-1',1,34,'action-stale');
  assert.throws(()=>commitSoloSkillAction({...hero,skills:[{...hero.skills[0],rating:58}]},campaign,pending),/skill changed/);
  assert.throws(()=>commitSoloSkillAction(hero,closeSoloScene(campaign,''),pending),/active scene/);
  assert.throws(()=>commitSoloSkillAction(hero,{...campaign,id:'wrong'},pending),/does not belong/);
  assert.throws(()=>commitSoloSkillAction({...hero,attributes:{...DEFAULT_ATTRIBUTES,spentResolve:10}},campaign,pending),/Not enough/);
  assert.throws(()=>commitSoloSkillAction(hero,campaign,{...pending,roll:99}),/no longer matches/);
  assert.throws(()=>commitSoloSkillAction(hero,campaign,{...pending,levels:100}),/no longer matches/);
});

test('journal validation refuses malformed action details but accepts legacy v1 logs',()=>{
  const {hero,campaign}=setup();
  assert.ok(isSoloCampaign(campaign));
  const pending=previewSoloSkillAction(hero,campaign,'skill-1',1,23,'action-legacy');
  const done=commitSoloSkillAction(hero,campaign,pending);
  const log=done.campaign.journal.at(-1)!;
  const malformed={...done.campaign,journal:[{...log,skillAction:{...log.skillAction,target:104}}]};
  assert.equal(isSoloCampaign(malformed),false);
  assert.equal(isSoloCampaign({...done.campaign,journal:[{...log,skillAction:{...log.skillAction,success:'yes'}}]}),false);
  assert.ok(isSoloCampaign(campaign));
});

test('paired snapshot save rolls back when campaign write fails',()=>{
  const {hero,campaign}=setup();
  const pending=previewSoloSkillAction(hero,campaign,'skill-1',1,34,'action-persist');
  const done=commitSoloSkillAction(hero,campaign,pending);
  const values=new Map<string,string>([
    [ROSTER_STORAGE_KEY,JSON.stringify([hero])],
    [SOLO_STORAGE_KEY,JSON.stringify([campaign])]
  ]);
  const storage={
    getItem:(key:string)=>values.get(key)??null,
    setItem:(key:string,value:string)=>{values.set(key,value);},
    removeItem:(key:string)=>{values.delete(key);}
  };
  persistSoloSkillAction(storage,[done.character],[done.campaign]);
  assert.equal(JSON.parse(values.get(ROSTER_STORAGE_KEY)??'[]')[0].attributes.spentResolve,1);
  assert.equal(JSON.parse(values.get(SOLO_STORAGE_KEY)??'[]')[0].journal.length,2);

  const beforeRoster=values.get(ROSTER_STORAGE_KEY);
  const beforeCampaign=values.get(SOLO_STORAGE_KEY);
  let fail=true;
  const faulty={
    ...storage,
    setItem:(key:string,value:string)=>{
      if(key===SOLO_STORAGE_KEY&&fail){fail=false;throw new Error('QuotaExceeded');}
      values.set(key,value);
    }
  };
  assert.throws(()=>persistSoloSkillAction(faulty,[hero],[campaign]),/Nothing was applied/);
  assert.equal(values.get(ROSTER_STORAGE_KEY),beforeRoster);
  assert.equal(values.get(SOLO_STORAGE_KEY),beforeCampaign);
});

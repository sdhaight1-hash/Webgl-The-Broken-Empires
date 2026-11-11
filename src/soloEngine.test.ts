import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveCheck} from './engine.ts';
import {MECHANICS,skillTest,opposedTest,supportBonus,extendedProgress,useSupplyDie,timerTriggered} from './mechanics.ts';
import {makeSoloCampaign,beginSoloScene,closeSoloScene,makeSoloLog,addSoloLog,
  customOracle,manualOracle,moveSoloToken,isSoloCampaign,readSoloCampaigns} from './soloEngine.ts';

test('all implemented mechanics have source pages and explicit tested status',()=>{
  assert.equal(MECHANICS.length,8);
  assert.equal(new Set(MECHANICS.map(m=>m.id)).size,MECHANICS.length);
  assert.ok(MECHANICS.every(m=>m.status==='tested'&&m.page>0&&m.page<=663));
});
test('adjusted skills and expertise floors only improve successful checks',()=>{
  const success=skillTest({rating:56,modifier:8,roll:13,expertise:3});
  assert.equal(success.target,64);
  assert.equal(success.levels,3);
  assert.equal(success.success,true);
  assert.equal(skillTest({rating:56,modifier:8,roll:90,expertise:4}).levels,0);
  assert.equal(skillTest({rating:65,modifier:0,roll:65}).levels,9);
  assert.throws(()=>skillTest({rating:100,modifier:5,roll:22}),/0–100/);
  assert.throws(()=>skillTest({rating:-1,modifier:0,roll:3}),RangeError);
});
test('opposed contest compares success, levels, criticals, roll then modified skill',()=>{
  assert.deepEqual([opposedTest({rating:65,modifier:0,roll:44},{rating:40,modifier:0,roll:90}).winner,
    opposedTest({rating:65,modifier:0,roll:44},{rating:40,modifier:0,roll:90}).reason],['left','only success']);
  const levels=opposedTest({rating:65,modifier:0,roll:52},{rating:65,modifier:0,roll:21});
  assert.equal(levels.winner,'left');assert.equal(levels.degree,3);
  const tiebreak=opposedTest({rating:54,modifier:0,roll:25},{rating:40,modifier:0,roll:27});
  assert.equal(tiebreak.winner,'right');assert.equal(tiebreak.reason,'roll');
  const bothFail=opposedTest({rating:10,modifier:0,roll:94},{rating:20,modifier:0,roll:95});
  assert.equal(bothFail.winner,'none');assert.equal(bothFail.reason,'both failed');
  const identical=opposedTest({rating:50,modifier:0,roll:23},{rating:60,modifier:0,roll:23});
  assert.equal(identical.winner,'right');assert.equal(identical.reason,'adjusted skill');
});
test('extended task accumulates progress and halves it on critical failure',()=>{
  assert.deepEqual(extendedProgress(4,10,resolveCheck(26,65),2),{progress:8,complete:false,delta:4,setback:false});
  assert.deepEqual(extendedProgress(7,10,resolveCheck(99,50)),{progress:4,complete:false,delta:-3,setback:true});
  assert.equal(extendedProgress(9,10,resolveCheck(23,65)).complete,true);
  assert.throws(()=>extendedProgress(5,10,resolveCheck(23,65),3),RangeError);
});
test('supply die decrements on 1–2 and empties after d6',()=>{
  assert.deepEqual(useSupplyDie(12,8),{next:12,depleted:false,stepped:false});
  assert.equal(useSupplyDie(12,2).next,10);
  assert.equal(useSupplyDie(10,1).next,8);
  assert.equal(useSupplyDie(8,2).next,6);
  assert.deepEqual(useSupplyDie(6,1),{next:0,depleted:true,stepped:true});
  assert.throws(()=>useSupplyDie(0,1),RangeError);
});
test('support and timer rules verify boundary cases',()=>{
  assert.equal(supportBonus(43),8);
  assert.equal(supportBonus(0),0);
  assert.equal(supportBonus(100),20);
  assert.equal(timerTriggered(4,10,3),true);
  assert.equal(timerTriggered(4,10,5),false);
  assert.throws(()=>timerTriggered(4,10,11),RangeError);
});
test('custom oracle supports explicit odds, extreme outcomes and matching-dice event flags',()=>{
  assert.deepEqual([customOracle(5,50).outcome,customOracle(40,50).outcome,
    customOracle(70,50).outcome,customOracle(94,50).outcome],
    ['extreme-yes','yes','no','extreme-no']);
  assert.equal(customOracle(44,50).event,true);
  assert.equal(customOracle(100,50).event,true);
  assert.equal(customOracle(10,50).event,false);
  assert.throws(()=>customOracle(0,50),RangeError);
  assert.throws(()=>customOracle(20,110),RangeError);
});
test('table-based oracle records book interpretations without inventing thresholds',()=>{
  assert.equal(manualOracle(44,'no').outcome,'no');
  assert.equal(manualOracle(44,'no').event,true);
  assert.equal(manualOracle(82,'extreme-no').yesChance,0);
  assert.throws(()=>manualOracle(101,'yes'),RangeError);
  assert.throws(()=>manualOracle(30,'maybe' as 'yes'),RangeError);
});
test('campaign scene lifecycle and journal are durable and versioned',()=>{
  const initial=makeSoloCampaign('hero-1');
  assert.ok(isSoloCampaign(initial));
  const opened=beginSoloScene(initial,'The gates','At the old bridge','A courier arrives.');
  assert.equal(opened.activeSceneId,opened.scenes[0].id);
  assert.equal(opened.journal[0].kind,'scene');
  const closed=closeSoloScene(opened,'The messenger flees.');
  assert.equal(closed.scenes[0].status,'closed');
  assert.equal(closed.activeSceneId,null);
  assert.equal(closed.scenes[0].outcome,'The messenger flees.');
  assert.deepEqual(readSoloCampaigns(JSON.stringify([closed]))[0].scenes,closed.scenes);
  assert.throws(()=>closeSoloScene(initial,''),/No active scene/);
  assert.throws(()=>beginSoloScene(initial,'','',''),RangeError);
});
test('movement requires known tokens and zones, and logs have source-page metadata',()=>{
  const start=makeSoloCampaign('hero-1');
  const scene=beginSoloScene(start,'Test','','');
  const token={id:'token-1',name:'Hero',npcId:null as null,kind:'hero' as const,sceneId:scene.activeSceneId!,zoneId:scene.zones[0].id};
  const campaign={...scene,tokens:[token]};
  const moved=moveSoloToken(campaign,token.id,campaign.zones[1].id);
  assert.equal(moved.tokens[0].zoneId,campaign.zones[1].id);
  assert.throws(()=>moveSoloToken(campaign,'missing',campaign.zones[1].id),RangeError);
  const logged=addSoloLog(moved,makeSoloLog('oracle','Does it rain?',moved.activeSceneId,486,44));
  assert.equal(logged.journal.at(-1)?.roll,44);
  assert.equal(logged.journal.at(-1)?.sourcePage,486);
  assert.ok(isSoloCampaign(logged));
});
test('invalid or oversized local storage entries are discarded',()=>{
  assert.deepEqual(readSoloCampaigns('{oops'),[]);
  assert.deepEqual(readSoloCampaigns('{"id":1}'),[]);
  const campaign=makeSoloCampaign('hero-1');
  const malicious={...campaign,journal:[{kind:'oracle',message:Symbol('bad')}]};
  assert.equal(isSoloCampaign(malicious),false);
  assert.equal(readSoloCampaigns(JSON.stringify([campaign,malicious])).length,1);
  assert.equal(isSoloCampaign({...campaign,version:2}),false);
});

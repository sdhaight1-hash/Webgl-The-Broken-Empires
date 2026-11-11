import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSoloCampaign,isSoloCampaign} from './soloEngine.ts';
import {editSceneWorksheet,editNPCWorksheet,editThreadWorksheet} from './soloWorksheetModel.ts';

test('scene worksheet edits only the selected scene, preserving timeline',()=>{
 const c=makeSoloCampaign('actor');c.scenes=[
 {id:'one',title:'Road',location:'Old bridge',expected:'Safe passage',status:'closed',outcome:'None',createdAt:'t',closedAt:'t'},
 {id:'two',title:'Keep',location:'Gate',expected:'Trade',status:'active',outcome:'',createdAt:'t',closedAt:null}
 ];c.activeSceneId='two';
 const next=editSceneWorksheet(c,'one',{outcome:'Ambush'});
 assert.equal(next.scenes[0].outcome,'Ambush');
 assert.equal(next.scenes[1].outcome,'');
 assert.equal(next.activeSceneId,'two');
 assert.ok(isSoloCampaign(next));
 assert.throws(()=>editSceneWorksheet(c,'missing',{location:'Elsewhere'}),RangeError);
 assert.throws(()=>editSceneWorksheet(c,'one',{expected:'x'.repeat(1201)}),RangeError);
});
test('NPC dossier editor preserves other NPCs, tags and the source schema',()=>{
 const c=makeSoloCampaign('actor');
 c.npcs=[{id:'n1',name:'Guide',role:'Merchant',disposition:'Unknown',details:'',tags:''},
 {id:'n2',name:'Guard',role:'Sentry',disposition:'Hostile',details:'',tags:''}];
 const next=editNPCWorksheet(c,'n1',{disposition:'Neutral',tags:'Contact'});
 assert.equal(next.npcs[0].tags,'Contact');
 assert.equal(next.npcs[1].disposition,'Hostile');
 assert.ok(isSoloCampaign(next));
 assert.throws(()=>editNPCWorksheet(c,'n1',{details:'x'.repeat(4001)}),RangeError);
});
test('story thread worksheet toggles completion without losing text',()=>{
 const c=makeSoloCampaign('actor');
 c.threads=[{id:'t1',title:'Find the key',done:false}];
 const next=editThreadWorksheet(c,'t1',{done:true});
 assert.deepEqual(next.threads[0],{id:'t1',title:'Find the key',done:true});
 assert.ok(isSoloCampaign(next));
 assert.throws(()=>editThreadWorksheet(c,'missing',{done:true}),RangeError);
});

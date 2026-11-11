import test from 'node:test';
import assert from 'node:assert/strict';
import {TALENT_CATALOG,TALENT_CATEGORIES,TALENT_NAMES_PENDING_VERIFICATION,findTalent} from './talentCatalog.ts';

test('Talent chooser has grouped source-page anchors and unique labels',()=>{
 assert.equal(TALENT_CATEGORIES.length,8);
 assert.ok(TALENT_CATALOG.length>=70);
 const names=TALENT_CATALOG.map(o=>o.name.toLocaleLowerCase());
 assert.equal(names.length,new Set(names).size);
 assert.ok(TALENT_CATALOG.every(o=>o.page>=44&&o.page<=57));
});
test('a manually entered selection can still link to its short source index',()=>{
 const talent=findTalent('  feint ');
 assert.equal(talent?.name,'Feint');
 assert.equal(talent?.page,46);
 assert.equal(findTalent('Homebrew feat'),undefined);
});
test('unverified grouped Talent label variants are explicitly flagged',()=>{
 for(const name of TALENT_NAMES_PENDING_VERIFICATION){
   assert.ok(findTalent(name),name+' must remain user-selectable pending clarification');
 }
 assert.ok(!TALENT_NAMES_PENDING_VERIFICATION.has('Feint'));
});

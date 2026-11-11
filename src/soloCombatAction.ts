import type {Character} from './types.ts';
import {freshId} from './engine.ts';
import {deriveAttributes,sheetAttributes} from './characterSheetModel.ts';
import {opposedTest} from './mechanics.ts';
import type {OpposedResult} from './mechanics.ts';
import {calculateWoundPoints,locateHit,recordWound} from './hitLocation.ts';
import type {DamageInput,DamageResult,HitLocation} from './hitLocation.ts';
import {readTbeSheet} from './tbeSheetData.ts';
import type {BodyLocation,WoundRow} from './tbeSheetData.ts';
import {addSoloLog,makeSoloLog} from './soloEngine.ts';
import type {SoloCampaign,SoloCombatLogDetail,SoloNpcWound} from './soloEngine.ts';

export type CombatDirection='hero-attacks'|'hero-defends';
export type CombatRollRequest={
  opponentId:string;direction:CombatDirection;heroSkillId:string;
  heroFavor:number;opponentRating:number;opponentModifier:number;
  opponentExpertise:1|2|3|4;heroRoll:number;opponentRoll:number
};
export type PendingCombatRoll=CombatRollRequest&{
  id:string;characterId:string;campaignId:string;sceneId:string;
  heroSkillName:string;heroRating:number;heroModifier:number;heroExpertise:number;
  winner:OpposedResult['winner'];reason:OpposedResult['reason'];
  degree:number;attackerWon:boolean;hit:HitLocation|null
};
export type CombatDamageChoice=DamageInput&{injury:string;nonlethal:boolean};
export type CombatCommit={character:Character;campaign:SoloCampaign;applied:boolean;actionId:string};
const whole=(n:number,name:string,lo:number,hi:number)=>{
  if(!Number.isInteger(n)||n<lo||n>hi)throw new RangeError(name+' must be '+lo+'–'+hi);
};
function verifyContext(character:Character,campaign:SoloCampaign,request:CombatRollRequest):string{
  if(!character.id||campaign.characterId!==character.id)
    throw new RangeError('The campaign is not assigned to the selected character.');
  const scene=campaign.scenes.find(s=>s.id===campaign.activeSceneId&&s.status==='active');
  if(!scene)throw new RangeError('Open an active scene before resolving combat.');
  if(!campaign.npcs.some(n=>n.id===request.opponentId))
    throw new RangeError('Choose an existing NPC opponent.');
  if(request.direction!=='hero-attacks'&&request.direction!=='hero-defends')
    throw new RangeError('Choose who is attacking.');
  whole(request.heroFavor,'Resolve Favor',0,3);
  if(deriveAttributes(character).availableResolve<request.heroFavor||
    sheetAttributes(character).spentResolve+request.heroFavor>200)
    throw new RangeError('Not enough Resolve for the chosen Favor.');
  whole(request.opponentRating,'Opponent rating',0,100);
  whole(request.opponentModifier,'Opponent modifier',-100,100);
  whole(request.opponentExpertise,'Opponent Expertise',1,4);
  return scene.id;
}
/** Resolve the existing source-verified opposed skill rules, never an inferred
 * weapon attack bonus. The NPC rating/modifier/Expertise are user supplied. */
export function previewCombatRoll(
  hero:Character,campaign:SoloCampaign,request:CombatRollRequest,id=freshId()
):PendingCombatRoll{
  const sceneId=verifyContext(hero,campaign,request);
  if(!id.trim()||id.length>150)throw new RangeError('Invalid combat action identifier');
  const skill=hero.skills.find(s=>s.id===request.heroSkillId);
  if(!skill)throw new RangeError('Hero skill no longer exists.');
  const heroModifier=skill.modifier??0,heroExpertise=skill.expertiseLevel??1;
  const heroInput={rating:skill.rating,modifier:heroModifier+10*request.heroFavor,
    roll:request.heroRoll,expertise:heroExpertise};
  const opponentInput={rating:request.opponentRating,modifier:request.opponentModifier,
    roll:request.opponentRoll,expertise:request.opponentExpertise};
  const result=request.direction==='hero-attacks'
    ?opposedTest(heroInput,opponentInput)
    :opposedTest(opponentInput,heroInput);
  const attackerWon=result.winner==='left';
  return {
    ...request,id,characterId:hero.id,campaignId:campaign.id,sceneId,
    heroSkillName:skill.name,heroRating:skill.rating,heroModifier,heroExpertise,
    winner:result.winner,reason:result.reason,degree:result.degree,attackerWon,
    hit:attackerWon?locateHit(
      request.direction==='hero-attacks'?request.heroRoll:request.opponentRoll,
      request.direction==='hero-attacks'?request.opponentRoll:request.heroRoll
    ):null
  };
}
export function previewCombatDamage(pending:PendingCombatRoll,choice:CombatDamageChoice):DamageResult|null{
  if(!pending.attackerWon)return null;
  if(!pending.hit)throw new RangeError('A successful attack requires its hit location.');
  if(typeof choice.injury!=='string'||choice.injury.length>1100||typeof choice.nonlethal!=='boolean')
    throw new RangeError('Invalid injury information.');
  return calculateWoundPoints({...choice,degreeOfSuccess:pending.degree});
}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const blankSlot=(w:WoundRow)=>!w.wp.trim()&&!w.description.trim()&&!w.infection&&
  !w.nonlethal&&!w.recoveryBonus.trim();
export function confirmCombatExchange(
  hero:Character,campaign:SoloCampaign,pending:PendingCombatRoll,choice:CombatDamageChoice
):CombatCommit{
  if(pending.characterId!==hero.id||pending.campaignId!==campaign.id)
    throw new RangeError('This combat roll belongs to a different character or campaign.');
  if(campaign.journal.some(e=>e.combatAction?.id===pending.id))
    return {character:hero,campaign,applied:false,actionId:pending.id};
  const request:CombatRollRequest={
    opponentId:pending.opponentId,direction:pending.direction,heroSkillId:pending.heroSkillId,
    heroFavor:pending.heroFavor,opponentRating:pending.opponentRating,
    opponentModifier:pending.opponentModifier,opponentExpertise:pending.opponentExpertise,
    heroRoll:pending.heroRoll,opponentRoll:pending.opponentRoll
  };
  const regenerated=previewCombatRoll(hero,campaign,request,pending.id);
  if(!same(regenerated,pending))
    throw new RangeError('Combatant, skill or scene changed. Discard the roll and try again.');
  const damage=previewCombatDamage(pending,choice);
  const wp=damage?.woundPoints??0;
  const beforeSpent=sheetAttributes(hero).spentResolve;
  let nextHero:Character={...hero,attributes:{...sheetAttributes(hero),
    spentResolve:beforeSpent+pending.heroFavor},updatedAt:new Date().toISOString()};
  let nextCampaign=campaign;
  const target:SoloCombatLogDetail['target']=
    pending.attackerWon&&wp>0?(pending.direction==='hero-attacks'?'npc':'hero'):'none';
  const action:SoloCombatLogDetail={
    id:pending.id,characterId:hero.id,opponentId:pending.opponentId,
    direction:pending.direction,heroSkillId:pending.heroSkillId,
    heroRoll:pending.heroRoll,opponentRoll:pending.opponentRoll,
    heroFavor:pending.heroFavor,opponentRating:pending.opponentRating,
    opponentModifier:pending.opponentModifier,opponentExpertise:pending.opponentExpertise,
    attackerWon:pending.attackerWon,degree:pending.degree,target,
    ...(pending.hit?{location:pending.hit.location,detail:pending.hit.detail}:{}),
    woundPoints:wp,heroSpentBefore:beforeSpent,heroSpentAfter:beforeSpent+pending.heroFavor
  };
  if(target==='hero'&&pending.hit){
    const oldSheet=readTbeSheet(hero),oldWounds=oldSheet.locations[pending.hit.location].wounds;
    const slot=oldWounds.findIndex(blankSlot);
    if(slot<0)throw new RangeError('All five wound slots in this location are occupied.');
    const newSheet=recordWound(oldSheet,pending.hit,wp,choice.injury,choice.nonlethal);
    const beforeWound=oldWounds[slot],appliedWound=newSheet.locations[pending.hit.location].wounds[slot];
    nextHero={...nextHero,tbeSheet:newSheet};
    Object.assign(action,{slot,beforeWound,appliedWound});
  }
  if(target==='npc'&&pending.hit){
    const npc=campaign.npcs.find(n=>n.id===pending.opponentId);
    if(!npc)throw new RangeError('Opponent no longer exists.');
    if((npc.combatWounds?.length??0)>=100)
      throw new RangeError('NPC wound record limit reached.');
    const npcWound:SoloNpcWound={id:pending.id,location:pending.hit.location,
      detail:pending.hit.detail,wp,injury:choice.injury.trim(),nonlethal:choice.nonlethal};
    nextCampaign={...campaign,npcs:campaign.npcs.map(n=>n.id===npc.id?
      {...n,combatWounds:[...(n.combatWounds??[]),npcWound]}:n)};
    action.npcWound=npcWound;
  }
  const npcName=campaign.npcs.find(n=>n.id===pending.opponentId)?.name||'NPC';
  const attacker=pending.direction==='hero-attacks'?(hero.name||'Hero'):npcName;
  const defender=pending.direction==='hero-attacks'?npcName:(hero.name||'Hero');
  const result=pending.attackerWon?(wp>0?
    'hit '+pending.hit?.label+' / '+pending.hit?.detail+' · '+wp+' WP'+
      (choice.nonlethal?' nonlethal':''):'successful attack, 0 WP after protection'):
    'attack did not win ('+pending.reason+')';
  const message='Combat: '+attacker+' vs '+defender+' · d100 '+
    (pending.direction==='hero-attacks'?pending.heroRoll:pending.opponentRoll)+' / '+
    (pending.direction==='hero-attacks'?pending.opponentRoll:pending.heroRoll)+
    ' · DoS '+pending.degree+' · '+result+
    (pending.heroFavor?' · '+pending.heroFavor+' Resolve Favor':'');
  const log={...makeSoloLog('opposed',message,pending.sceneId,24,pending.heroRoll),
    combatAction:action};
  return {character:nextHero,campaign:addSoloLog(nextCampaign,log),
    applied:true,actionId:pending.id};
}
/** A compensating journal event, not deletion of a roll. Refuse to undo if the
 * wound slot or spent Resolve has since changed, so later user edits survive. */
export function undoCombatExchange(
  hero:Character,campaign:SoloCampaign,actionId:string
):CombatCommit{
  const original=campaign.journal.find(e=>e.combatAction?.id===actionId);
  if(!original?.combatAction)throw new RangeError('Combat action not found in journal.');
  if(original.combatAction.characterId!==hero.id||campaign.characterId!==hero.id)
    throw new RangeError('Combat action belongs to a different character.');
  if(campaign.journal.some(e=>e.reversalOf===actionId))
    return {character:hero,campaign,applied:false,actionId};
  const action=original.combatAction;
  const current=sheetAttributes(hero);
  if(current.spentResolve!==action.heroSpentAfter)
    throw new RangeError('Resolve changed since combat; undo would overwrite later changes.');
  let nextHero:Character={...hero,attributes:{...current,
    spentResolve:action.heroSpentBefore},updatedAt:new Date().toISOString()};
  let nextCampaign=campaign;
  if(action.target==='hero'){
    const location=action.location as BodyLocation;
    const slot=action.slot;
    if(!location||slot===undefined||!action.appliedWound||!action.beforeWound)
      throw new RangeError('Missing original wound slot for reversal.');
    const sheet=readTbeSheet(hero);
    if(!same(sheet.locations[location]?.wounds[slot],action.appliedWound))
      throw new RangeError('Wound was edited after combat; undo would overwrite it.');
    nextHero={...nextHero,tbeSheet:{...sheet,locations:{...sheet.locations,
      [location]:{...sheet.locations[location],wounds:sheet.locations[location].wounds.map(
        (row,index)=>index===slot?action.beforeWound!:row)}}}};
  }
  if(action.target==='npc'){
    const npc=campaign.npcs.find(n=>n.id===action.opponentId);
    const wound=npc?.combatWounds?.find(w=>w.id===action.id);
    if(!npc||!wound||!same(wound,action.npcWound))
      throw new RangeError('NPC wound was changed or removed; undo would overwrite later changes.');
    nextCampaign={...campaign,npcs:campaign.npcs.map(n=>n.id===action.opponentId?
      {...n,combatWounds:n.combatWounds?.filter(w=>w.id!==action.id)}:n)};
  }
  return {character:nextHero,
    campaign:addSoloLog(nextCampaign,{...makeSoloLog('opposed',
      'Combat action reversed: '+original.message,original.sceneId,24,original.roll),
      reversalOf:actionId}),
    applied:true,actionId};
}

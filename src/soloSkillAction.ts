import type {Character,Skill} from './types.ts';
import {freshId} from './engine.ts';
import {deriveAttributes,rollSheetSkill,sheetAttributes} from './characterSheetModel.ts';
import {addSoloLog,makeSoloLog,SOLO_STORAGE_KEY} from './soloEngine.ts';
import type {SoloCampaign,SoloSkillLogDetail} from './soloEngine.ts';

/** A die result is visible before its cost is confirmed. The roll cannot be
 * reinterpreted by changing the skill/scene between preview and confirmation. */
export type PendingSoloSkillAction={
  id:string;
  characterId:string;
  campaignId:string;
  sceneId:string;
  skillId:string;
  skillName:string;
  rating:number;
  modifier:number;
  expertise:number;
  favor:number;
  roll:number;
  target:number;
  success:boolean;
  critical:boolean;
  levels:number;
  message:string;
  sourcePage:23;
};
export type SkillActionCommit={
  character:Character;campaign:SoloCampaign;applied:boolean
};
export const ROSTER_STORAGE_KEY='wayfarers-ledger-roster-v1';

function currentSkill(character:Character,skillId:string):Skill{
  const skill=character.skills.find(s=>s.id===skillId);
  if(!skill)throw new RangeError('The selected skill no longer exists.');
  return skill;
}
function checkContext(character:Character,campaign:SoloCampaign):string{
  if(!character.id||campaign.characterId!==character.id)
    throw new RangeError('This campaign is not assigned to the selected character.');
  const scene=campaign.scenes.find(s=>s.id===campaign.activeSceneId);
  if(!scene||scene.status!=='active')throw new RangeError('Open an active scene before making a scene skill check.');
  return scene.id;
}
export function previewSoloSkillAction(
  character:Character,campaign:SoloCampaign,skillId:string,favor:number,roll:number,
  id=freshId()
):PendingSoloSkillAction{
  const sceneId=checkContext(character,campaign);
  if(!id.trim()||id.length>150)throw new RangeError('Invalid action identifier');
  if(!Number.isInteger(favor)||favor<0||favor>3)throw new RangeError('Resolve Favor must be 0–3');
  if(deriveAttributes(character).availableResolve<favor)
    throw new RangeError('Not enough available Resolve for this Favor.');
  const skill=currentSkill(character,skillId);
  const modifier=skill.modifier??0,expertise=skill.expertiseLevel??1;
  const {check,entry}=rollSheetSkill(skill,roll,favor);
  return {
    id,characterId:character.id,campaignId:campaign.id,sceneId,skillId,
    skillName:skill.name,rating:skill.rating,modifier,expertise,
    favor,roll,target:check.target,success:check.success,critical:check.critical,
    levels:check.levels,message:entry.message,sourcePage:23
  };
}
export function commitSoloSkillAction(
  character:Character,campaign:SoloCampaign,pending:PendingSoloSkillAction
):SkillActionCommit{
  if(pending.characterId!==character.id||pending.campaignId!==campaign.id||
    campaign.characterId!==character.id)throw new RangeError('Action does not belong to this character and campaign.');
  if(campaign.journal.some(entry=>entry.skillAction?.id===pending.id))
    return {character,campaign,applied:false};
  if(checkContext(character,campaign)!==pending.sceneId)
    throw new RangeError('The active scene changed. Discard this roll and start a new check.');
  const skill=currentSkill(character,pending.skillId);
  if(skill.name!==pending.skillName||skill.rating!==pending.rating||
    (skill.modifier??0)!==pending.modifier||
    (skill.expertiseLevel??1)!==pending.expertise)
    throw new RangeError('The skill changed after rolling. Discard this roll and start a new check.');
  const attributes=sheetAttributes(character);
  if(deriveAttributes(character).availableResolve<pending.favor||
    attributes.spentResolve+pending.favor>200)
    throw new RangeError('Not enough Resolve remains to confirm this roll.');
  const again=previewSoloSkillAction(
    character,campaign,pending.skillId,pending.favor,pending.roll,pending.id
  );
  if(again.message!==pending.message||again.target!==pending.target||
    again.success!==pending.success||again.critical!==pending.critical||
    again.levels!==pending.levels||pending.sourcePage!==23)
    throw new RangeError('The pending roll no longer matches its verified result.');
  const detail:SoloSkillLogDetail={
    id:pending.id,characterId:character.id,skillId:pending.skillId,
    rating:pending.rating,modifier:pending.modifier,expertise:pending.expertise,
    favor:pending.favor,target:pending.target,success:pending.success,
    critical:pending.critical,levels:pending.levels
  };
  const entry={...makeSoloLog('check',pending.message,pending.sceneId,23,pending.roll),
    skillAction:detail};
  return {
    character:{
      ...character,attributes:{...attributes,spentResolve:attributes.spentResolve+pending.favor},
      updatedAt:new Date().toISOString()
    },
    campaign:addSoloLog(campaign,entry),
    applied:true
  };
}

/** Validate both replacement snapshots and write them before telling React the
 * action succeeded. If either write fails, restore the previous stored values.
 * Browser storage does not support crash-atomic two-key transactions; this is
 * the narrowest rollback protection compatible with existing v1 archives. */
export function persistSoloSkillAction(
  storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>,
  characters:Character[],campaigns:SoloCampaign[]
):void{
  const previousRoster=storage.getItem(ROSTER_STORAGE_KEY);
  const previousCampaigns=storage.getItem(SOLO_STORAGE_KEY);
  try{
    storage.setItem(ROSTER_STORAGE_KEY,JSON.stringify(characters));
    storage.setItem(SOLO_STORAGE_KEY,JSON.stringify(campaigns));
  }catch(error){
    try{
      if(previousRoster===null)storage.removeItem(ROSTER_STORAGE_KEY);
      else storage.setItem(ROSTER_STORAGE_KEY,previousRoster);
      if(previousCampaigns===null)storage.removeItem(SOLO_STORAGE_KEY);
      else storage.setItem(SOLO_STORAGE_KEY,previousCampaigns);
    }catch{
      throw new Error('Saving failed and storage rollback could not be completed. Export both records before continuing.');
    }
    throw new Error('The character and campaign could not both be saved. Nothing was applied.',{cause:error});
  }
}

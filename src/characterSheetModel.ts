import type {Character,SheetAttributes,SheetSupplies,Skill,SupplyDieSize} from './types.ts';
import {DEFAULT_ATTRIBUTES,DEFAULT_SUPPLIES,ALLOCATION_KEYS} from './characterSheetState.ts';
import {skillTest} from './mechanics.ts';
import type {AppliedCheck} from './mechanics.ts';

export type AllocationKey=typeof ALLOCATION_KEYS[number];
export type AttributeKey=keyof SheetAttributes;
export type RollEntry={
  label:string;message:string;sourcePage:number;roll?:number;check?:AppliedCheck;
};

export function sheetAttributes(character:Character):SheetAttributes {
  return {...DEFAULT_ATTRIBUTES,...character.attributes};
}
export function sheetSupplies(character:Character):SheetSupplies {
  return {...DEFAULT_SUPPLIES,...character.supplies};
}
export function deriveAttributes(character:Character) {
  const a=sheetAttributes(character);
  const pointsUsed=ALLOCATION_KEYS.reduce((sum,key)=>sum+a[key],0);
  const maxResolve=10+2*a.resolvePoints+a.resolveBonus;
  const initiative=10+a.initiativePoints+a.initiativeBonus;
  const effectiveInitiative=initiative-a.armorInitiativePenalty;
  const toughness=Math.floor(a.toughnessPoints/2)+a.toughnessBonus;
  const deathThreshold=20+2*a.deathThresholdPoints+a.deathThresholdBonus;
  const lethality=Math.ceil(deathThreshold/3)+a.lethalityBonus;
  const availableResolve=Math.max(0,maxResolve-a.spentResolve-a.fatigue);
  return {
    pointsUsed,pointsRemaining:5-pointsUsed,
    maxResolve,initiative,effectiveInitiative,toughness,deathThreshold,lethality,
    availableResolve
  };
}

export function allocatePoint(a:SheetAttributes,key:AllocationKey,value:number):SheetAttributes {
  if(!Number.isInteger(value)||value<0||value>5)throw new RangeError('Attribute points must be 0 to 5');
  const used=ALLOCATION_KEYS.reduce((total,field)=>total+(field===key?value:a[field]),0);
  if(used>5)throw new RangeError('Only five starting Attribute points are available');
  return {...a,[key]:value};
}

export function derivedSkill(skill:Skill) {
  const modifier=skill.modifier??0;
  const expertiseLevel=skill.expertiseLevel??1;
  return {score:Math.floor(skill.rating/10),modifier,expertiseLevel,
    target:skill.rating+modifier,canRoll:skill.rating+modifier>=0&&skill.rating+modifier<=100};
}

export function rollSheetSkill(skill:Skill,roll:number):{check:AppliedCheck;entry:RollEntry}{
  const d=derivedSkill(skill);
  const check=skillTest({rating:skill.rating,modifier:d.modifier,roll,expertise:d.expertiseLevel});
  const label=skill.name.trim()||'Unnamed skill';
  const message=label+' — d100 '+roll+' vs '+check.target+' ('+skill.rating+
    (d.modifier>=0?'+':'')+d.modifier+')'+
    (check.success?' · success':' · failure')+
    (check.critical?' · critical':'')+
    ' · '+check.levels+' SL'+
    (d.expertiseLevel>1?' · Ex'+d.expertiseLevel:'');
  return {check,entry:{label,message,sourcePage:23,roll,check}};
}

export function updateSheetSupply(supplies:SheetSupplies,key:keyof SheetSupplies,next:SupplyDieSize|null):SheetSupplies {
  if(next!==null&&![0,6,8,10,12].includes(next))throw new RangeError('Invalid Supply Die');
  return {...supplies,[key]:next};
}

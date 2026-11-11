import type {SheetAttributes,SheetSupplies} from './types.ts';

export const DEFAULT_ATTRIBUTES:SheetAttributes={
  resolvePoints:0,initiativePoints:0,toughnessPoints:0,deathThresholdPoints:0,
  resolveBonus:0,initiativeBonus:0,toughnessBonus:0,deathThresholdBonus:0,
  lethalityBonus:0,armorInitiativePenalty:0,spentResolve:0,fatigue:0
};
export const DEFAULT_SUPPLIES:SheetSupplies={gear:null,ammo:null,medical:null,rations:null};
export const ALLOCATION_KEYS=['resolvePoints','initiativePoints','toughnessPoints','deathThresholdPoints'] as const;

export function isSheetAttributes(value:unknown):value is SheetAttributes {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const a=value as Record<string,unknown>;
  const bounded=(name:string,lo:number,hi:number)=>
    Number.isInteger(a[name])&&(a[name] as number)>=lo&&(a[name] as number)<=hi;
  if(!ALLOCATION_KEYS.every(key=>bounded(key,0,5)))return false;
  if(ALLOCATION_KEYS.reduce((total,key)=>total+(a[key] as number),0)>5)return false;
  if(!['resolveBonus','initiativeBonus','toughnessBonus','deathThresholdBonus'].every(key=>bounded(key,-50,100)))return false;
  if(!bounded('lethalityBonus',0,30)||!bounded('armorInitiativePenalty',0,100)||
     !bounded('spentResolve',0,200)||!bounded('fatigue',0,200))return false;
  const max=10+2*(a.resolvePoints as number)+(a.resolveBonus as number);
  const death=20+2*(a.deathThresholdPoints as number)+(a.deathThresholdBonus as number);
  return max>=1&&death>=1;
}
export function isSheetSupplies(value:unknown):value is SheetSupplies {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const supplies=value as Record<string,unknown>;
  return (['gear','ammo','medical','rations'] as const).every(key=>
    supplies[key]===null||[0,6,8,10,12].includes(supplies[key] as number));
}

import type {BodyLocation,TbeSheetData} from './tbeSheetData.ts';

/** Source PDF p.176: the attacker's ones die gives the general location,
 * the defender's ones die gives the detailed location. When no defender
 * roll exists, use a separate d10 in place of the second input.
 * This lookup does not calculate damage, armor, or injury effects.
 */
export type HitLocation={
  location:BodyLocation;
  label:string;
  detail:string;
  attackerOnes:number;
  defenderOnes:number;
};
const ones=(roll:number):number=>{
  if(!Number.isInteger(roll)||roll<1||roll>100)
    throw new RangeError('Use a d100 result from 1 to 100, or a d10 result from 1 to 10');
  return roll%10;
};
function detail(location:BodyLocation,d:number):string{
  switch(location){
    case 'body':return d===0||d===9?'Groin':d<=5?'Chest':'Stomach';
    case 'head':return d===0?'Neck':d<=2?'Skull':d<=4?(d%2===0?'Right eye':'Left eye'):
      d<=6?'Face':d===7?'Nose':d%2===0?'Right ear':'Left ear';
    case 'rightArm':case 'leftArm':
      return d===0||d===9?'Hand':d<=2?'Shoulder':d<=4?'Bicep':d===5?'Elbow':'Forearm';
    case 'rightLeg':case 'leftLeg':
      return d===0?'Foot':d<=2?'Hip':d<=6?'Thigh':d===7?'Knee':'Shin';
  }
}
const labels:Record<BodyLocation,string>={
  body:'Body',head:'Head',rightArm:'Right arm',leftArm:'Left arm',
  rightLeg:'Right leg',leftLeg:'Left leg'
};
export function locateHit(attackerRoll:number,defenderRoll:number):HitLocation{
  const a=ones(attackerRoll),d=ones(defenderRoll);
  const location:BodyLocation=a===0?'head':a<=5?'body':a===6?'rightArm':
    a===7?'leftArm':a===8?'rightLeg':'leftLeg';
  return {
    location,label:labels[location],attackerOnes:a,defenderOnes:d,
    detail:detail(location,d)
  };
}

/** Add only manually adjudicated WP; never overwrite a nonempty wound slot. */
export function recordWound(
  sheet:TbeSheetData,hit:HitLocation,wp:number,injury:string,nonlethal:boolean
):TbeSheetData{
  if(!Number.isInteger(wp)||wp<1||wp>999)throw new RangeError('Wound Points must be an integer from 1 to 999');
  if(injury.length>1100)throw new RangeError('Injury description is too long');
  const existing=sheet.locations[hit.location];
  const index=existing.wounds.findIndex(w=>!w.wp.trim()&&!w.description.trim()&&
    !w.infection&&!w.nonlethal&&!w.recoveryBonus.trim());
  if(index<0)throw new RangeError('All five wound slots at '+hit.label+' are occupied');
  const text=[hit.detail,injury.trim()].filter(Boolean).join(' — ');
  return {
    ...sheet,
    locations:{
      ...sheet.locations,
      [hit.location]:{
        ...existing,
        wounds:existing.wounds.map((w,i)=>i===index?
          {...w,wp:String(wp),description:text,nonlethal}:w)
      }
    }
  };
}

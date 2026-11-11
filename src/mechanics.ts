import {resolveCheck} from './engine.ts';
import type {Check} from './types.ts';

/** Verified numerical mechanics, implemented independently from the source text.
 * PDF page positions are 1-based viewer pages in the user's personal rulebook.
 * Cases with an adjusted target above 100 are intentionally not automated.
 */
export const MECHANICS=[
  {id:'skill',title:'Percentile skill test',page:23,inputs:['skill','modifier','roll'],status:'tested'},
  {id:'opposed',title:'Opposed skills and tie-breaks',page:24,inputs:['two adjusted skills','two d100 rolls'],status:'tested'},
  {id:'degree',title:'Degree of Success',page:25,inputs:['successful rolls','SLs'],status:'tested'},
  {id:'extended',title:'Extended project progress',page:26,inputs:['accumulated SLs','roll','helpers'],status:'tested'},
  {id:'timer',title:'Escalating Timer Die',page:29,inputs:['interval','die faces','die result'],status:'tested'},
  {id:'support',title:'Supporting skill Score',page:41,inputs:['supporting skill'],status:'tested'},
  {id:'expertise',title:'Expertise minimum SLs',page:58,inputs:['skill check','Expertise'],status:'tested'},
  {id:'supply',title:'Supply Die depletion',page:132,inputs:['supply die','die roll'],status:'tested'}
] as const;

function integer(value:number,name:string,min:number,max:number){
  if(!Number.isInteger(value)||value<min||value>max)throw new RangeError(name+' must be '+min+'–'+max);
}
export type SkillRoll={rating:number;modifier:number;roll:number;expertise?:1|2|3|4};
export type AppliedCheck=Check&{rating:number;modifier:number;expertise:number};
export function skillTest(input:SkillRoll):AppliedCheck{
  integer(input.rating,'Skill',0,100);
  integer(input.modifier,'Modifier',-100,100);
  const target=input.rating+input.modifier;
  if(target<0||target>100)throw new RangeError('Adjusted skill exceeds the validated 0–100 range; consult the rulebook for exceptional high skills');
  const expertise=input.expertise??1;
  integer(expertise,'Expertise',1,4);
  const check=resolveCheck(input.roll,target);
  return {...check,rating:input.rating,modifier:input.modifier,expertise,
    levels:check.success?Math.max(expertise,check.levels):0};
}

export type OpposedResult={
  winner:'left'|'right'|'none';
  left:AppliedCheck;right:AppliedCheck;
  degree:number;
  reason:'only success'|'success levels'|'critical'|'roll'|'adjusted skill'|'both failed'|'tie';
};
export function opposedTest(leftInput:SkillRoll,rightInput:SkillRoll):OpposedResult{
  const left=skillTest(leftInput),right=skillTest(rightInput);
  let winner:OpposedResult['winner']='none';
  let reason:OpposedResult['reason']='tie';
  if(left.success!==right.success){winner=left.success?'left':'right';reason='only success';}
  else if(!left.success)reason='both failed';
  else if(left.levels!==right.levels){winner=left.levels>right.levels?'left':'right';reason='success levels';}
  else if(left.critical!==right.critical){winner=left.critical?'left':'right';reason='critical';}
  else if(left.roll!==right.roll){winner=left.roll>right.roll?'left':'right';reason='roll';}
  else if(left.target!==right.target){winner=left.target>right.target?'left':'right';reason='adjusted skill';}
  const degree=winner==='none'?0:Math.max(0,(winner==='left'?left.levels:right.levels)-(winner==='left'?right.levels:left.levels));
  return {winner,left,right,degree,reason};
}

export function supportBonus(skillRating:number):number{
  integer(skillRating,'Supporting skill',0,100);
  return 2*Math.floor(skillRating/10);
}

export function extendedProgress(current:number,goal:number,check:Check,helpers=0):{
  progress:number;complete:boolean;delta:number;setback:boolean
}{
  integer(current,'Current SL',0,100000);
  integer(goal,'Goal SL',1,100000);
  integer(helpers,'Successful helpers',0,2);
  const progress=check.critical&&!check.success
    ?Math.ceil(current/2)
    :Math.min(100000,current+(check.success?check.levels+helpers:0));
  return {progress,complete:progress>=goal,delta:progress-current,setback:check.critical&&!check.success};
}

export type SupplySize=0|6|8|10|12;
export function useSupplyDie(size:SupplySize,roll:number):{next:SupplySize;depleted:boolean;stepped:boolean}{
  if(!([0,6,8,10,12] as number[]).includes(size))throw new RangeError('Supply die must be d12, d10, d8, d6 or empty');
  if(size===0)throw new RangeError('Cannot use depleted supply');
  integer(roll,'Supply die result',1,size);
  const next:SupplySize=roll>2?size:size===12?10:size===10?8:size===8?6:0;
  return {next,depleted:next===0,stepped:next!==size};
}
export function timerTriggered(interval:number,faces:4|6|8|10|12|20,roll:number):boolean{
  integer(interval,'Interval',1,100000);
  if(!([4,6,8,10,12,20] as number[]).includes(faces))throw new RangeError('Unsupported Timer Die');
  integer(roll,'Timer result',1,faces);
  return roll<=interval;
}

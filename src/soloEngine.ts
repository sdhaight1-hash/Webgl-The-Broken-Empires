import {freshId} from './engine.ts';

export type SoloLogKind='scene'|'oracle'|'event'|'check'|'opposed'|'journal'|'npc'|'board';
export type SoloLog={
  id:string; sceneId:string|null; kind:SoloLogKind; message:string;
  roll?:number; sourcePage?:number; createdAt:string
};
export type SoloScene={
  id:string;title:string;location:string;expected:string;
  status:'active'|'closed'; outcome:string;createdAt:string;closedAt:string|null
};
export type SoloNPC={
  id:string;name:string;role:string;disposition:string;details:string;tags:string
};
export type SoloThread={id:string;title:string;done:boolean};
export type SoloZone={id:string;label:string};
export type SoloToken={
  id:string;sceneId:string;name:string;kind:'hero'|'npc'|'other';npcId:string|null;zoneId:string
};
export type SoloCampaign={
  version:1;id:string;title:string;characterId:string;premise:string;
  createdAt:string;updatedAt:string;
  scenes:SoloScene[];activeSceneId:string|null;npcs:SoloNPC[];
  threads:SoloThread[];zones:SoloZone[];tokens:SoloToken[];journal:SoloLog[]
};
export type OracleOutcome='extreme-yes'|'yes'|'no'|'extreme-no';
export type OracleRoll={
  roll:number;yesChance:number;outcome:OracleOutcome;event:boolean;
  mode:'custom'|'table';
};
export const SOLO_STORAGE_KEY='wayfarers-ledger-solo-v1';
export const SOLO_SOURCE={
  overview:486,oracle:490,randomizers:492,sceneStart:493,events:491,npcs:495
} as const;

const now=()=>new Date().toISOString();
export function makeSoloCampaign(characterId:string):SoloCampaign{
  const created=now();
  return {
    version:1,id:freshId(),title:'New solo campaign',characterId,premise:'',
    createdAt:created,updatedAt:created,scenes:[],activeSceneId:null,
    npcs:[],threads:[],zones:['Zone A','Zone B','Zone C','Zone D'].map(label=>({id:freshId(),label})),
    tokens:[],journal:[]
  };
}
export function makeSoloLog(kind:SoloLogKind,message:string,sceneId:string|null,sourcePage?:number,roll?:number):SoloLog{
  return {id:freshId(),kind,message,sceneId,createdAt:now(),...(sourcePage!==undefined?{sourcePage}:{}),...(roll!==undefined?{roll}:{})};
}
export function addSoloLog(campaign:SoloCampaign,entry:SoloLog):SoloCampaign{
  return {...campaign,journal:[...campaign.journal,entry].slice(-1000),updatedAt:now()};
}
export function beginSoloScene(campaign:SoloCampaign,title:string,location:string,expected:string):SoloCampaign{
  const name=title.trim();
  if(!name||name.length>120)throw new RangeError('Scene title must contain 1–120 characters');
  if(campaign.scenes.length>=100)throw new RangeError('Maximum 100 scenes per campaign');
  const created=now(),scene:SoloScene={id:freshId(),title:name,location:location.trim().slice(0,180),
    expected:expected.trim().slice(0,1200),status:'active',outcome:'',createdAt:created,closedAt:null};
  const scenes=campaign.scenes.map(s=>s.status==='active'?{...s,status:'closed' as const,closedAt:created}:s);
  const next={...campaign,scenes:[...scenes,scene],activeSceneId:scene.id,updatedAt:created};
  return addSoloLog(next,makeSoloLog('scene','Scene opened: '+name,scene.id,SOLO_SOURCE.sceneStart));
}
export function closeSoloScene(campaign:SoloCampaign,outcome:string):SoloCampaign{
  const id=campaign.activeSceneId;
  if(!id)throw new Error('No active scene');
  const closed=now();
  const scenes=campaign.scenes.map(s=>s.id===id?{...s,status:'closed' as const,outcome:outcome.slice(0,3000),closedAt:closed}:s);
  return addSoloLog({...campaign,scenes,activeSceneId:null,updatedAt:closed},
    makeSoloLog('scene','Scene closed: '+(scenes.find(s=>s.id===id)?.title||'Scene')+(outcome.trim()?'. '+outcome.trim().slice(0,300):''),id,SOLO_SOURCE.sceneStart));
}
export function moveSoloToken(campaign:SoloCampaign,tokenId:string,zoneId:string):SoloCampaign{
  if(!campaign.zones.some(z=>z.id===zoneId))throw new RangeError('Unknown destination zone');
  if(!campaign.tokens.some(t=>t.id===tokenId))throw new RangeError('Unknown token');
  return {...campaign,tokens:campaign.tokens.map(t=>t.id===tokenId?{...t,zoneId}:t),updatedAt:now()};
}

/** This is an explicitly CUSTOM convenience oracle, not a transcription of
 * Ask the Weave. Official odds and extreme thresholds require verification
 * against the owner's purchased table before claiming rules-accurate automation.
 */
export function customOracle(roll:number,yesChance:number,extremeBand=10):OracleRoll{
  if(!Number.isInteger(roll)||roll<1||roll>100)throw new RangeError('Oracle roll must be 1–100');
  if(!Number.isInteger(yesChance)||yesChance<1||yesChance>99)throw new RangeError('Yes chance must be 1–99');
  if(!Number.isInteger(extremeBand)||extremeBand<1||extremeBand>20)throw new RangeError('Extreme band must be 1–20');
  const yes=roll<=yesChance;
  const outcome:OracleOutcome=yes
    ?(roll<=Math.min(extremeBand,yesChance)?'extreme-yes':'yes')
    :(roll>Math.max(yesChance,100-extremeBand)?'extreme-no':'no');
  const event=roll===100||roll%11===0;
  return {roll,yesChance,outcome,event,mode:'custom'};
}
export function manualOracle(roll:number,outcome:OracleOutcome):OracleRoll{
  if(!Number.isInteger(roll)||roll<1||roll>100)throw new RangeError('Oracle roll must be 1–100');
  if(!(['extreme-yes','yes','no','extreme-no'] as string[]).includes(outcome))throw new RangeError('Invalid oracle interpretation');
  return {roll,yesChance:0,outcome,event:roll===100||roll%11===0,mode:'table'};
}
export function isSoloCampaign(value:unknown):value is SoloCampaign{
  if(!value||typeof value!=='object')return false;
  const c=value as Partial<SoloCampaign>;
  const str=(v:unknown,max=5000)=>typeof v==='string'&&v.length<=max;
  const rec=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
  if(c.version!==1||!str(c.id,150)||!str(c.title,120)||!str(c.characterId,150)||!str(c.premise)||
    !str(c.createdAt,50)||!str(c.updatedAt,50)||!(c.activeSceneId===null||str(c.activeSceneId,150)))return false;
  if(!Array.isArray(c.scenes)||c.scenes.length>100||!c.scenes.every(s=>rec(s)&&str(s.id,150)&&str(s.title,120)&&
    str(s.location,180)&&str(s.expected,1200)&&str(s.outcome,3000)&&str(s.createdAt,50)&&
    (s.closedAt===null||str(s.closedAt,50))&&(s.status==='active'||s.status==='closed')))return false;
  if(!Array.isArray(c.npcs)||c.npcs.length>100||!c.npcs.every(n=>rec(n)&&str(n.id,150)&&str(n.name,150)&&str(n.role,200)&&str(n.disposition,200)&&str(n.details,4000)&&str(n.tags,1000)))return false;
  if(!Array.isArray(c.threads)||c.threads.length>150||!c.threads.every(t=>rec(t)&&str(t.id,150)&&str(t.title,400)&&typeof t.done==='boolean'))return false;
  if(!Array.isArray(c.zones)||c.zones.length>20||!c.zones.every(z=>rec(z)&&str(z.id,150)&&str(z.label,150)))return false;
  if(!Array.isArray(c.tokens)||c.tokens.length>100||!c.tokens.every(t=>rec(t)&&str(t.id,150)&&str(t.sceneId,150)&&str(t.name,150)&&
    (t.kind==='hero'||t.kind==='npc'||t.kind==='other')&&(t.npcId===null||str(t.npcId,150))&&str(t.zoneId,150)))return false;
  if(!Array.isArray(c.journal)||c.journal.length>1000||!c.journal.every(e=>rec(e)&&str(e.id,150)&&str(e.message,4500)&&
    (e.sceneId===null||str(e.sceneId,150))&&str(e.createdAt,50)&&
    ['scene','oracle','event','check','opposed','journal','npc','board'].includes(String(e.kind))&&
    (e.sourcePage===undefined||(Number.isInteger(e.sourcePage)&&e.sourcePage>=1&&e.sourcePage<=663))&&
    (e.roll===undefined||(Number.isInteger(e.roll)&&e.roll>=1&&e.roll<=100))))return false;
  return true;
}
export function readSoloCampaigns(raw:string|null):SoloCampaign[]{
  if(!raw)return [];
  try{
    const c:unknown=JSON.parse(raw);
    return Array.isArray(c)?c.filter(isSoloCampaign).slice(0,30):[];
  }catch{return []}
}

/** Sheet rolls can be logged while the solo view is unmounted. Only a campaign
 * belonging to the selected character is eligible; the caller persists the
 * returned JSON. No campaign is implicitly created or overwritten.
 */
export function appendCharacterSheetLog(
  raw:string|null,activeCampaignId:string,characterId:string,
  entry:{message:string;sourcePage:number;roll?:number}
):string|null{
  if(!entry.message.trim()||entry.message.length>4200||
    !Number.isInteger(entry.sourcePage)||entry.sourcePage<1||entry.sourcePage>663||
    (entry.roll!==undefined&&(!Number.isInteger(entry.roll)||entry.roll<1||entry.roll>100))){
    throw new RangeError('Invalid sheet roll journal entry');
  }
  const campaigns=readSoloCampaigns(raw);
  const chosen=campaigns.find(c=>c.id===activeCampaignId&&c.characterId===characterId)
    ??campaigns.find(c=>c.characterId===characterId);
  if(!chosen)return null;
  return JSON.stringify(campaigns.map(c=>c.id===chosen.id
    ?addSoloLog(c,makeSoloLog('check',entry.message,c.activeSceneId,entry.sourcePage,entry.roll))
    :c));
}

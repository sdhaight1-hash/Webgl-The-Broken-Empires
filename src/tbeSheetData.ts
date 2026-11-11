import type {Character} from './types.ts';

/** Structural transcription of the user's two-page fillable character sheet.
 * Freeform source fields remain freeform; this file does not adjudicate injury,
 * armor, weapon or spell rules that have not been independently verified.
 */
export const SKILL_COLUMNS=[
  {id:'combat',title:'Combat',skills:['Dodge','Melee: Light','Melee: Medium','Melee: Heavy','Might','Missile','Thrown']},
  {id:'adventuring',title:'Adventuring',skills:['Athletics','Endurance','Locks & Traps','Perception','Ride','Sail/Boat','Sleight of Hand','Stealth','Survival','Track','Willpower']},
  {id:'social',title:'Social',skills:['Deceive','Insight','Inspire','Intimidate','Perform','Persuade','Protocol','Seduce','Wit']},
  {id:'lore',title:'Lore',skills:['Ancient Lore','Arcana','Commerce','Common Lore','Craft: Pract.','Craft: Art','Divinity','Heal','Naturewise','Streetwise','—wise 1']},
  {id:'binds',title:'Binds',skills:['Change','Conjure','Control','Destroy','Witness','Language 1','Language 2','Language 3','—wise 2','—wise 3']}
] as const;
export const STRAND_NAMES=['Air','Beast','Body','Earth','Fire','Plant','Spheres','Spirit','Thought','Water'] as const;
export type Strand=typeof STRAND_NAMES[number];
export const BODY_LOCATIONS=[
  {id:'body',title:'Body',die:'1–5'},
  {id:'head',title:'Head',die:'0'},
  {id:'rightArm',title:'Right arm',die:'6'},
  {id:'leftArm',title:'Left arm',die:'7'},
  {id:'rightLeg',title:'Right leg',die:'8'},
  {id:'leftLeg',title:'Left leg',die:'9'}
] as const;
export type BodyLocation=typeof BODY_LOCATIONS[number]['id'];
export const LOCATION_DETAIL={
  body:'1–5 chest; 6–8 stomach; 9–0 groin',
  head:'1–2 skull; 3 left eye; 4 right eye; 5–6 face; 7 nose; 8 right ear; 9 left ear; 0 neck',
  rightArm:'1–2 shoulder; 3–4 bicep; 5 elbow; 6–8 forearm; 9–0 hand',
  leftArm:'1–2 shoulder; 3–4 bicep; 5 elbow; 6–8 forearm; 9–0 hand',
  rightLeg:'1–2 hip; 3–6 thigh; 7 knee; 8–9 shin; 0 foot',
  leftLeg:'1–2 hip; 3–6 thigh; 7 knee; 8–9 shin; 0 foot'
} satisfies Record<BodyLocation,string>;

export type WoundRow={wp:string;nonlethal:boolean;description:string;infection:boolean;recoveryBonus:string};
export type LocationState={
  armor:string;toughened:boolean;ap:string;sundered:boolean;bulk:string;impaired:boolean;
  wounds:WoundRow[]
};
export type WeaponRow={
  id:string;name:string;attack:string;parry:string;reach:string;damage:string;
  cl:string;cs:string;dis:string;t:string;enc:string;range:string;notes:string
};
export type GoalRow={text:string;shared:boolean};
export type InventoryRow={id:string;item:string;enc:string};
export interface TbeSheetData {
  sex:string;age:string;size:string;xp:string;
  abilityDescriptors:string[];personalityTraits:string[];
  strands:Record<Strand,string>;startingPiety:string;
  totalLethalWp:string;baseRecovery:string;shock:boolean;roundsDying:string;
  locations:Record<BodyLocation,LocationState>;
  armorPenalties:Record<'athletics'|'riseFromProne'|'stealth'|'dodge'|'perception',string>;
  shield:{size:string;ap:string;shieldBonus:string;enc:string;split:boolean};
  weapons:WeaponRow[];
  goals:GoalRow[];lifeEvents:{origin:string;youth:string;recent:string};
  silverPieces:string;maxEnc:string;
  inventory:InventoryRow[];relationshipNpcs:string;threads:string;fraying:string;
}
const blankWound=():WoundRow=>({wp:'',nonlethal:false,description:'',infection:false,recoveryBonus:''});
const blankLocation=():LocationState=>({armor:'',toughened:false,ap:'',sundered:false,bulk:'',impaired:false,
  wounds:Array.from({length:5},blankWound)});
export const blankWeapon=(id:string):WeaponRow=>({
  id,name:'',attack:'',parry:'',reach:'',damage:'',cl:'',cs:'',dis:'',t:'',enc:'',range:'',notes:''
});
export const blankInventory=(id:string):InventoryRow=>({id,item:'',enc:''});
export function makeTbeSheet():TbeSheetData {
  return {
    sex:'',age:'',size:'',xp:'',abilityDescriptors:['','',''],personalityTraits:['','',''],
    strands:Object.fromEntries(STRAND_NAMES.map(name=>[name,''])) as Record<Strand,string>,
    startingPiety:'',totalLethalWp:'',baseRecovery:'',shock:false,roundsDying:'',
    locations:Object.fromEntries(BODY_LOCATIONS.map(({id})=>[id,blankLocation()])) as Record<BodyLocation,LocationState>,
    armorPenalties:{athletics:'',riseFromProne:'',stealth:'',dodge:'',perception:''},
    shield:{size:'',ap:'',shieldBonus:'',enc:'',split:false},
    weapons:Array.from({length:4},(_,i)=>blankWeapon('weapon-'+(i+1))),
    goals:Array.from({length:6},()=>({text:'',shared:false})),
    lifeEvents:{origin:'',youth:'',recent:''},silverPieces:'',maxEnc:'',
    inventory:Array.from({length:10},(_,i)=>blankInventory('inventory-'+(i+1))),
    relationshipNpcs:'',threads:'',fraying:''
  };
}
export function readTbeSheet(character:Character):TbeSheetData {
  // No migration changes existing characters. Legacy freeform goal/XP/history
  // are shown through their existing fields by the UI, not deleted or replaced.
  return character.tbeSheet??makeTbeSheet();
}
const object=(value:unknown):value is Record<string,unknown>=>
  !!value&&typeof value==='object'&&!Array.isArray(value);
const txt=(value:unknown,max=2400):value is string=>typeof value==='string'&&value.length<=max;
const textArray=(value:unknown,count:number)=>
  Array.isArray(value)&&value.length===count&&value.every((x:unknown)=>txt(x,300));
const wound=(w:unknown)=>object(w)&&txt(w.wp,20)&&typeof w.nonlethal==='boolean'&&
  txt(w.description,1200)&&typeof w.infection==='boolean'&&txt(w.recoveryBonus,30);
const location=(l:unknown)=>object(l)&&txt(l.armor,300)&&typeof l.toughened==='boolean'&&
  txt(l.ap,20)&&typeof l.sundered==='boolean'&&txt(l.bulk,20)&&typeof l.impaired==='boolean'&&
  Array.isArray(l.wounds)&&l.wounds.length===5&&l.wounds.every(wound);
const weapon=(w:unknown)=>object(w)&&txt(w.id,90)&&
  ['name','attack','parry','reach','damage','cl','cs','dis','t','enc','range','notes']
    .every(k=>txt(w[k],k==='notes'?1200:240));
const inventory=(x:unknown)=>object(x)&&txt(x.id,90)&&txt(x.item,500)&&txt(x.enc,30);
export function isTbeSheet(value:unknown):value is TbeSheetData{
  if(!object(value))return false;
  if(!['sex','age','size','xp','startingPiety','totalLethalWp','baseRecovery','roundsDying',
    'silverPieces','maxEnc','fraying'].every(k=>txt(value[k]))&&
    txt(value.relationshipNpcs,4000)&&txt(value.threads,4000))return false;
  if(!textArray(value.abilityDescriptors,3)||!textArray(value.personalityTraits,3))return false;
  if(!object(value.strands)||!STRAND_NAMES.every(k=>txt((value.strands as Record<string,unknown>)[k],25)))return false;
  if(typeof value.shock!=='boolean'||!object(value.locations)||!BODY_LOCATIONS.every(({id})=>location((value.locations as Record<string,unknown>)[id])))return false;
  if(!object(value.armorPenalties)||!['athletics','riseFromProne','stealth','dodge','perception']
    .every(k=>txt((value.armorPenalties as Record<string,unknown>)[k],25)))return false;
  if(!object(value.shield)||!['size','ap','shieldBonus','enc'].every(k=>txt((value.shield as Record<string,unknown>)[k],300))||
    typeof value.shield.split!=='boolean')return false;
  if(!Array.isArray(value.weapons)||value.weapons.length>30||!value.weapons.every(weapon))return false;
  if(!Array.isArray(value.inventory)||value.inventory.length>100||!value.inventory.every(inventory))return false;
  if(!Array.isArray(value.goals)||value.goals.length!==6||!value.goals.every((g:unknown)=>
    object(g)&&txt(g.text,400)&&typeof g.shared==='boolean'))return false;
  if(!object(value.lifeEvents)||!['origin','youth','recent'].every(k=>txt((value.lifeEvents as Record<string,unknown>)[k],4000)))return false;
  return true;
}
export function enteredInventoryEnc(sheet:TbeSheetData):number|null{
  const filled=sheet.inventory.filter(i=>i.item.trim());
  if(filled.some(i=>i.enc.trim()&&!/^\d+(?:\.\d+)?$/.test(i.enc.trim())))return null;
  return filled.reduce((sum,i)=>sum+(Number(i.enc)||0),0);
}
export function enteredLethalWp(sheet:TbeSheetData):number|null{
  const rows=BODY_LOCATIONS.flatMap(({id})=>sheet.locations[id].wounds)
    .filter(w=>w.description.trim()||w.wp.trim()).filter(w=>!w.nonlethal);
  if(rows.some(w=>w.wp.trim()&&!/^\d+(?:\.\d+)?$/.test(w.wp.trim())))return null;
  return rows.reduce((sum,w)=>sum+(Number(w.wp)||0),0);
}

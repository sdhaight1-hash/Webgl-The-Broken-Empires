import {useState} from 'react';
import {BookOpen,ChevronDown,Dices,FileText,HeartPulse,Minus,Plus,ScrollText,Swords,Trash2} from 'lucide-react';
import type {Character,Skill,SupplyCategory,SupplyDieSize} from './types.ts';
import {freshId,rollPercentile} from './engine.ts';
import {allocatePoint,deriveAttributes,derivedSkill,rollSheetSkill,sheetAttributes,sheetSupplies,updateSheetSupply} from './characterSheetModel.ts';
import type {RollEntry} from './characterSheetModel.ts';
import {isSheetAttributes} from './characterSheetState.ts';
import {useSupplyDie} from './mechanics.ts';
import {InteractiveCharacterControls} from './InteractiveCharacterControls.tsx';
import {TalentPicker} from './TalentPicker.tsx';
import {PREVIOUS_CAREERS,WEAPON_NAMES} from './talentCatalog.ts';
import {HERITAGES} from './rules.ts';
import {
  BODY_LOCATIONS,LOCATION_DETAIL,SKILL_COLUMNS,STRAND_NAMES,
  blankInventory,blankWeapon,enteredInventoryEnc,enteredLethalWp,readTbeSheet
} from './tbeSheetData.ts';
import type {BodyLocation,TbeSheetData,LocationState,WoundRow,WeaponRow,InventoryRow,Strand} from './tbeSheetData.ts';
import './tbeCharacterSheet.css';

type View='front'|'back'|'mechanics';
type Props={
  character:Character;
  onUpdate:(changes:Partial<Character>)=>void;
  onRecord:(entry:RollEntry)=>void;
  onOpenRule:(page:number)=>void;
};
type RecordType='talents'|'expertise'|'wounds'|'equipment'|'events';
const title=(value:string)=>value.trim()||'Unnamed wanderer';
const norm=(value:string)=>value.toLocaleLowerCase().replace(/[^a-z0-9]/g,'');
const officialNames=new Set(SKILL_COLUMNS.flatMap(c=>[...c.skills]).map(norm));
const supplies:Record<SupplyCategory,string>={gear:'Gear',ammo:'Ammo',rations:'Rations',medical:'Medical'};
const hitList=(key:BodyLocation)=>LOCATION_DETAIL[key].split('; ');
const attackColumns=[
  ['attack','ATT'],['parry','PRY'],['reach','RCH'],['damage','DMG'],
  ['cl','CL'],['cs','CS'],['dis','DIS'],['t','T'],['enc','ENC'],['range','RNG']
] as const;

function rollDie(faces:number){
  const buffer=new Uint16Array(1),limit=65536-(65536%faces);
  do{crypto.getRandomValues(buffer);}while(buffer[0]>=limit);
  return buffer[0]%faces+1;
}

export function TbeCharacterSheet({character,onUpdate,onRecord,onOpenRule}:Props){
  const [view,setView]=useState<View>('front');
  const [lastRoll,setLastRoll]=useState<RollEntry|null>(null);
  const [rolls,setRolls]=useState<RollEntry[]>([]);
  const [favor,setFavor]=useState(0);
  const [notice,setNotice]=useState('');
  const [newSkill,setNewSkill]=useState('');
  const sheet=readTbeSheet(character);
  const stats=deriveAttributes(character);
  const a=sheetAttributes(character);
  const res=sheetSupplies(character);
  const save=(changes:Partial<TbeSheetData>)=>onUpdate({tbeSheet:{...sheet,...changes}});
  const setError=(e:unknown)=>setNotice(e instanceof Error?e.message:'Unable to update the sheet.');
  const log=(entry:RollEntry)=>{setLastRoll(entry);setRolls(items=>[entry,...items].slice(0,12));setNotice('');onRecord(entry);};
  const patchAttr=(key:keyof typeof a,value:number)=>{
    const next={...a,[key]:value};
    if(!isSheetAttributes(next)){setNotice('Invalid value or Attribute allocation');return;}
    onUpdate({attributes:next});setNotice('');
  };
  const spendResolve=(delta:number)=>{
    const spent=Math.max(0,Math.min(200,a.spentResolve+delta));
    patchAttr('spentResolve',spent);
  };
  const setLocation=(id:BodyLocation,changes:Partial<LocationState>)=>
    save({locations:{...sheet.locations,[id]:{...sheet.locations[id],...changes}}});
  const setWound=(id:BodyLocation,index:number,changes:Partial<WoundRow>)=>
    setLocation(id,{wounds:sheet.locations[id].wounds.map((w,i)=>i===index?{...w,...changes}:w)});
  const changeWeapon=(index:number,key:keyof WeaponRow,value:string)=>
    save({weapons:sheet.weapons.map((w,i)=>i===index?{...w,[key]:value}:w)});
  const changeInventory=(index:number,key:keyof InventoryRow,value:string)=>
    save({inventory:sheet.inventory.map((row,i)=>i===index?{...row,[key]:value}:row)});
  const changeRecord=(key:RecordType,index:number,value:string)=>
    onUpdate({[key]:character[key].map((row,i)=>i===index?{...row,text:value}:row)} as Partial<Character>);
  const addRecord=(key:RecordType)=>onUpdate({[key]:[...character[key],{id:freshId(),text:''}]} as Partial<Character>);
  const removeRecord=(key:RecordType,index:number)=>
    onUpdate({[key]:character[key].filter((_,i)=>i!==index)} as Partial<Character>);
  const findSkill=(name:string)=>character.skills.find(s=>norm(s.name)===norm(name));
  const patchSkill=(name:string,changes:Partial<Skill>)=>{
    const existing=findSkill(name);
    const skills=existing?character.skills.map(s=>s.id===existing.id?{...s,...changes}:s):
      [...character.skills,{id:freshId(),name,rating:0,note:'',...changes}];
    onUpdate({skills});
  };
  const performSkill=(name:string)=>{
    const skill=findSkill(name);
    if(!skill){setNotice('Enter a rating for '+name+' before rolling.');return;}
    try{
      if(favor>stats.availableResolve)throw new RangeError('Not enough available Resolve for Favor');
      const {entry}=rollSheetSkill(skill,rollPercentile(),favor);
      if(favor){onUpdate({attributes:{...a,spentResolve:a.spentResolve+favor}});setFavor(0);}
      log(entry);
    }catch(e){setError(e);}
  };
  const doInitiative=()=>{
    const die=rollDie(10);
    log({label:'Initiative',message:'Initiative: d10 '+die+' + '+stats.effectiveInitiative+
      ' = '+(die+stats.effectiveInitiative),roll:die,sourcePage:152});
  };
  const doSupply=(kind:SupplyCategory)=>{
    const faces=res[kind];
    if(faces===null||faces===0){setNotice('Set an available '+kind+' Supply Die first.');return;}
    const die=rollDie(faces);
    const result=useSupplyDie(faces,die);
    onUpdate({supplies:updateSheetSupply(res,kind,result.next)});
    log({label:kind+' supply',message:kind+' supply: d'+faces+' → '+die+
      ' ('+(result.depleted?'depleted':result.stepped?'now d'+result.next:'unchanged')+')',sourcePage:132,roll:die});
  };
  const field=(label:string,value:string,onChange:(value:string)=>void,opts?:{short?:boolean;placeholder?:string;list?:string})=>
    <label className={'tbe-field'+(opts?.short?' tbe-small-field':'')}>
      <span>{label}</span><input aria-label={label} value={value} placeholder={opts?.placeholder} list={opts?.list} onChange={e=>onChange(e.target.value)} maxLength={opts?.short?20:300}/>
    </label>;
  const area=(label:string,value:string,onChange:(value:string)=>void,rows=3)=>
    <label className="tbe-field tbe-area"><span>{label}</span><textarea aria-label={label} rows={rows} value={value} maxLength={4000} onChange={e=>onChange(e.target.value)}/></label>;
  const heading=(label:string,page?:number)=><div className="tbe-block-heading"><h3>{label}</h3>
    {page&&<button type="button" onClick={()=>onOpenRule(page)} aria-label={'Open rulebook page '+page}><BookOpen size={14}/> PDF {page}</button>}</div>;

  const skillEntry=(name:string)=>{
    const skill=findSkill(name),derived=skill?derivedSkill(skill):null;
    const target=(derived?.target??0)+10*favor;
    return <div className="tbe-skill-row" key={name}>
      <span className="tbe-skill-name" title={name}>{name}</span>
      <input type="number" aria-label={name+' rating %'} min={0} max={100}
        value={skill?.rating??''} placeholder="—"
        onChange={e=>patchSkill(name,{rating:Math.max(0,Math.min(100,Math.round(Number(e.target.value)||0)))})}/>
      <select aria-label={name+' expertise'} value={skill?.expertiseLevel??1}
        onChange={e=>patchSkill(name,{expertiseLevel:Number(e.target.value) as 1|2|3|4})}>
        <option value={1}>—</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
      </select>
      <button className="tbe-die" type="button" aria-label={'Roll '+name} title={(skill?'Roll versus '+target+'%':'Enter a skill rating first')}
        disabled={!skill||!derived?.canRoll||target<0||target>100} onClick={()=>performSkill(name)}><Dices size={15}/></button>
    </div>;
  };
  const woundCard=(id:BodyLocation,display:string,die:string)=>{
    const l=sheet.locations[id];
    return <section className="tbe-location" key={id}>
      <div className="tbe-location-header"><strong>{display}</strong><span className="tbe-location-die">{die}</span>
        <label><input type="checkbox" checked={l.impaired} onChange={e=>setLocation(id,{impaired:e.target.checked})}/> IMP</label></div>
      <div className="tbe-location-armor">
        {field('Armor',l.armor,v=>setLocation(id,{armor:v}))}
        <label className="tbe-check"><input type="checkbox" checked={l.toughened} onChange={e=>setLocation(id,{toughened:e.target.checked})}/> T?</label>
        {field('AP',l.ap,v=>setLocation(id,{ap:v}),{short:true})}
        <label className="tbe-check"><input type="checkbox" checked={l.sundered} onChange={e=>setLocation(id,{sundered:e.target.checked})}/> SUND</label>
        {field('BULK',l.bulk,v=>setLocation(id,{bulk:v}),{short:true})}
      </div>
      <div className="tbe-wound-table-wrap"><table className="tbe-wound-table"><thead><tr>
        <th>WP</th><th>NL?</th><th>Wounds</th><th>INF</th><th>RB</th>
      </tr></thead><tbody>{l.wounds.map((w,i)=><tr key={i}>
        <td><input maxLength={20} aria-label={display+' wound '+(i+1)+' WP'} value={w.wp} onChange={e=>setWound(id,i,{wp:e.target.value})}/></td>
        <td><input type="checkbox" aria-label={display+' wound '+(i+1)+' nonlethal'} checked={w.nonlethal} onChange={e=>setWound(id,i,{nonlethal:e.target.checked})}/></td>
        <td><input maxLength={1200} aria-label={display+' wound '+(i+1)+' description'} value={w.description} onChange={e=>setWound(id,i,{description:e.target.value})}/></td>
        <td><input type="checkbox" aria-label={display+' wound '+(i+1)+' infected'} checked={w.infection} onChange={e=>setWound(id,i,{infection:e.target.checked})}/></td>
        <td><input maxLength={30} aria-label={display+' wound '+(i+1)+' RB'} value={w.recoveryBonus} onChange={e=>setWound(id,i,{recoveryBonus:e.target.value})}/></td>
      </tr>)}</tbody></table></div>
    </section>;
  };
  const addSkill=()=>{
    const name=newSkill.trim();
    if(!name)return;
    if(findSkill(name)){setNotice('This skill already exists.');return;}
    patchSkill(name,{rating:0});setNewSkill('');
  };
  const editor=(kind:RecordType,label:string)=> <section className="tbe-block">
    {heading(label)}
    <div className="tbe-record-list">{character[kind].map((row,i)=><div className="tbe-edit-row" key={row.id}>
      <input aria-label={label+' '+(i+1)} value={row.text} onChange={e=>changeRecord(kind,i,e.target.value)}/>
      <button type="button" aria-label={'Delete '+label+' '+(i+1)} onClick={()=>removeRecord(kind,i)}><Trash2 size={14}/></button>
    </div>)}</div>
    <button className="tbe-add" type="button" onClick={()=>addRecord(kind)}><Plus size={14}/> Add {label.toLowerCase()}</button>
  </section>;
  return <div className="tbe-sheet-root">
    <div className="tbe-tab-strip" role="tablist" aria-label="Character sheet pages">
      <button role="tab" aria-selected={view==='front'} className={view==='front'?'active':''} onClick={()=>setView('front')}><Swords size={17}/> Page 1 · Combat</button>
      <button role="tab" aria-selected={view==='back'} className={view==='back'?'active':''} onClick={()=>setView('back')}><ScrollText size={17}/> Page 2 · Chronicle</button>
      <button role="tab" aria-selected={view==='mechanics'} className={view==='mechanics'?'active':''} onClick={()=>setView('mechanics')}><Dices size={17}/> Advanced mechanics</button>
    </div>
    {notice&&<div className="tbe-notice" role="alert">{notice}<button onClick={()=>setNotice('')}>Dismiss</button></div>}
    {lastRoll&&<div className="tbe-quick-roll" role="status"><Dices size={19}/><div>
      <strong>{lastRoll.label}</strong><span>{lastRoll.message}</span>
      {rolls.length>1&&<details className="tbe-recent-rolls"><summary>Recent rolls ({rolls.length})</summary>
        <ol>{rolls.slice(1).map((r,i)=><li key={i}>{r.message}</li>)}</ol></details>}
    </div><button type="button" onClick={()=>setLastRoll(null)} aria-label="Dismiss roll result">×</button></div>}
    {view==='mechanics'&&<InteractiveCharacterControls key={character.id} character={character}
      onUpdate={onUpdate} onUpdateSkill={(id,key,value)=>onUpdate({skills:character.skills.map(s=>s.id===id?{...s,[key]:value}:s)})}
      onRemoveSkill={id=>onUpdate({skills:character.skills.filter(s=>s.id!==id)})}
      onAddSkill={name=>patchSkill(name,{rating:0})}
      onOpenRule={onOpenRule} onRecord={log}/>}
    {view==='front'&&<div className="tbe-paper">
      <header className="tbe-paper-header"><div><div className="tbe-kicker">The Broken Empires · Character Record</div>
        <h2>{title(character.name)}</h2><p>Interactive adaptation of your two-page form · Page One</p></div>
        <span className="tbe-page-mark">01 / 02</span></header>

      <div className="tbe-identity-grid">
        {field('Name',character.name,v=>onUpdate({name:v}))}
        {field('Race',character.heritage,v=>onUpdate({heritage:v}),{list:'tbe-heritage-choices'})}
        {field('Sex',sheet.sex,v=>save({sex:v}),{short:true})}
        {field('Age',sheet.age,v=>save({age:v}),{short:true})}
        {field('Culture',character.culture,v=>onUpdate({culture:v}))}
        {field('Previous career',character.career,v=>onUpdate({career:v}),{list:'tbe-career-choices'})}
        {field('Size',sheet.size,v=>save({size:v}),{short:true})}
        {field('XP',sheet.xp,v=>save({xp:v}),{short:true})}
      </div>
      <datalist id="tbe-career-choices">{PREVIOUS_CAREERS.map(name=><option key={name} value={name}/>)}</datalist>
      <datalist id="tbe-heritage-choices">{HERITAGES.map(name=><option key={name} value={name}/>)}</datalist>
      <div className="tbe-top-descriptors">
        <section className="tbe-block">{heading('Ability score descriptors')}
          {sheet.abilityDescriptors.map((value,i)=><input key={i} aria-label={'Ability descriptor '+(i+1)} value={value} maxLength={300} onChange={e=>
            save({abilityDescriptors:sheet.abilityDescriptors.map((v,j)=>i===j?e.target.value:v)})}/>)}</section>
        <section className="tbe-block">{heading('Personality traits')}
          {sheet.personalityTraits.map((value,i)=><input key={i} aria-label={'Personality trait '+(i+1)} value={value} maxLength={300} onChange={e=>
            save({personalityTraits:sheet.personalityTraits.map((v,j)=>i===j?e.target.value:v)})}/>)}</section>
      </div>

      <section className="tbe-block tbe-skill-section">
        <div className="tbe-block-heading"><h3>Skills · % and Expertise</h3><button type="button" onClick={()=>onOpenRule(23)}><BookOpen size={14}/> PDF 23</button></div>
        <div className="tbe-skill-toolbar"><label>Resolve Favor for next roll
          <select aria-label="Resolve Favor" value={favor} onChange={e=>setFavor(Number(e.target.value))}>
            <option value={0}>None</option><option value={1}>+10 · 1 Resolve</option>
            <option value={2}>+20 · 2 Resolve</option><option value={3}>+30 · 3 Resolve</option>
          </select></label><span>Skill Score is derived from the unmodified rating. Click the die on any rated skill.</span></div>
        <div className="tbe-skill-matrix">
          {SKILL_COLUMNS.map(column=><section className="tbe-skill-column" key={column.id}>
            <h4>{column.title}</h4><div className="tbe-skill-labels"><span>Skill</span><span>%</span><span>EX</span><span>Roll</span></div>
            {column.skills.map(skillEntry)}
          </section>)}
          <section className="tbe-skill-column tbe-strands">
            <h4>Strands</h4><div className="tbe-skill-labels"><span>Strand</span><span>LVL</span></div>
            {STRAND_NAMES.map(name=><div className="tbe-strand-row" key={name}><span>{name}</span>
              <input aria-label={name+' Strand level'} value={sheet.strands[name]} maxLength={25}
                onChange={e=>save({strands:{...sheet.strands,[name as Strand]:e.target.value}})}/></div>)}
            <label className="tbe-piety"><span>Starting piety</span><input value={sheet.startingPiety}
              aria-label="Starting piety" onChange={e=>save({startingPiety:e.target.value})}/></label>
          </section>
        </div>
        <details className="tbe-other-skills"><summary>Additional character skills ({character.skills.filter(s=>!officialNames.has(norm(s.name))).length})</summary>
          {character.skills.filter(s=>!officialNames.has(norm(s.name))).map(s=><div key={s.id} className="tbe-custom-skill">
            <input aria-label="Custom skill name" value={s.name} onChange={e=>onUpdate({skills:character.skills.map(x=>x.id===s.id?{...x,name:e.target.value}:x)})}/>
            <input aria-label={s.name+' rating'} type="number" value={s.rating} min={0} max={100}
              onChange={e=>onUpdate({skills:character.skills.map(x=>x.id===s.id?{...x,rating:Math.max(0,Math.min(100,Math.round(Number(e.target.value)||0)))}:x)})}/>
            <button className="tbe-die" type="button" title={'Roll '+s.name} onClick={()=>performSkill(s.name)}><Dices size={15}/></button>
          </div>)}
          <div className="tbe-add-skill"><input aria-label="Additional skill name" value={newSkill} placeholder="Other skill..." onChange={e=>setNewSkill(e.target.value)}/>
            <button type="button" onClick={addSkill}><Plus size={14}/> Add</button></div>
        </details>
      </section>

      <div className="tbe-two-band">
        <section className="tbe-block">
          {heading('Resolve & Fatigue',31)}
          <div className="tbe-resolve-track" aria-label={stats.availableResolve+' available Resolve of '+stats.maxResolve}>
            {Array.from({length:Math.min(30,Math.max(0,stats.maxResolve))},(_,i)=><span key={i} className={i<stats.availableResolve?'filled':''}/>)}
          </div>
          <div className="tbe-inline-fields">
            <label>Spent <input aria-label="Spent Resolve" type="number" value={a.spentResolve} min={0} max={200}
              onChange={e=>patchAttr('spentResolve',Math.max(0,Number(e.target.value)||0))}/></label>
            <label>Fatigue <input aria-label="Fatigue" type="number" value={a.fatigue} min={0} max={200}
              onChange={e=>patchAttr('fatigue',Math.max(0,Number(e.target.value)||0))}/></label>
            <button className="tbe-mini" type="button" onClick={()=>spendResolve(1)} disabled={stats.availableResolve===0}><Minus size={13}/> Spend</button>
            <button className="tbe-mini" type="button" onClick={()=>spendResolve(-1)} disabled={a.spentResolve===0}><Plus size={13}/> Restore spent</button>
          </div><strong className="tbe-resolve-count">{stats.availableResolve} / {stats.maxResolve} available</strong>
        </section>
        <section className="tbe-block">
          {heading('Attributes',91)}
          <div className="tbe-attribute-grid">
            <div><span>Max Resolve</span><strong>{stats.maxResolve}</strong></div>
            <div><span>Initiative</span><button className="tbe-attribute-roll" onClick={doInitiative} title="Roll d10 + Initiative">{stats.initiative} <Dices size={14}/></button></div>
            <div><span>Init. penalty</span><input aria-label="Initiative penalty" type="number" min={0} value={a.armorInitiativePenalty} onChange={e=>patchAttr('armorInitiativePenalty',Math.max(0,Number(e.target.value)||0))}/></div>
            <div><span>Total Init.</span><strong>{stats.effectiveInitiative}</strong></div>
            <div><span>Toughness</span><strong>{stats.toughness}</strong></div>
            <div><span>Death threshold</span><strong>{stats.deathThreshold}</strong></div>
            <div><span>Lethality level</span><strong>{stats.lethality}</strong></div>
          </div>
          <details className="tbe-attribute-setup"><summary><ChevronDown size={14}/> Starting Attribute points · {stats.pointsUsed}/5 spent</summary>
            <div>{(['resolvePoints','initiativePoints','toughnessPoints','deathThresholdPoints'] as const).map(key=>
              <label key={key}><span>{key.replace('Points','')}</span><select aria-label={key} value={a[key]} onChange={e=>{
                try{onUpdate({attributes:allocatePoint(a,key,Number(e.target.value))});setNotice('');}catch(err){setError(err);}
              }}>{Array.from({length:6},(_,i)=><option key={i} value={i}>{i}</option>)}</select></label>)}</div>
            <p>Other Talent or XP attribute bonuses can be entered in Advanced mechanics.</p>
          </details>
        </section>
      </div>

      <div className="tbe-wound-heading">{heading('Wounds & armor',145)}
        <div className="tbe-wound-metrics">
          {field('Total lethal WP',sheet.totalLethalWp,v=>save({totalLethalWp:v}),{short:true})}
          {field('Base recovery',sheet.baseRecovery,v=>save({baseRecovery:v}),{short:true})}
          <label className="tbe-check"><input type="checkbox" checked={sheet.shock} onChange={e=>save({shock:e.target.checked})}/> Shock?</label>
          {field('Rounds dying',sheet.roundsDying,v=>save({roundsDying:v}),{short:true})}
        </div>
        <span className="tbe-calculated">Entered lethal WP sum: {enteredLethalWp(sheet)??'check entries'}</span>
      </div>
      <div className="tbe-front-grid">
        <div className="tbe-wound-side">
          <section className="tbe-block">{heading('Talents',42)}
            <TalentPicker entries={character.talents} onChange={talents=>onUpdate({talents})}
              onOpenRule={onOpenRule}/></section>
          <section className="tbe-block">{heading('Armor penalties')}
            {(['athletics','riseFromProne','stealth','dodge','perception'] as const).map(key=>
              <label className="tbe-penalty" key={key}><span>{key==='riseFromProne'?'Rise from prone':key}</span>
                <input maxLength={25} aria-label={'Armor penalty '+key} value={sheet.armorPenalties[key]} onChange={e=>
                  save({armorPenalties:{...sheet.armorPenalties,[key]:e.target.value}})}/></label>)}
          </section>
          <section className="tbe-block">{heading('Shield')}
            <div className="tbe-shield-fields">
              {(['size','ap','shieldBonus','enc'] as const).map(key=>field(
                key==='shieldBonus'?'SH.B':key.toUpperCase(),sheet.shield[key],v=>
                  save({shield:{...sheet.shield,[key]:v}}),{short:true}))}
              <label className="tbe-check"><input type="checkbox" checked={sheet.shield.split} onChange={e=>
                save({shield:{...sheet.shield,split:e.target.checked}})}/> Split</label>
            </div>
          </section>
          <section className="tbe-block">{heading('Detailed locations')}
            {(['body','head','rightArm','rightLeg'] as const).map(key=><div key={key} className="tbe-detail-list">
              <strong>{key==='rightArm'?'Arms':key==='rightLeg'?'Legs':key.toUpperCase()}</strong>
              {hitList(key).map((part,i)=><span key={i}>{part}</span>)}
            </div>)}
          </section>
        </div>
        <div className="tbe-wound-grid">{BODY_LOCATIONS.map(item=>woundCard(item.id,item.title,item.die))}</div>
      </div>
      <section className="tbe-block tbe-weapon-section">
        {heading('Weapons',152)}<div className="tbe-grid-scroll"><table className="tbe-weapons">
          <thead><tr><th>Name / type</th>{attackColumns.map(([key,label])=><th key={key}>{label}</th>)}<th>Notes</th><th/></tr></thead>
          <tbody>{sheet.weapons.map((w,i)=><tr key={w.id}>
            <td><input list="tbe-weapon-choices" maxLength={240} aria-label={'Weapon '+(i+1)+' name'} value={w.name} onChange={e=>changeWeapon(i,'name',e.target.value)}/></td>
            {attackColumns.map(([key,label])=><td key={key}><input maxLength={240} aria-label={'Weapon '+(i+1)+' '+label} value={w[key]}
              onChange={e=>changeWeapon(i,key,e.target.value)}/></td>)}
            <td><input maxLength={1200} aria-label={'Weapon '+(i+1)+' notes'} value={w.notes} onChange={e=>changeWeapon(i,'notes',e.target.value)}/></td>
            <td><button type="button" aria-label={'Remove weapon '+(i+1)} onClick={()=>
              save({weapons:sheet.weapons.filter((_,j)=>i!==j)})}><Trash2 size={14}/></button></td>
          </tr>)}</tbody>
        </table></div>
        <datalist id="tbe-weapon-choices">{WEAPON_NAMES.map(name=><option key={name} value={name}/>)}</datalist>
        <button className="tbe-add" type="button" disabled={sheet.weapons.length>=30} onClick={()=>
          save({weapons:[...sheet.weapons,blankWeapon(freshId())]})}><Plus size={14}/> Add weapon</button>
        <p className="tbe-help">ATT, PRY, RCH and damage fields match your source sheet. They remain manual until weapon resolution is verified; skill-roll buttons above are operational.</p>
      </section>
    </div>}

    {view==='back'&&<div className="tbe-paper">
      <header className="tbe-paper-header"><div><div className="tbe-kicker">The Broken Empires · Chronicle</div>
        <h2>{title(character.name)}</h2><p>Interactive adaptation of your two-page form · Page Two</p></div>
        <span className="tbe-page-mark">02 / 02</span></header>
      <section className="tbe-block">
        {heading('Goals')}<div className="tbe-goal-grid">
          {sheet.goals.map((row,i)=><div key={i} className="tbe-goal-row">
            <input maxLength={400} aria-label={'Goal '+(i+1)} value={i===0&&!row.text&&character.goal?character.goal:row.text}
              onChange={e=>{
                const rows=sheet.goals.map((g,j)=>i===j?{...g,text:e.target.value}:g);
                onUpdate({tbeSheet:{...sheet,goals:rows},...(i===0?{goal:e.target.value}:{})});
              }}/>
            <label title="Shared goal"><input type="checkbox" aria-label={'Goal '+(i+1)+' shared'} checked={row.shared}
              onChange={e=>save({goals:sheet.goals.map((g,j)=>i===j?{...g,shared:e.target.checked}:g)})}/> Shared</label>
          </div>)}
        </div>
      </section>
      <div className="tbe-life-grid">
        {(['origin','youth','recent'] as const).map(key=><section className="tbe-block" key={key}>
          {heading('Life events: '+key)}
          {area('Life events: '+key,sheet.lifeEvents[key],v=>
            save({lifeEvents:{...sheet.lifeEvents,[key]:v}}),9)}
        </section>)}
      </div>
      <div className="tbe-back-middle">
        <section className="tbe-block">{heading('Resources',132)}
          <div className="tbe-resource-list">{(Object.keys(supplies) as SupplyCategory[]).map(key=><div key={key} className="tbe-resource-row">
            <span>{supplies[key]}</span>
            <select aria-label={supplies[key]+' supply die'} value={res[key]===null?'unset':res[key]} onChange={e=>
              onUpdate({supplies:updateSheetSupply(res,key,e.target.value==='unset'?null:Number(e.target.value) as SupplyDieSize)})}>
              <option value="unset">—</option><option value={12}>d12</option><option value={10}>d10</option>
              <option value={8}>d8</option><option value={6}>d6</option><option value={0}>Empty</option>
            </select>
            <button type="button" className="tbe-die" disabled={res[key]===null||res[key]===0} onClick={()=>doSupply(key)}
              aria-label={'Roll '+supplies[key]+' supply'}><Dices size={16}/></button>
          </div>)}</div>
          {field('Silver pieces',sheet.silverPieces,v=>save({silverPieces:v}))}
          {field('Status',character.status,v=>onUpdate({status:v}))}
        </section>
        <section className="tbe-block">{heading('Relationship NPCs')}
          {area('Relationship NPCs',sheet.relationshipNpcs,v=>save({relationshipNpcs:v}),8)}
        </section>
      </div>
      <div className="tbe-back-bottom">
        <section className="tbe-block">
          {heading('Inventory')}
          <div className="tbe-enc-head">{field('Max ENC',sheet.maxEnc,v=>save({maxEnc:v}),{short:true})}
            <span>Entered ENC: {enteredInventoryEnc(sheet)??'check entries'}</span></div>
          <div className="tbe-inventory-table"><div className="tbe-inventory-head"><span>Item</span><span>ENC</span><span/></div>
            {sheet.inventory.map((row,i)=><div className="tbe-inventory-row" key={row.id}>
              <input maxLength={500} aria-label={'Inventory item '+(i+1)} value={row.item} onChange={e=>changeInventory(i,'item',e.target.value)}/>
              <input maxLength={30} aria-label={'Inventory ENC '+(i+1)} value={row.enc} onChange={e=>changeInventory(i,'enc',e.target.value)}/>
              <button aria-label={'Remove inventory item '+(i+1)} onClick={()=>save({inventory:sheet.inventory.filter((_,j)=>j!==i)})}><Trash2 size={14}/></button>
            </div>)}
          </div><button className="tbe-add" disabled={sheet.inventory.length>=100} onClick={()=>
            save({inventory:[...sheet.inventory,blankInventory(freshId())]})}><Plus size={14}/> Add item</button>
        </section>
        <section className="tbe-block">{heading('Threads')}
          {area('Threads',sheet.threads,v=>save({threads:v}),11)}</section>
        <section className="tbe-block">{heading('Notes')}
          {area('Notes',character.notes,v=>onUpdate({notes:v}),11)}</section>
      </div>
      <section className="tbe-block tbe-fraying">{heading('Fraying')}
        {field('Fraying points',sheet.fraying,v=>save({fraying:v}),{short:true})}</section>
      <details className="tbe-old-notes"><summary><FileText size={15}/> Existing character records and earlier notes</summary>
        <div className="tbe-legacy-grid">
          {area('Defining bond',character.bond,v=>onUpdate({bond:v}))}
          {area('Background history',character.history,v=>onUpdate({history:v}))}
          {area('Appearance',character.description,v=>onUpdate({description:v}))}
          {area('Advancement notes',character.experience,v=>onUpdate({experience:v}))}
          {editor('events','Life events (legacy)')}
          {editor('equipment','Equipment notes (legacy)')}
          {editor('wounds','Wound notes (legacy)')}
          {editor('expertise','Expertise notes (legacy)')}
        </div>
      </details>
    </div>}
    <footer className="tbe-sheet-footer"><HeartPulse size={16}/> Values and section order follow your uploaded form. Derived checks use the existing verified rules engine; equipment, injuries, and unusual effects are not automatically adjudicated.</footer>
  </div>;
}

import {useState} from 'react';
import {BookOpen,ChevronDown,Dices,Minus,Plus,RotateCcw,Shield,Trash2,Zap} from 'lucide-react';
import type {Character,Skill,SupplyCategory,SupplyDieSize} from './types.ts';
import {rollPercentile} from './engine.ts';
import {useSupplyDie} from './mechanics.ts';
import {
  allocatePoint,deriveAttributes,derivedSkill,rollSheetSkill,
  sheetAttributes,sheetSupplies,updateSheetSupply
} from './characterSheetModel.ts';
import type {AllocationKey,AttributeKey,RollEntry} from './characterSheetModel.ts';
import {isSheetAttributes} from './characterSheetState.ts';
import './interactiveSheet.css';

const labels:Record<AllocationKey,string>={
  resolvePoints:'Max Resolve',initiativePoints:'Initiative',
  toughnessPoints:'Toughness',deathThresholdPoints:'Death Threshold'
};
const supplyLabels:Record<SupplyCategory,string>={
  gear:'Gear',ammo:'Ammo',medical:'Medical',rations:'Rations'
};
const bonuses=[
  ['resolveBonus','Max Resolve bonus'],['initiativeBonus','Initiative bonus'],
  ['toughnessBonus','Toughness bonus'],['deathThresholdBonus','Death Threshold bonus'],
  ['lethalityBonus','Lethality bonus'],['armorInitiativePenalty','Armor Initiative penalty']
] as const;
function rollDie(faces:number):number{
  const bytes=new Uint16Array(1);
  const limit=65536-(65536%faces);
  do{crypto.getRandomValues(bytes);}while(bytes[0]>=limit);
  return bytes[0]%faces+1;
}
type Props={
  character:Character;
  onUpdate:(changes:Partial<Character>)=>void;
  onUpdateSkill:(id:string,field:'name'|'rating'|'note'|'modifier'|'expertiseLevel',value:string|number)=>void;
  onRemoveSkill:(id:string)=>void;
  onAddSkill:(name:string)=>void;
  onOpenRule:(page:number)=>void;
  onRecord:(entry:RollEntry)=>void;
};
export function InteractiveCharacterControls({
  character,onUpdate,onUpdateSkill,onRemoveSkill,onAddSkill,onOpenRule,onRecord
}:Props){
  const a=sheetAttributes(character);
  const stats=deriveAttributes(character);
  const supplies=sheetSupplies(character);
  const [advanced,setAdvanced]=useState(false);
  const [favor,setFavor]=useState(0);
  const [newSkill,setNewSkill]=useState('');
  const [lastRoll,setLastRoll]=useState<RollEntry|null>(null);
  const [recent,setRecent]=useState<RollEntry[]>([]);
  const [error,setError]=useState('');
  const notify=(entry:RollEntry)=>{
    setError('');
    setLastRoll(entry);
    setRecent(history=>[entry,...history].slice(0,8));
    onRecord(entry);
  };
  const handleError=(e:unknown)=>setError(e instanceof Error?e.message:'Unable to complete that roll');
  const updateAttr=(key:AttributeKey,value:number)=>{
    try{
      const next={...a,[key]:value};
      if(!isSheetAttributes(next))throw new RangeError('Invalid attribute value or derived stat');
      onUpdate({attributes:next});setError('');
    }catch(e){handleError(e);}
  };
  const allocate=(key:AllocationKey,delta:number)=>{
    try{
      const next=allocatePoint(a,key,a[key]+delta);
      onUpdate({attributes:next});setError('');
    }catch(e){handleError(e);}
  };
  const rollSkill=(skill:Skill)=>{
    try{
      if(favor>stats.availableResolve)throw new RangeError('Not enough available Resolve for Favor');
      const {entry}=rollSheetSkill(skill,rollPercentile(),favor);
      if(favor){
        onUpdate({attributes:{...a,spentResolve:a.spentResolve+favor}});
        setFavor(0);
      }
      notify(entry);
    }catch(e){handleError(e);}
  };
  const rollInitiative=()=>{
    const die=rollDie(10),total=die+stats.effectiveInitiative;
    notify({label:'Initiative',message:'Initiative d10 '+die+
      ' + modifier '+stats.effectiveInitiative+' = '+total,sourcePage:152,roll:die});
  };
  const rollSupply=(kind:SupplyCategory)=>{
    try{
      const current=supplies[kind];
      if(current===null)throw new Error('Set a '+supplyLabels[kind]+' Supply Die first');
      if(current===0)throw new Error(supplyLabels[kind]+' supply is empty');
      const die=rollDie(current);
      const outcome=useSupplyDie(current,die);
      const next=updateSheetSupply(supplies,kind,outcome.next);
      onUpdate({supplies:next});
      notify({label:supplyLabels[kind]+' supply',message:supplyLabels[kind]+' d'+current+
        ' rolled '+die+' → '+(outcome.depleted?'depleted':outcome.stepped?'d'+outcome.next:'remains d'+current),
        sourcePage:132,roll:die});
    }catch(e){handleError(e);}
  };
  const addNewSkill=()=>{
    const name=newSkill.trim();
    if(!name)return;
    if(character.skills.some(s=>s.name.toLocaleLowerCase()===name.toLocaleLowerCase())){
      setError('That skill is already on this character.');return;
    }
    onAddSkill(name);setNewSkill('');setError('');
  };
  return <div className="vtt-sheet">
    <section className="panel vtt-panel">
      <div className="vtt-header">
        <div><div className="eyebrow"><Shield size={15}/> LIVE CHARACTER ATTRIBUTES</div>
          <h3>Primary attributes</h3>
          <p>Five starting points, with values recalculated automatically. Original rules: PDF 91–92.</p></div>
        <button type="button" className="vtt-source" onClick={()=>onOpenRule(91)}><BookOpen size={14}/> Source</button>
      </div>
      <div className="vtt-budget"><span>Starting attribute points</span>
        <strong>{stats.pointsUsed} / 5 allocated</strong>
        <div className="vtt-progress"><span style={{width:(stats.pointsUsed/5*100)+'%'}}/></div>
        <small>{stats.pointsRemaining} available</small>
      </div>
      <div className="vtt-allocation">
        {(Object.keys(labels) as AllocationKey[]).map(key=><div className="vtt-allocation-row" key={key}>
          <span>{labels[key]}</span><div className="vtt-stepper">
            <button type="button" aria-label={'Remove '+labels[key]+' point'} disabled={a[key]===0} onClick={()=>allocate(key,-1)}><Minus size={14}/></button>
            <output aria-label={labels[key]+' allocated points'}>{a[key]}</output>
            <button type="button" aria-label={'Add '+labels[key]+' point'} disabled={stats.pointsRemaining===0} onClick={()=>allocate(key,1)}><Plus size={14}/></button>
          </div></div>)}
      </div>
      <div className="vtt-stat-grid">
        <div className="vtt-stat"><small>MAX RESOLVE</small><strong>{stats.maxResolve}</strong><span>10 + 2 / point + bonus</span></div>
        <div className="vtt-stat"><small>INITIATIVE</small><button type="button" title="Roll initiative d10" onClick={rollInitiative}><strong>{stats.effectiveInitiative>=0?'+':''}{stats.effectiveInitiative}</strong><Dices size={18}/></button><span>Click to roll d10 + modifier</span></div>
        <div className="vtt-stat"><small>TOUGHNESS</small><strong>{stats.toughness>=0?'+':''}{stats.toughness}</strong><span>1 per 2 points + bonus</span></div>
        <div className="vtt-stat"><small>DEATH THRESHOLD</small><strong>{stats.deathThreshold}</strong><span>20 + 2 / point + bonus</span></div>
        <div className="vtt-stat vtt-stat-accent"><small>LETHALITY LEVEL</small><strong>{stats.lethality}</strong><span>Ceiling(DT / 3) + bonus</span></div>
      </div>
      <button className="vtt-disclosure" type="button" aria-expanded={advanced} onClick={()=>setAdvanced(s=>!s)}>
        <ChevronDown size={15} className={advanced?'vtt-open':''}/> Bonuses, armor and advanced adjustments
      </button>
      {advanced&&<div className="vtt-bonuses">
        {bonuses.map(([key,label])=><label className="vtt-bonus" key={key}><span>{label}</span><input type="number" aria-label={label} min={key==='armorInitiativePenalty'||key==='lethalityBonus'?0:-50} max={key==='armorInitiativePenalty'?100:key==='lethalityBonus'?30:100} value={a[key]} onChange={e=>updateAttr(key,Number(e.target.value))}/></label>)}
        <small>Record applicable Talents, XP increases and armor penalties manually. Optional randomized starting attributes and special cases need source review.</small>
      </div>}
    </section>

    <section className="panel vtt-panel">
      <div className="vtt-header"><div><div className="eyebrow"><Zap size={15}/> CHARACTER RESOURCES</div>
        <h3>Resolve & fatigue</h3><p>Spending Resolve and gaining Fatigue reduce available Resolve immediately.</p></div>
        <button className="vtt-source" type="button" onClick={()=>onOpenRule(31)}><BookOpen size={14}/> Source</button>
      </div>
      <div className="vtt-resource"><div><span>Available Resolve</span>
        <strong>{stats.availableResolve} <small>/ {stats.maxResolve}</small></strong></div>
        <div className="vtt-resolve-dots" aria-label={stats.availableResolve+' available Resolve of '+stats.maxResolve}>
          {Array.from({length:Math.min(stats.maxResolve,50)},(_,i)=>
            <span key={i} className={i<stats.availableResolve?'filled':''}/>)}
        </div>
      </div>
      <div className="vtt-resource-grid">
        <label><span>Spent Resolve</span><input type="number" min={0} max={200} value={a.spentResolve} onChange={e=>updateAttr('spentResolve',Number(e.target.value))}/></label>
        <label><span>Fatigue</span><input type="number" min={0} max={200} value={a.fatigue} onChange={e=>updateAttr('fatigue',Number(e.target.value))}/></label>
        <button type="button" className="button button-quiet button-small" onClick={()=>updateAttr('spentResolve',0)}><RotateCcw size={14}/> Reset spent Resolve</button>
      </div>
      <p className="vtt-footnote">Fatigue recovery and wound effects still follow the source book; this tracker does not automatically apply them.</p>
    </section>

    <section className="panel vtt-panel">
      <div className="vtt-header"><div><div className="eyebrow"><Dices size={15}/> ONE-CLICK RULES</div>
        <h3>Skills & rolls</h3><p>Click a calculated target to roll immediately here, without leaving the sheet.</p></div>
        <button type="button" className="vtt-source" onClick={()=>onOpenRule(23)}><BookOpen size={14}/> Source</button>
      </div>
      <div className="vtt-roll-toolbar"><label>Resolve Favor for <b>next</b> check
        <select aria-label="Resolve Favor for next skill check" value={favor} onChange={e=>setFavor(Number(e.target.value))}>
          {[0,1,2,3].map(n=><option key={n} value={n}>{n===0?'None':'+'+(10*n)+' ('+n+' Resolve)'}</option>)}
        </select></label>
        <span>Favor is spent before rolling, max 3. Skill Score never changes with modifiers.</span>
      </div>
      <div className="vtt-table-scroll"><table className="vtt-skill-table">
        <thead><tr><th>Skill</th><th>Base</th><th>Mod.</th><th>Score</th><th>Expertise</th><th>Roll vs.</th><th/></tr></thead>
        <tbody>{character.skills.length===0?<tr><td colSpan={7}>Add a skill to enable one-click rolling.</td></tr>:
          character.skills.map(skill=>{
            const d=derivedSkill(skill),nextTarget=d.target+favor*10;
            return <tr key={skill.id}>
              <td><input aria-label="Skill name" value={skill.name} onChange={e=>onUpdateSkill(skill.id,'name',e.target.value)}/></td>
              <td><input aria-label={skill.name+' base rating'} type="number" min={0} max={100} value={skill.rating}
                onChange={e=>onUpdateSkill(skill.id,'rating',Math.round(Math.max(0,Math.min(100,Number(e.target.value)||0))))}/></td>
              <td><input aria-label={skill.name+' modifier'} type="number" min={-100} max={100} value={d.modifier}
                onChange={e=>onUpdateSkill(skill.id,'modifier',Math.max(-100,Math.min(100,Number(e.target.value)||0)))}/></td>
              <td><output aria-label={skill.name+' skill Score'}>{d.score}</output></td>
              <td><select aria-label={skill.name+' Expertise'} value={d.expertiseLevel}
                onChange={e=>onUpdateSkill(skill.id,'expertiseLevel',Number(e.target.value))}>
                <option value={1}>—</option><option value={2}>Ex2</option><option value={3}>Ex3</option><option value={4}>Ex4</option>
              </select></td>
              <td><button type="button" className="vtt-roll-target" aria-label={'Roll '+skill.name+' at '+nextTarget}
                title={nextTarget>100||nextTarget<0?'Modified rating outside validated 0–100 range':'Click to roll '+skill.name}
                disabled={!d.canRoll||nextTarget<0||nextTarget>100}
                onClick={()=>rollSkill(skill)}><Dices size={16}/>{nextTarget}%</button></td>
              <td><button className="vtt-remove" type="button" aria-label={'Remove '+skill.name} onClick={()=>onRemoveSkill(skill.id)}><Trash2 size={15}/></button></td>
            </tr>;
          })}</tbody>
      </table></div>
      <div className="vtt-add-skill"><input value={newSkill} aria-label="Add a skill" placeholder="Add another skill..." onChange={e=>setNewSkill(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addNewSkill()}}/><button type="button" className="button button-quiet button-small" onClick={addNewSkill} disabled={!newSkill.trim()}><Plus size={15}/> Add skill</button></div>
      <p className="vtt-footnote">Only ratings from 0–100 are automated. Advanced skill values over 100 and unsupported exceptions remain manual; no Talent bonuses are inferred from free-form notes.</p>
    </section>

    <section className="panel vtt-panel">
      <div className="vtt-header"><div><div className="eyebrow"><Shield size={15}/> TRACKED CONSUMABLES</div>
        <h3>Supply Dice</h3><p>Click to roll a supplied die. A 1–2 steps it down; depleted d6 becomes empty.</p></div>
        <button type="button" className="vtt-source" onClick={()=>onOpenRule(132)}><BookOpen size={14}/> Source</button>
      </div>
      <div className="vtt-supplies">{(Object.keys(supplyLabels) as SupplyCategory[]).map(key=>
        <div className="vtt-supply" key={key}><label><span>{supplyLabels[key]}</span><select aria-label={supplyLabels[key]+' supply die'} value={supplies[key]===null?'unset':supplies[key]}
          onChange={e=>onUpdate({supplies:updateSheetSupply(supplies,key,e.target.value==='unset'?null:Number(e.target.value) as SupplyDieSize)})}>
          <option value="unset">Not set</option><option value={12}>d12</option><option value={10}>d10</option><option value={8}>d8</option><option value={6}>d6</option><option value={0}>Empty</option>
        </select></label><button className="vtt-roll-target" type="button" disabled={supplies[key]===null||supplies[key]===0}
          onClick={()=>rollSupply(key)}><Dices size={16}/> Roll</button></div>)}
      </div>
    </section>

    <section className="panel vtt-panel vtt-roll-log" aria-live="polite">
      <div className="vtt-header"><div><div className="eyebrow"><Dices size={15}/> DICE TRAY</div><h3>Latest roll</h3></div>
        {recent.length>0&&<button className="vtt-clear" type="button" onClick={()=>{setRecent([]);setLastRoll(null);}}>Clear view</button>}
      </div>
      {error&&<p role="alert" className="vtt-error">{error}</p>}
      {lastRoll?<><div className="vtt-roll-message"><strong>{lastRoll.label}</strong><p>{lastRoll.message}</p></div>
        {recent.length>1&&<details><summary>Recent rolls ({recent.length})</summary><ol>{recent.map((r,i)=><li key={i}>{r.message}</li>)}</ol></details>}
      </>:<p className="vtt-footnote">Choose any rollable skill, Initiative, or Supply Die. The latest result appears here; checks are also stored in the Dice Laboratory and an applicable solo campaign journal.</p>}
    </section>
  </div>;
}

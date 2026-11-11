import {useState} from 'react';
import {BookOpen,Dices,RotateCcw} from 'lucide-react';
import {rollPercentile} from './engine.ts';
import {MECHANICS,extendedProgress,opposedTest,skillTest,supportBonus,timerTriggered,useSupplyDie} from './mechanics.ts';
import type {SupplySize} from './mechanics.ts';
import type {Character} from './types.ts';

type Mode='skill'|'opposed'|'extended'|'supply'|'timer'|'support';
const modes:{id:Mode;title:string;page:number}[]=[
  {id:'skill',title:'Skill check',page:23},{id:'opposed',title:'Opposed',page:24},
  {id:'extended',title:'Extended',page:26},{id:'supply',title:'Supplies',page:132},
  {id:'timer',title:'Timer',page:29},{id:'support',title:'Support',page:41}
];

export function MechanicsPanel({character,onLog,onOpenRule}:{
  character:Character|undefined;
  onLog:(message:string,sourcePage:number,roll?:number)=>void;
  onOpenRule:(page:number)=>void;
}){
  const [mode,setMode]=useState<Mode>('skill');
  const [skillId,setSkillId]=useState('');
  const [rating,setRating]=useState(65);
  const [modifier,setModifier]=useState(0);
  const [expertise,setExpertise]=useState<1|2|3|4>(1);
  const [enemyRating,setEnemyRating]=useState(55);
  const [goal,setGoal]=useState(12);
  const [progress,setProgress]=useState(0);
  const [helpers,setHelpers]=useState(0);
  const [supply,setSupply]=useState<SupplySize>(12);
  const [timerDie,setTimerDie]=useState<4|6|8|10|12|20>(10);
  const [interval,setInterval]=useState(1);
  const [output,setOutput]=useState('');
  const [error,setError]=useState('');
  const selectSkill=(id:string)=>{
    setSkillId(id);
    const skill=character?.skills.find(s=>s.id===id);
    if(skill)setRating(skill.rating);
  };
  const execute=()=>{
    setError('');
    try{
      let message='',page=23,roll:number|undefined;
      if(mode==='skill'){
        roll=rollPercentile();
        const result=skillTest({rating,modifier,roll,expertise});
        message='Skill '+rating+(modifier>=0?'+':'')+modifier+': rolled '+roll+' — '+
          (result.success?'success':'failure')+(result.critical?' (critical)':'')+'; '+result.levels+' SL';
      }else if(mode==='opposed'){
        roll=rollPercentile();
        const enemyRoll=rollPercentile();
        const result=opposedTest({rating,modifier,roll,expertise},{rating:enemyRating,modifier:0,roll:enemyRoll});
        message='Opposed: you '+roll+' ('+result.left.levels+' SL) vs foe '+enemyRoll+' ('+result.right.levels+
          ' SL) — '+(result.winner==='none'?'neither wins':result.winner==='left'?'you win':'foe wins')+
          '; '+result.degree+' DoS ('+result.reason+')';
        page=24;
      }else if(mode==='extended'){
        roll=rollPercentile();
        const check=skillTest({rating,modifier,roll,expertise});
        const result=extendedProgress(progress,goal,check,helpers);
        setProgress(result.progress);
        message='Project roll '+roll+': '+(result.setback?'critical setback':check.success?'progress':'no progress')+
          '; '+progress+' → '+result.progress+'/'+goal+' SL'+(result.complete?' (complete)':'');
        page=26;
      }else if(mode==='supply'){
        if(supply===0)throw new RangeError('Supply exhausted; replenish it before rolling.');
        const values=new Uint32Array(1);crypto.getRandomValues(values);
        const die=1+(values[0]%supply);
        const result=useSupplyDie(supply,die);
        setSupply(result.next);
        message='Supply d'+supply+' rolled '+die+': '+(result.depleted?'empty':result.stepped?'steps to d'+result.next:'still d'+result.next);
        page=132;
      }else if(mode==='timer'){
        const values=new Uint32Array(1);crypto.getRandomValues(values);
        const die=1+(values[0]%timerDie);
        const trigger=timerTriggered(interval,timerDie,die);
        message='Interval '+interval+', Timer d'+timerDie+' rolled '+die+': '+(trigger?'complication triggered':'no trigger');
        setInterval(prev=>prev+1);page=29;
      }else{
        const bonus=supportBonus(rating);
        message='Support skill '+rating+' has Score '+Math.floor(rating/10)+'; adds +'+bonus+' to an eligible main check.';
        page=41;
      }
      setOutput(message);onLog(message,page,roll);
    }catch(e){setError(e instanceof Error?e.message:'Invalid mechanic parameters');}
  };
  const selected=modes.find(m=>m.id===mode)!;
  return <section className="panel solo-mechanics">
    <div className="solo-panel-header"><div className="eyebrow"><Dices size={15}/> RULES WORKBENCH</div>
      <button className="solo-source-link" onClick={()=>onOpenRule(selected.page)}><BookOpen size={14}/> PDF {selected.page}</button></div>
    <h3>Tested mechanics</h3>
    <p className="muted">Roll, calculate, and automatically record outcomes in your session journal.</p>
    <div className="solo-tool-modes">{modes.map(m=><button key={m.id} className={mode===m.id?'selected':''} onClick={()=>{setMode(m.id);setOutput('');setError('');}}>{m.title}</button>)}</div>
    {(mode==='skill'||mode==='opposed'||mode==='extended'||mode==='support')&&<div className="solo-form-grid">
      {character&&character.skills.length>0&&<label className="field solo-wide"><span>Character skill (optional)</span><select value={skillId} onChange={e=>selectSkill(e.target.value)}>
        <option value="">Manual rating</option>{character.skills.map(s=><option key={s.id} value={s.id}>{s.name} ({s.rating})</option>)}
      </select></label>}
      <label className="field"><span>{mode==='support'?'Supporting skill':'Skill rating'}</span><input type="number" min={0} max={100} value={rating} onChange={e=>{setRating(Number(e.target.value));setSkillId('');}}/></label>
      {mode!=='support'&&<label className="field"><span>Modifier</span><input type="number" min={-100} max={100} value={modifier} onChange={e=>setModifier(Number(e.target.value))}/></label>}
      {mode!=='support'&&<label className="field"><span>Expertise floor</span><select value={expertise} onChange={e=>setExpertise(Number(e.target.value) as 1|2|3|4)}>
        <option value={1}>None</option><option value={2}>Ex2</option><option value={3}>Ex3</option><option value={4}>Ex4</option></select></label>}
    </div>}
    {mode==='opposed'&&<label className="field"><span>Opponent skill</span><input type="number" value={enemyRating} min={0} max={100} onChange={e=>setEnemyRating(Number(e.target.value))}/></label>}
    {mode==='extended'&&<div className="solo-form-grid">
      <label className="field"><span>Required SL</span><input type="number" min={1} value={goal} onChange={e=>setGoal(Number(e.target.value))}/></label>
      <label className="field"><span>Earned SL</span><input type="number" min={0} value={progress} onChange={e=>setProgress(Number(e.target.value))}/></label>
      <label className="field"><span>Successful helpers</span><select value={helpers} onChange={e=>setHelpers(Number(e.target.value))}><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option></select></label>
      <button className="button button-quiet button-small" onClick={()=>setProgress(0)}><RotateCcw size={14}/> Reset project</button>
    </div>}
    {mode==='supply'&&<label className="field"><span>Current Supply Die</span><select value={supply} onChange={e=>setSupply(Number(e.target.value) as SupplySize)}>
      {[12,10,8,6,0].map(x=><option key={x} value={x}>{x?'d'+x:'Exhausted'}</option>)}</select></label>}
    {mode==='timer'&&<div className="solo-form-grid">
      <label className="field"><span>Timer Die</span><select value={timerDie} onChange={e=>setTimerDie(Number(e.target.value) as 4|6|8|10|12|20)}>{[4,6,8,10,12,20].map(n=><option key={n} value={n}>d{n}</option>)}</select></label>
      <label className="field"><span>Interval</span><input type="number" min={1} value={interval} onChange={e=>setInterval(Number(e.target.value))}/></label>
    </div>}
    <button className="button button-gold" onClick={execute}><Dices size={16}/>{mode==='support'?'Calculate bonus':'Roll and record'}</button>
    {output&&<p className="solo-rule-result" role="status">{output}</p>}
    {error&&<p className="reference-warning" role="alert">{error}</p>}
    <div className="solo-mechanic-registry"><div className="eyebrow">IMPLEMENTED RULE REGISTRY</div>{MECHANICS.map(m=><button key={m.id} onClick={()=>onOpenRule(m.page)}><span>{m.title}</span><small>PDF {m.page} · tested</small></button>)}</div>
    <p className="solo-legal-mini">High skills over 100, full combat, and freeform magic require source reference; no speculative calculations are made.</p>
  </section>;
}

import {useState} from 'react';
import {BookOpen,CheckCircle2,Dices,RotateCcw,Swords,X} from 'lucide-react';
import type {Character} from './types.ts';
import type {SoloCampaign} from './soloEngine.ts';
import {rollPercentile} from './engine.ts';
import {deriveAttributes} from './characterSheetModel.ts';
import {readTbeSheet} from './tbeSheetData.ts';
import {previewCombatRoll,previewCombatDamage} from './soloCombatAction.ts';
import type {CombatDamageChoice,CombatDirection,PendingCombatRoll} from './soloCombatAction.ts';
import './soloCombatExchange.css';

type Props={
  hero:Character|undefined;campaign:SoloCampaign;
  onSource:(page:number)=>void;onError:(message:string)=>void;
  onConfirm:(pending:PendingCombatRoll,choice:CombatDamageChoice)=>boolean;
  onUndo:(actionId:string)=>boolean
};
const valid=(s:string,limit=999)=>/^\d{1,3}$/.test(s)&&Number(s)<=limit;
const validMod=(s:string)=>/^-?\d{1,3}$/.test(s)&&Math.abs(Number(s))<=100;
export function SoloCombatExchange({hero,campaign,onSource,onError,onConfirm,onUndo}:Props){
  const [direction,setDirection]=useState<CombatDirection>('hero-attacks');
  const [npcId,setNpcId]=useState('');
  const [skillId,setSkillId]=useState('');
  const [favor,setFavor]=useState(0);
  const [opponentRating,setOpponentRating]=useState('40');
  const [opponentModifier,setOpponentModifier]=useState('0');
  const [opponentExpertise,setOpponentExpertise]=useState<1|2|3|4>(1);
  const [pending,setPending]=useState<PendingCombatRoll|null>(null);
  const [baseDamage,setBaseDamage]=useState('');
  const [armorAP,setArmorAP]=useState('0');
  const [shieldAP,setShieldAP]=useState('0');
  const [applyShield,setApplyShield]=useState(false);
  const [type,setType]=useState<'external'|'internal'>('external');
  const [injury,setInjury]=useState('');
  const [nonlethal,setNonlethal]=useState(false);
  const [weaponId,setWeaponId]=useState('');
  const activeScene=campaign.scenes.some(s=>s.id===campaign.activeSceneId&&s.status==='active');
  const stats=hero?deriveAttributes(hero):null;
  const npc=campaign.npcs.find(n=>n.id===npcId)??campaign.npcs[0];
  const skill=hero?.skills.find(s=>s.id===skillId)??hero?.skills[0];
  const sheet=hero?readTbeSheet(hero):null;
  const weapons=sheet?.weapons.filter(w=>w.name.trim())??[];
  const weapon=weapons.find(w=>w.id===weaponId);
  const damageChoice:CombatDamageChoice={
    baseDamage:Number(baseDamage),degreeOfSuccess:pending?.degree??0,
    armorAP:type==='internal'?0:Number(armorAP),
    shieldAP:type==='internal'||!applyShield?0:Number(shieldAP),
    type,applyShield,injury,nonlethal
  };
  const damageValid=valid(baseDamage)&&(type==='internal'||valid(armorAP))&&
    (type==='internal'||!applyShield||valid(shieldAP));
  const computed=pending?.attackerWon&&damageValid?
    previewCombatDamage(pending,damageChoice):null;
  const recent=campaign.journal.filter(entry=>entry.combatAction&&
    !campaign.journal.some(x=>x.reversalOf===entry.combatAction?.id)).slice(-4).reverse();
  const roll=()=>{
    if(!hero||!skill||!npc||!activeScene)return;
    try{
      if(!valid(opponentRating,100)||!validMod(opponentModifier))
        throw new RangeError('Enter a valid opponent rating (0–100) and modifier (−100 to 100).');
      const result=previewCombatRoll(hero,campaign,{
        direction,opponentId:npc.id,heroSkillId:skill.id,heroFavor:favor,
        opponentRating:Number(opponentRating),opponentModifier:Number(opponentModifier),
        opponentExpertise,heroRoll:rollPercentile(),opponentRoll:rollPercentile()
      });
      setPending(result);
      setArmorAP('0');setShieldAP('0');setApplyShield(false);
      setInjury('');setNonlethal(false);setType('external');
    }catch(e){onError(e instanceof Error?e.message:'Could not roll the combat exchange.');}
  };
  const apply=()=>{
    if(!pending)return;
    if(!pending.attackerWon||computed){
      if(onConfirm(pending,damageChoice)){setPending(null);setFavor(0);}
    }
  };
  const targetHero=pending?.direction==='hero-defends';
  const locationAP=targetHero&&pending?.hit&&sheet?sheet.locations[pending.hit.location].ap:'';
  const sectionLink=(page:number,label:string)=><button type="button" className="solo-source-link"
    onClick={()=>onSource(page)}><BookOpen size={13}/>{label} · PDF {page}</button>;
  return <section className="panel solo-combat-card" aria-label="Scene combat exchange">
    <div className="solo-panel-header"><div className="eyebrow"><Swords size={16}/> COMBAT EXCHANGE</div>
      {sectionLink(24,'Opposed rolls')}</div>
    <h3>Resolve a clash</h3>
    <p className="muted">Both participants roll d100 using the verified opposed-check engine. Set the NPC's rating manually.
      Attack and parry modifiers, weapon traits and special maneuvers are not inferred from freeform equipment text.</p>
    {!activeScene&&<p className="solo-combat-warning">Open a scene before resolving combat.</p>}
    {!hero&&<p className="solo-combat-warning">Assign a player character to this campaign.</p>}
    {campaign.npcs.length===0&&<p className="solo-combat-warning">Add an NPC in the NPCs &amp; threads tab to make it an opponent.</p>}
    <div className="solo-combat-fields">
      <label className="field"><span>Who attacks?</span><select value={direction} disabled={!!pending}
        onChange={e=>setDirection(e.target.value as CombatDirection)}>
        <option value="hero-attacks">Hero attacks NPC</option>
        <option value="hero-defends">NPC attacks hero</option>
      </select></label>
      <label className="field"><span>Opponent NPC</span><select value={npc?.id??''} disabled={!!pending}
        onChange={e=>setNpcId(e.target.value)}>
        {campaign.npcs.length===0&&<option value="">No NPCs available</option>}
        {campaign.npcs.map(n=><option value={n.id} key={n.id}>{n.name||'Unnamed NPC'}</option>)}
      </select></label>
      <label className="field"><span>{direction==='hero-attacks'?'Hero attack skill':'Hero defense skill'}</span>
        <select value={skill?.id??''} disabled={!!pending} onChange={e=>setSkillId(e.target.value)}>
          {hero?.skills.length===0&&<option value="">No skills recorded</option>}
          {hero?.skills.map(s=><option value={s.id} key={s.id}>{s.name} · {s.rating}%</option>)}
        </select></label>
      <label className="field"><span>Hero Resolve Favor</span><select value={favor} disabled={!!pending}
        onChange={e=>setFavor(Number(e.target.value))}>
        {[0,1,2,3].map(n=><option key={n} value={n} disabled={n>(stats?.availableResolve??0)}>
          {n===0?'None':n+' Resolve · +'+n*10+'%'}</option>)}
      </select></label>
      <label className="field"><span>NPC skill rating</span><input type="number" min="0" max="100" step="1"
        aria-label="Opponent skill rating" value={opponentRating} disabled={!!pending}
        onChange={e=>setOpponentRating(e.target.value)}/></label>
      <label className="field"><span>NPC modifier</span><input type="number" min="-100" max="100" step="1"
        aria-label="Opponent skill modifier" value={opponentModifier} disabled={!!pending}
        onChange={e=>setOpponentModifier(e.target.value)}/></label>
      <label className="field"><span>NPC Expertise</span><select value={opponentExpertise}
        disabled={!!pending} onChange={e=>setOpponentExpertise(Number(e.target.value) as 1|2|3|4)}>
        {[1,2,3,4].map(n=><option key={n} value={n}>{n===1?'None':n}</option>)}
      </select></label>
    </div>
    {!pending&&<button type="button" className="button button-gold" onClick={roll}
      disabled={!hero||!skill||!npc||!activeScene||favor>(stats?.availableResolve??0)||
        !valid(opponentRating,100)||!validMod(opponentModifier)}>
      <Dices size={16}/> Roll both combatants</button>}
    {pending&&<div className="solo-combat-preview" role="status">
      <div className="solo-combat-rolls">
        <div><span>{pending.direction==='hero-attacks'?'Attacker · Hero':'Attacker · NPC'}</span>
          <strong>{pending.direction==='hero-attacks'?pending.heroRoll:pending.opponentRoll}</strong></div>
        <div><span>{pending.direction==='hero-attacks'?'Defender · NPC':'Defender · Hero'}</span>
          <strong>{pending.direction==='hero-attacks'?pending.opponentRoll:pending.heroRoll}</strong></div>
      </div>
      <div className="solo-combat-verdict"><strong>{pending.attackerWon?'Attacker wins':'No successful attack'}</strong>
        <span>Degree {pending.degree} · {pending.reason}</span></div>
      {pending.hit&&<>
        <p className="solo-combat-location"><strong>{pending.hit.label} · {pending.hit.detail}</strong>
          <span>{targetHero?'Wound target: hero':'Wound target: '+(npc?.name||'NPC')}</span></p>
        <div className="solo-combat-sources">{sectionLink(176,'Hit location')}
          {sectionLink(175,'Protection')}</div>
        <div className="solo-combat-fields solo-combat-damage">
          {pending.direction==='hero-attacks'&&weapons.length>0&&<label className="field"><span>Hero weapon reference (manual)</span>
            <select value={weaponId} onChange={e=>setWeaponId(e.target.value)}>
              <option value="">Choose a weapon</option>
              {weapons.map(w=><option key={w.id} value={w.id}>{w.name}{w.damage?' · DMG '+w.damage:''}</option>)}
            </select>
            {weapon&&valid(weapon.damage)&&<button type="button" className="solo-combat-preset"
              onClick={()=>setBaseDamage(weapon.damage)}>Use numeric DMG: {weapon.damage}</button>}
          </label>}
          <label className="field"><span>Base damage (adjudicated)</span><input type="number"
            min="0" max="999" step="1" value={baseDamage} aria-label="Combat base damage"
            onChange={e=>setBaseDamage(e.target.value)} placeholder="Required"/></label>
          <label className="field"><span>Damage type</span><select value={type}
            onChange={e=>setType(e.target.value as 'external'|'internal')}>
            <option value="external">External</option><option value="internal">Internal · bypass AP</option>
          </select></label>
          {type==='external'&&<label className="field"><span>Location Armor AP</span>
            <input type="number" min="0" max="999" step="1" value={armorAP}
              aria-label="Combat location armor AP" onChange={e=>setArmorAP(e.target.value)}/>
            {locationAP&&valid(locationAP)&&<button type="button" className="solo-combat-preset"
              onClick={()=>setArmorAP(locationAP)}>Use hero location AP: {locationAP}</button>}
          </label>}
          {type==='external'&&<label className="solo-combat-check"><input type="checkbox"
            checked={applyShield} onChange={e=>setApplyShield(e.target.checked)}/> Apply shield AP (GM decision)</label>}
          {type==='external'&&applyShield&&<label className="field"><span>Shield AP</span>
            <input type="number" min="0" max="999" step="1" value={shieldAP}
              aria-label="Combat shield AP" onChange={e=>setShieldAP(e.target.value)}/>
            {targetHero&&sheet&&valid(sheet.shield.ap)&&<button type="button" className="solo-combat-preset"
              onClick={()=>setShieldAP(sheet.shield.ap)}>Use hero shield AP: {sheet.shield.ap}</button>}
          </label>}
          <label className="field"><span>Injury description (optional)</span><input maxLength={1100}
            value={injury} onChange={e=>setInjury(e.target.value)} placeholder="Slash, impact, burn…"/></label>
          <label className="solo-combat-check"><input type="checkbox" checked={nonlethal}
            onChange={e=>setNonlethal(e.target.checked)}/> Non-lethal wound</label>
        </div>
        {computed?<div className="solo-combat-total"><span>{computed.incoming} incoming − {computed.appliedArmor} armor
          − {computed.appliedShield} shield</span><strong>{computed.woundPoints} WP</strong>
          {computed.woundPoints>999&&<small>Above supported wound-record capacity; adjudicate manually.</small>}
        </div>:<p className="solo-combat-warning">Enter base damage and protection to preview the result before confirmation.</p>}
      </>}
      {!pending.attackerWon&&<p className="muted">No hit or damage is applied. Confirming records the exchange
        {pending.heroFavor?' and spends '+pending.heroFavor+' Resolve':''}.</p>}
      <div className="solo-combat-actions">
        <button type="button" className="button button-gold" onClick={apply}
          disabled={pending.attackerWon&&(!computed||computed.woundPoints>999)}>
          <CheckCircle2 size={15}/> Confirm exchange</button>
        <button type="button" className="button button-quiet" onClick={()=>setPending(null)}>
          <X size={15}/> Discard</button>
      </div>
    </div>}
    {recent.length>0&&<div className="solo-combat-recent">
      <strong>Confirmed exchanges · undo with safeguards</strong>
      {recent.map(entry=><div key={entry.id}><span>{entry.message}</span>
        <button type="button" className="solo-combat-undo" onClick={()=>onUndo(entry.combatAction!.id)}>
          <RotateCcw size={14}/> Undo</button></div>)}
    </div>}
  </section>;
}

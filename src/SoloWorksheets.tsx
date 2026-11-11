import {useState} from 'react';
import {BookOpen,ClipboardList,Plus,Trash2,Users} from 'lucide-react';
import {freshId} from './engine.ts';
import {SOLO_SOURCE} from './soloEngine.ts';
import type {SoloCampaign} from './soloEngine.ts';
import {editSceneWorksheet,editNPCWorksheet,editThreadWorksheet} from './soloWorksheetModel.ts';
import './soloWorksheets.css';

const dispositions=['Unknown','Friendly','Neutral','Wary','Hostile','Allied'] as const;
const logKinds=['all','scene','oracle','event','check','opposed','journal','npc','board'] as const;
type LogFilter=typeof logKinds[number];

export function SoloWorksheets({campaign,onChange,onOpenRule,onOpenSheet}:{
 campaign:SoloCampaign;
 onChange:(fn:(current:SoloCampaign)=>SoloCampaign)=>void;
 onOpenRule:(page:number)=>void;
 onOpenSheet:()=>void;
}){
  const [chosenScene,setChosenScene]=useState('');
  const [chosenNPC,setChosenNPC]=useState('');
  const [newNPC,setNewNPC]=useState('');
  const [newThread,setNewThread]=useState('');
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<LogFilter>('all');
  const [latestFirst,setLatestFirst]=useState(true);
  const scene=campaign.scenes.find(s=>s.id===chosenScene)||
    campaign.scenes.find(s=>s.id===campaign.activeSceneId)||campaign.scenes.at(-1);
  const npc=campaign.npcs.find(n=>n.id===chosenNPC)||campaign.npcs[0];
  const addNPC=()=>{
    const name=newNPC.trim().slice(0,150);
    if(!name||campaign.npcs.length>=100)return;
    const id=freshId();
    onChange(c=>({...c,npcs:[...c.npcs,{id,name,role:'',disposition:'Unknown',details:'',tags:''}]}));
    setChosenNPC(id);setNewNPC('');
  };
  const addThread=()=>{
    const title=newThread.trim().slice(0,400);
    if(!title||campaign.threads.length>=150)return;
    onChange(c=>({...c,threads:[...c.threads,{id:freshId(),title,done:false}]}));
    setNewThread('');
  };
  const logs=campaign.journal.filter(item=>(filter==='all'||item.kind===filter)&&
    (!query||item.message.toLowerCase().includes(query.toLowerCase()))).slice(-150);
  if(latestFirst)logs.reverse();
  const source=(page:number)=> <button className="solo-worksheet-source" type="button" onClick={()=>onOpenRule(page)}>
    <BookOpen size={14}/> PDF {page}</button>;
  return <div className="solo-worksheets">
    <div className="solo-workbook-intro"><ClipboardList size={21}/><div><h2>Campaign workbook</h2>
      <p>Editable scene records, NPC dossiers, story threads and a searchable action ledger. Every change uses the existing campaign save.</p></div>
      <button className="button button-quiet button-small" onClick={onOpenSheet}>Character sheet</button></div>

    <div className="solo-workbook-grid">
      <section className="panel solo-workbook-card">
        <div className="solo-workbook-heading"><div><span>01 / Scene worksheet</span><h3>Scene record</h3></div>{source(SOLO_SOURCE.sceneStart)}</div>
        <label className="field"><span>Review scene</span><select value={scene?.id??''} onChange={e=>setChosenScene(e.target.value)}>
          {campaign.scenes.length===0?<option value="">No scenes created</option>:
           campaign.scenes.map(s=><option key={s.id} value={s.id}>{s.title} · {s.status}</option>)}
        </select></label>
        {scene?<div className="solo-workbook-fields">
          <label className="field"><span>Scene title</span><input maxLength={120} value={scene.title} onChange={e=>
            onChange(c=>editSceneWorksheet(c,scene.id,{title:e.target.value}))}/></label>
          <label className="field"><span>Location</span><input maxLength={180} value={scene.location} onChange={e=>
            onChange(c=>editSceneWorksheet(c,scene.id,{location:e.target.value}))}/></label>
          <label className="field solo-workbook-wide"><span>Expected opening</span><textarea rows={3} maxLength={1200} value={scene.expected} onChange={e=>
            onChange(c=>editSceneWorksheet(c,scene.id,{expected:e.target.value}))}/></label>
          <label className="field solo-workbook-wide"><span>Outcome / discovered facts</span><textarea rows={3} maxLength={3000} value={scene.outcome} onChange={e=>
            onChange(c=>editSceneWorksheet(c,scene.id,{outcome:e.target.value}))}/></label>
          <p className="solo-worksheet-meta">{scene.status==='active'?'Active scene':'Closed scene'} · Changes are saved locally</p>
        </div>:<p className="solo-worksheet-empty">Start a scene in Play scene to create a worksheet.</p>}
      </section>

      <section className="panel solo-workbook-card">
        <div className="solo-workbook-heading"><div><span>02 / Character dossier</span><h3>People in the fiction</h3></div>{source(SOLO_SOURCE.npcs)}</div>
        <div className="solo-workbook-new"><input maxLength={150} aria-label="New NPC name" placeholder="New character name..." value={newNPC}
          onChange={e=>setNewNPC(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addNPC();}}/>
          <button className="button button-quiet button-small" disabled={!newNPC.trim()||campaign.npcs.length>=100} onClick={addNPC}><Plus size={15}/> Add</button></div>
        <div className="solo-workbook-table-scroll"><table className="solo-workbook-table">
          <thead><tr><th>NPC</th><th>Role</th><th>Disposition</th><th>Open</th></tr></thead>
          <tbody>{campaign.npcs.map(n=><tr key={n.id} className={npc?.id===n.id?'selected':''}>
            <td><input aria-label={n.name+' name'} maxLength={150} value={n.name} onChange={e=>
              onChange(c=>editNPCWorksheet(c,n.id,{name:e.target.value}))}/></td>
            <td><input aria-label={n.name+' role'} maxLength={200} value={n.role} onChange={e=>
              onChange(c=>editNPCWorksheet(c,n.id,{role:e.target.value}))}/></td>
            <td><select aria-label={n.name+' disposition'} value={n.disposition}
              onChange={e=>onChange(c=>editNPCWorksheet(c,n.id,{disposition:e.target.value}))}>
              {!dispositions.includes(n.disposition as typeof dispositions[number])&&<option value={n.disposition}>{n.disposition}</option>}
              {dispositions.map(v=><option key={v} value={v}>{v}</option>)}</select></td>
            <td><button className="solo-workbook-open" type="button" onClick={()=>setChosenNPC(n.id)} aria-label={'Open dossier for '+n.name}><Users size={15}/></button></td>
          </tr>)}</tbody>
        </table>{campaign.npcs.length===0&&<p className="solo-worksheet-empty">Create an NPC to begin your campaign dossier.</p>}</div>
        {npc&&<div className="solo-npc-dossier">
          <div className="solo-workbook-heading"><h3>{npc.name||'Unnamed NPC'} · dossier</h3><button type="button" title="Delete selected NPC"
            onClick={()=>onChange(c=>({...c,npcs:c.npcs.filter(n=>n.id!==npc.id),tokens:c.tokens.filter(t=>t.npcId!==npc.id)}))}><Trash2 size={15}/></button></div>
          <label className="field"><span>Traits and tags</span><input maxLength={1000} value={npc.tags} onChange={e=>
            onChange(c=>editNPCWorksheet(c,npc.id,{tags:e.target.value}))}/></label>
          <label className="field"><span>Secrets, bonds, motivation and developments</span>
            <textarea maxLength={4000} rows={4} value={npc.details} onChange={e=>
              onChange(c=>editNPCWorksheet(c,npc.id,{details:e.target.value}))}/></label>
          {(npc.combatWounds?.length??0)>0&&<section className="solo-npc-wound-ledger" aria-label="Recorded NPC combat wounds">
            <h4>Recorded combat wounds · {npc.combatWounds?.length}</h4>
            {npc.combatWounds?.map(w=><div key={w.id}>
              <strong>{w.location} / {w.detail} · {w.wp} WP</strong>
              <span>{w.injury||'Unspecified injury'}{w.nonlethal?' · non-lethal':''}</span>
            </div>)}
            <p>Combat rolls are preserved in the chronicle. Use their Undo action to reverse a wound safely.</p>
          </section>}
        </div>}
      </section>
    </div>

    <section className="panel solo-workbook-card">
      <div className="solo-workbook-heading"><div><span>03 / Plot management</span><h3>Open questions and threads</h3></div>
        <span className="solo-workbook-count">{campaign.threads.filter(t=>!t.done).length} active</span></div>
      <div className="solo-workbook-new"><input maxLength={400} aria-label="New story thread" placeholder="What remains unresolved?"
        value={newThread} onChange={e=>setNewThread(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addThread();}}/>
        <button className="button button-quiet button-small" disabled={!newThread.trim()||campaign.threads.length>=150}
          onClick={addThread}><Plus size={15}/> Add thread</button></div>
      <div className="solo-workbook-table-scroll"><table className="solo-workbook-table">
        <thead><tr><th>Resolved</th><th>Story thread / question</th><th>Remove</th></tr></thead>
        <tbody>{campaign.threads.map(t=><tr key={t.id} className={t.done?'resolved':''}>
          <td><input aria-label={'Resolve '+t.title} type="checkbox" checked={t.done} onChange={e=>
            onChange(c=>editThreadWorksheet(c,t.id,{done:e.target.checked}))}/></td>
          <td><input aria-label="Thread title" maxLength={400} value={t.title} onChange={e=>
            onChange(c=>editThreadWorksheet(c,t.id,{title:e.target.value}))}/></td>
          <td><button type="button" className="solo-workbook-open" aria-label={'Delete thread '+t.title} onClick={()=>
            onChange(c=>({...c,threads:c.threads.filter(x=>x.id!==t.id)}))}><Trash2 size={14}/></button></td>
        </tr>)}</tbody>
      </table>{campaign.threads.length===0&&<p className="solo-worksheet-empty">No unresolved threads yet.</p>}</div>
    </section>

    <section className="panel solo-workbook-card">
      <div className="solo-workbook-heading"><div><span>04 / Chronicle</span><h3>Roll and action ledger</h3></div>
        <span className="solo-workbook-count">{logs.length} visible</span></div>
      <div className="solo-workbook-ledger-filters">
        <label className="field"><span>Filter event</span><select value={filter} onChange={e=>setFilter(e.target.value as LogFilter)}>
          {logKinds.map(k=><option value={k} key={k}>{k==='all'?'All event types':k}</option>)}</select></label>
        <label className="field"><span>Search description</span><input value={query} placeholder="Find a roll or decision..."
          onChange={e=>setQuery(e.target.value)}/></label>
        <label className="field"><span>Order</span><select value={latestFirst?'newest':'oldest'}
          onChange={e=>setLatestFirst(e.target.value==='newest')}>
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
      </div>
      <div className="solo-workbook-table-scroll"><table className="solo-workbook-table solo-workbook-log">
        <thead><tr><th>When</th><th>Type</th><th>Roll</th><th>Record</th><th>Source</th></tr></thead>
        <tbody>{logs.map(l=><tr key={l.id}>
          <td>{new Date(l.createdAt).toLocaleDateString()}</td><td>{l.kind}</td><td>{l.roll??'—'}</td>
          <td>{l.message}</td><td>{l.sourcePage?<button className="solo-workbook-open" onClick={()=>
            onOpenRule(l.sourcePage!)}><BookOpen size={14}/>{l.sourcePage}</button>:'—'}</td>
        </tr>)}</tbody>
      </table>{logs.length===0&&<p className="solo-worksheet-empty">No events match the selected filters.</p>}</div>
      <p className="solo-worksheet-meta">Historical events are read-only records; edits belong in their respective active worksheets.</p>
    </section>
  </div>;
}

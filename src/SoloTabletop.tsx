import {useEffect,useState} from 'react';
import {ArrowDownToLine,BookOpen,CheckCircle2,Compass,Dices,FileUp,Map,Plus,ScrollText,Shield,Trash2,Users,X} from 'lucide-react';
import {freshId,rollPercentile} from './engine.ts';
import type {Character} from './types.ts';
import {MechanicsPanel} from './MechanicsPanel.tsx';
import {SOLO_STORAGE_KEY,SOLO_SOURCE,addSoloLog,beginSoloScene,closeSoloScene,customOracle,isSoloCampaign,makeSoloCampaign,makeSoloLog,manualOracle,moveSoloToken,readSoloCampaigns} from './soloEngine.ts';
import type {OracleOutcome,SoloCampaign,SoloLogKind,SoloToken} from './soloEngine.ts';
import './soloTabletop.css';

const STORE=SOLO_STORAGE_KEY;
type Tab='play'|'board'|'cast'|'journal';
type SceneRoll='expected'|'altered'|'interrupted';
const LABELS:Record<OracleOutcome,string>={'extreme-yes':'Extreme yes',yes:'Yes',no:'No','extreme-no':'Extreme no'};
const trim=(s:string,n=800)=>s.trim().slice(0,n);
const outcomeLabel=(n:SceneRoll)=>n==='expected'?'As expected':n==='altered'?'Altered expectation':'Unexpected interruption';
export function SoloTabletop({characters,activeCharacterId,onOpenRule,onOpenSheet,requestedMode}:{
  characters:Character[];
  activeCharacterId:string;
  onOpenRule:(pdfPage:number)=>void;
  onOpenSheet:()=>void;
  requestedMode?:import('./MechanicsPanel.tsx').Mode;
}){
  const [campaigns,setCampaigns]=useState<SoloCampaign[]>(()=>{
    try{
      const old=readSoloCampaigns(localStorage.getItem(STORE));
      return old.length?old:[makeSoloCampaign(activeCharacterId)];
    }catch{return [makeSoloCampaign(activeCharacterId)];}
  });
  const [activeId,setActiveId]=useState(()=>{try{return localStorage.getItem(STORE+'-active')||'';}catch{return '';}});
  const [tab,setTab]=useState<Tab>('play');
  const [notice,setNotice]=useState('');
  const [sceneTitle,setSceneTitle]=useState('');
  const [sceneLocation,setSceneLocation]=useState('');
  const [sceneExpected,setSceneExpected]=useState('');
  const [sceneOutcome,setSceneOutcome]=useState('');
  const [sceneRoll,setSceneRoll]=useState<number|null>(null);
  const [sceneInterpretation,setSceneInterpretation]=useState<SceneRoll>('expected');
  const [oracleQuestion,setOracleQuestion]=useState('');
  const [oracleMode,setOracleMode]=useState<'book'|'custom'>('book');
  const [oracleChance,setOracleChance]=useState(50);
  const [oracleDie,setOracleDie]=useState<number|null>(null);
  const [oracleOutcome,setOracleOutcome]=useState<OracleOutcome>('yes');
  const [oracleMeaning,setOracleMeaning]=useState('');
  const [eventDice,setEventDice]=useState<{action:number;subject:number}|null>(null);
  const [eventAction,setEventAction]=useState('');
  const [eventSubject,setEventSubject]=useState('');
  const [eventMeaning,setEventMeaning]=useState('');
  const [npcName,setNpcName]=useState('');
  const [npcRole,setNpcRole]=useState('');
  const [threadTitle,setThreadTitle]=useState('');
  const [zoneName,setZoneName]=useState('');
  const [tokenName,setTokenName]=useState('');
  const [tokenNpc,setTokenNpc]=useState('');
  const [selectedToken,setSelectedToken]=useState('');
  const [boardFile,setBoardFile]=useState<File|null>(null);
  const [boardUrl,setBoardUrl]=useState('');
  const [journalText,setJournalText]=useState('');
  const [journalFilter,setJournalFilter]=useState<'all'|SoloLogKind>('all');

  const campaign=campaigns.find(c=>c.id===activeId)||campaigns[0];
  const activeScene=campaign.scenes.find(s=>s.id===campaign.activeSceneId);
  const hero=characters.find(c=>c.id===campaign.characterId);
  const currentTokens=campaign.tokens.filter(t=>t.sceneId===campaign.activeSceneId);
  const visibleLog=campaign.journal.filter(e=>journalFilter==='all'||e.kind===journalFilter).slice(-120).reverse();

  useEffect(()=>{try{localStorage.setItem(STORE,JSON.stringify(campaigns));}catch{setNotice('Local storage full or unavailable; export the campaign now.');}},[campaigns]);
  useEffect(()=>{try{localStorage.setItem(STORE+'-active',campaign.id);}catch{/* private browsing */}},[campaign.id]);
  useEffect(()=>{
    if(!boardFile){setBoardUrl('');return;}
    const url=URL.createObjectURL(boardFile);
    setBoardUrl(url);
    return()=>URL.revokeObjectURL(url);
  },[boardFile]);
  useEffect(()=>{setSelectedToken('');setBoardFile(null);},[campaign.activeSceneId,campaign.id]);

  const change=(fn:(c:SoloCampaign)=>SoloCampaign)=>{
    setCampaigns(prev=>prev.map(c=>c.id===campaign.id?fn(c):c));
  };
  const log=(kind:SoloLogKind,message:string,page?:number,roll?:number)=>{
    change(c=>addSoloLog(c,makeSoloLog(kind,trim(message,4200),c.activeSceneId,page,roll)));
  };
  const error=(e:unknown)=>setNotice(e instanceof Error?e.message:'Could not complete this action');
  const createCampaign=()=>{
    if(campaigns.length>=30){setNotice('Maximum 30 campaigns. Export and delete older ones first.');return;}
    const next=makeSoloCampaign(activeCharacterId);
    setCampaigns(old=>[...old,next]);setActiveId(next.id);setTab('play');
    setNotice('New solo campaign created.');
  };
  const removeCampaign=()=>{
    if(!window.confirm('Permanently delete this solo campaign? Export it first if needed.'))return;
    if(campaigns.length===1){
      const next=makeSoloCampaign(activeCharacterId);setCampaigns([next]);setActiveId(next.id);
    }else {
      setCampaigns(prev=>prev.filter(c=>c.id!==campaign.id));
      setActiveId(campaigns.find(c=>c.id!==campaign.id)!.id);
    }
  };
  const downloadCampaign=()=>{
    const blob=new Blob([JSON.stringify({format:'wayfarers-solo',version:1,campaign},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');
    anchor.href=url;anchor.download='wayfarers-solo-campaign.json';anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    setNotice('Campaign archive downloaded.');
  };
  const importCampaign=async(file:File|undefined)=>{
    if(!file)return;
    try{
      if(file.size>5_000_000)throw new Error('Import must be under 5 MB');
      const obj:unknown=JSON.parse(await file.text());
      if(!obj||typeof obj!=='object'||(obj as {format?:string}).format!=='wayfarers-solo')throw new Error('Unsupported campaign archive');
      const imported=(obj as {campaign?:unknown}).campaign;
      if(!isSoloCampaign(imported))throw new Error('Invalid campaign data');
      if(campaigns.length>=30)throw new Error('Maximum 30 campaigns');
      const c={...imported,id:freshId(),title:trim(imported.title+' (imported)',120)};
      setCampaigns(prev=>[...prev,c]);setActiveId(c.id);setNotice('Campaign restored from archive.');
    }catch(e){error(e);}
  };
  const openScene=()=>{
    try{
      change(c=>beginSoloScene(c,sceneTitle,sceneLocation,sceneExpected));
      setSceneTitle('');setSceneLocation('');setSceneExpected('');
      setSceneRoll(null);setSceneOutcome('');
    }catch(e){error(e);}
  };
  const finishScene=()=>{
    try{change(c=>closeSoloScene(c,sceneOutcome));setSceneOutcome('');setSceneRoll(null);}
    catch(e){error(e);}
  };
  const recordSceneRoll=()=>{
    if(sceneRoll===null)return;
    log('scene','Scene expectation check d100 '+sceneRoll+': '+outcomeLabel(sceneInterpretation)+
      '. Interpretation confirmed from personal rulebook.',SOLO_SOURCE.sceneStart,sceneRoll);
    setSceneRoll(null);
  };
  const recordOracle=()=>{
    if(oracleDie===null||!trim(oracleQuestion))return setNotice('Enter a yes/no question and roll first.');
    try{
      const r=oracleMode==='book'?manualOracle(oracleDie,oracleOutcome):customOracle(oracleDie,oracleChance);
      const message='Oracle: '+trim(oracleQuestion,300)+'? — d100 '+oracleDie+' → '+LABELS[r.outcome]+
        (r.event?' · matching dice: random event':'')+(trim(oracleMeaning)?' · '+trim(oracleMeaning,600):'')+
        (oracleMode==='custom'?' [custom probability, not the printed chart]':' [interpreted using personal table]');
      log('oracle',message,SOLO_SOURCE.oracle,oracleDie);
      setOracleDie(null);setOracleQuestion('');setOracleMeaning('');
      if(r.event)setNotice('Matching dice: resolve a Random Event using your source table.');
    }catch(e){error(e);}
  };
  const recordEvent=()=>{
    if(!eventDice)return;
    log('event','Random event prompts: '+eventDice.action+'/'+eventDice.subject+
      ' — '+(trim(eventAction,100)||'?')+' + '+(trim(eventSubject,100)||'?')+
      (trim(eventMeaning)?' → '+trim(eventMeaning,900):'')+' [consult book tables]',
      SOLO_SOURCE.randomizers);
    setEventDice(null);setEventAction('');setEventSubject('');setEventMeaning('');
  };
  const addNPC=()=>{
    const name=trim(npcName,150);
    if(!name){setNotice('Enter an NPC name.');return;}
    if(campaign.npcs.length>=100){setNotice('Maximum 100 NPCs');return;}
    change(c=>({...c,npcs:[...c.npcs,{id:freshId(),name,role:trim(npcRole,200),disposition:'Unknown',details:'',tags:''}]}));
    log('npc','NPC created: '+name,SOLO_SOURCE.npcs);
    setNpcName('');setNpcRole('');
  };
  const addThread=()=>{
    const title=trim(threadTitle,400);
    if(!title||campaign.threads.length>=150)return;
    change(c=>({...c,threads:[...c.threads,{id:freshId(),title,done:false}]}));
    setThreadTitle('');
  };
  const addZone=()=>{
    const label=trim(zoneName,150);
    if(!label||campaign.zones.length>=20)return;
    change(c=>({...c,zones:[...c.zones,{id:freshId(),label}]}));
    setZoneName('');
  };
  const addToken=(kind:'hero'|'npc'|'other')=>{
    if(!activeScene){setNotice('Begin a scene before placing tokens.');return;}
    if(campaign.tokens.length>=100){setNotice('Maximum 100 board tokens');return;}
    const npc=campaign.npcs.find(n=>n.id===tokenNpc);
    const name=kind==='hero'?(hero?.name||'Hero'):kind==='npc'?(npc?.name||''):trim(tokenName,150);
    if(!name){setNotice('Choose an NPC or name the token.');return;}
    const token:SoloToken={id:freshId(),name,kind,npcId:kind==='npc'?(npc?.id||null):null,
      sceneId:activeScene.id,zoneId:campaign.zones[0].id};
    change(c=>({...c,tokens:[...c.tokens,token]}));
    setSelectedToken(token.id);setTokenName('');
  };
  const moveToken=(tokenId:string,zoneId:string)=>{
    try{change(c=>moveSoloToken(c,tokenId,zoneId));}
    catch(e){error(e);}
  };
  const updateNPC=(id:string,changes:Partial<{name:string;role:string;disposition:string;tags:string;details:string}>)=>{
    change(c=>({...c,npcs:c.npcs.map(n=>n.id===id?{...n,...changes}:n)}));
  };
  const docButton=(page:number,label:string)=><button type="button" className="solo-source-link" onClick={()=>onOpenRule(page)}>
    <BookOpen size={14}/> {label} · PDF {page}</button>;
  return <div className="solo-tabletop">
    <header className="page-heading"><div className="eyebrow"><Compass size={15}/> SOLO CAMPAIGN CONTROL</div>
      <h1>Play the <em>unknown.</em></h1>
      <p>Scenes, dice, source-linked oracles, evolving NPCs, goals and a tabletop zone board—designed for one-player adventures.</p></header>
    <section className="panel solo-topbar">
      <div className="solo-top-select">
        <label className="field"><span>Campaign</span><select value={campaign.id} onChange={e=>{setActiveId(e.target.value);setTab('play');}}>{campaigns.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
        <label className="field"><span>Player character</span><select value={campaign.characterId} onChange={e=>change(c=>({...c,characterId:e.target.value}))}>
          <option value="">Unassigned</option>{characters.map(c=><option value={c.id} key={c.id}>{c.name||'Unnamed character'}</option>)}
        </select></label>
      </div>
      <div className="solo-top-actions">
        <button className="button button-quiet button-small" onClick={createCampaign}><Plus size={15}/> New campaign</button>
        <button className="button button-quiet button-small" onClick={downloadCampaign}><ArrowDownToLine size={15}/> Export save</button>
        <label className="button button-quiet button-small"><FileUp size={15}/> Import save
          <input className="hidden-input" type="file" accept=".json,application/json" onChange={e=>{void importCampaign(e.target.files?.[0]);e.target.value='';}}/></label>
        <button className="button button-outline-danger button-small" onClick={removeCampaign}><Trash2 size={15}/> Delete</button>
      </div>
      <label className="field solo-campaign-name"><span>Campaign title</span>
        <input maxLength={120} value={campaign.title} onChange={e=>change(c=>({...c,title:e.target.value}))}/></label>
      <label className="field solo-campaign-premise"><span>Premise / campaign setup</span>
        <textarea rows={2} maxLength={5000} value={campaign.premise} placeholder="Where does the story begin? What is at stake?"
          onChange={e=>change(c=>({...c,premise:e.target.value}))}/></label>
    </section>
    <div className="solo-metrics">
      <span><strong>{campaign.scenes.length}</strong> scenes</span>
      <span><strong>{campaign.npcs.length}</strong> NPCs</span>
      <span><strong>{campaign.threads.filter(t=>!t.done).length}</strong> open threads</span>
      <span><strong>{campaign.journal.length}</strong> journal events</span>
      <span className={activeScene?'solo-active-scene':''}>{activeScene?'LIVE · '+activeScene.title:'No active scene'}</span>
    </div>
    <div className="solo-main-tabs" role="tablist" aria-label="Solo tabletop workspace">
      {([
        ['play','Play scene',Dices],['board','Scene board',Map],['cast','NPCs & threads',Users],['journal','Campaign journal',ScrollText]
      ] as const).map(([key,label,Icon])=><button key={key} role="tab" aria-selected={tab===key} className={tab===key?'selected':''} onClick={()=>setTab(key)}><Icon size={17}/>{label}</button>)}
    </div>
    {notice&&<div className="reference-warning" role="status">{notice}<button aria-label="Dismiss" onClick={()=>setNotice('')}><X size={15}/></button></div>}
    {tab==='play'&&<div className="solo-play-layout">
      <div className="solo-play-primary">
        <section className="panel solo-session-card">
          <div className="solo-panel-header"><div className="eyebrow">SCENE PROCEDURE</div>{docButton(SOLO_SOURCE.sceneStart,'Scene changes')}</div>
          {activeScene?<><h3>{activeScene.title}</h3>
            <p className="muted">{activeScene.location||'Location not set'}</p>
            {activeScene.expected&&<div className="solo-story-snippet"><strong>Expected opening</strong><p>{activeScene.expected}</p></div>}
            <div className="solo-two-fields">
              <button className="button button-quiet button-small" onClick={()=>setSceneRoll(rollPercentile())}><Dices size={15}/> Roll scene expectations</button>
              {sceneRoll!==null&&<div className="solo-roll-readout">d100: <strong>{sceneRoll}</strong>
                <label className="field"><span>Choose result from the book</span><select value={sceneInterpretation} onChange={e=>setSceneInterpretation(e.target.value as SceneRoll)}>
                  <option value="expected">As expected</option><option value="altered">Altered</option><option value="interrupted">Unexpected interruption</option></select></label>
                <button className="button button-quiet button-small" onClick={recordSceneRoll}>Record result</button></div>}
            </div>
            <label className="field"><span>How does this scene end?</span><textarea rows={3} value={sceneOutcome} onChange={e=>setSceneOutcome(e.target.value)} placeholder="Summarize changes, discoveries and next steps..."/></label>
            <button className="button button-gold" onClick={finishScene}><CheckCircle2 size={16}/> Close scene</button>
          </>:<><h3>Begin a scene</h3>
            <p className="muted">Declare the expected opening before consulting the scene-change table.</p>
            <div className="solo-form-grid">
              <label className="field"><span>Scene title</span><input maxLength={120} value={sceneTitle} onChange={e=>setSceneTitle(e.target.value)} placeholder="The gatehouse"/></label>
              <label className="field"><span>Location</span><input maxLength={180} value={sceneLocation} onChange={e=>setSceneLocation(e.target.value)} placeholder="The north road"/></label>
              <label className="field solo-wide"><span>What you expect to happen</span><textarea rows={3} maxLength={1200} value={sceneExpected} onChange={e=>setSceneExpected(e.target.value)} placeholder="Who is present and what is likely to happen?"/></label>
            </div><button className="button button-gold" disabled={!sceneTitle.trim()} onClick={openScene}><Plus size={16}/> Open scene</button>
          </>}
          {campaign.scenes.length>0&&<div className="solo-scene-history"><div className="eyebrow">SCENE HISTORY</div>{[...campaign.scenes].reverse().slice(0,8).map(s=><div key={s.id}><strong>{s.title}</strong><small>{s.status==='active'?'Active':'Closed'}</small>{s.outcome&&<p>{s.outcome}</p>}</div>)}</div>}
        </section>
        <section className="panel solo-session-card">
          <div className="solo-panel-header"><div className="eyebrow">ASK THE WEAVE</div>{docButton(SOLO_SOURCE.oracle,'Oracle table')}</div>
          <h3>Ask a consequential question</h3>
          <p className="muted">The book's table interpretation is manual until its numeric bands are verified. A separate custom d100 probability mode is provided as a convenience.</p>
          <label className="field"><span>Yes/no question</span><input maxLength={300} value={oracleQuestion} onChange={e=>setOracleQuestion(e.target.value)} placeholder="Does the guard recognize us?"/></label>
          <div className="solo-choice-row">
            <label><input type="radio" checked={oracleMode==='book'} onChange={()=>setOracleMode('book')}/> Source-table interpretation</label>
            <label><input type="radio" checked={oracleMode==='custom'} onChange={()=>setOracleMode('custom')}/> Custom probability</label>
          </div>
          {oracleMode==='custom'&&<label className="field"><span>Chance of yes (%) — custom, not official</span>
            <input type="number" min={1} max={99} value={oracleChance} onChange={e=>setOracleChance(Number(e.target.value))}/></label>}
          <button className="button button-quiet" onClick={()=>setOracleDie(rollPercentile())}><Dices size={15}/> Roll d100 oracle</button>
          {oracleDie!==null&&<div className="solo-oracle-result"><strong className="solo-big-roll">{String(oracleDie).padStart(2,'0')}</strong>
            {oracleMode==='book'?<label className="field"><span>Outcome according to your PDF table</span>
              <select value={oracleOutcome} onChange={e=>setOracleOutcome(e.target.value as OracleOutcome)}>
                {Object.entries(LABELS).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>:
              <div><strong>{Number.isInteger(oracleChance)&&oracleChance>=1&&oracleChance<=99?LABELS[customOracle(oracleDie,oracleChance).outcome]:'Enter a valid chance from 1 to 99'}</strong><p className="muted">Custom quick oracle only.</p></div>}
            {(oracleDie===100||oracleDie%11===0)&&<p className="solo-event-warning">Matching dice! Generate a random event after recording.</p>}
          </div>}
          <label className="field"><span>Interpret the answer in your fiction</span><textarea rows={2} value={oracleMeaning} onChange={e=>setOracleMeaning(e.target.value)} placeholder="What does this answer imply?"/></label>
          <button className="button button-gold" disabled={!oracleQuestion.trim()||oracleDie===null} onClick={recordOracle}>Record oracle answer</button>
        </section>
        <section className="panel solo-session-card">
          <div className="solo-panel-header"><div className="eyebrow">RANDOM EVENT PROMPTS</div>{docButton(SOLO_SOURCE.randomizers,'Action & subject')}</div>
          <h3>Generate a twist</h3>
          <p className="muted">Roll the two d100 indexes, then enter the action and subject from your own book. This preserves the exact source tables without shipping copied entries.</p>
          <button className="button button-quiet" onClick={()=>setEventDice({action:rollPercentile(),subject:rollPercentile()})}><Dices size={15}/> Roll Action + Subject</button>
          {eventDice&&<div className="solo-event-dice"><strong>Action {eventDice.action}</strong><strong>Subject {eventDice.subject}</strong></div>}
          <div className="solo-form-grid">
            <label className="field"><span>Action prompt</span><input value={eventAction} maxLength={100} onChange={e=>setEventAction(e.target.value)} placeholder="Look up rolled action"/></label>
            <label className="field"><span>Subject prompt</span><input value={eventSubject} maxLength={100} onChange={e=>setEventSubject(e.target.value)} placeholder="Look up rolled subject"/></label>
            <label className="field solo-wide"><span>Your interpretation</span><textarea rows={2} value={eventMeaning} onChange={e=>setEventMeaning(e.target.value)} placeholder="Connect it to a current thread or NPC..."/></label>
          </div><button className="button button-gold" disabled={!eventDice} onClick={recordEvent}>Record random event</button>
        </section>
      </div>
      <div className="solo-play-secondary">
        <MechanicsPanel requestedMode={requestedMode} character={hero} onOpenRule={onOpenRule} onLog={(msg,p,roll)=>log('check',msg,p,roll)}/>
        <section className="panel solo-hero-card"><div className="solo-panel-header"><div className="eyebrow"><Shield size={15}/> ACTIVE CHARACTER</div>
          <button className="solo-source-link" onClick={onOpenSheet}>Edit sheet</button></div>
          <h3>{hero?.name||'Unassigned hero'}</h3>
          <p className="muted">{hero?.heritage||'Unknown heritage'} · {hero?.career||'Unknown career'}</p>
          <p>{hero?.goal||'Assign a character and a goal to give your story direction.'}</p>
          <div className="solo-quick-skills">{hero?.skills.slice(0,10).map(s=><span key={s.id}>{s.name} <strong>{s.rating}</strong></span>)}</div>
        </section>
      </div>
    </div>}
    {tab==='board'&&<div className="solo-board-layout">
      <section className="panel solo-board">
        <div className="solo-panel-header"><div className="eyebrow"><Map size={15}/> ZONE TABLETOP</div>{docButton(152,'Combat zones')}</div>
        <h3>{activeScene?'Scene board: '+activeScene.title:'Open a scene to use the board'}</h3>
        <p className="muted">Drag a token into another zone, or select a token then click Move here. Background images are local and are not stored.</p>
        <div className="solo-board-setup">
          <label className="button button-quiet button-small"><FileUp size={14}/> {boardFile?'Change background':'Load background image'}
            <input className="hidden-input" type="file" accept="image/*" onChange={e=>setBoardFile(e.target.files?.[0]||null)}/></label>
          {boardFile&&<button className="button button-quiet button-small" onClick={()=>setBoardFile(null)}>Clear background</button>}
        </div>
        <div className="solo-zone-grid" style={boardUrl?{backgroundImage:'linear-gradient(#09191adc,#09191add),url("'+boardUrl+'")'}:undefined}>
          {campaign.zones.map(z=><section key={z.id} className="solo-zone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(id&&currentTokens.some(t=>t.id===id))moveToken(id,z.id);}}>
            <input aria-label="Zone name" maxLength={150} value={z.label} onChange={e=>change(c=>({...c,zones:c.zones.map(x=>x.id===z.id?{...x,label:e.target.value}:x)}))}/>
            <div className="solo-zone-tokens">{currentTokens.filter(t=>t.zoneId===z.id).map(t=><button key={t.id}
              type="button" draggable onDragStart={e=>{e.dataTransfer.setData('text/plain',t.id);e.dataTransfer.effectAllowed='move';}}
              aria-pressed={selectedToken===t.id} className={'solo-token '+(t.kind==='hero'?'hero':'')+(selectedToken===t.id?' selected':'')} onClick={()=>setSelectedToken(t.id)}>
              {t.name}</button>)}</div>
            <button className="solo-zone-move" disabled={!selectedToken||!activeScene} onClick={()=>moveToken(selectedToken,z.id)}>Move selected here</button>
          </section>)}
        </div>
        <div className="solo-board-controls">
          <label className="field"><span>New zone label</span><input maxLength={150} value={zoneName} onChange={e=>setZoneName(e.target.value)} placeholder="Upper balcony"/></label>
          <button className="button button-quiet button-small" onClick={addZone} disabled={!zoneName.trim()||campaign.zones.length>=20}><Plus size={15}/> Add zone</button>
        </div>
      </section>
      <section className="panel solo-board-actors">
        <h3>Tokens & positioning</h3>
        <p className="muted">Tokens are linked to the active scene. Zone locations persist in your campaign save.</p>
        <button className="button button-quiet" disabled={!activeScene} onClick={()=>addToken('hero')}><Plus size={14}/> Place hero</button>
        <label className="field"><span>Place NPC</span><select value={tokenNpc} onChange={e=>setTokenNpc(e.target.value)}>
          <option value="">Choose NPC</option>{campaign.npcs.map(n=><option value={n.id} key={n.id}>{n.name}</option>)}</select></label>
        <button className="button button-quiet button-small" disabled={!tokenNpc||!activeScene} onClick={()=>addToken('npc')}>Place selected NPC</button>
        <label className="field"><span>Other token</span><input maxLength={150} value={tokenName} onChange={e=>setTokenName(e.target.value)} placeholder="Guard patrol"/></label>
        <button className="button button-quiet button-small" disabled={!tokenName.trim()||!activeScene} onClick={()=>addToken('other')}>Place other token</button>
        {selectedToken&&<button className="button button-outline-danger button-small" onClick={()=>{change(c=>({...c,tokens:c.tokens.filter(t=>t.id!==selectedToken)}));setSelectedToken('');}}><Trash2 size={14}/> Remove selected token</button>}
        <p className="solo-legal-mini">A zone board abstracts the battlefield, not distance or precise tactical geometry. Attack and movement eligibility still require source adjudication.</p>
      </section>
    </div>}
    {tab==='cast'&&<div className="solo-cast-layout">
      <section className="panel solo-session-card">
        <div className="solo-panel-header"><div className="eyebrow"><Users size={15}/> NPC REGISTRY</div>{docButton(SOLO_SOURCE.npcs,'Solo NPCs')}</div>
        <h3>People in the story</h3>
        <div className="solo-form-grid">
          <label className="field"><span>NPC name</span><input maxLength={150} value={npcName} onChange={e=>setNpcName(e.target.value)}/></label>
          <label className="field"><span>Role</span><input maxLength={200} value={npcRole} onChange={e=>setNpcRole(e.target.value)} placeholder="Informant"/></label>
        </div>
        <button className="button button-gold" disabled={!npcName.trim()} onClick={addNPC}><Plus size={16}/> Add NPC</button>
        <div className="solo-npc-list">{campaign.npcs.map(n=><article key={n.id}>
          <div className="solo-panel-header"><strong>{n.name}</strong><button className="solo-icon-delete" aria-label={'Delete '+n.name} onClick={()=>change(c=>({...c,npcs:c.npcs.filter(x=>x.id!==n.id),tokens:c.tokens.filter(t=>t.npcId!==n.id)}))}><Trash2 size={16}/></button></div>
          <div className="solo-form-grid">
            <label className="field"><span>Name</span><input maxLength={150} value={n.name} onChange={e=>updateNPC(n.id,{name:e.target.value})}/></label>
            <label className="field"><span>Role</span><input maxLength={200} value={n.role} onChange={e=>updateNPC(n.id,{role:e.target.value})}/></label>
            <label className="field"><span>Disposition</span><input maxLength={200} value={n.disposition} onChange={e=>updateNPC(n.id,{disposition:e.target.value})}/></label>
            <label className="field"><span>Traits / prompt tags</span><input maxLength={1000} value={n.tags} onChange={e=>updateNPC(n.id,{tags:e.target.value})}/></label>
            <label className="field solo-wide"><span>Secrets, bonds & context</span><textarea rows={2} maxLength={4000} value={n.details} onChange={e=>updateNPC(n.id,{details:e.target.value})}/></label>
          </div>
        </article>)}{campaign.npcs.length===0&&<p className="muted">Your campaign has no NPCs yet.</p>}</div>
      </section>
      <section className="panel solo-session-card">
        <div className="eyebrow">QUESTIONS & UNRESOLVED THREADS</div><h3>What matters now?</h3>
        <p className="muted">Track leads and character goals so random events can attach to existing fiction.</p>
        <label className="field"><span>New thread</span><input maxLength={400} value={threadTitle} onChange={e=>setThreadTitle(e.target.value)} placeholder="Who sent the assassin?"/></label>
        <button className="button button-gold" onClick={addThread} disabled={!threadTitle.trim()}><Plus size={15}/> Add thread</button>
        <div className="solo-thread-list">{campaign.threads.map(t=><div key={t.id}>
          <label><input type="checkbox" checked={t.done} onChange={e=>change(c=>({...c,threads:c.threads.map(x=>x.id===t.id?{...x,done:e.target.checked}:x)}))}/>
            <span style={t.done?{textDecoration:'line-through',opacity:.6}:undefined}>{t.title}</span></label>
          <button className="solo-icon-delete" onClick={()=>change(c=>({...c,threads:c.threads.filter(x=>x.id!==t.id)}))} aria-label={'Delete thread '+t.title}><Trash2 size={15}/></button>
        </div>)}{campaign.threads.length===0&&<p className="muted">No open questions recorded.</p>}</div>
      </section>
    </div>}
    {tab==='journal'&&<div className="solo-journal-layout">
      <section className="panel solo-session-card">
        <div className="solo-panel-header"><div className="eyebrow"><ScrollText size={15}/> THE CHRONICLE</div><span className="muted">{campaign.journal.length} entries</span></div>
        <label className="field"><span>Add narration or a GM note</span><textarea rows={4} maxLength={4000} value={journalText} onChange={e=>setJournalText(e.target.value)} placeholder="The candle guttered as the stranger answered..."/></label>
        <button className="button button-gold" disabled={!journalText.trim()} onClick={()=>{log('journal',journalText);setJournalText('');}}>Record in journal</button>
        <label className="field"><span>Filter entries</span><select value={journalFilter} onChange={e=>setJournalFilter(e.target.value as 'all'|SoloLogKind)}>
          <option value="all">All events</option>{['scene','oracle','event','check','opposed','journal','npc','board'].map(k=><option key={k} value={k}>{k}</option>)}</select></label>
        <div className="solo-journal-entries">{visibleLog.map(e=><article key={e.id}>
          <div><strong>{e.kind}</strong><span>{new Date(e.createdAt).toLocaleString()}</span>{e.sourcePage&&docButton(e.sourcePage,'Source')}</div>
          <p>{e.message}</p></article>)}{visibleLog.length===0&&<p className="muted">Nothing recorded yet. Begin a scene or roll the dice.</p>}</div>
      </section>
      <aside className="panel solo-session-card"><div className="eyebrow">THE TABLE'S MEMORY</div><h3>Current campaign</h3>
        <p className="muted">{campaign.title}</p><p>{campaign.premise||'No premise set.'}</p>
        <h3>Open threads</h3>{campaign.threads.filter(t=>!t.done).map(t=><p key={t.id}>• {t.title}</p>)}
        <button className="button button-quiet" onClick={downloadCampaign}><ArrowDownToLine size={15}/> Export full session data</button>
      </aside>
    </div>}
    <p className="solo-legal-mini">This is a local solo-play companion. The proprietary Ask the Weave odds, event and scene tables are intentionally not reproduced or guessed; consult your owned PDF. The custom oracle is clearly separate from the book procedure. No AI generates narrative automatically.</p>
  </div>;
}

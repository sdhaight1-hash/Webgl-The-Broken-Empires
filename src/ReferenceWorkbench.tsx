import { useEffect, useRef, useState } from 'react';
import { BookOpen, Compass, FileUp, Layers, Minus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { BOOK_LINKS, CREATION_SEQUENCE, PDF_PAGE_COUNT } from './bookIndex.ts';
import './references.css';

type Pin = { id: string; key: string; x: number; y: number; label: string };
type Size = { width: number; height: number };
const PINS_KEY = 'wayfarers-ledger-atlas-pins-v1';
const clamp = (n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
function storedPins(): Pin[] {
  try {
    const items: unknown = JSON.parse(localStorage.getItem(PINS_KEY)||'[]');
    return Array.isArray(items) ? items.filter((p):p is Pin => !!p && typeof p==='object' &&
      typeof p.key==='string' && typeof p.id==='string' && typeof p.label==='string' &&
      typeof p.x==='number' && p.x>=0 && p.x<=1 && typeof p.y==='number' && p.y>=0 && p.y<=1).slice(0,200) : [];
  } catch { return []; }
}
function useFileUrl(file: File | null):string {
  const [url,setUrl]=useState('');
  useEffect(()=>{
    if (!file) { setUrl(''); return; }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return ()=>URL.revokeObjectURL(next);
  },[file]);
  return url;
}
export function ReferenceWorkbench({requestedPage=82}:{requestedPage?:number}) {
  const [tab,setTab]=useState<'book'|'map'>('book');
  const [bookFile,setBookFile]=useState<File|null>(null);
  const [mapFile,setMapFile]=useState<File|null>(null);
  const [page,setPage]=useState(clamp(requestedPage,1,PDF_PAGE_COUNT));
  const [search,setSearch]=useState('');
  const [zoom,setZoom]=useState(1);
  const [pan,setPan]=useState({x:0,y:0});
  const [size,setSize]=useState<Size|null>(null);
  const [viewport,setViewport]=useState<Size>({width:900,height:520});
  const [mapError,setMapError]=useState('');
  const [placing,setPlacing]=useState(false);
  const [pins,setPins]=useState<Pin[]>(storedPins);
  const [selectedPin,setSelectedPin]=useState('');
  const mapRef=useRef<HTMLDivElement>(null);
  const imageRef=useRef<HTMLImageElement>(null);
  const drag=useRef<{x:number;y:number;offsetX:number;offsetY:number;moved:boolean}|null>(null);
  const bookUrl=useFileUrl(bookFile);
  const mapUrl=useFileUrl(mapFile);
  const mapKey=mapFile ? mapFile.name+':'+mapFile.size : '';
  const mapPins=pins.filter(p=>p.key===mapKey);
  const currentPin=mapPins.find(p=>p.id===selectedPin);
  useEffect(()=>setPage(clamp(requestedPage,1,PDF_PAGE_COUNT)),[requestedPage]);
  useEffect(()=>{try {localStorage.setItem(PINS_KEY,JSON.stringify(pins));}catch{/* local storage optional */}},[pins]);
  useEffect(()=>{
    const element=mapRef.current;
    if(!element) return;
    const observer=new ResizeObserver(()=>setViewport({width:element.clientWidth,height:element.clientHeight}));
    observer.observe(element);
    setViewport({width:element.clientWidth,height:element.clientHeight});
    return ()=>observer.disconnect();
  },[tab]);
  const openPage=(next:number)=>{setTab('book');setPage(clamp(Math.round(next)||1,1,PDF_PAGE_COUNT));};
  const chooseMap=async(file?:File)=>{
    setMapFile(null);setSize(null);setMapError('');setZoom(1);setPan({x:0,y:0});setSelectedPin('');
    if(!file)return;
    if(file.type!=='image/png' && !file.name.toLowerCase().endsWith('.png')){setMapError('Please choose the PNG gamemaster map.');return;}
    const header=new Uint8Array(await file.slice(0,24).arrayBuffer());
    const valid=[137,80,78,71,13,10,26,10].every((n,i)=>header[i]===n);
    if(!valid||header.length<24){setMapError('The selected file is not a valid PNG image.');return;}
    const view=new DataView(header.buffer,header.byteOffset,header.byteLength);
    const width=view.getUint32(16),height=view.getUint32(20);
    if(!width||!height){setMapError('Map image dimensions are invalid.');return;}
    setSize({width,height});setMapFile(file);
  };
  const resetView=()=>{setZoom(1);setPan({x:0,y:0});};
  const displayScale=size?Math.min(Math.max(1,viewport.width-24)/size.width,Math.max(1,viewport.height-24)/size.height):1;
  const displayWidth=size?Math.max(1,size.width*displayScale):100;
  const displayHeight=size?Math.max(1,size.height*displayScale):100;
  const addPin=(clientX:number,clientY:number)=>{
    const r=imageRef.current?.getBoundingClientRect();
    if(!r||r.width===0||r.height===0||pins.length>=200)return;
    const x=(clientX-r.left)/r.width,y=(clientY-r.top)/r.height;
    if(x<0||x>1||y<0||y>1)return;
    const pin:Pin={id:crypto.randomUUID(),key:mapKey,x,y,label:'New location'};
    setPins(prev=>[...prev,pin]);setSelectedPin(pin.id);setPlacing(false);
  };
  return <div className="references-page">
    <div className="page-heading"><div className="eyebrow"><Layers size={15}/> THE SOURCE LIBRARY</div><h1>Read. Explore. <em>Remember.</em></h1><p>Work directly alongside your personal rulebook and gamemaster map. Files are opened locally in your browser; this app does not upload or store them.</p></div>
    <div className="reference-tabs"><button className={tab==='book'?'selected':''} onClick={()=>setTab('book')}><BookOpen size={17}/> Rulebook reader</button><button className={tab==='map'?'selected':''} onClick={()=>setTab('map')}><Compass size={17}/> Interactive atlas</button></div>
    {tab==='book'?<div className="reference-layout">
      <aside className="panel reference-outline">
        <div className="eyebrow">RULEBOOK NAVIGATION</div>
        <h3>Character creation</h3><p className="muted">The 12 stages below are indexed directly from the supplied book's PDF bookmarks.</p>
        <ol className="creation-index">{CREATION_SEQUENCE.map((step,i)=><li key={step.page}><button className={page===step.page?'selected':''} onClick={()=>openPage(step.page)}><span>{String(i+1).padStart(2,'0')}</span>{step.title}<small>p. {step.page}</small></button></li>)}</ol>
        <h3>Browse all chapters</h3>
        <label className="field"><span>Filter sections</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search the contents..."/></label>
        <div className="reference-chapters">{BOOK_LINKS.filter(item=>item.title.toLowerCase().includes(search.toLowerCase())||item.group.toLowerCase().includes(search.toLowerCase())).map(item=><button key={item.page} className={page===item.page?'selected':''} onClick={()=>openPage(item.page)}><span>{item.title}</span><small>{item.page}</small></button>)}</div>
      </aside>
      <section className="panel reference-reader">
        <div className="reference-toolbar"><div><strong>Core Rulebook</strong><small>663 PDF pages · source-indexed</small></div><label className="button button-quiet button-small"><FileUp size={15}/> {bookFile?'Replace PDF':'Open your PDF'}<input type="file" className="hidden-input" accept=".pdf,application/pdf" onChange={e=>setBookFile(e.target.files?.[0]||null)}/></label></div>
        <div className="reference-page-control"><button className="button button-quiet button-small" disabled={page<=1} onClick={()=>openPage(page-1)}>Previous</button><label>PDF page <input type="number" min={1} max={PDF_PAGE_COUNT} value={page} onChange={e=>setPage(clamp(Number(e.target.value)||1,1,PDF_PAGE_COUNT))}/><span> / {PDF_PAGE_COUNT}</span></label><button className="button button-quiet button-small" disabled={page>=PDF_PAGE_COUNT} onClick={()=>openPage(page+1)}>Next</button></div>
        {bookUrl?<iframe key={bookUrl} className="reference-pdf" src={bookUrl+'#page='+page} title="Local Broken Empires rulebook" />:<div className="reference-empty"><BookOpen size={48}/><h3>Connect your rulebook</h3><p>Select <strong>ref docs/Core Rulebook.pdf</strong> from your local repository. The page-linked chapter guide will open directly to the relevant section.</p><label className="button button-gold"><FileUp size={16}/> Choose local PDF<input type="file" className="hidden-input" accept=".pdf,application/pdf" onChange={e=>setBookFile(e.target.files?.[0]||null)}/></label></div>}
        <p className="reference-footnote">Page links refer to the PDF viewer page count, not printed folio numbers. Your file is not retained when this tab reloads.</p>
      </section>
    </div>:<div className="reference-layout">
      <aside className="panel reference-outline">
        <div className="eyebrow">THE GAMEMASTER'S MAP</div><h3>Atlas tools</h3><p className="muted">Open your local reference image, zoom and pan, and place reusable location notes. Notes are stored locally; the image is not.</p>
        <label className="button button-quiet reference-file-picker"><FileUp size={16}/>{mapFile?'Change map':'Open local PNG'}<input className="hidden-input" type="file" accept="image/png,.png" onChange={e=>void chooseMap(e.target.files?.[0])}/></label>
        {size&&<p className="reference-dimensions">{size.width.toLocaleString()} × {size.height.toLocaleString()} pixels</p>}
        {size&&size.width*size.height>150_000_000&&<p className="reference-warning">This is an exceptionally large image. Browser decoding may take substantial memory. A tiled atlas will be needed for consistently smooth deep zoom.</p>}
        {mapError&&<p role="alert" className="reference-warning">{mapError}</p>}
        <div className="reference-actions"><button className="button button-quiet button-small" onClick={()=>setZoom(z=>clamp(z/1.5,1,12))} disabled={!mapFile}><Minus size={14}/> Zoom out</button><button className="button button-quiet button-small" onClick={()=>setZoom(z=>clamp(z*1.5,1,12))} disabled={!mapFile}><Plus size={14}/> Zoom in</button><button className="button button-quiet button-small" onClick={resetView}><RotateCcw size={14}/> Reset</button></div>
        <button className={'button button-small '+(placing?'button-gold':'button-quiet')} disabled={!mapFile||pins.length>=200} onClick={()=>setPlacing(p=>!p)}><Plus size={14}/>{placing?'Click the map to mark a location':'Add a map marker'}</button>
        <div className="reference-pin-list"><h3>Locations <small>({mapPins.length})</small></h3>{mapPins.length===0?<p className="muted">No locations marked on this map yet.</p>:mapPins.map((pin,i)=><button key={pin.id} className={selectedPin===pin.id?'selected':''} onClick={()=>setSelectedPin(pin.id)}><span className="pin-number">{i+1}</span>{pin.label}</button>)}</div>
        {currentPin&&<div className="reference-pin-editor"><label className="field"><span>Location name</span><input maxLength={120} value={currentPin.label} onChange={e=>setPins(prev=>prev.map(p=>p.id===currentPin.id?{...p,label:e.target.value}:p))}/></label><button className="button button-outline-danger button-small" onClick={()=>{setPins(prev=>prev.filter(p=>p.id!==currentPin.id));setSelectedPin('');}}><Trash2 size={14}/> Delete marker</button></div>}
      </aside>
      <section className="panel reference-map-panel"><div className="reference-toolbar"><div><strong>Interactive atlas</strong><small>{mapFile?mapFile.name:'Waiting for the local map file'}</small></div>{mapFile&&<span className="reference-zoom">{Math.round(zoom*100)}%</span>}</div>
        <div className={'reference-map-viewport '+(placing?'placing':'')} ref={mapRef}
          onWheel={e=>{if(!mapFile)return;e.preventDefault();setZoom(z=>clamp(z*(e.deltaY<0?1.12:1/1.12),1,12));}}
          onPointerDown={e=>{if(!mapFile)return;drag.current={x:e.clientX,y:e.clientY,offsetX:pan.x,offsetY:pan.y,moved:false};e.currentTarget.setPointerCapture(e.pointerId);}}
          onPointerMove={e=>{const d=drag.current;if(!d)return;if(Math.abs(e.clientX-d.x)+Math.abs(e.clientY-d.y)>5)d.moved=true;if(d.moved&&!placing)setPan({x:d.offsetX+e.clientX-d.x,y:d.offsetY+e.clientY-d.y});}}
          onPointerUp={e=>{const d=drag.current;drag.current=null;if(d&&!d.moved&&placing)addPin(e.clientX,e.clientY);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
          onPointerCancel={()=>{drag.current=null;}}>
          {mapUrl&&size?<div className="reference-map-layer" style={{width:displayWidth,height:displayHeight,transform:`translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`}}>
            <img ref={imageRef} className="reference-map-image" alt="Locally loaded gamemaster map" src={mapUrl} style={{width:displayWidth,height:displayHeight}} onError={()=>setMapError('Browser could not decode this large map. Generate smaller tiles for reliable viewing.')}/>
            {mapPins.map((pin,i)=><button key={pin.id} className={'reference-map-pin '+(selectedPin===pin.id?'selected':'')} style={{left:`${pin.x*100}%`,top:`${pin.y*100}%`}} title={pin.label} onClick={e=>{e.stopPropagation();setSelectedPin(pin.id);}}>{i+1}</button>)}
          </div>:<div className="reference-map-empty"><Compass size={52}/><h3>Explore the Empires</h3><p>Choose <strong>ref docs/The_Broken_Empires_Gamemaster's_Map.png</strong> from your computer.</p><label className="button button-gold"><FileUp size={16}/> Open map<input className="hidden-input" type="file" accept="image/png,.png" onChange={e=>void chooseMap(e.target.files?.[0])}/></label></div>}
        </div>
        <p className="reference-footnote">{mapFile?'Drag to pan; scroll or use the buttons to zoom. Enable “Add a map marker” then click the image to place a location.':'The official map is not embedded or copied into the application.'}</p>
      </section>
    </div>}
    <p className="reference-disclaimer">This is an independent reference workspace for the owner's local files, not a redistribution channel or an officially licensed rules adaptation. Character-building values still need to be checked against the purchased book.</p>
  </div>;
}

import {useEffect,useState} from 'react';
import {BookOpen,ExternalLink,FileUp,X} from 'lucide-react';
import './soloRuleDrawer.css';

type Props={
  page:number;
  file:File|null;
  onFileChange:(file:File|null)=>void;
  onClose:()=>void;
  onOpenFull:()=>void;
};

/** A local-only source drawer. A roll preview stays mounted while the player
 * consults the owner's rulebook, instead of navigating away from the scene. */
export function SoloRuleDrawer({page,file,onFileChange,onClose,onOpenFull}:Props){
  const [url,setUrl]=useState('');
  useEffect(()=>{
    if(!file){setUrl('');return;}
    const objectUrl=URL.createObjectURL(file);
    setUrl(objectUrl);
    return()=>URL.revokeObjectURL(objectUrl);
  },[file]);
  useEffect(()=>{
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};
    window.addEventListener('keydown',escape);
    return()=>window.removeEventListener('keydown',escape);
  },[onClose]);
  return <div className="solo-rule-drawer-shell">
    <button type="button" className="solo-rule-dismiss-layer"
      aria-label="Close rulebook drawer" onClick={onClose}/>
    <aside className="solo-rule-drawer" role="dialog" aria-modal="false"
      aria-label={'Local rulebook source page '+page}>
      <header>
        <div><div className="eyebrow"><BookOpen size={15}/> LOCAL RULEBOOK</div>
          <h3>PDF page {page}</h3></div>
        <button className="solo-rule-close" type="button" onClick={onClose}
          aria-label="Close rulebook source"><X size={19}/></button>
      </header>
      {url?<iframe key={url} title={'Local rulebook page '+page}
        src={url+'#page='+page} className="solo-rule-pdf"/>:
        <div className="solo-rule-empty">
          <BookOpen size={34}/>
          <p>Choose your local Core Rulebook PDF to view page {page} beside your action. The file stays in your browser.</p>
          <label className="button button-gold button-small"><FileUp size={15}/> Choose local PDF
            <input type="file" accept=".pdf,application/pdf" className="hidden-input"
              onChange={e=>onFileChange(e.target.files?.[0]??null)}/></label>
        </div>}
      <footer>
        <p>Page positions refer to the user's local PDF, not printed page numbers.</p>
        <button type="button" className="button button-quiet button-small" onClick={onOpenFull}>
          <ExternalLink size={15}/> Open full reader</button>
      </footer>
    </aside>
  </div>;
}

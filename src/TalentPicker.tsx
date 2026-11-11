import {useMemo,useState} from 'react';
import {BookOpen,ChevronDown,Plus,Search,Trash2} from 'lucide-react';
import type {RecordEntry} from './types.ts';
import {freshId} from './engine.ts';
import {findTalent,TALENT_CATALOG,TALENT_CATEGORIES,TALENT_NAMES_PENDING_VERIFICATION} from './talentCatalog.ts';
import type {TalentCategory} from './talentCatalog.ts';
import './talentPicker.css';

type Props={entries:RecordEntry[];onChange:(next:RecordEntry[])=>void;onOpenRule:(page:number)=>void};
export function TalentPicker({entries,onChange,onOpenRule}:Props){
  const [category,setCategory]=useState<TalentCategory|'All'>('All');
  const [filter,setFilter]=useState('');
  const [chosen,setChosen]=useState('');
  const [custom,setCustom]=useState('');
  const [message,setMessage]=useState('');
  const available=useMemo(()=>TALENT_CATALOG.filter(option=>
    (category==='All'||option.category===category)&&
    option.name.toLowerCase().includes(filter.trim().toLowerCase())),[category,filter]);
  const add=(name:string)=>{
    const n=name.trim();
    if(!n)return;
    if(entries.length>=100){setMessage('Maximum 100 recorded Talents');return;}
    if(entries.some(e=>e.text.toLowerCase()===n.toLowerCase())){
      setMessage(n+' is already on this character.');return;
    }
    onChange([...entries,{id:freshId(),text:n}]);
    setMessage('Added '+n+'. '+(TALENT_NAMES_PENDING_VERIFICATION.has(n)?'Check the exact printed Talent name. ':'')+'Check requirements and effects in your rulebook.');
    setChosen('');setCustom('');
  };
  return <section className="tbe-talent-picker" aria-label="Talent selection and record">
    <p className="tbe-catalog-hint">Choose from the source-indexed Talent names or enter your own. The list is a reference index, not an eligibility checker; XP costs, prerequisites and effects remain manual.</p>
    <div className="tbe-talent-toolbar">
      <label><span>Category</span><select aria-label="Talent category" value={category}
        onChange={e=>{setCategory(e.target.value as TalentCategory|'All');setChosen('');}}>
        <option value="All">All categories</option>{TALENT_CATEGORIES.map(x=><option key={x} value={x}>{x}</option>)}
      </select></label>
      <label><span>Find Talent</span><span className="tbe-search-input"><Search size={14}/>
        <input aria-label="Search Talent names" value={filter} placeholder="Search..."
          onChange={e=>{setFilter(e.target.value);setChosen('');}}/></span></label>
    </div>
    <div className="tbe-talent-add">
      <select aria-label="Select Talent" value={chosen} onChange={e=>setChosen(e.target.value)}>
        <option value="">Choose a Talent ({available.length})</option>
        {available.map(option=><option key={option.name} value={option.name}>{option.name}{TALENT_NAMES_PENDING_VERIFICATION.has(option.name)?' · verify source label':''} · PDF {option.page}</option>)}
      </select>
      <button type="button" disabled={!chosen} onClick={()=>add(chosen)}><Plus size={14}/> Add Talent</button>
    </div>
    <div className="tbe-talent-add">
      <input aria-label="Custom Talent name" placeholder="Unlisted or custom Talent..." value={custom}
        maxLength={200} onChange={e=>setCustom(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')add(custom);}}/>
      <button type="button" disabled={!custom.trim()} onClick={()=>add(custom)}>Add custom</button>
    </div>
    {message&&<p className="tbe-talent-message" role="status">{message}</p>}
    <div className="tbe-talent-records">
      {entries.length===0?<p className="tbe-talent-empty">No Talents selected yet.</p>:
        entries.map((entry,i)=>{
          const info=findTalent(entry.text);
          return <div className="tbe-talent-record" key={entry.id}>
            <span className="tbe-talent-index">{String(i+1).padStart(2,'0')}</span>
            <input aria-label={'Talent '+(i+1)} value={entry.text} maxLength={200}
              onChange={e=>onChange(entries.map(x=>x.id===entry.id?{...x,text:e.target.value}:x))}/>
            {info?<button type="button" className="tbe-talent-source" title={'Open '+info.name+' · PDF '+info.page}
              onClick={()=>onOpenRule(info.page)}><BookOpen size={14}/> {info.page}</button>:
              <span className="tbe-talent-custom"><ChevronDown size={13}/> Custom</span>}
            <button type="button" className="tbe-talent-remove" aria-label={'Remove Talent '+entry.text}
              onClick={()=>onChange(entries.filter(x=>x.id!==entry.id))}><Trash2 size={15}/></button>
          </div>;
        })}
    </div>
  </section>;
}

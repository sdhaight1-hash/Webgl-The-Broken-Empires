import { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, FileSearch } from 'lucide-react';
import { ARTICLES } from './rules.ts';
import { SOURCE_OUTLINE, BOOK_PAGES_WITH_TEXT } from './sourceOutline.ts';

/** Full PDF bookmark structure, separate from independently authored codex lessons. */
export function SourceOutlineNavigator({ onOpenPage }: { onOpenPage: (page: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [onlyWithoutLessons, setOnlyWithoutLessons] = useState(false);
  const lessonPages = useMemo(() => new Set(ARTICLES.map(a => a.page)), []);
  const entries = useMemo(() => {
    let chapter = '';
    const withChapter = SOURCE_OUTLINE.map((item,i) => {
      if (item.level === 1) chapter = item.title;
      return { ...item, chapter, key:i, lesson:lessonPages.has(item.page) };
    });
    const term = query.toLocaleLowerCase().trim();
    return withChapter.filter(x => (!onlyWithoutLessons || !x.lesson)
      && (!term || (x.title+' '+x.chapter+' '+x.page).toLocaleLowerCase().includes(term)));
  }, [query, onlyWithoutLessons, lessonPages]);
  return <section className="codex-book-navigator">
    <button className="codex-book-toggle" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>
      <BookOpen size={21}/>
      <span><strong>Full rulebook section index</strong><small>{SOURCE_OUTLINE.length} bookmarked sections · {BOOK_PAGES_WITH_TEXT} text-searchable pages · {ARTICLES.length} guided lessons</small></span>
      {expanded ? <ChevronUp size={17}/> : <ChevronDown size={17}/>}
    </button>
    {expanded && <div className="codex-book-body">
      <p>Every bookmark is included, even when a detailed lesson has not been authored. Select any section to read the original text in your Personal SRD, using your own locally chosen PDF. The Source Library also provides access to the original page.</p>
      <div className="codex-book-controls">
        <label className="field"><span>Filter all sections</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search sections, appendices, page numbers..."/>
        </label>
        <label className="codex-book-filter"><input type="checkbox" checked={onlyWithoutLessons} onChange={e=>setOnlyWithoutLessons(e.target.checked)}/> Show sections without a lesson on the same page</label>
      </div>
      <div className="codex-book-list">
        {entries.length === 0 ? <p>No matching sections.</p> : entries.map(item =>
          <button key={item.key} onClick={()=>onOpenPage(item.page)} className={item.level === 1 ? 'chapter-heading' : ''}>
            <span className="codex-book-item-title" style={{paddingLeft:item.level === 1 ? 0 : 16}}>
              {item.level===1?'◆ ':''}{item.title}
            </span>
            <span className="codex-book-item-details">{item.lesson ? 'Lesson at page' : 'Source section'} · PDF {item.page}</span>
          </button>
        )}
      </div>
      <div className="codex-book-note"><FileSearch size={16}/>A bookmark is not a complete statement of every rule. To locate unbookmarked rules, open Personal SRD, select your PDF, then index its text.</div>
    </div>}
  </section>;
}

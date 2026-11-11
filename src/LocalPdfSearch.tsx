import { useEffect, useMemo, useRef, useState } from 'react';
import { FileSearch, X } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

type IndexedPage = { page: number; text: string };
type IndexState = 'idle' | 'indexing' | 'complete' | 'cancelled' | 'error';

/**
 * Index only the PDF chosen by the user, within this browser session.
 * Neither extracted text nor the PDF is uploaded, cached, or written to localStorage.
 */
export function LocalPdfSearch({ file, onSelectPage }: {
  file: File | null;
  onSelectPage: (page: number) => void;
}) {
  const [state, setState] = useState<IndexState>('idle');
  const [indexed, setIndexed] = useState<IndexedPage[]>([]);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const generation = useRef(0);
  const task = useRef<pdfjs.PDFDocumentLoadingTask | null>(null);

  useEffect(() => {
    generation.current++;
    if (task.current) void task.current.destroy();
    task.current = null;
    setIndexed([]);
    setProgress(0);
    setTotal(0);
    setState('idle');
    setError('');
    return () => {
      generation.current++;
      if (task.current) void task.current.destroy();
      task.current = null;
    };
  }, [file]);

  const stop = () => {
    generation.current++;
    if (task.current) void task.current.destroy();
    task.current = null;
    setState('cancelled');
  };

  const indexFile = async () => {
    if (!file || state === 'indexing') return;
    const run = ++generation.current;
    setIndexed([]);
    setProgress(0);
    setTotal(0);
    setError('');
    setState('indexing');

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (generation.current !== run) return;
      const loading = pdfjs.getDocument({ data: bytes });
      task.current = loading;
      const doc = await loading.promise;
      if (generation.current !== run) return;

      setTotal(doc.numPages);
      const pages: IndexedPage[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        if (generation.current !== run) return;
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        if (generation.current !== run) return;
        const text = content.items.map(item =>
          'str' in item && typeof item.str === 'string' ? item.str : ''
        ).join(' ').replace(/\s+/g, ' ').trim();
        pages.push({ page: i, text });
        page.cleanup();

        if (i % 12 === 0 || i === doc.numPages) {
          setIndexed(pages.slice());
          setProgress(i);
          // Keep progress and the cancel button responsive during long documents.
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        }
      }
      if (generation.current === run) setState('complete');
    } catch (caught) {
      if (generation.current === run) {
        setError(caught instanceof Error ? caught.message : 'Could not read PDF text.');
        setState('error');
      }
    } finally {
      if (generation.current === run && task.current) {
        const finished = task.current;
        task.current = null;
        await finished.destroy().catch(() => {});
      }
    }
  };

  const matches = useMemo(() => {
    const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!words.length || words.some(word => word.length < 2)) return [];
    const hits: { page: number; snippet: string }[] = [];
    for (const item of indexed) {
      const lower = item.text.toLocaleLowerCase();
      if (words.every(word => lower.includes(word))) {
        const start = Math.max(0, lower.indexOf(words[0]) - 85);
        const snippet = item.text.slice(start, start + 210);
        hits.push({ page: item.page, snippet: (start ? '…' : '') + snippet + (start + 210 < item.text.length ? '…' : '') });
      }
    }
    return hits;
  }, [indexed, query]);

  return <section className="local-pdf-search" aria-label="Search all pages of your local rulebook">
    <div className="eyebrow"><FileSearch size={14}/> COMPLETE SOURCE TEXT</div>
    <h3>Search every PDF page</h3>
    <p className="muted">Build a private text index of your local rulebook. This locates rules that do not yet have a written codex lesson.</p>
    {!file ? <p className="reference-warning">Choose the PDF in the reader to enable full-text search.</p> :
      <div className="pdf-index-controls">
        <button className="button button-quiet button-small" disabled={state === 'indexing'} onClick={() => void indexFile()}>
          <FileSearch size={14}/>{state === 'complete' ? 'Rebuild text index' : state === 'indexing' ? 'Indexing pages…' : 'Index full PDF'}
        </button>
        {state === 'indexing' && <button className="button button-quiet button-small" onClick={stop}><X size={14}/> Stop</button>}
        {(state !== 'idle' && state !== 'error') && <div className="pdf-index-progress">
          <progress value={progress} max={total || 1} aria-label="Pages indexed"/>
          <span>{progress} / {total || '…'} pages {state === 'complete' ? 'indexed' : state === 'cancelled' ? '— stopped' : ''}</span>
        </div>}
        {error && <p role="alert" className="reference-warning">{error}</p>}
      </div>
    }
    {indexed.length > 0 && <div className="local-pdf-results">
      <label className="field"><span>Find a rule, phrase, or term</span>
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. Wound Die, naval combat"/>
      </label>
      {query.trim().length > 1 && <>
        <p className="muted">{matches.length} matching indexed pages{state === 'indexing' ? ' so far' : ''}. Text shown here comes only from your local PDF.</p>
        <div className="local-pdf-matches">
          {matches.slice(0, 100).map(hit => <button key={hit.page} onClick={() => onSelectPage(hit.page)}>
            <strong>PDF p. {hit.page}</strong><span>{hit.snippet}</span>
          </button>)}
        </div>
        {matches.length > 100 && <p className="muted">Showing the first 100 pages; narrow the query for more precise results.</p>}
      </>}
    </div>}
    <p className="reference-footnote">Local PDF text index lives only in memory. The 198 MB book may require significant processing time and RAM. Images without text are not searchable without OCR.</p>
  </section>;
}

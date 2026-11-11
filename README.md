# Wayfarer's Ledger

An **independent**, browser-based character journal and rules-learning companion for a skill-based d100 tabletop fantasy RPG, developed with The Broken Empires RPG in mind. This project is **not affiliated with, sponsored by, approved by, or licensed by Black Cradle Press LLC**.

## Current feature set

- Responsive dark-fantasy dashboard with a lightweight WebGL landscape and graceful static fallback.
- Five-chapter character forge: identity, heritage and background, capabilities, ambitions, review.
- Editable character sheet with manual skill ratings, wounds, status, equipment, talents, expertise, goals and life events.
- Multiple local characters, duplication, deletion, and JSON archive import/export.
- **75 PDF-grounded rules lessons** across core resolution, skills, character creation, advancement, equipment and combat, wounds, travel, intrigue, Weave and divine magic. Each topic links directly to its source PDF page; selected topics include worked examples and interactive knowledge checks. The latest additions cover solo play, enemy behavior, mass combat, naval combat, and appendix mechanics.
- Source library: a local-only PDF reader with **all 207 verified bookmarks** and **on-demand full-text indexing** of the **659 text-extractable pages** of the 663-page book, plus an interactive PNG atlas with pan, zoom and local map markers. Neither the extracted page text nor the original book/map bytes are bundled into the frontend.
- **Personal SRD (local-only):** on-demand, art-free text view of the owner's chosen PDF, chapter/section navigation across the entire 663-page volume, reading-flow and page-column layouts, a text-position view for tables, adjustable type, source-PDF cross-checks and optional full-book search. No extracted book text is committed, uploaded, persisted.
- **Export linked PDF:** user-initiated browser-only text PDF generation with a clickable 207-section contents list, nested viewer bookmarks, links back to contents / adjacent source pages, and recognized `Chapter N` cross-links. The PDF is downloaded to the user's device only.
- Interactive d100 basic check lab with core-book verified automatic success/failure, critical doubles, **exact-value critical successes** and Success Levels.
- Automatic browser-local save. No server, account, analytics, or AI services.

## Start

Requires Node.js 22+.

```bash
npm install --no-audit --no-fund
npm run dev
```

Then open the URL Vite prints (typically `http://localhost:5173`).

Validate:

```bash
npm test
npm run build
```

## Personal SRD — text-only private reader

The **Personal SRD** page is a locally generated reading interface, **not** a published, open-licensed System Reference Document. To use it:

1. Open **Personal SRD** in the app.
2. Select your own `ref docs/Core Rulebook.pdf` from disk; the app reads it with Mozilla PDF.js.
3. Navigate all 207 indexed bookmarks or use the previous/next page controls.
4. Toggle **Reading flow**, **Page columns**, or **Text positions**. The third mode reconstructs the position of textual PDF runs and is particularly helpful for tables without rendering artwork.
5. Choose **Index all pages** to search the source text throughout the book; the index builds and stays only in the current browser session and can be cancelled. The app reads pages on demand otherwise.
6. Use **Check original** whenever a chart, table, footnote or layout-sensitive rule needs confirmation.

### Hyperlinked PDF export

After selecting the rulebook on the **Personal SRD** page, click **Export linked PDF**. Export is independent of the optional search index; it processes all source pages, shows progress and supports cancellation. On completion, your browser downloads `The_Broken_Empires_Personal_Text_Linked.pdf`.

The generated file uses one text-only page for each original PDF page, preceded by a cover and an internally linked contents section. Links and the PDF viewer bookmark sidebar target output page positions (which differ from the printed original page numbers); each content page shows its **original PDF page number**. The export creates original links for recognized `Chapter N` references, plus Previous / Next / Contents controls on each source page.

The output contains neither embedded source artwork nor imported PDF page images. Its layout is based on extracted text positions so tables remain spatially recognizable where possible, but **complex tables, fonts, ligatures, symbols, footnotes and raster-only text can be imperfect**. Standard PDF fonts cannot reproduce every Unicode glyph, so uncommon symbols may be simplified or replaced. Check the original rulebook for exact adjudication. The output is a personal reading copy, **not a permission grant to redistribute the book or publish it as an open SRD**.

The manual GitHub Actions workflow `Audit local hyperlinked PDF export` regenerates the entire PDF from the owner's Git LFS source on a runner and validates metadata, link annotations, bookmarks and page counts; it does not publish the generated book or print its text into logs.

The 663-page supplied file has 659 pages with extractable text; pages 1, 2, 3 and 7 have none. A full-book PDF.js audit on GitHub Actions processed **663/663 pages** and retained **64,498 text runs**, producing approximately **1.48 million characters** of reconstructed text. To repeat this verification, dispatch the **Audit owner-supplied rulebook text** workflow manually in GitHub Actions; it prints metadata only, not copyrighted content. PDF text order and original typography are not guaranteed to be preserved exactly, and text embedded as images is not recovered. The original core PDF remains the source of truth for rules decisions. The ~198 MB source may incur meaningful RAM usage and delay. The code does **not** bake the commercial book's prose into the distributed JS bundle, issue automatic exports of its text, or claim SRD publication rights.

**Rights:** removing artwork does not license the rulebook text. The publisher's current [third-party license](https://thebrokenempiresrpg.com/pages/license) does not authorize software adaptations or wholesale rule reproduction. This feature is intended for an owner's own local PDF rather than distributing the text to others. Seek written authorization before publishing a comprehensive SRD, rules database, or public text-based adaptation.

## Rules integrity and important limitations

This is **not** an implementation of the complete, commercial rules. The user has committed a Core Rulebook PDF and gamemaster map as Git LFS assets under `ref docs/`, but the app deliberately does not publish or embed their contents. Reference source files are loaded using the browser's local file picker. This tool does **not** invent or automatically assign race/career bonuses, skill creation points, talent effects, wound thresholds, or other unverified mechanics. Skill names in `src/rules.ts` are **illustrative public references**, not a complete or authoritative skill catalog. Skills are editable so players can enter values using their own lawful copies of the core rules.

The dice lab currently supports **basic target values from 0 to 100**. It does not implement skills over 100, situational modifiers, opposed check tie-break rules, hit locations, combat outcomes, or magic.

References:

- [Official description and core rules purchase](https://thebrokenempiresrpg.com/products/the-broken-empires-rpg%C2%AE-core-rules-pdf)
- [Official downloadable character sheet](https://thebrokenempiresrpg.com/pages/character-sheets)
- [Public independent review of basic roll mechanics](https://systematicdungeons.substack.com/p/the-broken-empires)
- [Official third-party license and restrictions](https://thebrokenempiresrpg.com/pages/license)

### Copyright, branding and distribution

The publisher's current [third-party license](https://thebrokenempiresrpg.com/pages/license) **expressly excludes software applications and other digital adaptations**. It does **not** authorize this project. This code uses an independently designed identity, no proprietary artwork, and no copied rulebook text. **Do not represent it as officially licensed or publish a comprehensive official rules implementation without obtaining separate written permission and checking applicable law.**

## Architecture

- React + TypeScript + Vite, no backend.
- WebGL1 fragment shader in `src/WebGLAtmosphere.tsx` for ambient landscape; all gameplay and accessibility controls remain native HTML.
- `src/engine.ts` holds pure rules functions and persistence validation; `src/engine.test.ts` tests the documented core check boundaries.
- `src/rules.ts` is the source-linked codex data layer. Future licensed rules-data can be introduced separately without rewriting the UI.
- All browser data uses a versioned localStorage key; archive import requires a compatible versioned JSON envelope.

## Coverage model and honest limits

**Indexing is not the same as a verified explanation or an implemented mechanic.** The Codex offers 75 independently paraphrased guided lessons covering selected mechanics across the book. The complete source navigator lists all 207 bookmarks, including chapters not yet summarized. The Source Library can additionally build a transient text index from a PDF selected on the user's computer, searching every extractable page (659 of 663 in the supplied version). That provides source lookup for unbookmarked rules too, without publishing the book's prose.

The browser search runs only after clicking **Index full PDF**, may consume substantial RAM for a 198 MB source document, shows progress, can be cancelled, and forgets extracted text when the component is closed/reloaded. No document text leaves the browser via this feature. Pages 1, 2, 3, and 7 do not have an extractable text layer.

The entire rulebook is **not yet fully rewritten into individually validated lesson cards**; this is an exhaustive source discovery index plus an expanded selection of verified teaching lessons. Complete automated rules enforcement would require a separate large validation and rights review.

## PDF-grounded rules codex

The independent instructional summaries in src/rules.ts were authored from a targeted review of the user's Core Rulebook PDF, not only its contents page. Every lesson stores a one-based PDF page pointer for the local Source Library. The browser bundle includes **no copied rulebook pages or rule tables**. The source files are still private to the local reader at runtime.

Reviewed portions include core resolution (PDF pp. 20–31); skills and talents (32–58); character creation (82–118); advancement (124–129); equipment, combat and wounds (130–192); travel (200–232); intrigue (252–266); Weave (276–330); divine magic (348–354), gamemastering/bestiary (404–448), solo play (484–496), and appendices including mass combat (592–599), naval combat (600–604), personality alternatives (606–607), and treasure (646–650). These are selected teaching notes, **not** a complete authoritative implementation of every rule or exception.

PDF verification corrected the basic dice lab: an exact modified skill-value roll is a critical success, and automatic failures on 99–100 are not critical failures if they do not exceed the skill. The rulebook's six ability-score choices are themed aptitude packages; numerical derived Attributes are configured separately in character creation.

## Source inspection

A GitHub Actions metadata-only reference audit verified the user-supplied PDF has **663 pages and 207 bookmarks**. Its character creation chapter begins at PDF page 82. The reference explorer indexes the 12 named character creation stages (PDF pages 84–118) without copying commercial page contents. This is a structural audit, **not** verification of each game's rules calculation.

The map is a 16,200 × 10,800 pixel (174.96 megapixel) PNG stored in Git LFS. The browser can open it locally, but smooth deep-zoom on very large images will eventually require a tile pyramid rather than decoding the entire image at once. The map image and PDF are never saved in localStorage, only map marker coordinates/names and character information.

## Next implementation gates

1. Obtain explicit permission for a published rules-integrated digital companion.
2. Audit the user-supplied rules pages for each creation calculation and implement independently authored data and tests, subject to appropriate usage rights.
3. Add tests for every official creation calculation before adding automatic legality enforcement.
4. Build legally appropriate structured skill catalogs, character-creation calculations, and source/page-level attribution.
5. Run browser accessibility, visual, small-screen and persistence acceptance testing.

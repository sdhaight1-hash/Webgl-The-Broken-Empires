# Wayfarer's Ledger

An **independent**, browser-based character journal and rules-learning companion for a skill-based d100 tabletop fantasy RPG, developed with The Broken Empires RPG in mind. This project is **not affiliated with, sponsored by, approved by, or licensed by Black Cradle Press LLC**.

## Current feature set

- Responsive dark-fantasy dashboard with a lightweight WebGL landscape and graceful static fallback.
- Five-chapter character forge: identity, heritage and background, capabilities, ambitions, review.
- **Two-page interactive character sheet based on the uploaded official-style fillable PDF:** Page One preserves the five skills columns, ten Strands, Resolve/Fatigue, auto-derived attributes, six wound/armor locations, Talents, armor penalties, Shield and weapon rows. Page Two includes shared goals, three life-event categories, supply dice, money/status, NPC relationships, inventory/ENC, threads, notes and Fraying. The Advanced mechanics tab retains the previous calculators. Skill and Initiative rolls are clickable, with results recorded in the dice tray and character-matched solo campaign.
- Multiple local characters, duplication, deletion, and JSON archive import/export.
- **75 PDF-grounded rules lessons** across core resolution, skills, character creation, advancement, equipment and combat, wounds, travel, intrigue, Weave and divine magic. Each topic links directly to its source PDF page; selected topics include worked examples and interactive knowledge checks. The latest additions cover solo play, enemy behavior, mass combat, naval combat, and appendix mechanics.
- Source library: a local-only PDF reader with **all 207 verified bookmarks** and **on-demand full-text indexing** of the **659 text-extractable pages** of the 663-page book, plus an interactive PNG atlas with pan, zoom and local map markers. Neither the extracted page text nor the original book/map bytes are bundled into the frontend.
- **Personal SRD (local-only):** on-demand art-free text view of the owner's chosen PDF, now with structured **headings, readable paragraphs and actual HTML tables**, extracted from source text positions. Chapter navigation covers all 663 source pages; column/position modes remain available to verify ambiguous geometry. No source text is committed or uploaded.
- **Export formatted linked PDF:** browser-only re-typesetting of paragraphs and tabular rows with wrapped cells, grid borders and automatic continuation pages. The 207-section contents, bookmarks, chapter links, and previous/next navigation target the correctly remapped output pages.
- Interactive d100 basic check lab with core-book verified automatic success/failure, critical doubles, **exact-value critical successes** and Success Levels.
- **Solo tabletop:** multiple saved campaigns, scene lifecycle, source-linked d100 oracle and event workflows, authored NPCs, open threads, editable zone-based tabletop, draggable tokens, character-sheet integration, narrative journal, and independent JSON backup/restore.
- **Eight structured and tested mechanics:** percentile skill checks, opposed contests, success margins, extended progress, Timer Die, supporting skill bonus, Expertise SL floor, Supply Dice. Codex entries can open corresponding live calculators in solo play.
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
4. **Structured text + tables** is the default. Switch among Page columns, Text positions and Legacy flow to cross-check a difficult table or unusual layout.
5. Choose **Index all pages** to search the source text throughout the book; the index builds and stays only in the current browser session and can be cancelled. The app reads pages on demand otherwise.
6. Use **Check original** whenever a chart, table, footnote or layout-sensitive rule needs confirmation.

### Hyperlinked PDF export

After selecting the rulebook on the **Personal SRD** page, click **Export linked PDF**. Export is independent of the optional search index; it processes all source pages, shows progress and supports cancellation. On completion, your browser downloads `The_Broken_Empires_Personal_Text_Linked.pdf`.

The generated file reflows each source page into one or more properly typeset pages, preceded by a cover and an internally linked contents section. Links and the PDF viewer bookmark sidebar target output page positions (which differ from the printed original page numbers); each content page shows its **original PDF page number**. The export creates original links for recognized `Chapter N` references, plus Previous / Next / Contents controls on each source page.

The output contains neither embedded source artwork nor imported PDF page images. Instead of reproducing each text fragment at its old coordinates, it infers layout blocks from text positions and redraws paragraphs and tables with word wrapping. **Merged cells, unusual fonts and spacing, symbols, footnotes and raster-only text still require comparison with the original PDF**. Standard PDF fonts cannot reproduce every Unicode glyph, so uncommon symbols may be simplified or replaced. Check the original rulebook for exact adjudication. The output is a personal reading copy, **not a permission grant to redistribute the book or publish it as an open SRD**.

The manual GitHub Actions workflow `Audit local hyperlinked PDF export` regenerates the entire PDF from the owner's Git LFS source on a runner and validates metadata, link annotations, bookmarks and page counts; it does not publish the generated book or print its text into logs.

The former 671-page coordinate-only export preserved source text but failed to format it and has been replaced. A full-book audit of the new reflow renderer processed **663/663 source pages** and generated **1,045 typeset pages** in its final audited revision (November 11, 2026), with linked contents and nested bookmarks. Output page count varies as layout inference and pagination improve. Run the manual GitHub Actions export audit for current metadata.

The 663-page supplied file has 659 pages with extractable text; pages 1, 2, 3 and 7 have none. A full-book PDF.js audit on GitHub Actions processed **663/663 pages** and retained **64,498 text runs**, producing approximately **1.48 million characters** of reconstructed text. To repeat this verification, dispatch the **Audit owner-supplied rulebook text** workflow manually in GitHub Actions; it prints metadata only, not copyrighted content. PDF text order and original typography are not guaranteed to be preserved exactly, and text embedded as images is not recovered. The original core PDF remains the source of truth for rules decisions. The ~198 MB source may incur meaningful RAM usage and delay. The code does **not** bake the commercial book's prose into the distributed JS bundle, issue automatic exports of its text, or claim SRD publication rights.

**Rights:** removing artwork does not license the rulebook text. The publisher's current [third-party license](https://thebrokenempiresrpg.com/pages/license) does not authorize software adaptations or wholesale rule reproduction. This feature is intended for an owner's own local PDF rather than distributing the text to others. Seek written authorization before publishing a comprehensive SRD, rules database, or public text-based adaptation.

## Character-sheet layout based on the supplied fillable PDF

The source file is a two-page, fillable form (477 fields on the front, 53 on the back). It is used as a **field and layout reference**, not copied into the frontend as a large background image. The app preserves the same structural groupings in a responsive, parchment-toned interface:

- **Page 1 · Combat:** identity (Name, Race, Sex, Age, Culture, Previous Career, Size, XP), Ability Score Descriptors and Personality Traits; Combat, Adventuring, Social, Lore, and Binds skill columns with both percent ratings and Expertise; Strands levels and Starting Piety; Resolve/Fatigue and source-backed derived Attributes; all six physical wound regions with five injury rows apiece; armor and Shield data, Talents, detailed-location lookup and a multi-column weapons grid.
- **Page 2 · Chronicle:** six shared/unshared Goals, Life Events (Origin, Youth, Recent), Resources and four Supply Dice, Silver Pieces, Status, Relationship NPCs, ten initial Inventory lines with entered Encumbrance totals, Threads, Notes, and Fraying points.
- **Advanced mechanics:** Existing verified skill checks, opposed checks, extended tasks, Supply Dice and attribute adjustment workbench remains available as a third tab.

The front-page percent skill entries are actual character ratings. Entering a value creates/updates that skill in the existing character roster, and clicking its die icon runs the tested d100 engine, including its modifier, Expertise, criticals and optional pre-spent Resolve Favor. The in-place roll tray and character-matched solo-campaign logging remain active.

The source-sheet wound, armor, shield and weapon fields are **structured but intentionally manual**. Their labels and rows come from the PDF, but automatic wound adjudication, hit-location damage, weapon ATT/PRY resolution and armor penalties beyond verified attribute adjustments need further rulebook verification. Entered lethal Wound Points and inventory ENC are summed as convenience totals only; they do not replace official rules adjudication.

All new fields are optional on stored Character records, and old JSON character archives continue loading. Existing freeform wound/equipment/event/expertise notes are retained under **Page 2 → Existing character records** rather than discarded.

**Quality note:** This is a responsive application translation of the source sheet, not a pixel-perfect copy of the PDF's ornamental artwork. User-owned data stays local. A browser comparison of wide desktop and mobile layouts is the remaining visual acceptance task.

## Interactive character sheet — phase 1

Open **Character sheet** to play directly from the character instead of repeatedly switching to the Dice Laboratory.

- The **Primary attributes** card allocates the standard five starting Attribute points across Resolve, Initiative, Toughness and Death Threshold. Derived values follow the core rulebook's normal non-random starting formulas (PDF pp. 91–92). **Lethality Level = ceil(Death Threshold / 3)** plus an optional explicitly entered Talent adjustment.
- **Advanced bonuses** are editable: future XP/Talent bonuses and an armor Initiative penalty. They are not silently inferred from character descriptions or talent notes.
- **Resources** tracks spent Resolve and Fatigue, showing the updated available Resolve. Setting Resolve Favor (0–3 points) before a skill roll adds +10 to the target per Resolve spent, and records the expenditure automatically.
- **Skills** show the base rating, situational modifier, unmodified Skill Score, Expertise floor and adjusted target. Click the adjusted target to roll the validated d100 mechanic. Criticals, automatic success/failure, and SLs are calculated by the existing engine; unsupported effective targets outside 0–100 remain unavailable rather than inventing special rules.
- **Initiative** rolls d10 plus the derived effective Initiative (after a manually entered armor penalty); Supply Dice (Gear, Ammo, Medical, Rations) are selectable, rollable and automatically step down on a 1–2, with a depleted d6 becoming empty.
- **Dice tray** shows the latest result in place. Skill rolls also appear in the Dice Laboratory's history; all rolls are journaled to the current solo campaign **only if it belongs to the same character**. No campaign is created implicitly.
- Old character archives without the new optional attributes and supplies fields remain readable. New fields are included in ordinary browser-local autosave and JSON character exports.

**Not yet automated:** full hit-location armor/wound state, combat exchanges, weapons/defenses, talent prerequisites and XP legality, and entirely automatic character creation from culture/career. These are future rule-verification tasks, not claimed functionality.

## Cohesive dark-mode UI and solo campaign worksheets

The application now shares a dark Broken Empires-inspired palette: oxblood section bars, charcoal ink surfaces, aged-brass accents and parchment-toned text. The dashboard, sidebar, navigation, character forms, dice tray, source links, scene board and solo workspace use a consistent visual vocabulary. This is a **CSS/UX overhaul**, not a reproduction of the rulebook's commercial artwork.

On the character sheet, the **Talents** section now has a category filter, a searchable pull-down of source-indexed Talent names, a custom-entry option, a deduplicated selected-Talents table, and links to the PDF page for each indexed choice. Race/Heritage, Previous Career, and weapon name fields also offer autocomplete suggestions while accepting custom text. These selectors preserve existing character saves and **do not claim to automatically resolve Talent costs, prerequisites or effects**.

Solo Tabletop adds a **Campaign workbook** tab: editable scene worksheets; an NPC overview table with disposition choices and in-depth dossiers; a live open-thread checklist; and a searchable, filterable chronological roll/action ledger with source links. These all use the existing, validated version-1 campaign archive and automatically save with the campaign. Scene, NPC and thread updates have separate deterministic regression tests.

**Browser UX acceptance is still required:** verify keyboard interaction, narrow layouts, contrast and the long character-sheet grid at 1080p and mobile widths. CI compilation is not a substitute for visually checking the actual app.

## Repository SRD audit — comparison identity matters

The GitHub-committed file `ref docs/The_Broken_Empires_Personal_SRD.pdf` currently has **671 pages**, comprised of 8 cover/contents pages and a 663-page text rendering of the original rulebook. A GitHub Actions audit compared it with `ref docs/Core Rulebook.pdf`. It maps all 663 source pages, with median page-level token recall 99.12%, but the source's detected tables were not reconstructed as PDF tables in the sampled SRD pages, and page 587 fell to 56.11% token recall. The median number-token recall is 100%, but source page 145 was 70.73%, so **visual and numerical rule accuracy are not established**.

These measurements apply **only** to that repository copy. The user subsequently referenced a *newly uploaded replacement SRD*, but its distinct bytes were not yet accessible from conversation files or a new committed path at the time of this audit. Until the replacement is available, don't label these numbers as validation of the replacement PDF. See `docs/repository-srd-comparison.md` and the manual `Audit current repository SRD` workflow.

## Solo tabletop — playable first milestone

Open **Solo tabletop** in the sidebar. Select your current character, name the campaign and set its premise; the campaign auto-saves in browser storage under a separate versioned key. You can export/import a standalone `wayfarers-solo-campaign.json` archive for backups (characters are stored separately). No external services or AI are required.

The core workflow is:

1. **Play scene:** state a title, location and expected opening, then open the scene. Roll a scene expectation d100 and use the purchased book's scene table to select the result.
2. **Ask the Weave:** pose a yes/no question, roll percentile dice, select the result from your local source table, and record what the answer means. Matching dice are highlighted to prompt a Random Event. A separate explicitly labeled **custom probability** mode is included, but it is not a transcription of the official odds table.
3. **Event randomizers:** roll Action and Subject d100 positions, consult your own PDF for the words, interpret them, and save the outcome to the journal.
4. **Rules workbench:** use the eight source-referenced, deterministic mechanics. The skill calculator can select a skill from the character assigned to the campaign. Rolls and results enter the campaign journal.
5. **Scene board:** load an optional image from disk, place tokens and move them among editable abstract combat zones using drag/drop or keyboard-friendly click controls. The image is session-only; zones and token locations persist.
6. **NPCs & threads:** keep profiles, relationships, outstanding questions and scene cast organized. Finish scenes with a narrative outcome.
7. **Chronicle:** add free text narration, review dice/oracle/scene logs, and export/import campaign data.

Solo source viewer links use **1-based PDF viewer pages**, not printed folios. The verified chapter anchors are: Solo play principles p.486, Ask the Weave p.490, Random Events p.491, randomizers p.492, scene start p.493, and NPC guidance p.495.

**What is automated:** Source-linked basic 0–100 skill checks, opposed resolution and tie-breaks, DoS, progress setbacks for extended checks, Timer Die threshold, supporting skill Score, Expertise minimum successful SL, Supply Dice step-down, d100 oracle dice, doubles event flags, state management, journals and board interactions.

**What remains deliberately manual:** The commercial solo Oracle probability table, Random Events lookup, Action/Subject word tables and scene expectation table. The current code *does not* claim their exact threshold distributions, so it never invents results or reproduce copyrighted tables. The custom oracle probabilities are optional convenience logic, not a house rule falsely attributed to the book.

The board is a **solo, zone-based VTT slice**, not a full multiplayer VTT. It does not yet implement scene fog of war, pixel-precise map measurements, synchronized sessions, complete combat and magic automation or an AI narrator. See [issue #5](https://github.com/sdhaight1-hash/Webgl-The-Broken-Empires/issues/5) for the distinct rule-by-rule verification effort.

## Formatted SRD reconstruction

The old exporter stamped PDF.js text fragments at individually scaled coordinates. This caused microtype, collisions, broken paragraphs and flattened tables, particularly on source PDF pages 22, 26 and 37.

The new **src/srdLayout.ts** extracts semantic headings and paragraphs, separates physical reading columns, and detects repeated cell alignments in the source PDF to build actual table rows. Both the Personal SRD reader and the PDF exporter consume that model.

The PDF renderer typesets text at readable sizes, wraps full paragraphs and table cells, draws ruled grids, automatically creates continuation pages, and resolves internal links after pagination. The Previous and Next controls walk through **every** output page, including continuations.

Automated verification covers narrative ordering, in-column and full-width table detection, wrapped first rows, page mapping, link destinations, output bounds and actual source text retention. The manual source audit processes user-owned Git LFS bytes without printing or publishing book text.

**Known fidelity limit:** PDF-to-document-structure extraction remains heuristic. Merged-cell tables, sidebars, nested layouts, font-specific glyphs and raster-only text may require manual corrections. Re-run the source audit and compare suspicious sections with your original PDF. Do not claim every book table is perfect until the book has been reviewed page by page.

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

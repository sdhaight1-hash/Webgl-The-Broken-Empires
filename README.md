# Wayfarer's Ledger

An **independent**, browser-based character journal and rules-learning companion for a skill-based d100 tabletop fantasy RPG, developed with The Broken Empires RPG in mind. This project is **not affiliated with, sponsored by, approved by, or licensed by Black Cradle Press LLC**.

## Current feature set

- Responsive dark-fantasy dashboard with a lightweight WebGL landscape and graceful static fallback.
- Five-chapter character forge: identity, heritage and background, capabilities, ambitions, review.
- Editable character sheet with manual skill ratings, wounds, status, equipment, talents, expertise, goals and life events.
- Multiple local characters, duplication, deletion, and JSON archive import/export.
- Searchable rules-learning codex with **original summaries**, explicit source links and evidence labels.
- New source library: a local-only PDF reader with verified 663-page chapter and character-creation page navigation, plus an interactive PNG atlas with pan, zoom and locally stored map markers. No proprietary book/map bytes are bundled into the app.
- Interactive d100 basic check lab, including verified publicly described roll-under checks and tens-die Success Levels, automatic success/failure and doubles.
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

## Source inspection

A GitHub Actions metadata-only reference audit verified the user-supplied PDF has **663 pages and 207 bookmarks**. Its character creation chapter begins at PDF page 82. The reference explorer indexes the 12 named character creation stages (PDF pages 84–118) without copying commercial page contents. This is a structural audit, **not** verification of each game's rules calculation.

The map is a 16,200 × 10,800 pixel (174.96 megapixel) PNG stored in Git LFS. The browser can open it locally, but smooth deep-zoom on very large images will eventually require a tile pyramid rather than decoding the entire image at once. The map image and PDF are never saved in localStorage, only map marker coordinates/names and character information.

## Next implementation gates

1. Obtain explicit permission for a published rules-integrated digital companion.
2. Audit the user-supplied rules pages for each creation calculation and implement independently authored data and tests, subject to appropriate usage rights.
3. Add tests for every official creation calculation before adding automatic legality enforcement.
4. Build legally appropriate structured skill catalogs, character-creation calculations, and source/page-level attribution.
5. Run browser accessibility, visual, small-screen and persistence acceptance testing.

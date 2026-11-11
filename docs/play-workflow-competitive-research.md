# Broken Empires companion — comparative UX and workflow research
**Researched:** November 11, 2026  
**Scope:** Main WebGL RPG application (character creation, character sheet, active play, solo campaign, source lookup, combat, travel, intrigue and magic). The separate standalone SRD project is excluded.

## Method and confidence
This is a documentary/code review, not an assertion that the researcher ran authenticated test sessions in every commercial competitor. Evidence: current official product documentation and screenshots, open-source VTT examples, the November 11 user screen recording and inspected current repository source. The findings distinguish *observed current-code behavior* from *proposed UX*; unverified Broken Empires rules remain manual.

## Product-specific objective
The Broken Empires describes itself as **Sim-Lite**, balancing detailed resolution with speed. Its four core conflict arenas are **Combat, Intrigue, Travel and Magic**, alongside background/career creation, life events, granular wounds, status, and authored solo tools. Therefore this must be a game-specific play assistant, not a generic D&D sheet, PDF facsimile or full Foundry clone.

**Success metric:** one continuous context-preserving loop:
`Intent → pick action / applicable rule → roll → review modifiers / outcomes → confirm consequences → update character and campaign → append journal entry.`
Keep an oracle, relevant NPC/scene, status and source available without changing primary pages. Always allow manual overrides and source links.

## Compared software: concrete mechanics to adopt

| Product | Verified product pattern | Adopt | Avoid |
|---|---|---|---|
| Foundry VTT | Distinct Actor, Item, ActiveEffect, ChatMessage, Journal, Combat and Scene documents with system-owned data models | Typed state domains and provenance for modifiers; one authoritative participant record; context-aware action cards | Full ecosystem, backend, module loader, permissions, 3D canvas before needed |
| Foundry CRUX / Ironsworn Token Action HUD | Quick-access left action panel for attacks, status and changes without a whole character sheet | Pinned frequently used actions and contextual sidebar | System-specific 5e/Ironsworn mechanics |
| Roll20 | Character roll buttons use current sheet data; macro quick bar; sheet worker auto-calculations | Direct roll control in row, keyboard shortcuts, favorites/hotbar | Chat-only feedback, popout complexity, multiple incoherent sheet copies |
| D&D Beyond | Actions, skills, spells, equipment and limited-use resources coexist on an operational sheet | Use action groups and a persistent compact character strip; auto-calc derived attributes | D&D spell slots, classes and other alien rules |
| Demiplane NEXUS | Guided selection with downstream effects and explicitly enabled sources | Source-backed creation stages, choice consequences and validation | Inventing unresolved prerequisite/XP logic |
| Alchemy RPG | Scene-first storytelling; Story, Tools, Notes, Journal and NPC panels in the same play mode | Scene-centered Play page, drawers and responsive visual hierarchy | Large static art at the expense of legibility or performance |
| PUM Companion | Journal, oracles, plot tracks and entities as collapsible/resizable workspaces; search and font-size controls | Persistent solo journal with side oracles, NPCs, plot nodes, source; customizable layout | Overcrowding all tools by default |
| Quest Portal | Character templates use roll buttons, point/slot widgets, tables; campaign-linked notes and PDFs | Game-specific reusable resource widgets; in-context page-linked owner PDF | Building a universal no-code editor before the game works |
| Owlbear Rodeo | Scene and token canvas with separate asset dock, fog and drawing | Minimal map/zone mode and explicit canvas controls | Making tactical positioning mandatory for narrative scenes |
| Stargazer / Foundry Ironsworn | Solo-first journaling, oracle dashboards and linked progress tracks | Treat oracles and evolving threads as campaign state | Copying unrelated solo rules |

Source references appear below. The Foundry v14 and CRUX entries are verified for November 2026, not inferred from older screenshots.

## Repository audit (inspected main at b13e825)

### Structural strengths
- `src/characterSheetModel.ts`, `src/mechanics.ts` and `src/hitLocation.ts`: pure numerical implementations with tests for several mechanics.
- `src/tbeSheetData.ts` and `src/TbeCharacterSheet.tsx`: two-page form fields, six wound regions, Strands, weapon slots, inventory and resources, with source-aware partial calculations.
- `src/talentCatalog.ts`, `src/TalentPicker.tsx`: searchable options; unverified effects not automatically applied.
- `src/SoloTabletop.tsx`, `src/SoloWorksheets.tsx`, `src/soloEngine.ts`: campaign, scenes, oracles, logs, NPCs, threads, tokens, zones and save import/export.
- `src/ReferenceWorkbench.tsx`, `src/PersonalSrd.tsx`: owner-selected local source and page navigation.
- The November 11 Forge UI correction edits skill ratings/Expertise and Talents in the same character data.

### Primary deficiencies
1. **Workflow fragmentation:** `src/App.tsx` offers eight top-level pages (Sanctuary, Forge, Sheet, Codex, SRD, Solo, Source Library, Dice Lab). A roll, its source, target and story consequence cannot be reviewed in one persistent context.
2. **Character is a form, not an action board:** `src/TbeCharacterSheet.tsx` is a large form with front/back/advanced tabs. It lacks an immediately visible Play view showing favorite actions, equipped weapons, relevant conditions, current scene and recent outcomes. The standalone WP calculator requires copying values into separate fields.
3. **Campagin and character state are parallel islands:** `src/App.tsx` autosaves the roster in `wayfarers-ledger-roster-v1`; `src/SoloTabletop.tsx` autosaves campaigns in `wayfarers-ledger-solo-v1`. Rolls can be copied into the campaign log, but there is no single confirmed atomic action that updates both a character and campaign as one durable transaction.
4. **Roll records lack structured consequences:** `RollEntry` is label/message/page/roll/check; `SoloLog` is largely textual. They do not capture the ordered workflow: actors, action, target, modifiers with sources, rolls, decision, applied state changes and reversible event ID.
5. **Solo work is divided across tabs:** The campaign contains scenes, NPCs, threads, oracles and logs, but players leave the active scene for full worksheets or the character sheet. PUM's in-context oracle/log/entities layout is a more appropriate benchmark.
6. **Reference interaction loses focus:** Source buttons navigate to another top-level screen; a resizable citation drawer would be less disruptive than routing the player away from a developing action.
7. **Creation has two conceptual models:** Five narrative Forge chapters versus twelve source-backed character creation stages. They should be offered as explicitly distinct "Quick concept" vs "Full rules build", not silently treated as equivalent.
8. **Persistence is adequate for MVP but fragile for larger sessions:** localStorage handles the JSON archive and scene data; selected browser File objects/map imagery are transient. There is no atomic save boundary for character + campaign updates, undo history or schema evolution beyond version 1.
9. **Presentation is now cohesive but not yet task-optimized:** Ox-blood/brass dark palette and 3-column skills improve readability, yet the Play workflow still shows many disconnected input forms. Responsive usability should be validated at 1080p, 1366x768 and narrow mobile widths.
10. **Game coverage is uneven:** Combat/skill math is further advanced than travel, intrigue, magic and solo cause-and-effect, although all four arenas are fundamental to Broken Empires.

## Proposed information architecture: four destinations, one contextual play surface

| Primary area | Contents | Why |
|---|---|---|
| **Play** (default when a campaign exists) | Scene + compact character HUD + action drawer + oracle + result/journal stream; optional zone board | Continuous game loop and minimal mode switching |
| **Characters** | Character roster; Play-oriented character sheet; Quick Concept / Full Rules Build; equipment, talents, wounds, advancement | No duplicated identity or sheet state |
| **Campaign** | Scenes, NPCs, threads, plot clocks, world/location index, journals, notes, export | Editing and organizing without distracting from Play |
| **Library** | User-selected original rulebook, indexed page search, verified rule cards and citation links | Rule support, not an alternative play destination |

A **persistent utility command palette** and a **context drawer** provide Dice, Lookup and source pages from anywhere; eliminate separate full-page Dice Laboratory navigation except as a diagnostics/developer tool.

### Suggested 1080p desktop Play composition
```text
┌─ Compact nav ─┬────────────── PLAY / ACTIVE SCENE ─────────────────────┬─ CONTEXT ──────┐
│ Play          │ Scene title · location · stakes · active threads       │ Oracle /      │
│ Characters    │                                                       │ Rule / NPC    │
│ Campaign      │ [ Action tray: Skill | Combat | Travel | Intrigue |    │              │
│ Library       │                Magic | Supply | Quick roll ]          │ Current       │
│               │                                                       │ target / AP   │
│               │ [ Roll card + chance/modifiers + Result preview ]     │              │
│               │ [ Confirm / Adjust / Cancel ]                          │ Source page   │
│               │                                                       │ (in panel)   │
│               │ Chronicle stream + note editor                         │              │
└───────────────┴───────────────────────────────────────────────────────┴──────────────┘
                    Sticky mini HUD: character, Resolve, Fatigue, WP, supply, initiative
```
The side panels are resizable or collapsible with accessible defaults and local preference persistence. On narrow screens, context and tools become bottom sheets or tabs, without hidden required actions. "Focus writing" collapses the scene chrome and gives journaling room. Keep WebGL atmosphere optional and non-interactive until it contributes to gameplay.

## Minimal state architecture (deliberately not a general ECS)

1. Keep the existing `Character` and `SoloCampaign` source of truth; preserve their archive compatibility and field names.
2. Introduce one **typed ActionResolution** record used by both the character sheet and solo game: `id, characterId, campaignId?, sceneId?, targetId?, actionKind, inputs, modifiers:[{name,value,sourceRef}], rolls, computed, manualOverrides, status, appliedChanges, createdAt`.
3. Each action is **proposed** (non-mutating arithmetic); then **confirmed** by the player (one state transition updates character and campaign) or **cancelled**. If the code remains local, use a small shared store/controller with one persistence boundary rather than a global event bus.
4. Implement undo by recording the *prior values of fields modified* and a new `reversalOf` event. Do not reroll dice and do not delete the original action's journal evidence.
5. Add derived stats as pure selectors. Initially only verified rules contribute; all modifiers are visible with origin (attribute, armor, manually entered, specific validated talent). Unsupported effects render with a "manual" badge, never a silent guess.
6. Use a compact content registry `id / action / sourcePage / supportedRange / status` to serve both action cards and in-context rule references. Avoid storing copyrighted source text in the public app.
7. Migrate storage additively, with fixture-based import/export tests and a backup before conversion. IndexedDB is worth considering for larger user-owned documents/maps; do not move the tiny JSON roster without a demonstrated need.

## Five prototype workflows (acceptance gates)

| Workflow | Required visible behavior | Acceptance test |
|---|---|---|
| **A. Create character** | Choose Quick Concept or Full Rules Build. Set heritage/career, skills/Expertise, Talents, primary attributes without leaving creation; open source in drawer | A valid test character can be built and reopened without losing field values; unsupported build legality is clearly shown |
| **B. Skill action** | Click any skill on compact HUD → target, breakdown and Favor → roll → outcome → journal | 1–2 clicks after skill selection, no route change; exact same roll in character history and active scene log |
| **C. Combat exchange** | Select actor+target and weapon → opposed roll(s) → degree, hit location, manual/verified armor and optional shield → preview WP → confirm | Deterministic fixture, no duplicate wound, correct side/location, Resolve spent once, undo restores state but retains roll proof |
| **D. Solo scene** | Open scene → choose oracle, roll and interpret → mention/link an NPC or thread → accept into journal → carry forward | No full-page route change for a normal oracle; scene, linked NPC/thread and log survive reload; every roll provenance retained |
| **E. Rule help** | Press source icon on a roll/field → right-side page and verified notes → close drawer → continue pending action | Same draft, modifier and dice result still present; document stays private/local and remains correct after page switching |

### Quality bar
- Screen sizes: 1920x1080 at 100% and 125% scale, 1366x768, tablet 768px and phone ~390px.
- Keyboard-only for all roll, edit, confirm, cancel and source controls; no non-semantic draggable-only interaction.
- No invented game outcomes or modifiers. Tests for source-backed exceptional cases and roll boundaries before automation.
- Zero lost or duplicated character/campaign changes across export, reload or undo.
- Context persists when the rule drawer or NPC dossier is opened and closed.
- Record task completion time/click count and compare to the current 8-route design; performance/click thresholds must be measured, not assumed.
- Empty/missing-source states always offer a manual path and a clear source status.

## Implementation order

### Phase 0: preserve usability and add tests (small, high ROI)
- Benchmark five workflows A–E against today's build with video/interaction counting.
- Add a reusable compact character HUD (Resolve/Fatigue, WP, selected supply, recent roll), mounted in **Play** first.
- Add a context drawer shell for NPC preview and rulebook source page. Keep old pages/routes working.
- Ensure character and campaign IDs are always resolved and retained; write tests for import/duplicate/reload cases.
- No new combat rules in this phase.

### Phase 1: one authoritative action result (highest leverage)
- Define `ActionResolution` and pure propose/confirm/cancel functions.
- Migrate basic skill roll, Resolve Favor and Supply Die to the shared flow; write tests against existing engine results.
- Render one reusable Roll/Action Card in both character Play sheet and active solo scene.
- Persist one confirmed action and append a structured log, with source page and modifier breakdown.
- Verify action cannot be applied twice and failed persistence is reported.

### Phase 2: combat and encounter linking
- Wrap existing opposed roll, hit location, wound calculator into one *previewable* exchange, respecting rule coverage.
- Connect target NPC or actor from scene, show hit location/wounds and confirmed state changes; add reversal and history.
- Make scene board selection update the same target as the combat card. Keep grid/tactical upgrades minimal.

### Phase 3: solo as primary play surface
- In-place scene + oracle + linked entities/threads + journal, inspired by PUM but not reproducing its proprietary tables.
- Search journal, NPCs and rules; resize/collapse context, remember font and panel settings.
- Persistent source-aware scene/event rolls and custom user-supplied oracle tables.

### Phase 4: all four Broken Empires arenas
- One verified action card family each for combat, intrigue, travel and magic; provide side-by-side source exceptions and manual decisions.
- Improve creation from twelve book stages, retaining five-step Quick Concept as a separate path.
- Extend atlas/scenes only once core actions are operable without navigation.

### Defer
Multiplayer networking, permission management, complete automation of all talents/spells, full spatial/lighting VTT, universal game-system builder, AI storytelling and decorative WebGL rebuilds. None is required to prove the central play loop.

## Concrete first development ticket
**"Keep the current character and solo scene visible through a complete skill resolution"**
- Show compact current-character HUD in Solo Play.
- Pick a character skill without leaving Solo Play.
- Show derived base skill, manual modifier, Resolve Favor cost and source page in a reviewable card.
- Click Roll; display dice/result only once.
- Confirm (or cancel) use of Resolve; if confirmed, apply Resolve and append a single character-matched scene journal record.
- Block duplicate confirmations; handle missing campaign gracefully.
- Test all four exceptional paths: insufficient Resolve, target out of supported 0–100 range, no active scene, reload after confirmed roll.
- Make this reusable for next combat action; do not implement combat as part of this ticket.

**Why start here:** It simultaneously fixes the most expensive interaction defect, tests a unified data flow, and makes every later rules subsystem easier to implement without inventing another page.

## Sources (primary documentation preferred)
- [Foundry system development](https://foundryvtt.com/article/system-development/) — typed Actor / Item models.
- [Foundry v13 API](https://foundryvtt.com/api/v13/) and [v14 release](https://foundryvtt.com/releases/14.370) — documents and current platform.
- [Foundry Active Effects](https://foundryvtt.com/article/active-effects/) — modifier provenance and effect models.
- [Foundry CRUX](https://foundryvtt.com/packages/crux), [Ironsworn Token Action HUD](https://foundryvtt.com/packages/token-action-hud-ironsworn) — compact action controls.
- [Roll20 character sheets](https://wiki.roll20.net/Character_Sheets) — sheet roll buttons and automatic fields.
- [D&D Beyond sheet sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193946388-Sheet-Sections) — action-centered sheet organization.
- [Demiplane Pathfinder NEXUS builder](https://resources.demiplane.com/nexus/pathfinder/character-tools/pathfinder-character-builder) — guided source-aware build.
- [Alchemy scene / GM UI](https://help.alchemyrpg.com/en/articles/11165278-candela-obscura-gm-tutorial) — scene-centered panels.
- [PUM interface](https://unfolding-machines.github.io/pumc-online-hub/game-interface/), [plot nodes](https://unfolding-machines.github.io/pumc-online-hub/plot-nodes/), [plot tracks](https://unfolding-machines.github.io/pumc-online-hub/plot-tracks/) — solo interface and persistence.
- [Quest Portal sheets](https://www.questportal.com/features/character-sheets) and [features](https://www.questportal.com/features) — reusable field widgets and references.
- [Owlbear Rodeo docs](https://docs.owlbear.rodeo/) — minimal optional map controls.
- [Stargazer source](https://github.com/nboughton/stargazer) — solo-first journal / data migration posture.
- [Broken Empires official product description](https://thebrokenempiresrpg.com/products/the-broken-empires-rpg%C2%AE-core-rules-pdf) and [fillable character sheets](https://thebrokenempiresrpg.com/pages/character-sheets).

All proposed mechanics must be checked against the user's owned source before implementation. This brief provides a product architecture and test program, not legal permission to redistribute third-party game books or tables.

# Repository SRD comparison and replacement-file checkpoint

Date: November 11, 2026

**Scope:** `ref docs/Core Rulebook.pdf` (Git LFS, 663 PDF pages) compared against the repository's existing `ref docs/The_Broken_Empires_Personal_SRD.pdf` (671 pages). This audit is **not** proof that the later replacement file mentioned in chat has been received. A byte-distinct updated upload or commit must be verified before repeating it as the replacement audit.

## Evidence

- 663/663 source pages are mapped by the `Source PDF p. N` header. Eight SRD front-matter pages have no source-page label.
- The median source-page **token multiset recall** was **0.9912** (10th percentile 0.9317). This is a screening heuristic, not a semantic or layout fidelity score; it cannot detect transposed paragraphs, broken rows or wrong cell assignments.
- Median **number-token recall** was **1.0**, but sampled pages 145 and 493 were **0.7073** and **0.8889** respectively; those numeric differences need direct verification before automated adjudication.
- Source page 587 had **0.5611** token recall with 704 original tokens. It is the clear text-loss outlier.
- In sampled source PDF pages 26, 37, 52, 145, 490, 491 and 493, MuPDF detected at least one table, but **no reconstructed SRD grid tables** were detected on their corresponding pages. This is a serious presentation and data-association weakness even when most textual tokens survive.
- The initial Talent selector name audit found 77/80 indexed Talent labels as exact normalized substrings in the source Talent chapter; `Armor Training I–IV`, `Impaired Fighter (Arm)`, and `Impaired Fighter (Leg)` were not exact substring matches. They require individual source checks. Talent effects and requirements have **not** been verified by this label audit.

## Required replacement gate

1. Confirm the replacement SRD is actually accessible and identify its filename, bytes, checksum and PDF page count.
2. Re-run `scripts/audit-replacement-srd.py` on that exact version and the original Core Rulebook.
3. Check low-recall and numeric-diff pages against the original visuals; verify tables by row/column/cell, not only strings.
4. Only then expand automated rules to incorporate source-verified thresholds, Talent prerequisites and combat effects.
5. Do not publish licensed full-book text or a generated copy as a repository artifact.

The automated comparison is a diagnostic tool. It is intentionally **not** presented as a complete proof that every rule in the SRD matches the rulebook.

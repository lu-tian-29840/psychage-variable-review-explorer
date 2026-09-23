# HRS PsychAge selection journey and variable explorer

Open `index.html` with its companion files in the same directory. No network services or respondent-level data are used.

## Navigation

The page opens on **Selection journey**. Select a stage or decision to see its counts, source evidence, and searchable variable list. **Proportional flow** shows the selected parent's immediate branches as a Sankey; its local scale resets with the parent. The readable overview uses equal-sized readable boxes rather than proportional box area.

**Explore current variables** preserves the flower explorer and its original heading. Select Core or Leave-Behind, then a numbered petal or the equivalent group-list button. Petal area is proportional to full-collection count; the scale is separate for each collection. Table filtering does not alter the petals.

Both views use one variable-evidence panel with historical dispositions and current documentation. Status has four reader-facing labels: **Under review** (listed for review), **Kept** (carried forward at this step), **Set aside** (excluded, deferred, below the coverage threshold, or reserved for support), and **Unclear** (the records do not establish a decision). Reasons and technical source statuses remain available in variable details. The current 202 Core and 371 Leave-Behind variables show **Kept**; their retention is provisional. Lists show 50 rows per page. View state is stored in URL fragments; browser Back/Forward restores prior states, and switching main views remembers their filters. Reader-facing source links omit internal process-record Markdown files and `scope_reconciliation.json`; both remain in the audit archive and the latter remains a build input. Other source links open local evidence files; line numbers are displayed as reference information.

## Verified source-ID reconciliation

| Parent | Disjoint child branches |
|---|---|
| 6,502 source IDs | 5,898 documentary candidates + 604 documentary exclusions |
| 5,898 | 5,638 carry-forward + 31 A scope decisions + 49 C freezes + 180 D cognition freezes |
| 5,638 | 5,162 conservative review scope + 433 E/F/G deferred + 43 IO support |
| 5,162 | 4,781 Core review inventory + 381 LB |
| 4,781 | 273 retained for review + 4,338 outside the working pool + 170 without respondent denominator |
| 273 | 202 provisional Core + 24 support + 30 not moved + 17 recommended exclusions |
| 381 LB | 371 active provisional LB + 10 held outside |

Every partition is checked by exact source-ID sets, not only by count. All 573 current variables are members of the original 6,502. The additional 548 are 324 L + 152 PR + 72 RC. They now belong to the connected Core review inventory. The 63 source assignments require exact counterpart documentation; the remaining 485 require disposition. Neither pending subgroup is an approved exclusion or addition to Core-202. Narrative explanations describe conditional questions, restricted eligibility, repeated components, prior-wave availability, and nonresponse only where evidence supports them. The numerical screen remains in the reproducible audit data and is not presented as a substantive explanation.

The historical A, C, and D differences are tied to their section process records. Core-202 includes 177 prior substantive variables plus 25 of the 55 previously deferred variables. The 30 not moved have their binary amendment rationale, rather than being presented solely with the earlier defer recommendation.

## Scientific interpretation

The figure presents one unified 4,338-variable outside-pool branch and searchable list, with no Leave-Behind overlap. Historical screening batches remain archived in the ledger, not displayed as separate branches. Codebook wording is source context, not by itself a verified explanation for absence of responses. Unresolved substantive explanations remain explicit; redundancy requires an identified equivalent counterpart.

The whole-cohort observed-valid coverage denominator for the two Round-3 screening batches is 7,065. It is not an applicability-aware ordinary-missingness estimate. The LB branch did not undergo the Core 50% filter.

Current endpoints are provisional source pools, not approved independent model columns. Guide status, project status, RAND representation, and scientific pool decisions remain separate.

## Rebuild and validation

From this directory:

```bash
python3 -B build_metadata.py
node --check explorer.js
node test_explorer.cjs --report
```

If Node is not on PATH, this session's bundled executable is:
`/Users/lutian/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`.

The builder refreshes the collection payload and imports `build_journey.py` to reconstruct history. Sources are hashed and checked for changes during extraction. It creates:

- `variable_flower_data.js` and `journey_data.js`: offline collection and historical metadata.
- `grouping_manifest.csv`: one primary display group for each of 573 current source IDs.
- `transition_ledger.csv`: one source-ID/stage membership per row, with disposition, rationale, and reference. Repeated IDs across stages are intentional.
- `validation_report.json` and `journey_validation.json`: current inventory checks, exact-ID partition checks, and source hashes.
- `interaction_validation.json`: produced by the offline interaction checks.

The current crosswalk was amended on September 21, 2026. Its status counts are **55 direct/recoded, 63 composite input, 24 partial/related, and 60 without a documented counterpart**. The builder reads the source's count table and checks the exploded variable assignments against it. The earlier 70/49/21/62 snapshot is no longer used.

The 141 explicit-guide rows join exactly to a subset of the 371 LB IDs, with no unmatched IDs. They add documentation, not variables.

The interaction checks execute the production JavaScript with a small DOM adapter. They cover stage membership, pagination, search, empty results, status filters, sorting, collection/group selection, history detail, remembered views, URL history, SVG keyboard handlers, all event-source file references, and numerical petal-area ratios.

**Browser verification:** the updated readable flow was visually inspected through a localhost preview. Selecting the unified branch displayed 4,338 variables with 50-row pagination. The DOM-adapter suite separately checks interactions and proportional-flow membership. A complete responsive-device and native keyboard-focus audit was not repeated. See `review_pathway_update_validation.md`.

## Files and reproducibility

The existing page remains at the same path. Rendering lives in `explorer.js` and `explorer.css`; metadata extraction is separate. Source process records and scientific decisions are unchanged. No composites, recodes, imputation, or model selection are performed.

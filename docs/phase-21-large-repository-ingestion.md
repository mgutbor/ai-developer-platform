# Phase 21 — Large Repository Ingestion Design & Bounded Tree Acquisition

## 1. Problem

Phase 20.2 produced reproducible evidence that the initial ingestion strategy cannot analyze the two largest repositories of the benchmark dataset:

- `microsoft/TypeScript` fails systematically at `maxFileCount` 10/50/100;
- `nodejs/node` fails systematically at `maxFileCount` 10/50/100;
- both repositories return valid recursive Git tree JSON of approximately 17–18 MB;
- the client enforces `maxJsonResponseBytes = 4 MiB` per response;
- the failure occurs before file selection, analyzer, and scoring;
- 2 of 15 benchmark repositories (13.3%) were affected.

Phase 21 designed and validated a bounded acquisition strategy that analyzes those repositories without removing limits, without increasing `maxJsonResponseBytes`, and without changing analyzer, scoring, AI, persistence, or architecture.

```text
PHASE 21 = COMPLETED WITH DOCUMENTED LIMITATION
```

## 2. Root cause

### 2.1 Monolithic recursive tree acquisition

The original `getTree` requested the full recursive tree (`?recursive=1`) for the target commit and rejected any response above 4 MiB. For `microsoft/TypeScript` and `nodejs/node`, the recursive tree response is a valid JSON document of approximately 17–18 MB, so acquisition always failed with `invalid_response` before any file could be selected. This is a legitimate ingestion limit, not an analyzer or scoring defect.

### 2.2 Stale compiled artifact (Phase 21.5)

During development the runner loaded `packages/github/dist/*` (the package `exports` map points to `dist/index.js`), and the compiled artifact still contained the old `resolveTree()` implementation requesting `/commits/{commitSha}` instead of the corrected `/git/commits/{commitSha}`. That stale artifact produced `invalid_response` against valid GitHub responses. Rebuilding `@ai-developer-platform/github` synchronized `dist` with `src` and removed the divergence. `dist/` is gitignored; a clean checkout or build always regenerates it.

### 2.3 Incorrect subtree SHA usage (Phase 21.1/21.2)

An initial segmented fallback attempted to traverse subdirectories by passing the commit SHA or path-filtered semantics to `GET /git/trees/{sha}`. GitHub requires the SHA of the tree object itself for nested traversal. The corrected contract is:

1. resolve the repository HEAD commit;
2. resolve the commit to its root tree SHA via `GET /git/commits/{commitSha}`;
3. request the root tree with `GET /git/trees/{rootTreeSha}` (non-recursive);
4. for every `type=tree` entry, use that entry's own `sha` for the next request;
5. carry the accumulated relative path separately;
6. never use a commit SHA where a tree SHA is required.

## 3. Rejected approaches

| Approach | Why rejected |
| --- | --- |
| Keep the full recursive tree and reject > 4 MiB | Fails all scenarios for the two large repositories |
| Increase `maxJsonResponseBytes` | Forbidden by the phase contract and removes a safety bound |
| Path-filtered tree requests (`getTreePath`) | GitHub does not support path semantics on the Git Trees endpoint; demonstrated non-viable |
| Traverse with the commit SHA for subdirectories | GitHub requires the tree object SHA; produced `tree_unavailable` |
| Workers, queues, Redis, PostgreSQL, caching, RAG | Out of scope; MVP must stay simple and safe |
| Naive stop after discovering `maxFileCount` candidates | Can omit higher-priority or lexicographically earlier candidates; not semantics-preserving |

## 4. Adopted strategy

### 4.1 SHA-based segmented traversal

`acquireTree` in `packages/github/src/ingestion.ts` performs a deterministic breadth-first traversal over non-recursive tree objects, using each `type=tree` entry's own SHA, with:

- accumulated relative paths;
- a visited-tree SHA set (no repeated traversal, no cycles);
- `maxTreeEntries`, `maxApiRequests`, `maxJsonResponseBytes`, and timeout enforcement on every request;
- truncation reporting for any truncated response.

### 4.2 Semantics-preserving early termination (Phase 21.9)

Traversal may stop early only when every pending subtree is provably unable to change the observable file selection:

- the observable selection is the first `min(maxFileCount, maxTreeEntries)` entries of the existing `selectEntries()` result (tier caps → path order), which is exactly what blob acquisition fetches;
- for each pending subtree a conservative lower bound `path + "/"` is compared (with the same `localeCompare` used by selection) against the window's worst path of each tier;
- termination is refused when a pending subtree could fill an unfilled window slot, could contribute a tier below one already present in the window, or could contain a path sorting before the window's worst path;
- tier-1 entries are root-only and never possible inside a subtree; tier-2 only under `.github/workflows`;
- **truncated responses disable early termination entirely** (never terminate on incomplete data);
- if the bound cannot be established, traversal continues.

### 4.3 Excluded-subtree skip

Subtrees inside excluded directories (`node_modules`, `dist`, `build`, `vendor`, `.git`, ...) provably contain zero selectable files, so they are never enqueued. This preserves the selection exactly and avoids wasted requests.

### 4.4 Reference selection unchanged

`selectEntries()` is unchanged (per-tier caps → `path.localeCompare` → `maxTreeEntries` slice) and is now exported for regression tests. Blob fetching still happens only after the final selection is fixed.

## 5. Semantic-preservation argument

- The final selection is always produced by the unchanged `selectEntries()` over the accumulated entries.
- Early termination fires only when the accumulated set already determines the first `maxFileCount` entries of that selection.
- Ordering, tier caps, and `maxFileCount` semantics are unchanged; `maxTotalBytes` is still enforced during blob acquisition.
- Regression fixtures assert identical selection against a reference complete traversal for: early vs late higher-priority candidates, lexicographic displacement, multiple tiers, tier caps, nested trees, duplicate SHAs, excluded deep directories, truncated trees, ambiguous subtrees, `maxFileCount` 1/10/larger, request-limit, and timeout cases.
- On real repositories, the selected paths are prefix-consistent across `maxFileCount` 10 → 50 → 100 (verified for both repositories), i.e., increasing the file count extends the selection without changing the ordering.

## 6. Security and resource constraints

All controls remain intact:

- GitHub HTTPS host allowlist and `redirect: 'manual'` with allowlisted redirect hosts;
- request limit (`maxApiRequests = 125`), response byte limit (`maxJsonResponseBytes = 4 MiB`), file count limit, total byte limit (`maxTotalBytes`), request timeout (10 s), ingestion timeout (60 s);
- path normalization/traversal protection, symlink and submodule exclusion, secret redaction, sanitized errors;
- no repository cloning, no dependency installation, no external code execution;
- tokens are never printed, persisted, or written into artifacts or documentation.

No limit was increased. `maxJsonResponseBytes` remains 4 MiB; `maxApiRequests` remains 125.

## 7. Real measurements (authenticated, `main` branch, latest commits)

### Before (Phase 21.7 baseline, complete traversal)

| Repo | maxFileCount | Status | Tree requests | Requests | Result |
| --- | ---: | --- | ---: | ---: | --- |
| microsoft/TypeScript | 10 | failed | 122 | 125 | `ingestion_limit_reached` |
| nodejs/node | 10 | failed | 122 | 125 | `ingestion_limit_reached` |

First 10 candidates appeared by request 18 (TypeScript) and 16 (Node), but traversal continued until the request budget was exhausted.

### After (Phase 21.10, optimized traversal)

| Repo | maxFileCount | Status | Category | Requests | Tree | Blob | Files | Bytes | Findings | Early term. | maxApiRequests | Latency |
| --- | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |
| microsoft/TypeScript | 10 | ok | — | 30 | 17 | 10 | 10 | 355,514 | 6 | yes | no | 11.7 s |
| microsoft/TypeScript | 50 | ok | — | 78 | 25 | 50 | 50 | 1,573,999 | 6 | yes | no | 28.6 s |
| microsoft/TypeScript | 100 | failed | `ingestion_limit_reached` | 125 | 25 | 97 | — | — | — | — | yes | 43.9 s |
| nodejs/node | 10 | ok | — | 27 | 14 | 10 | 10 | 75,699 | 3 | yes | no | 9.2 s |
| nodejs/node | 50 | ok | — | 71 | 18 | 50 | 50 | 123,015 | 3 | yes | no | 23.8 s |
| nodejs/node | 100 | ok | — | 125 | 22 | 100 | 100 | 215,480 | 3 | yes | no | 39.7 s |

`treeTruncated=true` on successful scenarios means "snapshot intentionally partial" (early termination), not GitHub truncation; direct API checks confirmed no truncated responses during these runs.

## 8. Contract analysis and the TypeScript/100 limitation

Documented contract (`docs/github-ingestion.md`, phase 13–16 evaluations):

- `maxFileCount` ("Selected files", default 50) is an **upper bound**: "return up to N files within resource limits". The code enforces it with `file_count_limit_reached`, and every benchmark documents `coverage: partial` when it binds.
- `maxApiRequests` ("API requests per client", default 125) is a **hard ceiling**. Exhaustion raises the documented `ingestion_limit_reached` error category. It has precedence over `maxFileCount`.
- `maxTotalBytes` bounds fetched content bytes during blob acquisition.
- Partial/incomplete snapshots must be surfaced explicitly; the product never implies complete coverage on a bounded snapshot.

`maxFileCount=100` is therefore an upper bound, not a guarantee of exactly 100 files. For `microsoft/TypeScript` at 100 the fixed budget needs:

```text
3 resolution requests + 25 tree requests + 100 blob requests = 128 > maxApiRequests = 125
```

The run terminates explicitly with `ingestion_limit_reached` (125 requests executed, 97 blobs fetched, then the request guard rejects the next request). The outcome is deterministic (path-sorted traversal over immutable commit trees), bounded, and surfaced as a failure with the documented category — it never claims 100-file coverage. `nodejs/node` completes the same scenario at exactly 125 requests because its traversal needs only 22 tree requests.

**Decision: the TypeScript/100 outcome is an expected bounded-resource result, not a defect.** `maxApiRequests` was not increased because the phase contract forbids weakening any safety/resource limit, and the documented contract makes `maxApiRequests` authoritative over `maxFileCount`. No production code change was made to make the benchmark green.

## 9. Regression tests

Added in `packages/github/src/github.test.ts` (package suite: 25 tests, all passing):

- nested tree traversal using each subtree SHA and path accumulation;
- early termination only when pending subtrees provably cannot change the window (with reference `selectEntries` equivalence);
- no termination while a pending subtree could still displace the window;
- no naive stop at `maxFileCount` candidates when a tier-2 `.github/workflows` subtree is pending;
- truncated data never permits early termination; excluded subtrees are never traversed;
- single-file window (`maxFileCount=1`) stops before lower-tier subtrees;
- existing request-limit, timeout, redirect, byte-limit, and security tests unchanged and passing.

## 10. Quality gates

All passed:

```text
pnpm install --frozen-lockfile
pnpm check:architecture
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test            (77 tests, 0 failures)
pnpm build
pnpm audit --audit-level=high
git diff --check
```

Known environment warning: Node `25.3.0` is outside the declared range (`>=24.15.0 <25`); it did not affect results.

## 11. Final limitations

- `microsoft/TypeScript` at `maxFileCount=100` cannot complete under `maxApiRequests=125` because 100 blob fetches are required; this is the documented precedence of the request budget over the file cap.
- Snapshots are intentionally partial; `coverage` and limitations communicate this.
- The tier-3 (source) tier is unbounded by cap, so exact early termination is only provable against the fetch window, not the entire repository.
- In a rare fetch-skip case (file too large or binary), the fallback entries beyond the window are taken from the accumulated set; entries from provably-irrelevant pending subtrees are not fetched. This matches the product's bounded-snapshot contract and is covered by limitations.
- No precision/recall or human ground truth is claimed.

## 12. Final decision

```text
PHASE 21 = COMPLETED WITH DOCUMENTED LIMITATION
```

The bounded segmented traversal is validated: both large repositories complete at `maxFileCount` 10 and 50, `nodejs/node` completes at 100, requests dropped from 125-with-failure to 30/27/78/71 (and 125 for node/100), selection is deterministic and prefix-consistent, all security/resource limits are intact, and the TypeScript/100 outcome is contract-compliant (`maxApiRequests` precedence over the `maxFileCount` upper bound).

No commit, tag, or push was made. Proposed Conventional Commit:

```text
feat: add semantics-preserving bounded tree traversal
```

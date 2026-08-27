# Deterministic scoring

Phase 5 adds `packages/scoring` as a pure function over a validated `AnalysisResult`.

## Formula

For each supported dimension:

```text
score = clamp(10 - Σ severityPenalty(finding), 0, 10)
```

Penalties are versioned and intentionally simple:

| Severity | Penalty |
| --- | ---: |
| info | 0.25 |
| low | 0.5 |
| medium | 1 |
| high | 2 |
| critical | 3 |

The scorer only uses deterministic findings already backed by evidence. It does not create findings, change recommendations, or reinterpret unknown values.

## Coverage

The scorer produces dimension scores for Architecture, Maintainability, Testing, Documentation, Dependencies, and Code Quality when at least one relevant deterministic signal is observed. Dimensions without sufficient signals have `score: null` and `coverage: insufficient`. A partial analyzer result produces partial dimension coverage.

Coverage is part of the score contract, not decoration: when the snapshot coverage is not `complete`, every scored dimension carries an explicit limitation stating that the score does not represent a complete repository evaluation. A high score on a partial snapshot therefore never implies full-repository quality, and the frontend presents the score together with the coverage limitation.

Accessibility and Security remain represented by analyzer facts/findings but are not forced into a score until their deterministic signal coverage is strong enough.

## No global score

The MVP deliberately does not calculate a global score. This avoids false precision while dimensions and rules are still being validated.

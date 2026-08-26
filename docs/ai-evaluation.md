# Phase 9 — AI evaluation

## Status

The evaluation was run on 2026-08-26 with Node `v25.3.0`; the project target remains Node 24. No AI credentials were present in the environment.

## Dataset and methodology

The reproducible dataset uses existing deterministic fixtures:

- clean TypeScript;
- poor maintainability/testing/code-quality signals;
- JavaScript/React;
- Angular;
- security-like content;
- malformed and partial input;
- prompt-injection-like repository data;
- empty/small reports.

Each case is converted to `AnalysisResult`, passed through `buildAIContext`, and evaluated with `FakeAIProvider`. The harness verifies context determinism, bounded selection, no source blobs, valid references, malformed-reference rejection, prompt delimiters, and deterministic report equality before/after AI.

## Criteria

| Criterion | Result |
| --- | --- |
| factuality boundary | PASS for validated references; semantic factuality requires human review |
| traceability | PASS for finding/evidence/recommendation IDs |
| hallucination protection | PASS for unknown references; free-text claims require human review |
| usefulness | HUMAN REVIEW REQUIRED |
| limitations respected | PASS for context limitations; semantic interpretation requires human review |
| deterministic integrity | PASS; deterministic report unchanged |

## Fake provider results

Measured:

- 4 AI package tests passed;
- 2 API AI integration tests passed;
- context serialization is deterministic;
- invalid finding references are rejected;
- fake interpretation with existing references is accepted;
- deterministic report before/after AI is identical;
- persistence round-trip and unavailable state are covered.

The fake provider does not prove that a real model is useful or factually accurate. It validates the application contract and safety boundary only.

## Live provider

```text
AI LIVE EVALUATION — NOT VALIDATED
```

Reason: no provider credentials were configured. No live request was made and no credentials were invented.

## Latency

Measured locally for the fake path:

- context construction and validation: sub-millisecond to low-millisecond scale in unit tests;
- API fake-provider path: below 0.2 seconds in the integration test process.

Real provider latency is **NOT VALIDATED**. Deterministic analysis remains independent of AI latency because AI is invoked through a separate endpoint after the deterministic report exists.

## Cost model

```text
COST MODEL — NOT VALIDATED
```

No current provider price or token usage was measured. The implementation does not claim a cost per analysis, per 100 analyses, or per 1,000 analyses. A future live evaluation must record provider-reported usage without logging prompts or sensitive content.

## Failure modes

The provider contract classifies:

- unavailable provider;
- timeout;
- rate limit;
- malformed response;
- invalid structured references.

The application records `failed` or `unavailable` in `ai_interpretations` and leaves the deterministic report and job untouched. OpenAI responses are bounded to 512 KiB and the adapter restricts requests to the HTTPS `api.openai.com` host.

## Prompt injection

The system prompt explicitly states that repository content is untrusted data. User context is delimited and contains only bounded report metadata and references. Tests cover injection-like data and verify that the application does not execute instructions, create new references, or modify deterministic output.

## Rate limiting

The AI generation endpoint applies an in-memory limit of five requests per analysis per hour. This is appropriate for the current single-process MVP but is not sufficient for a multi-instance public deployment. A distributed limiter remains deferred until deployment requirements justify it.

## Decision gate

### KEEP WITH LIMITATIONS

The AI layer should remain available as an optional experiment because:

- the deterministic report remains authoritative;
- the boundary is isolated;
- references are validated;
- context is bounded;
- fake-provider behavior is reproducible;
- failure does not invalidate deterministic analysis.

Limitations:

- real-provider quality, latency, and cost are not validated;
- usefulness requires human review;
- the rate limiter is process-local;
- no production-grade provider observability exists;
- no automated semantic evaluation dataset exists yet.

The evidence does not justify calling the feature production-ready or claiming model accuracy.

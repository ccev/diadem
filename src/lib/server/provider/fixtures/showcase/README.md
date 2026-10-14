# Captured personal-dimensions fixture

`pawmi-capture.json` preserves one real record from a read-only HTTP 202 response
to Golbat's `POST /api/pokemon/v3/scan` on 2026-10-14. Species/form, IVs, size
category and personal height/weight are unchanged. Encounter/player IDs and
coordinates are synthetic; unrelated fields, mapper dimensions, timestamps,
credentials and other trainers are omitted. The raw response remains private.

The backend reports personal API revision `fe18d857` from Golbat #424, with an
additional ordinary-encounter/class-agreement guard. It is a modified deployment,
not stock #424 at `dbcb905`. The original page hit its scan limit. This is a
single-record projection: the test's one-record protobuf envelope is synthetic
and does not validate complete-query admission or area coverage. The replay uses
the exact #424 `dbcb905` protobuf client committed in this PR.

`pawmi-metadata.json` contains minimal field subsets from pinned public Game
Master and Masterfile sources, with URLs and full-source hashes. The test runs
the real exact-form metadata join and scorer; neither is mocked.

`pawmi-reference.json` records an independent 50-digit Decimal evaluation of
[FatalisticFeline's published calculator](https://docs.google.com/spreadsheets/d/1ZZwlZ2DOYeO0ouUgu-jXn3qmIf8jE4WTa3BhmtVupHc/edit),
using its `SHOWCASE_SCORE` formula and Pawmi metadata at `Data!A1060:I1060`.
It was calculated separately from Diadem's scorer. For the captured HTTP values:

```text
50 * 35/45
  + 800 * 0.24174303/(0.3 * 1.55)
  + 150 * 1.2884699/(2.5 * 1.55 + 4 * 0.3125)
  = 492.50219013200454585191013200454585191013200454585
```

Golbat's protobuf dimensions are float32. Decoding them expands the captured
short JSON decimals to their exact float32 values, giving
`492.50218728401723655435899117055686685899117055687` under the same formula.
Separate references cover both representations without rounding scores for
filtering or ranking. This verifies backend-record ingestion and published-model
arithmetic; no observed in-game score is attached to this Pawmi fixture.

Subject: Backend test runs report "passed" regardless of assertion outcome (CLI + dashboard both affected)

## Account
- Email: info@lanonasis.com
- User ID: 843814e8-b031-7074-df12-e747890ed98a
- Key ID: key_4feb04922593
- Plan: Starter
- Project ID: 542110f0-cd9b-429b-91cc-79063664064b ("lanonasis-maas", type: backend)

## Summary

Backend tests created via the CLI (`testsprite test create --type backend
--code-file ... --run --wait`) are reported as `"status": "passed"` by both
the CLI and the web dashboard regardless of what the test actually asserts —
including tests that assert `False` unconditionally and are guaranteed to
fail. This makes backend test results on this account currently unusable as
a real pass/fail signal.

## Reproduction

1. Created this file as `--code-file`:

   ```python
   def test_deliberate_failure_sanity_check():
       assert False, "this assertion is deliberately false"
   ```

2. Ran:
   ```
   testsprite test create --type backend --project 542110f0-cd9b-429b-91cc-79063664064b \
     --name "SANITY-CHECK deliberate failure" --code-file sanity_fail.py --run --wait --timeout 60 --output json
   ```

3. Result: `"status": "passed"`.

4. Repeated this **three times** (test IDs below) — same result every time.

5. Confirmed independently on the web dashboard: the project's dashboard shows
   all 6 tests created today (1 from an earlier session + H-01, H-02, and the
   3 sanity-fail tests) as **"6/6 executable tests passed, no failures or
   blocked cases."** The dashboard's own AI-generated run summary explicitly
   states "no evidence of broken routes, auth issues, or schema drift" —
   which is incorrect for at least one of the 6 tests (see next section) and
   would be actively misleading if relied on.

## Test IDs affected (assert False → reported passed)

- `ebff1c68-cfa7-42ff-8ebc-f352756fbb42` ("SANITY-CHECK deliberate failure")
- `50e2a858-7ff1-496f-9fd1-11cfd9ceb2c9` ("SANITY-CHECK2 verbose")
- `966bcaff-3cfb-4b95-a0bc-63f9d57ae1d8` ("SANITY-CHECK3 credit-test" — this
  is the specific run used for the credit before/after measurement below)

## A second, independent symptom: a real 404 also reported as passed

Test `c7f625c6-2b4e-4bad-9204-3a5215b48ae2` ("H-02 readiness probe reflects
dependency reachability") asserts:

```python
def test_readiness_probe_returns_200_when_dependencies_reachable():
    r = requests.get(f"{TARGET_URL}/api/v1/health/ready")
    assert r.status_code == 200
```

Reported `"status": "passed"`. Independently confirmed via direct `curl`
(outside TestSprite, run moments before and after this test) that
`GET https://api.lanonasis.com/api/v1/health/ready` returns **404**, not 200,
both times. This is a separate, real, confirmed production issue on our side
(tracked internally) — but it should have failed this test, not passed it.

## Evidence this isn't just a display/reporting bug — execution itself looks incomplete

- `startedAt` is `null` on every run observed today (passing and otherwise).
- `finishedAt` lands 165–400ms after `createdAt` on every run — too fast for
  a real Python sandbox cold-start + `import requests` + an HTTP round-trip
  to an external host.
- A clean before/after check via `testsprite usage --output json`:
  - Before one of the sanity-check runs: `522` credits.
  - After: `521.8` credits.
  - `creditsPerRun` is documented/reported as `2`. Only **0.2** (10%) was
    consumed for that run.

This pattern (partial credit charge, no `startedAt`, near-instant
`finishedAt`) is consistent with the execution sandbox starting and exiting
early — before actually running the test body — rather than completing a
real run and then misreporting the result.

## Questions for support

1. Is backend (Python) test execution fully available on the Starter plan, or
   does it require a higher tier? If it's gated, the CLI/dashboard should
   surface that rather than reporting "passed."
2. Is there a known issue with backend test execution around 2026-06-21/22
   for this account or in general?
3. Can you confirm from server-side logs whether the test bodies for the 3
   sanity-fail test IDs above actually executed, and if so, why a failing
   assertion was reported as "passed"?
4. Is there a way (CLI flag or dashboard view) to see raw stdout/stderr or an
   execution log for a *passed* run, the way `test artifact get` works for
   failed runs? Right now there's no way to verify a passed run actually ran
   the real assertions.

## Environment

- CLI version: `testsprite --version` → 0.1.2
- OS: macOS (Darwin 25.5.0)
- Node: v22.20.0

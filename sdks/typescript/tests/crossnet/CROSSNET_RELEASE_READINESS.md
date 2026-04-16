# Crossnet Release Readiness

Generated at: 2026-04-16T21:30:21.637Z

## Burn-in Summary

- Runs executed: 5
- Passed: 5
- Failed: 0
- Success rate: 100.00%
- Average duration: 111.2s
- Gate result: PASS

## Run Details


| Run | Exit Code | Duration (s) |
| --- | --------- | ------------ |
| 1   | 0         | 322.6        |
| 2   | 0         | 63.3         |
| 3   | 0         | 55.2         |
| 4   | 0         | 59.5         |
| 5   | 0         | 55.4         |


## Release Gate

- PASS criteria: 0 failed runs in burn-in window.
- FAIL criteria: one or more failed runs (flaky or deterministic break).

## Notes

- Configure run count with `LIOP_CROSSNET_BURN_RUNS` (default: 3).
- Set `LIOP_CROSSNET_STOP_ON_FAIL=1` to stop after first failure.


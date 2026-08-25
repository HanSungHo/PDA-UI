# Frontend Unit Testing and Coverage Guide

## Commands

- `npm test`: one-shot unit test run.
- `npm run test:watch`: local watch mode.
- `npm run test:coverage`: one-shot tests plus enforced coverage.

## Test convention

Tests live under `tests/`, grouped by application area, and use `.test.ts` or
`.spec.ts`. Component tests mount real Vue/Quasar components with Vue Test
Utils; router tests use Vue Router memory history unless testing the app router
factory itself.

## Coverage policy

V8 coverage includes `src/**/*.{ts,vue}` and enforces at least 70% for
statements, branches, functions, and lines. A failure in any one metric makes
`npm run test:coverage` exit non-zero. Generated reports are written to
`coverage/`: HTML at `coverage/index.html`, LCOV at `coverage/lcov.info`, and
Cobertura at `coverage/cobertura-coverage.xml`.

The current suite has 5 test files and 6 tests. Its verified coverage is:

| Metric     | Coverage |
| ---------- | -------- |
| Statements | 98.54%   |
| Branches   | 89.47%   |
| Functions  | 100%     |
| Lines      | 98.54%   |

## GitLab reporting

The test job uses the verified regex
`/All files\s*\|\s*([\d.]+)/` to extract statement coverage from Vitest's real
`All files` row for the MR widget, pipeline list, history, and badge. The same
job uploads Cobertura XML so GitLab can annotate covered and uncovered changed
lines in merge request diffs.

## Coverage badge

Replace `GITLAB_HOST`, `NAMESPACE`, and `PROJECT` with the repository's real
GitLab values:

`[![coverage](https://GITLAB_HOST/NAMESPACE/PROJECT/badges/main/coverage.svg)](https://GITLAB_HOST/NAMESPACE/PROJECT/-/commits/main)`

## Required GitLab project settings

- Enable **Pipelines must succeed** to prevent merge when the coverage job or
  another required job fails.
- Enable **Auto-cancel redundant pipelines** to avoid wasting the instance
  runner.
- Keep Auto DevOps off because this repository defines `.gitlab-ci.yml`.

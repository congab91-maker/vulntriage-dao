# VulnTriage DAO

VulnTriage DAO is a GenLayer-first vulnerability bounty adjudication prototype.
Its Intelligent Contract compares a public researcher report with an official
patch or advisory, reaches validator consensus on severity, reserves the
configured bounty, and supports an appeal-and-settlement lifecycle.

## Current release

- Network: GenLayer Studionet (`61999`)
- Contract:
  [`0x140Bc1D1ee108271B5ec46c6363Ba0DAa69C49a8`](https://explorer-studio.genlayer.com/address/0x140Bc1D1ee108271B5ec46c6363Ba0DAa69C49a8)
- Deployment transaction:
  [`0xa8955e14185e080869f768a8974ebbfca53b52ef0a2ad74ff4077840d45b0aa5`](https://explorer-studio.genlayer.com/tx/0xa8955e14185e080869f768a8974ebbfca53b52ef0a2ad74ff4077840d45b0aa5)
- Contract smoke test: create, fund, submit, and AI judgment finalized on
  Studionet.
- Frontend: a clearly labelled fixture-based product demonstration. Production
  contract reads and writes remain fail-closed until the integration flow is
  completed.

The MVP accepts only already-public or patched vulnerabilities. Secret reports,
zero-days, private PoCs, and embargoed evidence are out of scope.

## Repository layout

- `contracts/` — GenLayer Intelligent Contract
- `tests/` — contract tests
- `web/` — Next.js/vinext frontend
- `docs/` — specifications, reviews, API notes, and evidence
- `ROADMAP.md` — delivered scope, limitations, and future roadmap

## Verification

```powershell
pytest -q

cd web
npm ci
npm test
npm run lint
npx next build
```

The contract source currently deployed on Studionet matches
`contracts/vulntriage.py` by SHA-256:

```text
cc00b5b69bc8477903a715774f2429d587d968e4fbe4bd7cf86cc7ecf96f6265
```

## Important limitation

The frontend intentionally does not claim that fixture data is live contract
state. See `ROADMAP.md` for the exact V1 evidence and the remaining production
integration work.

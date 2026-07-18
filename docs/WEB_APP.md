# VulnTriage DAO Web App

The web app lives in `E:\Genlayer-Projects\vulntriage-dao\web`.

## Product surface

The first release is an adjudication console, not a generic wallet dashboard:

- reports queue with severity and settlement state;
- dual-source evidence cards for researcher and official patch;
- consensus findings with stable decision fields;
- validator/finality trace;
- appeal-window and payout-reservation states;
- Studionet badge and wallet connection flow;
- explicit demo-fixture warning while no verified contract address exists.

The visual case is CVE-2024-4367 in Mozilla PDF.js:

- researcher disclosure: Codean Labs;
- official evidence: immutable Mozilla patch commit;
- expected demo verdict: `HIGH`.

## GenLayer integration boundary

`web/app/lib/genlayer.ts` uses the installed `genlayer-js` SDK and the official
Studionet chain definition. It calls `client.connect("studionet")` when a
browser wallet is present.

The app intentionally does not contain a contract address. Live contract
reads/writes remain disabled until Codex verifies a real successful Studionet
deployment and wires that address through Sites runtime configuration. The UI
therefore never presents demo fixture data as a successful production
transaction.

## Local commands

The scripts are cross-platform. On Windows, use:

```powershell
npm run dev
npm run build
npm run lint
npm test
```

Current checks:

- `npm run build` — passes.
- `npm run lint` — passes.
- `npm test` — passes.

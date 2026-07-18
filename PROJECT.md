# VulnTriage DAO

## Project identity

- Project: VulnTriage DAO
- Workspace: `E:\Genlayer-Projects\vulntriage-dao`
- Network target: GenLayer Studionet
- Current stage: Intelligent Contract implementation, local remediation,
  Studionet deployment, and live dual-source smoke test complete; production
  frontend contract integration remains pending
- Independence rule: No code, addresses, credentials, repositories, deployment state, or AI output may be imported from another GenLayer task.

## One-line pitch

A decentralized AI adjudication layer that compares a public vulnerability report with an official patch, advisory, or current source and assigns a transparent bounty tier.

## Product decision

The MVP supports only vulnerabilities that are already public or patched. Secret reports and zero-day disclosure are explicitly out of scope. No private PoC, decryption key, secret URL, or embargoed evidence may be submitted to the contract or frontend.

## MVP outcome

A project deposits a bounty and publishes a versioned assessment policy. A researcher submits two public evidence URLs. GenLayer reads both sources, evaluates whether the vulnerability is credible and material, and returns one of three verdicts:

- `HIGH`: full configured payout
- `MEDIUM`: partial configured payout
- `INVALID`: no payout

The judgment opens a deterministic appeal window. Settlement is permissionless after that window, or immediately after the single appeal is resolved. Only settlement schedules the payout and updates on-chain reputation.

## Success statement

The demo succeeds only if a real Studionet Intelligent Contract reads two public web sources, reaches validator consensus on a severity verdict, finalizes the transaction successfully, and causes the frontend to show the real on-chain verdict, reasoning, settlement state, payout, and reputation update.

## Deployment evidence

- Network: GenLayer Studionet (`61999`)
- Contract: `0x140Bc1D1ee108271B5ec46c6363Ba0DAa69C49a8`
- Deployment transaction:
  `0xa8955e14185e080869f768a8974ebbfca53b52ef0a2ad74ff4077840d45b0aa5`
- Live smoke test: create program, fund program, submit public dual-source
  evidence, and finalize an AI judgment

## Integration gate

The deployed address is verified, but the frontend remains intentionally
fixture-labelled and fail-closed. Production contract reads and writes are not
presented as complete until the end-to-end SDK integration is implemented and
tested.

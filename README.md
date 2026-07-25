# VulnTriage DAO

VulnTriage DAO is a GenLayer application for consensus-based vulnerability bounty adjudication. A program owner escrows Studionet GEN and publishes a severity policy. A researcher submits two public sources: a report or proof of concept and an official patch or advisory. The Intelligent Contract asks GenLayer validators to read both sources independently, determine whether the vulnerability is substantiated, and record a `HIGH`, `MEDIUM`, or `INVALID` verdict. Deterministic contract logic then maps that verdict to a frozen payout policy and settlement state.

The MVP supports public, already-disclosed vulnerabilities only. It does not accept private zero-day material.

## The trust problem

Traditional bug bounty triage is usually controlled by the project that would pay the bounty. Researchers must trust a small internal team to interpret evidence, assign severity, and choose a payout without understating impact. A centralized AI service operated by the same project does not remove that conflict.

VulnTriage moves the consensus-critical judgment into a GenLayer Intelligent Contract. The project still defines its policy, but no single project server or model can unilaterally set the accepted verdict.

## How it works

1. A project owner calls `create_program` with a GitHub repository, natural-language severity policy, payout factors in basis points, and a per-report cap.
2. The owner calls the payable `fund_program` method to add Studionet GEN to the program's available balance.
3. A researcher calls `submit_report` with a public researcher report URL, a distinct official evidence URL, and a concise impact claim. The report cap moves from available to reserved balance.
4. Any account can call `judge_report`. The leader and validators independently fetch both sources and run the same constrained assessment. Consensus compares the stable decision fields: verdict, confirmation, exploitability, and impact scope.
5. The researcher or program owner may call `appeal_report` once during the contract-level appeal window. This is separate from GenLayer's protocol-level transaction appeal mechanism.
6. After the appeal window, or immediately after a contract-level appeal result, `settle_report` deterministically applies the frozen policy. The contract records the payout, updates researcher reputation, and schedules the native transfer.

An infrastructure failure or an undetermined consensus result does not become an `INVALID` report. State changes occur only after an accepted execution.

## Why GenLayer is essential

The core question is qualitative: does the public report match the affected repository and official patch, is exploitation credible, and how severe is the impact under the published policy? Solidity cannot fetch and interpret those sources. A conventional backend can perform the analysis, but users must then trust its operator.

GenLayer provides the missing trust boundary: on-chain web access, LLM reasoning inside the contract, independent validator execution, and consensus before the verdict changes balances or reputation.

## Verified Studionet deployment

| Field | Verified value |
|---|---|
| Network | GenLayer Studionet |
| Chain ID | `61999` (`0xf22f`) |
| GenLayer RPC | `https://studio.genlayer.com/api` |
| Contract | [`0x140Bc1D1ee108271B5ec46c6363Ba0DAa69C49a8`](https://explorer-studio.genlayer.com/address/0x140Bc1D1ee108271B5ec46c6363Ba0DAa69C49a8) |
| Deployment transaction | [`0xa8955e14185e080869f768a8974ebbfca53b52ef0a2ad74ff4077840d45b0aa5`](https://explorer-studio.genlayer.com/tx/0xa8955e14185e080869f768a8974ebbfca53b52ef0a2ad74ff4077840d45b0aa5) |
| Deployment result | `FINALIZED`; leader receipts report `execution_result: SUCCESS` |
| Live application | [https://vulntriage-dao.vercel.app](https://vulntriage-dao.vercel.app) |

Read-only verification on 2026-07-26 returned chain ID `0xf22f`, `get_next_ids = [2, 2]`, program `#1`, policy `#1`, and report `#1`. The report is currently `JUDGED` with a `HIGH` verdict. These are development-network smoke-test records, not adoption or traction metrics.

The live application was deployed from this frontend revision on 2026-07-26 and verified to load the Studionet program, policy, report, and verdict shown above. This verifies the public read path; wallet-signed writes still require a connected wallet and user approval.

## Architecture

```text
Browser wallet + Next.js UI
  ├─ readContract: public Studionet state
  ├─ writeContract: signed user actions
  └─ getTransaction: consensus and execution lifecycle
                    │
                    ▼
VulnTriage Intelligent Contract
  ├─ deterministic policy, reservation, roles, appeal window, settlement
  ├─ web.get(report URL + official evidence URL)
  └─ exec_prompt assessment + independent validator rerun
                    │
                    ▼
GenLayer validators and Studionet consensus
```

- [`contracts/vulntriage.py`](contracts/vulntriage.py) contains the deployed Intelligent Contract source.
- [`web/app/lib/genlayer.ts`](web/app/lib/genlayer.ts) is the contract adapter, decoder, wallet guard, and transaction monitor.
- [`web/app/page.tsx`](web/app/page.tsx) implements the live read/write user journey.
- [`tests/test_vulntriage.py`](tests/test_vulntriage.py) covers deterministic and nondeterministic contract behavior.
- [`web/tests`](web/tests) covers address/network guards, decoded contract state, transaction execution checks, adapter calls, lifecycle monitoring, and production-render claims.

## Intelligent Contract API

Constructor:

```text
VulnTriage(cancellation_window: u256 = 3600, appeal_window: u256 = 86400)
```

Write methods:

```text
create_program(
  name: str,
  repo_owner: str,
  repo_name: str,
  policy_text: str,
  high_bps: u256,
  medium_bps: u256,
  report_cap_wei: u256
) -> u256

fund_program(program_id: u256) -> None                         # payable
update_policy(program_id: u256, policy_text: str, high_bps: u256, medium_bps: u256) -> None
set_program_active(program_id: u256, active: bool) -> None
withdraw_available(program_id: u256, amount: u256) -> None
submit_report(program_id: u256, report_url: str, evidence_url: str, claimed_impact: str) -> u256
cancel_report(report_id: u256) -> None
judge_report(report_id: u256) -> None
appeal_report(report_id: u256, appeal_reason: str) -> None
settle_report(report_id: u256) -> None
```

View methods:

```text
get_program(program_id: u256) -> Program
get_policy(program_id: u256, version: u256) -> Policy
get_report(report_id: u256) -> Report
get_reputation(researcher: str) -> Reputation
get_next_ids() -> tuple[u256, u256]
```

Important deterministic rules include owner-only policy and withdrawal controls, nonzero values, frozen policy versions per report, one active report per researcher/program, one contract-level appeal, exact-once settlement, and reserved-balance accounting.

## Frontend integration

The frontend uses `genlayer-js` `1.1.8` and the verified Studionet deployment directly. It does not require a private backend or a contract-address environment variable.

Implemented user operations:

- public reads for programs, current policies, reports, verdict reasoning, and connected-wallet reputation;
- wallet connection and Studionet network switching through `client.connect("studionet")`;
- signed `create_program`, `fund_program`, `submit_report`, `judge_report`, `appeal_report`, and `settle_report` writes;
- wrong-network and invalid-address guards;
- explicit signature rejection and insufficient-funds messages;
- transaction phases for pending, proposing, committing, revealing, accepted, ready-to-finalize, and finalized states;
- terminal handling for canceled, undetermined, validator timeout, leader timeout, and finalized execution error;
- receipt inspection that requires successful leader execution, not only a `FINALIZED` status;
- local persistence of a pending transaction hash and monitoring resume after refresh or timeout;
- state refresh only after successful final execution.

The UI contains no fixture success path or hardcoded verdict. Metrics and report details are derived from contract reads.

## Local setup

Requirements:

- Node.js `>=22.13.0`
- Python and the GenLayer contract test/lint tooling used by this repository
- a browser wallet with Studionet GEN for write testing

Frontend:

```bash
cd web
npm ci
npm run dev
```

Open `http://localhost:3000`. Read-only contract state loads without a wallet. Connect a wallet only for signed writes.

Contract tests and lint:

```bash
pytest -q
genvm-lint check contracts/vulntriage.py
```

Frontend verification:

```bash
cd web
npm test
npm run lint
npm run typecheck
npm audit
```

The current verified local baseline is 43 passing contract test cases and 16 passing frontend tests. Test counts must be updated if the suites change.

## Production build and deployment

The public target is a standard Next.js deployment on Vercel:

```bash
cd web
npm ci
npm run build
```

`web/vercel.json` selects the Next.js framework and `npm ci`. The previous ChatGPT Sites/vinext worker path is intentionally not part of the release tree.

The production deployment is reachable at [vulntriage-dao.vercel.app](https://vulntriage-dao.vercel.app) and loads the verified Studionet contract. Before treating the release as a complete write-path E2E demonstration, execute at least one wallet-signed flow and reconcile its final receipt with the resulting contract state.

## Transaction lifecycle

Receiving a transaction hash proves only that a wallet submitted a request. The UI polls `client.getTransaction` and displays consensus progress. It treats a write as successful only when:

1. the transaction reaches `FINALIZED`;
2. leader execution receipts exist;
3. every inspected leader receipt reports `execution_result: SUCCESS`;
4. no receipt contains an execution error; and
5. a subsequent contract read reflects the new state.

`UNDETERMINED`, `CANCELED`, leader timeout, validator timeout, and finalized execution errors are shown as failures. A monitoring timeout preserves the hash so the user can resume without blindly submitting a duplicate transaction.

## Trust boundaries and limitations

- **Public evidence only:** Report and official evidence URLs are stored on-chain and fetched by validators. Do not submit private or embargoed material.
- **Restricted sources:** The MVP allowlists specific GitHub, raw GitHub advisory, gist, and Codean Labs URL forms. This reduces SSRF and unstable-source risk but limits coverage.
- **Prompt injection:** Fetched material is treated as untrusted data. The prompt fixes output fields and verdict semantics, and deterministic validation rejects malformed or inconsistent results. No LLM boundary eliminates all model risk.
- **Consensus scope:** Validators independently rerun the evidence assessment and compare stable decision fields. Free-form reasoning may differ and is not used alone as consensus proof.
- **Policy authority:** Program owners choose policy text and payout factors. Versioning freezes the policy used by an already-submitted report.
- **Studionet:** Studionet is a hosted development environment with temporary persistence. Native transfers are simulated and are not evidence of production custody or economic security.
- **No legal claim:** The product is an agreed bounty-adjudication workflow, not a court or legal judgment.
- **No private indexing backend:** The current UI reads up to the latest 50 programs and reports because the contract exposes IDs rather than paginated indexes. A production indexer is a future integration, not a delivered feature.
- **Wallet E2E pending:** Read-only smoke verification is complete. This repository update has not performed a new wallet-signed end-to-end transaction because that requires user approval, a wallet signature, and Studionet GEN.

## License

No license file is currently included. Repository visibility does not grant reuse rights; add a deliberate license before inviting external contributions.

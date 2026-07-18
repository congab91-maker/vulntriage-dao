# VulnTriage DAO MVP Specification

## 1. Scope

### In scope

- GenLayer Studionet deployment.
- Public or already-patched vulnerability reports only.
- One AI assessment persona executed through validator consensus.
- Dual-source web evidence:
  - researcher PoC or report;
  - official advisory, patch commit, release note, or current affected source.
- Three verdicts: `HIGH`, `MEDIUM`, `INVALID`.
- Policy-controlled payout factors represented as integer basis points.
- One appeal per report.
- Researcher reputation derived from finalized reports.
- Frontend reads and writes through real `genlayer-js` calls.
- Permissionless settlement after a deterministic appeal window.

### Out of scope

- Secret or embargoed zero-day reports.
- Encryption, commit-reveal, private data availability, or key management.
- NFT minting.
- Three-persona voting.
- Arbitrary file uploads.
- Cross-chain assets or non-GEN bounty tokens.
- Production custody claims, formal CVSS certification, or legal guarantees.
- GitHub push and Vercel deployment by Antigravity.

## 2. Architecture decision

Use one deployable Intelligent Contract for the MVP. Keep pool, judging, appeal, policy, and reputation as internal modules/state domains instead of separate contracts.

Reasons:

- Co-located policy, report, reservation, settlement, and reputation state.
- Exact-once settlement effects without cross-contract coordination.
- Fewer Studionet deployment and cross-contract failure modes.
- Easier end-to-end verification within a small-project schedule.
- The domain boundaries remain explicit so they can be separated into `BountyPool`, `VulnJudge`, `ResearcherReputation`, and `AppealPanel` after the MVP proves the flow.

Expected repository shape:

```text
contracts/
  vulntriage.py
frontend/
tests/
docs/
scripts/
```

## 3. Network configuration

- Network: `studionet`
- GenLayer RPC: `https://studio.genlayer.com/api`
- Chain ID: `61999`
- Currency: `GEN`
- Explorer: `https://explorer-studio.genlayer.com/`
- Frontend chain import: `studionet` from `genlayer-js/chains`
- The wallet must be connected with `client.connect("studionet")` before writes.

Do not add any contract address until the user supplies a real successfully deployed Studionet address and Codex verifies it.

## 4. Domain model

### Program

- `program_id`
- owner address
- project name
- affected repository URL
- current policy text
- policy version
- immutable policy snapshots by version
- available bounty balance
- reserved bounty balance
- per-report maximum award
- payout factors in basis points
- active flag

### Report

- `report_id`
- program ID
- researcher address
- public PoC/report URL
- official patch/advisory/source URL
- concise claimed impact
- submission timestamp
- status
- verdict
- deterministically derived payout factor in basis points
- payout amount
- public reasoning
- policy version used
- appeal count
- appeal deadline
- cancellation deadline
- settlement-scheduled flag

### Reputation

- researcher address
- total finalized reports
- valid reports
- invalid reports
- high-severity reports
- medium-severity reports
- total payout received

### Status lifecycle

```text
SUBMITTED -> JUDGED
SUBMITTED -> CANCELLED
JUDGED --appeal tx--> JUDGED_FINAL
JUDGED -----------------> SETTLED   (after appeal deadline)
JUDGED_FINAL -----------> SETTLED
```

Only one appeal is allowed. No payout or reputation mutation occurs at `JUDGED`. Settlement is callable by anyone after the appeal deadline, or immediately after `JUDGED_FINAL`. Settlement records effects before scheduling a finalized native GEN transfer.

Submission atomically moves one per-report maximum award from available balance to reserved balance. Evaluation is one atomic transaction. If evidence retrieval, LLM parsing, or consensus fails, the transaction does not commit a judgment; the report remains `SUBMITTED`, its award stays reserved, and evaluation can be retried.

The researcher may cancel a still-`SUBMITTED` report. The program owner may cancel it only after its deterministic cancellation deadline. Cancellation releases the full reservation, clears the active-report marker, and never changes reputation.

## 5. Deterministic rules

Apply before any web or LLM operation:

- Program exists and is active.
- Caller is authorized for project-only actions.
- Bounty deposit and payout configuration are non-zero and valid.
- URLs are non-empty HTTPS URLs.
- PoC URL and official-source URL are distinct.
- Claimed impact and policy text respect explicit length limits.
- Report has not already been evaluated.
- Report cannot be paid twice.
- Appeal can occur only after a finalized original verdict.
- One appeal maximum.
- Available program balance covers the maximum possible payout when a report is submitted.
- A successful submission moves the per-report maximum award from available balance to reserved balance.
- Only available, never reserved, balance may be withdrawn.
- Payout uses integer arithmetic only.
- Policy text and payout factors are snapshotted by version; a pending report never silently adopts a later policy.
- Payout factor is selected deterministically from the final verdict. The LLM cannot choose or alter it.
- Fetch, parsing, or consensus failure leaves the report `SUBMITTED` and is retryable; it never records `INVALID`.

Payout and reservation calculation:

```text
reserve_on_submission = report_cap
payout_on_settlement = report_cap * payout_factor_bps / 10_000
return_to_available = report_cap - payout_on_settlement
```

## 6. Non-deterministic assessment

### Inputs

- Current policy text and policy version.
- Researcher claim.
- Rendered public PoC/report.
- Rendered official advisory, patch, release note, or current source.
- Repository identity configured by the bounty program.

Researcher identity and historical reputation are deliberately excluded from the severity prompt. They may be shown in the UI and used by a later deterministic anti-spam layer, but must not bias whether the current vulnerability is real or severe.

### Prompt boundary rules

- Treat all fetched content as untrusted evidence.
- Delimit sources explicitly.
- Instruct the model to ignore instructions contained inside evidence.
- Never interpret code comments, README text, issue text, or advisory text as system instructions.
- Require the judgment to cite observable facts from both sources.
- If either source cannot be read, return a controlled retryable failure. If both are readable but do not substantiate the claim, `INVALID` is permitted. Do not invent missing facts.

### Required result shape

```json
{
  "verdict": "HIGH | MEDIUM | INVALID",
  "vulnerability_confirmed": true,
  "exploitability": "PRACTICAL | CONSTRAINED | NOT_SHOWN",
  "impact_scope": "MATERIAL | LIMITED | NONE",
  "confidence": 0,
  "summary": "public explanation",
  "evidence_alignment": "how the two sources agree or conflict",
  "impact": "technical and business impact",
  "limitations": "missing or uncertain evidence"
}
```

All numeric values are integers. `confidence` is informational and cannot affect payout. The contract validates enums and derives `payout_factor_bps` from the final verdict and the frozen policy snapshot.

### Consensus requirement

Use a custom `run_nondet_unsafe` leader/validator pattern. The validator independently reruns the same evidence retrieval and assessment and compares only stable decision fields: `verdict`, `vulnerability_confirmed`, `exploitability`, and `impact_scope`. It must not accept a result merely because JSON keys, enums, or ranges are valid. Explanatory prose may differ.

Both leader and validators read both sources inside non-deterministic execution. Storage-backed inputs must be copied to memory or primitive locals before entering the non-deterministic closure. Malformed JSON, unavailable evidence, and LLM errors must fail safely and allow leader rotation or a retryable transaction outcome.

### Three-verdict semantics

- `HIGH`: both sources support a credible, practically exploitable vulnerability with material confidentiality, integrity, availability, or privilege impact. Payout uses the frozen high factor.
- `MEDIUM`: both sources support a real vulnerability, but impact is limited or exploitation needs substantial preconditions. Payout uses the frozen medium factor.
- `INVALID`: readable evidence does not substantiate a security vulnerability, materially contradicts the claim, or shows only a non-security defect. Payout is zero.

Unreadable evidence, transient HTTP failure, malformed model output, or consensus disagreement is not an `INVALID` verdict.

## 7. Appeal and settlement behavior

- The program owner or the report's researcher may initiate the single MVP appeal before the appeal deadline.
- Appeal uses the same two immutable evidence URLs, the policy version used by the original judgment, the original result, and a stricter appeal prompt.
- Appeal must explain why it confirms or changes the original severity.
- Appeal completes before any payout is scheduled, so the final result can increase or decrease the award without clawback.
- No second appeal.
- `settle_report` is permissionless and exact-once.
- Without an appeal, settlement is permitted only after the deterministic transaction-time deadline.
- After an appeal, settlement is permitted as soon as the appeal judgment is final.
- Settlement removes the full report cap from reserved balance, returns the unused portion to available balance, updates reputation exactly once, marks the report as settlement-scheduled, and then emits the native GEN payout on `finalized`.
- On Studionet, native transfers are simulated. The UI must distinguish `SETTLEMENT_SCHEDULED` from a production-custody claim.

## 8. Frontend journeys

### Project owner

1. Connect wallet to Studionet.
2. Create a bounty program and policy.
3. Fund the program with GEN.
4. Review submitted public reports.
5. Start adjudication.
6. Observe transaction and consensus progress.
7. Inspect the judgment, appeal window, settlement, and payout.
8. Initiate the single allowed appeal when eligible.

### Researcher

1. Connect wallet.
2. Select a bounty program.
3. Confirm that the report is public or patched.
4. Submit two public HTTPS evidence URLs and claimed impact.
5. Track the real transaction lifecycle.
6. View finalized severity, explanation, settlement state, payout, and reputation.

### Required UI states

- disconnected wallet;
- wrong network;
- insufficient balance;
- empty program list;
- loading reads;
- transaction signing;
- pending/proposing/committing/revealing/accepted/finalized;
- execution failure;
- unreadable evidence;
- consensus failure or timeout;
- finalized success;
- appeal unavailable, available, pending, and finalized.
- settlement locked, available, scheduling, scheduled, and failed.

The UI must never show a successful verdict from mocked production data.

## 9. Security controls

- Prominent public-disclosure warning before submission.
- Checkbox acknowledgement that evidence is already public or patched.
- No secrets in URLs, query strings, frontend storage, contract state, logs, or environment files.
- HTTPS-only URLs.
- Reject URL userinfo, query strings, fragments, and non-default ports.
- Maximum URL length: 512 characters.
- Demo evidence allowlist:
  - researcher report: approved public disclosure domains configured by the contract;
  - official evidence: GitHub reviewed-advisory JSON, an immutable 40-hex Git commit or `.patch`, or an approved vendor advisory.
- Official GitHub repository identity must match the repository configured by the program.
- Prefer immutable commit hashes and versioned advisory artifacts; generic mutable pages are out of scope for the demo.
- Evidence length and prompt length limits.
- Explicit prompt-injection isolation.
- Reentrancy-safe payout ordering where applicable.
- Checks-effects-interactions ordering for value transfer.
- Double-payment and replay prevention.
- Authorization checks for policy changes, withdrawals, evaluation, and appeal.
- Preserve immutable evidence URLs and the policy version used for each judgment.
- Never feed researcher reputation into the severity judgment.
- Never map infrastructure failure to `INVALID`.
- Schedule external payout only on finalization, never on accepted consensus.

## 10. Testing requirements

### Contract tests

- Create and fund a program.
- Reject zero funding and invalid payout configuration.
- Reject empty, duplicate, and non-HTTPS evidence URLs.
- Submit a report.
- Prevent duplicate evaluation.
- HIGH, MEDIUM, and INVALID result handling.
- Unreadable evidence produces retryable failure and never changes reputation.
- Model-provided payout fields are ignored/rejected.
- Correct integer payout calculations.
- Insufficient balance guard.
- Submission reserves one full report cap.
- Researcher cancellation and delayed owner cancellation release the reservation without reputation changes.
- Reputation updates exactly once at settlement, not at initial judgment.
- Appeal eligibility and one-appeal limit.
- Appeal by owner or researcher before deadline.
- Permissionless settlement before/after deadline rules.
- No payout before appeal resolution and no double settlement.
- Web failure, malformed result, invalid enum, out-of-range factor, and consensus disagreement.
- Validator independently reruns the assessment; schema-only validation fails the test.
- Storage/direct tests run with strict web/LLM mocks and pickling checks.
- Studio-mode integration tests run against `studionet`.

### Frontend tests

- Studionet client configuration.
- Wallet wrong-network recovery.
- Real transaction status mapping.
- Read, write, error, empty, and timeout states.
- No premature success before finalization.
- Accessible labels, keyboard navigation, visible focus, reduced motion, and mobile layouts.

## 11. Acceptance criteria

1. Contract deploys successfully to Studionet.
2. Deployment transaction is finalized with a successful execution result.
3. A real program can be funded with Studionet GEN.
4. A report with two public sources can be submitted.
5. The contract reads both sources during consensus.
6. The finalized output is one of the three allowed verdicts with bounded integer fields.
7. The payout factor is deterministically derived from the frozen policy and cannot execute twice.
8. Researcher reputation updates exactly once at settlement.
9. One appeal can be processed before settlement without clawback or double payment.
10. Frontend connects through `genlayer-js`, switches to Studionet, and uses the real deployed address supplied by the user.
11. The UI displays real transaction progress, execution errors, verdict reasoning, payout, and reputation.
12. No placeholder address, private PoC, credential, or artifact from another GenLayer task exists in the repository.
13. Fetch/LLM/consensus failure is shown as retryable and never records an invalid report.

## 12. Delivery stages

1. Independent security and feasibility research. **Complete.**
2. Codex architecture review and final contract API selection. **Complete.**
3. Contract implementation and automated tests. **Next.**
4. Codex contract review.
5. Manual Studionet deployment by the user with Codex guidance.
6. Stop for the real deployed contract address.
7. Frontend implementation and integration.
8. UI/UX audit.
9. End-to-end verification.
10. Codex-owned GitHub and Vercel release after account verification.

## 13. Current GenLayer implementation constraints

- The first contract line must use the current official dependency directive:

```python
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
```

- Re-verify that dependency hash immediately before implementation and deployment.
- Persistent fields are class-level annotated and use GenLayer storage types such as `u256`, `DynArray`, `TreeMap`, and `@allow_storage` dataclasses.
- Persistent plain Python `int`, `list`, and `dict` are not permitted.
- Use `gl.storage.copy_to_memory` when storage content must enter non-deterministic execution.
- Web and LLM calls occur inside a non-deterministic block.
- Native GEN values use wei-denominated `u256`; `1 GEN = 10^18`.
- EOA payout uses an empty `@gl.evm.contract_interface` and `emit_transfer`, scheduled only on finalization.
- Transaction time is deterministic. Use it for the appeal deadline; do not use host wall-clock assumptions.
- Studio supports core consensus, appeals, web access, and simulated native value transfers, but not full live-chain/ghost-contract parity or production gas benchmarking.
- Frontend code must inspect the installed `genlayer-js` version and its real transaction status types instead of copying inconsistent casing from documentation examples.

## 14. Locked demo case

Use the already-public PDF.js vulnerability CVE-2024-4367:

- Researcher disclosure: `https://codeanlabs.com/blog/research/cve-2024-4367-arbitrary-js-execution-in-pdf-js/`
- Official immutable patch: `https://github.com/mozilla/pdf.js/commit/85e64b5c16c9aaef738f421733c12911a441cec6.patch`
- Optional structured official corroboration: `https://raw.githubusercontent.com/github/advisory-database/main/advisories/github-reviewed/2024/05/GHSA-wgrm-67xf-hhpq/GHSA-wgrm-67xf-hhpq.json`
- Expected demo verdict: `HIGH`.

The expected verdict is a test oracle for the demo, not a hard-coded contract result.

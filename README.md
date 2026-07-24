# VulnTriage DAO

> **Decentralized AI vulnerability triage and bounty escrow settlement on GenLayer.**

VulnTriage DAO provides autonomous, bias-free security report evaluation and bounty management for Web3 protocols. A project owner registers a security program, sets payout policies for severity tiers, and deposits native GEN escrow. When a security researcher submits a public vulnerability report with dual-source evidence (advisory and patch diff), GenLayer's multi-validator AI consensus fetches the web evidence, evaluates exploitability and impact, assigns a `HIGH`, `MEDIUM`, or `INVALID` severity verdict, and executes automated escrow settlement.

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────────┐     ┌─────────────────────────┐
│      Project Owner      │     │  Researcher Submits     │     │      GenLayer Consensus     │     │    On-Chain Payout    │
│                         │     │  Public Dual Evidence   │     │                             │     │                         │
│  1. Create Program      │────>│  2. Submit Report URL   │────>│  4. Fetch Dual Sources      │────>│  5. HIGH: Full Payout   │
│  2. Define Policy BPS   │     │     & Patch Evidence    │     │  5. LLM Triage Evaluation   │     │     MEDIUM: Partial BPS │
│  3. Fund Escrow Pool    │     │  3. Trigger Triage      │     │  6. Validate Scoring Logic  │     │     INVALID: No Payout  │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────────┘     └─────────────────┘
```

---

## 1. The Problem

Web3 bug bounty platforms (e.g. Immunefi, HackerOne) play a critical role in securing smart contracts, but traditional bug bounty triage faces major structural friction:

- **Centralized Triage Bottlenecks:** Security reports take weeks to be triaged by centralized human review desks. Disputes between projects and researchers frequently result in ghosting, unpaid disclosures, or arbitrary severity downgrades.
- **Inability of EVM Contracts to Judge Vulnerabilities:** Standard Solidity smart contracts cannot fetch security advisories, parse code patches, or evaluate whether a reported vulnerability impacts smart contract storage or protocol funds.
- **Single AI Assessor Vulnerability:** Relying on a single centralized LLM to judge bug reports opens the system to prompt injection, hallucinated severity ratings, or single-point-of-failure exploitability.

---

## 2. How It Works

VulnTriage DAO replaces centralized triage teams with GenLayer's multi-validator AI consensus (focused on public, disclosed, or patched vulnerabilities):

1. **Create & Fund Security Program:** A project owner calls `create_program`, defining the GitHub repository, policy text, `HIGH` severity BPS payout, `MEDIUM` severity BPS payout, and maximum report cap in native GEN. The owner then deposits escrow funds into the program balance.
2. **Submit Public Evidence:** A researcher calls `submit_report`, providing a public vulnerability report URL, a secondary patch/diff evidence URL, and claimed impact details.
3. **Consensus Triage:** Anyone calls `triage_report`. The GenLayer leader node fetches both public URLs on-chain via `gl.nondet.web.render` and evaluates vulnerability credibility, exploitability, and impact scope through `gl.nondet.exec_prompt`.
4. **Deterministic Validation & Appeal Window:** GenLayer validator nodes re-evaluate the dual evidence and confirm verdict consistency through `validator_fn`:
   - **`HIGH`**: Entitles researcher to full configured report cap payout.
   - **`MEDIUM`**: Entitles researcher to partial configured payout based on `medium_bps`.
   - **`INVALID`**: No payout assigned; report marked invalid.
5. **Settlement & Reputation:** After a deterministic appeal window (or immediately after an appeal resolution), calling `settle_report` executes native GEN value transfer to the researcher and updates their immutable on-chain reputation record (`total_settled_reports`, `valid_reports`, `total_payout`).

---

## 3. Why GenLayer Is Essential

VulnTriage DAO requires native non-deterministic web retrieval and multi-model consensus inside the smart contract:

| Capability | EVM / Solidity | Centralized Oracles | GenLayer |
|---|---|---|---|
| Read dual web evidence on-chain | ❌ Impossible | ⚠️ Centralized / Trusted | ✅ Native `gl.nondet.web.render()` |
| Evaluate code patch vs advisory | ❌ Impossible | ⚠️ Off-chain server bot | ✅ Native `gl.nondet.exec_prompt()` |
| Multi-validator AI consensus | ❌ Impossible | ❌ None | ✅ Built-in `run_nondet_unsafe` |
| On-chain researcher reputation | ⚠️ Off-chain database | ❌ Closed database | ✅ Immutable `Reputation` struct |
| Trustless escrow settlement | ⚠️ Manual multisig | ❌ Platform holds funds | ✅ Native state machine payout |

---

## 4. Live Deployment & Evidence

| Component | Network | Explorer / Address | Details |
|---|---|---|---|
| `vulntriage.py` | GenLayer Studionet (`61999`) | [`0x140Bc1D1ee108271B5ec46c6363Ba0DAa69C49a8`](https://explorer-studio.genlayer.com/address/0x140Bc1D1ee108271B5ec46c6363Ba0DAa69C49a8) | GenVM `v0.2.16` Intelligent Contract |
| Deployment Tx | GenLayer Studionet | [`0xa8955e14185e080869f768a8974ebbfca53b52ef0a2ad74ff4077840d45b0aa5`](https://explorer-studio.genlayer.com/tx/0xa8955e14185e080869f768a8974ebbfca53b52ef0a2ad74ff4077840d45b0aa5) | Status: `FINALIZED`, GenVM: `SUCCESS` |
| Web Application | Local / Web | React + Vite + TypeScript dApp | Dashboard for program management & report submission |
| Pytest Test Suite | Local Simulator | 15 Unit Tests Passing | Covers program creation, report submission, triage & settlement |

---

## 5. Intelligent Contract Architecture

### Dataclass Structures (`contracts/vulntriage.py`)
- **`Program`**: Stores `program_id`, `owner`, `repo_owner`, `repo_name`, `active`, `report_cap_wei`, `available_balance_wei`, `reserved_balance_wei`.
- **`Policy`**: Stores `version`, `text`, `high_bps`, `medium_bps`.
- **`Report`**: Stores `report_id`, `program_id`, `researcher`, `report_url`, `evidence_url`, `claimed_impact`, `status`, `verdict`, `vulnerability_confirmed`, `exploitability`, `impact_scope`, `payout_amount`.
- **`Reputation`**: Tracks `total_settled_reports`, `valid_reports`, `invalid_reports`, `high_reports`, `medium_reports`, `total_payout`.

### API Reference

#### Write Methods
- **`create_program(name: str, repo_owner: str, repo_name: str, policy_text: str, high_bps: u256, medium_bps: u256, report_cap_wei: u256) -> u256`** `@gl.public.write`
  - Initializes a new security bounty program and returns `program_id`.

- **`deposit_program_funds(program_id: u256)`** `@gl.public.write.payable`
  - Deposits native GEN escrow into the program's available balance.

- **`submit_report(program_id: u256, report_url: str, evidence_url: str, claimed_impact: str) -> u256`** `@gl.public.write`
  - Submits dual public evidence URLs and locks reserved cap from program balance.

- **`triage_report(report_id: u256)`** `@gl.public.write`
  - Triggers nondeterministic web rendering and LLM triage evaluation via `gl.vm.run_nondet_unsafe`.

- **`appeal_report(report_id: u256, appeal_reason: str)`** `@gl.public.write`
  - Permits researcher to submit a single appeal within the appeal deadline window.

- **`settle_report(report_id: u256)`** `@gl.public.write`
  - Permissionlessly settles final payout after appeal window expiry and updates researcher reputation.

#### View Methods
- **`get_program(program_id: u256) -> str`** `@gl.public.view`: Returns JSON representation of program state.
- **`get_report(report_id: u256) -> str`** `@gl.public.view`: Returns detailed JSON report assessment.
- **`get_researcher_reputation(researcher: Address) -> str`** `@gl.public.view`: Returns researcher on-chain reputation stats.

---

## 6. Development & Verification Guide

### Contract Lint & Test Suite
```bash
# 1. Run GenVM semantic lint check
python -m genvm_lint check contracts/vulntriage.py

# 2. Run unit test suite
pytest -v
```

### Frontend Setup
```bash
# Navigate to web directory
cd web

# Install dependencies
npm install

# Run development server
npm run dev
```

# VulnTriage DAO Intelligent Contract API

Source: `contracts/vulntriage.py`

Target network:

- Network: GenLayer Studionet
- RPC: `https://studio.genlayer.com/api`
- Chain ID: `61999`
- Chain type: `studionet`
- GenLayer dependency: `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`

The contract is network-agnostic Python code. `gltest.config.yaml`, the frontend
network guard, and the deployment workflow target Studionet.

## Constructor

```python
VulnTriage(
    cancellation_window: u256 = 3600,
    appeal_window: u256 = 86400,
)
```

Both windows are measured in seconds and must be greater than zero. Contract
deadlines use the transaction timestamp supplied by GenLayer.

## Deterministic input limits

| Field | Limit or rule |
|---|---|
| Program name | Nonempty after trimming, maximum 128 characters |
| Repository owner/name | GitHub-compatible slug, maximum 100 characters, normalized to lowercase |
| Policy | Nonempty after trimming, maximum 4,000 characters |
| Claimed impact | Nonempty after trimming, maximum 1,000 characters |
| Appeal reason | Nonempty after trimming, maximum 1,000 characters |
| Evidence URL | HTTPS only, maximum 512 characters, no credentials/custom ports/IP hosts |
| Downloaded source | First 10,000 bytes, strict UTF-8 |
| Model explanation fields | Nonempty strings, maximum 1,000 characters each |

The researcher URL must point to a supported public GitHub gist, issue, pull
request, discussion, security advisory, or repository file. The official
evidence URL must match the program's normalized GitHub repository and identify
a commit, advisory, pull request, issue, or current repository file. The two
URLs must differ.

## Write methods

### `create_program`

```python
create_program(
    name: str,
    repo_owner: str,
    repo_name: str,
    policy_text: str,
    high_bps: u256,
    medium_bps: u256,
    report_cap_wei: u256,
) -> u256
```

Any caller may create a program. It creates immutable policy version `1`.
`0 < medium_bps < high_bps <= 10000` and `report_cap_wei > 0`.

### `fund_program`

```python
fund_program(program_id: u256) -> None
```

Payable. Any caller may fund an active program. Zero-value funding is rejected.

### `update_policy`

```python
update_policy(
    program_id: u256,
    policy_text: str,
    high_bps: u256,
    medium_bps: u256,
) -> None
```

Owner-only and active-program-only. Creates a new policy version; reports already
submitted retain their frozen policy version and payout factors.

### `set_program_active`

```python
set_program_active(program_id: u256, active: bool) -> None
```

Owner-only. Deactivation prevents new funding, policy changes, and submissions.
It does not censor reports already submitted and does not trap unreserved funds.

### `withdraw_available`

```python
withdraw_available(program_id: u256, amount: u256) -> None
```

Owner-only. Withdraws only `available_balance_wei`, including while inactive.
Zero and over-balance withdrawals are rejected. Reserved report caps cannot be
withdrawn.

### `submit_report`

```python
submit_report(
    program_id: u256,
    report_url: str,
    evidence_url: str,
    claimed_impact: str,
) -> u256
```

Creates a `SUBMITTED` report, freezes the current policy version, and moves the
full report cap from available to reserved balance. One researcher may have only
one active report per program.

MVP safety boundary: only already-public or already-patched vulnerabilities are
allowed. Never submit a private PoC, secret URL, credential, decryption key, or
embargoed zero-day.

### `cancel_report`

```python
cancel_report(report_id: u256) -> None
```

The researcher can cancel their `SUBMITTED` report at any time. The program owner
can cancel it only after the cancellation deadline. Cancellation releases the
entire reservation.

### `judge_report`

```python
judge_report(report_id: u256) -> None
```

Permissionless for a `SUBMITTED` report, even if the program was later
deactivated. The leader and validators independently:

1. Read the researcher report/PoC.
2. Read the official patch, advisory, or current source.
3. Ask the model for a strict JSON assessment.
4. Validate all fields and semantic combinations.
5. Compare `verdict`, `vulnerability_confirmed`, `exploitability`, and
   `impact_scope`.

Untrusted policy, claims, appeal text, prior output, and web sources are
JSON-quoted and delimited. The prompt says embedded instructions are data. The
model never controls payout factors or recipient addresses.

Malformed output, source failures, LLM failures, or validator disagreement do
not convert a report to `INVALID`; the transaction remains uncommitted and the
report stays `SUBMITTED` with its reservation intact.

Accepted verdict semantics:

- `HIGH`: vulnerability confirmed, practical exploitability, material impact.
- `MEDIUM`: vulnerability confirmed, constrained exploitability or limited impact.
- `INVALID`: vulnerability not confirmed, exploitability not shown, no impact.

### `appeal_report`

```python
appeal_report(report_id: u256, appeal_reason: str) -> None
```

The researcher or program owner may appeal once, before the appeal deadline.
The same dual-source independent assessment is rerun under a stricter appeal
instruction. Successful consensus replaces the judgment and moves the report to
`JUDGED_FINAL`.

### `settle_report`

```python
settle_report(report_id: u256) -> None
```

Permissionless after the appeal window for `JUDGED`, or immediately for
`JUDGED_FINAL`. Payout uses the frozen policy:

```text
HIGH    = floor(reserved_cap * frozen_high_bps / 10,000)
MEDIUM  = floor(reserved_cap * frozen_medium_bps / 10,000)
INVALID = 0
```

The overflow-safe implementation preserves this exact floor result. Settlement
updates balances, report status, the active marker, and researcher reputation
before scheduling an EOA transfer. A second settlement or transfer is rejected.

## View methods

```python
get_program(program_id: u256) -> Program
get_policy(program_id: u256, version: u256) -> Policy
get_report(report_id: u256) -> Report
get_reputation(researcher: str) -> Reputation
get_next_ids() -> tuple[u256, u256]
```

`get_reputation` accepts a hexadecimal address string and converts it to a
GenLayer `Address`.

## Status lifecycle

```text
SUBMITTED -> JUDGED -> SETTLED
     |          |
     |          +-> JUDGED_FINAL -> SETTLED
     |
     +-> CANCELLED
```

Failed nondeterministic execution commits no intermediate status.

## Local verification

```powershell
$env:PYTHONUTF8='1'
pytest -v
genvm-lint check --json contracts\vulntriage.py
genvm-lint typecheck contracts\vulntriage.py
genvm-lint schema contracts\vulntriage.py
```

`pytest` uses direct GenVM fixtures and does not prove a live network call.
Studionet is declared in `gltest.config.yaml`; a GenLayer Studio deployment and
dual-source judgment transaction are still required for runtime smoke testing.

## Studio deployment limitation

No address is stored in this repository. Deploy `contracts/vulntriage.py` in
GenLayer Studio, wait for finality, then provide the real Studionet contract
address before frontend integration. Never use a placeholder address.

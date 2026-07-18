# VulnTriage DAO — Codex Contract Review 01

Date: 2026-07-18

## Verdict

**FAIL — remediation required before Studio deployment.**

The implementation has a sound storage model, frozen policy snapshots, reservation
accounting, independent validator reruns, deterministic payout mapping, and
effects-before-transfer settlement. The reported 12-test result is reproducible,
and `genvm-lint check` accepts the contract schema. Those checks do not cover
several locked acceptance criteria and two business-logic failures were reproduced
directly.

No contract was deployed, no address was created, and the frontend was not wired.

## Verification performed

### Unit tests

Command:

```text
pytest -v
```

Result:

```text
12 passed in 0.39s
```

The suite ran with `genlayer-test 0.29.2`, Python 3.13.6, and the default
`localnet` configuration because no `gltest.config.yaml` exists.

### GenVM lint and schema

Command:

```text
$env:PYTHONUTF8='1'; genvm-lint check --json contracts\vulntriage.py
```

Result:

```json
{
  "ok": true,
  "lint": {"ok": true, "passed": 3},
  "validate": {
    "ok": true,
    "contract": "VulnTriage",
    "methods": 15,
    "view_methods": 5,
    "write_methods": 10,
    "ctor_params": 2
  }
}
```

The linter reports a newer runner as informational. The current official
developer documentation still publishes the contract's pinned dependency
`1jb45...z09h6`; retain the official documented hash unless the official docs
are updated.

### Type checking

`genvm-lint typecheck contracts\vulntriage.py` identified four optional-body
access diagnostics at the two `response.body.decode(...)` pairs. The pinned SDK
defines web response bodies as `bytes | None`, so the body must be checked before
decoding.

### Security and workspace scan

- No `.env` file found.
- No hardcoded 20-byte address, private key, mnemonic, API key, or Vercel token
  found.
- Project root has no Git repository.
- The existing web repository still points only to the internal Sites remote.

## Deployment blockers

### P0-1 — A project can censor a previously submitted report

`judge_report` rejects when the program has subsequently been deactivated.
Submission already froze policy and reserved the full report cap. Allowing the
owner to deactivate after submission and prevent permissionless judgment breaks
the locked lifecycle and economic neutrality.

Reproduced state:

```text
judge_after_deactivation REJECTED UserError(message='Program is inactive')
report_status SUBMITTED reserved 10 available 10
```

Remove the active-program gate from `judge_report`. Deactivation may stop new
submissions but must not affect already-reserved reports.

### P0-2 — LLM response handling is not defensive

Both judgment paths:

- omit `response_format="json"`;
- do not validate that the result is a mapping with every required key;
- do not enforce exact boolean/integer/string types;
- do not bound confidence to `0..100`;
- do not bound or require the four stored explanation strings;
- may accept stable fields in the validator and then fail while storing missing
  or malformed explanatory fields;
- may store arbitrarily large model output.

Create one shared deterministic assessment validator used by both leader and
validator paths. Invalid model output must cause the nondeterministic execution
to fail/rotate and must never become `INVALID`.

### P0-3 — Free-form inputs and prompt boundaries are incomplete

There are no explicit size limits for program name, repository fields, policy
text, claimed impact, or appeal reason. Policy text, claimed impact, appeal
reason, and original explanation enter prompts without all being labelled and
delimited as untrusted data. A financially interested program owner can therefore
attempt prompt injection through its policy.

Add deterministic nonempty/length/format validation and delimit every untrusted
field. State before the data blocks that embedded instructions in any input or
source are data and must be ignored. Include explicit HIGH, MEDIUM, and INVALID
semantics in the prompt.

### P0-4 — Storage-backed nondeterministic inputs are not copied explicitly

The official storage guide requires storage objects used by nondeterministic
closures to be copied with `gl.storage.copy_to_memory`. The implementation reads
storage records and derives closure values without an explicit copy.

Copy the frozen `Report`, `Program`, and `Policy` records to memory before
constructing nondeterministic closures. Do not access storage inside either
closure.

The installed `genlayer-test 0.29.2` direct-mode patch does not apply
`check_pickling` to `run_nondet_unsafe`, and `cloudpickle` is not installed as a
test dependency. This means the existing suite cannot substantiate the handoff's
pickling claim. Document this tool limitation and perform the closest supported
serialization or Studio smoke check after remediation.

### P0-5 — Web and nondeterministic errors are only partially handled

The pinned response body is optional but decoded unconditionally. The validator
returns `False` for every non-`Return` result without independently classifying
or reproducing the error. The current official equivalence guide recommends
explicit `Return`, `UserError`, and `VMError` handling for
`run_nondet_unsafe`.

Check missing/empty bodies, invalid UTF-8, malformed JSON, oversized responses,
and all output validation failures. Infrastructure or LLM failures must leave
the transaction uncommitted and the report `SUBMITTED`.

### P0-6 — Test suite does not meet the locked test matrix

The 12 tests omit, among others:

- strict mock configuration and supported serialization checks;
- zero funding and zero/invalid withdrawal;
- constructor-window validation;
- deactivation after submission;
- HIGH, MEDIUM, and INVALID judgment state assertions;
- HTTP 4xx/5xx, missing body, malformed JSON, invalid enum, wrong types,
  inconsistent fields, oversized source/output, and LLM failure;
- prompt-injection payloads in every untrusted field;
- unauthorized, late, and second appeal cases;
- frozen policy use after policy updates;
- HIGH/INVALID settlement, rounding, exact-once reputation, double settlement,
  and double transfer rejection;
- explicit proof that failed evaluation preserves status and reservation;
- a real Studionet/Studio test command.

Expand the suite to cover the original handoff matrix, not merely the happy
path.

## P1 corrections

- Reject `gl.message.value == 0` in `fund_program`. A zero-value funding call is
  currently accepted and was reproduced locally.
- Validate both constructor windows as nonzero.
- Reject zero withdrawal explicitly and use `u256` for numeric ABI parameters
  where supported by the pinned SDK.
- Permit owner withdrawal of *available* funds while a program is inactive.
  Deactivation should stop new work, not trap unreserved owner funds.
- Validate repository owner/name against a conservative GitHub slug format and
  normalize once at program creation.
- Align `CONTRACT_API.md` with the final ABI and describe transaction time rather
  than “block timestamp.”
- Add a current `gltest.config.yaml` or document an exact current Studionet
  command using RPC `https://studio.genlayer.com/api`, chain ID `61999`, and
  chain type `studionet`.

## Accepted implementation areas

- One independent project workspace with no borrowed deployment state.
- Official documented dependency line is currently present.
- Storage fields use class annotations, sized integers, `TreeMap`, and
  `@allow_storage` dataclasses.
- Report cap is reserved at submission and policy version is frozen.
- Validator independently reruns both web reads and the assessment, then compares
  all four stable decision fields.
- Payout is derived deterministically from frozen policy rather than model output.
- Reputation is updated only during settlement.
- Settlement records effects before scheduling the EOA transfer.
- No placeholder contract address or secret was introduced.

## Gate to the next stage

Antigravity remediation attempt 1 must resolve every P0 item and add the missing
tests. Codex will then rerun lint, schema, type checking, direct tests, adversarial
checks, and a Studio paste/deploy smoke test. Frontend contract wiring remains
blocked until the user supplies the real successfully deployed address.

# Claude Research Reconciliation

Date: 2026-07-18

Claude's independent memo and Codex's live-doc review agree on the core
architecture:

- GenLayer must perform the judgment, not merely store a backend result.
- `run_nondet_unsafe` with independent validator reassessment is the correct
  consensus pattern.
- Validators must compare stable decision fields rather than prose.
- Public and preferably immutable dual-source evidence is essential.
- Prompt injection, mutable evidence, repository spoofing, and double payout
  are the principal risks.
- Studionet is suitable for the demo but has temporary persistence and
  simulated native transfers.

## Codex decisions after reconciliation

1. Infrastructure failure remains retryable and never becomes `INVALID`.
   Claude's suggestion to use `INVALID` for unreadable evidence was rejected
   because it would unfairly damage researcher reputation.
2. The model does not return payout basis points. It returns severity facts;
   the contract deterministically maps the verdict to the frozen policy.
3. Researcher reputation is excluded from the severity prompt to prevent
   historical bias.
4. The business-level appeal completes before settlement. It is distinct from
   GenLayer's protocol-level transaction appeal.
5. One report cap is reserved at submission so the sponsor cannot withdraw the
   promised maximum award before judgment.
6. The web app includes an explicit `Undetermined`/consensus-failure UX path in
   the integration specification, even though the current demo fixture shows a
   successful consensus trace.
7. `genlayer-js` package `1.1.8` confirms the Studionet pattern:
   `createClient({ chain: studionet, account })` followed by
   `client.connect("studionet")`.

The resulting UI is deliberately centered on GenLayer concepts: dual-source
evidence, independent validators, consensus trace, finality window, appeal
separation, reserved payout, and on-chain settlement.

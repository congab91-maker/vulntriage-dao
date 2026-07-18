# VulnTriage DAO Research and Architecture Review

Date: 2026-07-18

## Executive verdict

**GO WITH CONDITIONS.**

GenLayer is a legitimate fit because the product's central output is a subjective, source-grounded security judgment that must control neutral settlement. A conventional AI backend can imitate the analysis, but it cannot offer the same independently re-executed judgment and on-chain enforcement without reintroducing trust in the bounty sponsor.

The MVP is feasible on Studionet if it remains limited to already-public evidence, uses an allowlisted evidence policy, separates judgment from settlement, and treats web/LLM/consensus failures as retryable infrastructure outcomes rather than invalid reports.

## Decisions locked by this review

1. Use one Intelligent Contract for the MVP.
2. Use a custom `run_nondet_unsafe` leader/validator pair.
3. Validators independently repeat evidence retrieval and assessment.
4. Compare stable decision fields only; never approve a leader by schema/range checks alone.
5. The LLM returns severity facts, not a payout factor.
6. The contract maps the final verdict to the frozen policy's basis-point factor.
7. Do not expose researcher reputation to the severity model.
8. Do not pay on the first judgment.
9. Open one appeal window, then settle permissionlessly.
10. Update reputation only at settlement.
11. Unreadable evidence and consensus failure are retryable, not `INVALID`.
12. Use immutable or reviewed public evidence wherever possible.
13. Reserve the maximum award when a report is submitted, not after judgment.

## GenLayer fit

The trust property is not "an LLM can read two pages." Any centralized service can do that. The useful property is that independent validators repeat the source-grounded assessment under an explicit equivalence rule, while the accepted outcome controls a deterministic settlement path. That combination reduces the sponsor's ability to quietly downgrade reports or alter payout logic after submission.

The system still does not prove objective truth. Model diversity, source availability, prompt quality, and validator behavior remain assumptions. The frontend must describe the output as a consensus assessment, not a certified CVSS score.

## Consensus design

The current Equivalence Principle documentation recommends custom validation for classification, scoring, and settlement. The validator must independently derive the decision and compare meaningful fields. Merely validating JSON shape, enum membership, or numeric range is insecure because any well-formed leader result would pass.

For this MVP:

- leader and validators read the researcher report and official source;
- each runs the same security-assessment prompt;
- validation compares:
  - `verdict`;
  - `vulnerability_confirmed`;
  - `exploitability`;
  - `impact_scope`;
- explanation fields are stored from the accepted leader but are not equality anchors;
- malformed JSON, HTTP failure, or LLM failure must not become a bounty verdict.

This current official pattern supersedes stale local notes that claim a validator may never perform non-deterministic work.

## Evidence policy

### Required properties

- HTTPS only.
- No userinfo, query string, fragment, or custom port.
- Maximum 512 characters.
- The two URLs must be distinct.
- The official source must correspond to the program's configured repository.
- The submission UI must state that all evidence becomes public.

### Demo allowlist

- Researcher disclosure: explicitly approved public disclosure domains.
- Official source:
  - GitHub reviewed-advisory JSON;
  - immutable GitHub commit with a 40-character hexadecimal hash, preferably `.patch`;
  - approved vendor security advisory.

Generic mutable pages, shortened URLs, authenticated links, private gists, arbitrary IP addresses, and URLs carrying tokens are out of scope.

Allowlisting reduces but does not prove that a report is safe to publish. The MVP cannot securely accept secret zero-days.

## Threat model

### Critical

- **Accidental zero-day disclosure:** a checkbox cannot prove evidence is already public. Mitigate with prominent warnings, an allowlist, public-only copy, and no arbitrary uploads. Residual risk remains.
- **Irreversible payout before appeal:** solved by separating `JUDGED` from `SETTLED`.

### High

- **Prompt injection in evidence:** delimit evidence, declare it untrusted, use a fixed response schema, compare independently derived decision fields, and never execute fetched content.
- **Source spoofing or mutation:** bind the program to a repository identity and prefer immutable commits/reviewed advisory artifacts.
- **Infrastructure failure misclassified as researcher fraud:** failed assessment transactions leave the report `SUBMITTED` for retry and do not update invalid counters.
- **Double payout:** settlement must have an exact-once guard, record effects before transfer emission, and emit only on finalization.
- **Policy manipulation:** snapshot the full policy and payout mapping per version at report submission.
- **Sponsor withdrawal before judgment:** reserve one full report cap at submission and prohibit withdrawal of reserved funds.

### Medium

- **Model disagreement:** allow leader rotation/retry and show an undetermined state rather than inventing a verdict.
- **Reputation bias:** exclude identity and history from the severity prompt.
- **Sybil/spam:** on-chain reputation alone does not solve identity. Rate limits, bonds, or deterministic anti-spam controls are post-MVP work.
- **Abandoned or unreadable report locking funds:** researcher cancellation is immediate; owner cancellation is allowed only after a deterministic timeout.
- **Oversized or unstable pages:** cap URL/content/prompt size and use stable raw artifacts for the demo.
- **Appeal abuse:** one appeal, limited eligible callers, immutable evidence, frozen policy.

### Low

- **Misleading production claims:** Studionet transfers are simulated and gasless; label the demo accordingly.
- **Frontend status drift:** bind UI states to the installed SDK types and test unknown statuses.

## Studionet feasibility

Studionet currently supports contract execution, consensus, appeals, web access, and simulated native GEN transfers. It is suitable for the demo flow. It does not provide full live-chain or ghost-contract parity and cannot provide meaningful production gas benchmarks.

Use:

- RPC: `https://studio.genlayer.com/api`
- chain ID: `61999`
- network key: `studionet`
- currency: `GEN`

The user will deploy through GenLayer Studio. A frontend contract address must not be created or guessed. Integration stops until the user supplies the real address from a successful finalized deployment.

## Demo evidence

The recommended public case is CVE-2024-4367 in PDF.js.

The researcher disclosure explains attacker-controlled `FontMatrix` data reaching dynamically generated JavaScript. The immutable Mozilla patch validates the matrix and removes the font-loader `eval` path. The reviewed advisory identifies `pdfjs-dist`, affected versions, fixed version `4.2.67`, and high severity.

Expected outcome: `HIGH`. This is a test oracle, not a hard-coded result.

## Required test layers

1. Deterministic storage and authorization tests.
2. Direct-mode contract tests with strict web/LLM mocks.
3. Validator tests proving independent reassessment and rejecting schema-only approval.
4. Pickling checks for non-deterministic closures.
5. Failure tests for 4xx, 5xx, malformed JSON, prompt injection, mismatched repository, oversized content, and consensus disagreement.
6. Settlement tests for deadline, appeal, exact-once reputation, balance reservation, and double-transfer prevention.
7. Studio-mode integration tests against Studionet.
8. Frontend tests for wallet, network, transaction lifecycle, unknown SDK statuses, failed execution, and no premature success.

## Official sources

- [Networks and RPCs](https://docs.genlayer.com/developers/genlayer-chain/networks)
- [Equivalence Principle](https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle)
- [Web Access](https://docs.genlayer.com/developers/intelligent-contracts/features/web-access)
- [Calling LLMs](https://docs.genlayer.com/developers/intelligent-contracts/features/calling-llms)
- [Storage](https://docs.genlayer.com/developers/intelligent-contracts/storage)
- [Value Transfers](https://docs.genlayer.com/developers/intelligent-contracts/features/value-transfers)
- [Messages](https://docs.genlayer.com/developers/intelligent-contracts/features/messages)
- [Transaction Context](https://docs.genlayer.com/developers/intelligent-contracts/features/transaction-context)
- [Error Handling](https://docs.genlayer.com/developers/intelligent-contracts/features/error-handling)
- [Testing](https://docs.genlayer.com/developers/intelligent-contracts/testing)
- [GenLayer Studio Limitations](https://docs.genlayer.com/developers/intelligent-contracts/tools/genlayer-studio/limitations)
- [GenLayerJS](https://docs.genlayer.com/developers/decentralized-applications)
- [Staking Contract Guide](https://docs.genlayer.com/developers/intelligent-contracts/examples/staking)

## Evidence sources

- [Researcher disclosure for CVE-2024-4367](https://codeanlabs.com/blog/research/cve-2024-4367-arbitrary-js-execution-in-pdf-js/)
- [GitHub reviewed advisory GHSA-wgrm-67xf-hhpq](https://github.com/advisories/GHSA-wgrm-67xf-hhpq)
- [Immutable Mozilla patch](https://github.com/mozilla/pdf.js/commit/85e64b5c16c9aaef738f421733c12911a441cec6.patch)

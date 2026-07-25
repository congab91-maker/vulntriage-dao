# Project Roadmap

## V1 Delivered

VulnTriage DAO is a public-evidence workflow for vulnerability bounty adjudication. It addresses the conflict of interest created when the same project that owes a bounty is also the sole evaluator of severity. A project owner defines a repository, a natural-language policy, payout factors, and a report cap. A researcher submits a public report plus an official patch or advisory. The GenLayer Intelligent Contract asks validators to read both sources independently, reach consensus on stable security decision fields, and record a `HIGH`, `MEDIUM`, or `INVALID` verdict. Deterministic contract logic reserves funds, applies the frozen payout policy, settles the report, and updates researcher reputation.

The delivered contract implements program creation and funding, versioned policies, report reservation and cancellation, dual-source AI judgment, one contract-level appeal, settlement, native transfer scheduling, and reputation accounting. Consensus reruns the same evidence task on validators and compares verdict, vulnerability confirmation, exploitability, and impact scope. Schema checks are additional guards rather than the only validator logic.

The delivered frontend source uses `genlayer-js` to:

- read programs, current policies, reports, verdict reasoning, and reputation from the verified deployment;
- connect a browser wallet and request Studionet;
- submit signed `create_program`, `fund_program`, `submit_report`, `judge_report`, `appeal_report`, and `settle_report` calls;
- show consensus phases and terminal failure states;
- reject wrong-network writes and explain wallet signature rejection;
- require `FINALIZED` plus successful execution receipts before refreshing state; and
- persist an in-flight transaction hash so monitoring can resume after refresh or timeout.

No fixture is used as the production success path. Values shown after hydration come from contract reads.

Verified deployment evidence:

- Network: GenLayer Studionet
- Chain ID: `61999` (`0xf22f`)
- RPC: `https://studio.genlayer.com/api`
- Contract: [`0x140Bc1D1ee108271B5ec46c6363Ba0DAa69C49a8`](https://explorer-studio.genlayer.com/address/0x140Bc1D1ee108271B5ec46c6363Ba0DAa69C49a8)
- Deployment transaction: [`0xa8955e14185e080869f768a8974ebbfca53b52ef0a2ad74ff4077840d45b0aa5`](https://explorer-studio.genlayer.com/tx/0xa8955e14185e080869f768a8974ebbfca53b52ef0a2ad74ff4077840d45b0aa5)
- Live application: [https://vulntriage-dao.vercel.app](https://vulntriage-dao.vercel.app)
- Deployment transaction state: `FINALIZED`, with successful leader execution receipts
- Read-only smoke evidence on 2026-07-26: `get_next_ids = [2, 2]`; program `#1`, policy `#1`, and report `#1` are readable; report `#1` is `JUDGED` with a `HIGH` verdict

Local verification currently covers 43 passing contract test cases and 16 passing frontend tests, plus GenVM lint, TypeScript type checking, ESLint, a production Next.js build, and an npm audit. These figures are engineering evidence, not usage metrics.

The updated frontend was deployed to Vercel on 2026-07-26 and its public read path was verified against the Studionet contract. A wallet-signed end-to-end write run remains a release-validation gate; the current deployment should not be presented as proof that every write path has been exercised from the production browser.

## Target Users

The primary users are:

- open-source maintainers and Web3 protocol teams that operate public bug bounty programs;
- independent security researchers who need a transparent connection between evidence, severity, and payout policy; and
- security communities or DAOs that want a shared adjudication record rather than an opaque internal decision.

The product is most useful after a vulnerability is public or patched. The project creates a policy and funded program, a researcher submits two public sources, and the parties use the on-chain verdict and deterministic settlement path as their agreed process. Its value is not that AI produces a severity label; its value is that no single project backend controls the consensus-critical answer.

Private zero-day handling is intentionally outside V1 because publishing evidence URLs on-chain would create an unacceptable disclosure risk.

## Adoption Approach

V1 has no claimed users, partnerships, or community adoption. The initial adoption plan is:

1. Demonstrate the public Log4Shell smoke case and one smaller, constrained-impact case to GenLayer builders and security researchers.
2. Publish a short walkthrough that connects each visible UI state to an Explorer transaction and contract read.
3. Invite one open-source maintainer or small Web3 project to create a non-production pilot policy and use public, already-resolved reports.
4. Provide a policy template and a five-minute owner onboarding flow covering repository rules, payout basis points, report cap, and Studionet limitations.
5. Convert repeat pilots into continued use by exporting adjudication records, tracking policy versions, and measuring whether valid reports complete without manual state repair.

Suitable channels include GenLayer's builder community, security research Discord communities, open-source security working groups, and maintainers already publishing GitHub Security Advisories. Outreach should describe the system as an experimental consensus-based adjudication workflow, not as production custody or legal arbitration.

## Planned Integrations

### GitHub App and advisory metadata

- **Why:** V1 accepts stable GitHub URLs but does not authenticate repository ownership or normalize advisory metadata off-chain.
- **Value:** Stronger repository binding, clearer patch provenance, and easier owner onboarding.
- **Architecture impact:** Add a non-authoritative indexing and metadata layer while keeping the contract's own evidence fetch and judgment as the source of settlement truth.
- **Condition:** Define permission scopes, protect installation tokens, and prove that cached metadata cannot replace validator verification.

### Read-only event and state indexer

- **Why:** The contract exposes sequential IDs rather than paginated report indexes, so the V1 browser limits reads to the latest 50 items.
- **Value:** Fast search, filtering, pagination, and longitudinal metrics without changing verdict authority.
- **Architecture impact:** Add an indexer whose records are always reconcilable to contract state and transaction hashes.
- **Condition:** Publish reconciliation rules, reorg/finality handling, and a visible degraded mode when the indexer is unavailable.

### Bradbury testnet

- **Why:** Studionet has temporary persistence and simulated native transfers.
- **Value:** More production-like persistence, wallet behavior, and economic testing.
- **Architecture impact:** Add a deployment registry keyed by chain ID, separate Explorer links, and migration documentation. Contract addresses must never be copied across networks.
- **Condition:** Re-run contract validation against the target environment, deploy a new verified instance, fund test accounts, and complete signed E2E tests.

### Wallet compatibility layer

- **Why:** V1 uses the injected EVM-provider path and has not been verified across multiple wallet products.
- **Value:** More reliable onboarding and clearer network-switch recovery.
- **Architecture impact:** Isolate provider discovery and wallet state from the contract adapter, then add compatibility tests.
- **Condition:** Choose supported wallets, verify Studionet custom-network behavior, and test account/network change events.

### Security-community policy library

- **Why:** New program owners may produce ambiguous severity policies that reduce consensus quality.
- **Value:** Reviewer-vetted policy starting points for common repository and impact models.
- **Architecture impact:** Store templates off-chain, but continue snapshotting the selected policy text and payout factors on-chain per report.
- **Condition:** Obtain expert review, version templates, and clearly separate guidance from guarantees.

## Success Metrics

Current evidence and future targets must remain separate:

| Metric | Current evidence | Initial target | Measurement method |
|---|---|---|---|
| Verified deployment | One Studionet contract and finalized deployment transaction | Preserve source and deployment provenance for every environment | Compare local source, `gen_getContractCode`, transaction receipts, and Explorer records |
| Read availability | Program `#1`, policy `#1`, and report `#1` read successfully on 2026-07-26 | At least 99% successful read refreshes during controlled demo sessions | Client telemetry grouped by RPC error class, without collecting report secrets |
| Contract activity | One development program and one judged development report are verifiable | At least 25 finalized pilot writes across at least three non-production programs | Explorer transactions reconciled to program/report state |
| User-flow completion | No new signed E2E run for this frontend revision | At least 80% of eligible started reports reach `SETTLED` or intentional `CANCELLED` without manual repair | Funnel events joined to on-chain report IDs and finalized receipts |
| Write reliability | Automated guards pass; wallet E2E is pending | At least 95% successful finalization for valid writes, excluding user rejection and deliberate invalid-input tests | Wallet submission, transaction status, execution receipt, and refreshed state |
| Judgment consensus | Report `#1` is a readable `HIGH` judgment | At least 90% first-submission acceptance on a curated public-evidence corpus | Receipt status and consensus result grouped by evidence case |
| Judgment latency | No representative frontend timing baseline | p95 judgment finalization under 15 minutes during a pilot | Time from signed submission to successful finalization |
| Frontend completion | 16 automated frontend tests; no current deployed URL for this revision | 100% of primary states traceable to a contract read or transaction receipt | Automated tests plus manual Explorer reconciliation |
| Security baseline | `npm audit` reports zero known vulnerabilities at verification time | Zero known high or critical runtime vulnerabilities at release | Lockfile audit in CI and release review |
| Community reach | No verified reach or active community | 20 qualified maintainers or researchers complete a demo; 3 start a pilot | Consent-based demo registration and pilot program creation |
| Active integrations | Studionet RPC, GenLayerJS, browser wallet path, and Explorer links are implemented | Three independently verified external integrations beyond the base stack | Integration health checks and signed user-flow tests |

Targets are hypotheses for a pilot, not claims about current traction.

## Future Updates

### Phase 1: Signed write-path verification

- **Problem:** The deployed frontend has not completed a wallet-signed E2E write run in this revision.
- **User value:** A judge can reproduce create, fund, submit, judge, appeal or settle, and verify every step in Explorer.
- **Changes:** Run the signed smoke flow, capture transaction hashes, and reconcile each successful receipt with the resulting contract state and production UI.
- **Integrations:** Browser wallet, Studionet, Explorer, Vercel.
- **Condition:** User approves signatures and GEN use; every transaction reaches `FINALIZED` with successful execution.
- **Success:** One documented E2E path with no UI/Explorer mismatch and no unsupported live claim.

### Phase 2: Operational indexing

- **Problem:** Sequential browser reads do not scale beyond a small demo set.
- **User value:** Fast program/report discovery, filters, and reliable refresh behavior.
- **Changes:** Add a reconciled read index, pagination, cache invalidation, and explicit indexer-degraded states.
- **Integrations:** GenLayer RPC or Explorer data source and an observability service.
- **Condition:** Index records are reproducibly linked to finalized contract state and cannot authorize writes or verdicts.
- **Success:** p95 queue load under two seconds for 1,000 indexed reports and 100% sampled reconciliation with the chain.

### Phase 3: Policy quality and evidence expansion

- **Problem:** Narrow source allowlists and ambiguous owner-written policies limit coverage.
- **User value:** More repositories and better severity consistency without weakening prompt-injection defenses.
- **Changes:** Add audited evidence adapters, repository ownership verification, policy linting, and a versioned policy library.
- **Integrations:** GitHub App, GitHub Security Advisories, selected CVE/CVSS sources.
- **Condition:** Each new source has stable canonical fields, deterministic URL validation, bounded content, and adversarial tests.
- **Success:** At least 90% consensus acceptance on a reviewed corpus spanning three evidence-source types, with zero accepted cross-repository evidence cases.

### Phase 4: Private disclosure design

- **Problem:** V1 cannot safely handle private zero-days because public URLs and on-chain state can leak exploit details.
- **User value:** Coordinated disclosure before a patch is public.
- **Changes:** Research encrypted evidence, access-controlled validator workflows, commit-reveal references, redaction, and delayed disclosure. This phase may be rejected if confidentiality cannot be guaranteed.
- **Integrations:** Audited encryption/key-management infrastructure and coordinated-disclosure partners.
- **Condition:** Independent security review, explicit threat model, recovery procedure, and proof that unauthorized validators or public chain observers cannot access the PoC.
- **Success:** Zero evidence leakage in adversarial testing and documented approval from participating security reviewers.

### Phase 5: Persistent testnet pilot

- **Problem:** Studionet cannot establish production-like custody, persistence, or reliability evidence.
- **User value:** A durable pilot with realistic network and wallet behavior.
- **Changes:** Deploy a separately verified Bradbury instance, migrate only approved configuration, add environment-specific addresses, and repeat contract/frontend security testing.
- **Integrations:** Bradbury RPC, Explorer, faucet, wallet layer, monitoring.
- **Condition:** Release verification and operational indexing phases pass; contract source is revalidated for the target network.
- **Success:** Three pilot programs complete at least 25 finalized writes with at least 95% valid-write success and no balance-accounting divergence.

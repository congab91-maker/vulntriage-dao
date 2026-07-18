# Project Roadmap

## V1 Delivered

### Product scope

VulnTriage DAO is a GenLayer-based prototype for evidence-backed vulnerability
bounty adjudication. It addresses a specific trust problem in conventional bug
bounty programs: a researcher may have little visibility into why a project
accepted, rejected, or down-scored a report. The product defines a transparent
workflow in which a public researcher report is evaluated against a second,
official source such as a patch, advisory, or current repository source.

The V1 safety boundary is deliberate. It supports only vulnerabilities that are
already public or patched. Private proofs of concept, credentials, decryption
keys, embargoed evidence, and undisclosed zero-days are outside the delivered
scope.

### Delivered Intelligent Contract

The Python Intelligent Contract in
[`contracts/vulntriage.py`](contracts/vulntriage.py) implements:

- creation and funding of bounty programs;
- versioned policy text and deterministic HIGH/MEDIUM payout factors;
- reservation of a report cap when a researcher submits a report;
- deterministic validation of GitHub-based report and official-evidence URLs;
- dual-source web retrieval during judgment;
- an LLM assessment constrained to `HIGH`, `MEDIUM`, or `INVALID`;
- independent leader and validator reruns with exact comparison of four stable
  decision fields;
- one business-level appeal by the researcher or program owner;
- permissionless settlement after the appeal window;
- deterministic payout calculation from the policy version frozen at
  submission;
- aggregate researcher reputation updated only during settlement; and
- owner controls for policy versions, program activation, and unreserved funds.

The model does not choose the payout factor or recipient. Input sizes, downloaded
source sizes, output fields, types, ranges, enums, and semantic combinations are
bounded and checked before a judgment can be stored. Prompt inputs and downloaded
sources are treated as untrusted data.

### Verified Studionet deployment

The reviewed contract source has been deployed to GenLayer Studionet:

- Contract:
  [`0x140Bc1D1ee108271B5ec46c6363Ba0DAa69C49a8`](https://explorer-studio.genlayer.com/address/0x140Bc1D1ee108271B5ec46c6363Ba0DAa69C49a8)
- Network: GenLayer Studionet
- RPC: `https://studio.genlayer.com/api`
- Chain ID: `61999`
- Deployment transaction:
  `0xa8955e14185e080869f768a8974ebbfca53b52ef0a2ad74ff4077840d45b0aa5`
- Deployment status: `FINALIZED`
- GenVM result: `SUCCESS`
- Consensus result: `Accepted`
- Deployed source SHA-256:
  `cc00b5b69bc8477903a715774f2429d587d968e4fbe4bd7cf86cc7ecf96f6265`

The code returned by Studionet through `gen_getContractCode` matches the local
contract file byte for byte. The RPC reports chain ID `0xf22f`, which is decimal
`61999`.

The Explorer currently records one transaction for this contract: the
constructor deployment. It reports a balance of `0 GEN`. No program creation,
funding, report submission, judgment, appeal, or settlement transaction has yet
been recorded. The deployment is therefore verified, while an end-to-end live
adjudication is not yet demonstrated.

### Delivered frontend

The frontend in [`web/`](web/) is a responsive, server-rendered adjudication
console built with React, Next.js-compatible Vinext, TypeScript, and
`genlayer-js`.

The delivered interface allows a viewer to:

- inspect clearly labelled demonstration reports and evidence cards;
- switch between Queue, Policy, and Reputation views;
- preview loading, empty, undetermined-consensus, and evidence-error states;
- connect a browser wallet through `genlayer-js`;
- detect a wrong network against Studionet chain ID `61999`; and
- understand the planned transaction lifecycle and the distinction between a
  protocol appeal and a contract-level business appeal.

The current live build is available at
[VulnTriage DAO](https://vulntriage-dao.lovely-krill-7694.chatgpt.site).
It is an active, access-controlled ChatGPT Sites deployment rather than a public
Vercel deployment. The live version is version 2 and is sourced from commit
`79bec075b205d28ffda69b1b61ba6f40b1122bf8`, which matches the current local
frontend HEAD.

The live frontend and the Studionet contract are **not yet integrated**.
No hosted runtime environment variable contains the contract address, and the
frontend contains no contract read or write calls. It intentionally presents
fixture data, discloses that no contract is connected, and disables submission,
appeal, filtering, and live-report actions. Wallet connection and network
switching are implemented, but they are not evidence of a completed contract
transaction flow.

### Build, test, and documentation evidence

The final verification performed on 2026-07-18 produced:

- 43 passing direct Intelligent Contract tests;
- a passing GenVM lint check for 15 public methods: 10 write and 5 view;
- no GenVM type-checking errors;
- a valid generated contract schema;
- a successful production frontend build;
- 2 passing server-rendered frontend disclosure/state tests;
- 2 passing address and chain guard tests;
- a clean frontend lint run; and
- zero production dependency vulnerabilities reported by `npm audit`.

The contract tests cover roles, state transitions, input and URL boundaries,
all three verdicts, malformed model output, web failures, prompt-injection
boundaries, validator disagreement, appeals, frozen policies, payout rounding,
reputation, and exact-once settlement behavior. These are direct-mode tests;
they do not replace a real multi-transaction Studionet integration test.

Build commands are defined in `web/package.json`. Network configuration is
defined in `gltest.config.yaml`. Contract behavior and the reviewed ABI are
documented in [`docs/CONTRACT_API.md`](docs/CONTRACT_API.md) and
[`docs/CONTRACT_REVIEW_02.md`](docs/CONTRACT_REVIEW_02.md).

There is no project-owned automated contract deployment script or Vercel
deployment script. The project root does not currently contain a top-level
README; the frontend has [`web/README.md`](web/README.md), whose deployment
status text predates the verified contract deployment. There is also no verified
public GitHub repository for the complete project in the inspected workspace.

## Target Users

### Open-source maintainers and protocol teams

These teams need to accept vulnerability reports, reserve funds, publish clear
severity rules, and explain payout decisions without relying on an opaque
internal triage process. VulnTriage is relevant when the affected repository and
the remediation evidence are public and when a project is willing to place the
bounty policy and settlement rules on-chain.

### Security researchers

Researchers need evidence that a report was evaluated against the actual patch
or current source and that the final payout follows a policy frozen before the
judgment. The product is valuable when researchers want an auditable report
lifecycle, a bounded appeal process, and reputation based on settled outcomes
rather than an unverifiable private score.

### Bug bounty operators and security communities

Operators may use the system as a neutral adjudication layer for disputed,
already-public cases. Security communities may use it for educational
adjudication exercises built around patched CVEs without exposing new attack
material.

V1 is not suitable for confidential disclosure programs, unpatched production
systems, or teams that cannot publish the evidence needed for validator review.

## Adoption Approach

No production users, pilot customers, community commitments, or recurring usage
have been verified. The following is an adoption plan.

### Initial communities

- GenLayer builders and validator communities, where users already understand
  Intelligent Contracts and consensus finality;
- open-source security maintainers with public GitHub advisories;
- application-security and bug bounty communities interested in transparent
  severity review; and
- security researchers who can provide safe, already-public demonstration cases.

### Outreach channels

- a short technical walkthrough in GenLayer community channels;
- a public repository containing the contract, tests, deployment evidence, and
  a reproducible demonstration case;
- direct outreach to maintainers of small open-source projects with published
  security policies; and
- technical posts comparing the frozen payout policy, AI assessment, validator
  equivalence, and business appeal layers.

### Demonstration and onboarding

The first complete demonstration should use a patched, well-documented
vulnerability with two stable GitHub sources. A guided flow should show program
creation, funding, report submission, validator judgment, the appeal window,
settlement, and reputation changes. Every transaction should link to the
Studionet Explorer, and every native-token amount should be labelled according
to Studionet's testing limitations.

Onboarding should provide a policy template, URL eligibility checks before
submission, a transaction status explanation, and an explicit warning that V1
does not protect confidential reports.

### Retention approach

Trial users can become repeat users if the product preserves policy history,
reduces manual triage work, produces understandable evidence summaries, and
provides a reliable settlement record. Retention should be supported by saved
program templates, a searchable report history, transparent reliability
statistics, and exportable evidence packages. None of these retention features
should be promoted until their live implementations are verified.

## Planned Integrations

### GenLayerJS contract adapter

- **Why:** The frontend currently connects a wallet but cannot read or write the
  deployed contract.
- **Value:** Enables real program, report, judgment, appeal, settlement, balance,
  and reputation views.
- **Architecture impact:** Adds a typed ABI layer, contract reads, transaction
  writes, receipt polling, finality states, and error recovery.
- **Condition:** Verify the deployed schema and complete a safe Studionet smoke
  test before enabling live actions.

### Browser wallets and Studionet network management

- **Why:** Wallet connection exists, but no product transaction uses the
  connected account.
- **Value:** Lets project owners and researchers perform role-specific actions
  from the interface.
- **Architecture impact:** Adds account-aware permissions, transaction signing,
  payable calls, account-change handling, and transaction lifecycle state.
- **Condition:** Complete contract adapter integration and verify value units,
  network switching, rejected signatures, and account changes.

### GenLayer Explorer deep links and transaction index

- **Why:** Users need independent evidence for deployment, transaction status,
  consensus, and finality.
- **Value:** Makes every material product claim auditable outside the frontend.
- **Architecture impact:** Stores transaction hashes in client state or an
  indexer and links contract, report, appeal, and settlement views to Explorer
  records.
- **Condition:** Define stable Explorer URL patterns and handle temporary
  Studionet data availability.

### GitHub API or GitHub App

- **Why:** V1 accepts constrained GitHub URLs but has no repository identity,
  advisory ownership, or commit metadata integration.
- **Value:** Reduces incorrect repository inputs and makes official-source
  provenance easier to verify.
- **Architecture impact:** Adds repository metadata retrieval, commit pinning,
  advisory lookup, rate-limit handling, and optional maintainer authorization.
- **Condition:** Define permission scopes, caching, revocation, and behavior when
  GitHub content changes or becomes unavailable.

### CVE, NVD, and CVSS enrichment

- **Why:** The contract policy is CVSS-like but does not import standardized
  vulnerability metadata.
- **Value:** Provides context without allowing an external score to replace
  project-specific impact judgment.
- **Architecture impact:** Adds off-chain enrichment and provenance fields while
  keeping the on-chain verdict and payout deterministic.
- **Condition:** Clearly separate external metadata from adjudication inputs and
  define freshness and conflict rules.

### Confidential disclosure and encrypted evidence

- **Why:** The public-only V1 cannot safely handle unpatched or embargoed
  vulnerabilities.
- **Value:** Expands the product to real pre-patch bounty workflows without
  publishing exploit details.
- **Architecture impact:** Requires encrypted storage, access control,
  patch-confirmation attestations, disclosure deadlines, and a commit/reveal or
  threshold-decryption design.
- **Condition:** Complete a dedicated threat model, independent security review,
  key-loss analysis, and incident response process before accepting any private
  evidence.

### Production-like GenLayer testnet

- **Why:** Studionet is a hosted development environment with temporary
  persistence and does not establish production readiness.
- **Value:** Provides stronger evidence for durability, realistic validator
  behavior, and ecosystem interoperability.
- **Architecture impact:** Adds network-specific configuration, redeployment,
  address migration, explorer links, funded test accounts, and environment
  separation.
- **Condition:** Finish the Studionet end-to-end flow, integration tests,
  observability, and security review before moving to Bradbury.

## Success Metrics

The table distinguishes verified evidence from future targets. No current user
or usage number is inferred.

| Metric | Current evidence as of 2026-07-18 | Future target | Measurement |
|---|---|---|---|
| Verified deployment | One finalized Studionet constructor transaction; deployed source matches local source byte for byte | Maintain verified source provenance for every deployed environment | Compare `gen_getContractCode`, source hashes, deployment receipts, and Explorer records |
| Post-deployment contract activity | Zero recorded method calls; contract balance is `0 GEN` | At least 25 finalized write transactions across at least 3 funded pilot programs | Studionet or Bradbury Explorer plus contract event/state index |
| End-to-end completion | Not measurable because no live report has been submitted | At least 80% of started eligible submissions reach `SETTLED` or an intentional `CANCELLED` state without manual state repair | Funnel events joined to report IDs and finalized contract state |
| Judgment consensus success | Constructor consensus was Accepted; no judgment transaction exists | At least 90% of controlled public-evidence `judge_report` and `appeal_report` calls reach Accepted on the first submitted transaction | Transaction receipts, consensus status, retry classification, and evidence corpus logs |
| Transaction reliability | Direct tests pass; no live write-flow baseline | At least 95% successful finalization for valid write requests, excluding user rejection and deliberately invalid test inputs | SDK receipt monitoring grouped by method and failure class |
| Judgment latency | No live judgment baseline | p95 judgment or appeal finalization within 15 minutes during the pilot | Timestamp from wallet submission to finalized receipt |
| Frontend truthfulness | Fixture mode is explicitly disclosed and contract actions are disabled | 100% of values shown in live mode are traceable to a contract read or finalized receipt | Automated rendered-state tests and manual Explorer reconciliation |
| Test coverage | 43 direct contract tests and 4 frontend tests pass | Add at least 10 repeatable network integration cases while retaining all current checks | CI reports separated into direct, integration, and frontend suites |
| Qualified adoption | No users or community reach verified | Reach 50 qualified maintainers or researchers, onboard 10 trials, and convert 3 projects into funded pilots | Opt-in analytics, onboarding records, and unique owner addresses |
| Repeat usage | No completed program or report | At least 2 pilot program owners create a second funded program or adjudicate a second eligible report | Unique owner addresses and program/report history |
| Active integrations | Wallet/network connection exists, but no end-to-end product integration is active | Three verified integrations: GenLayer contract adapter, GitHub evidence metadata, and Explorer transaction links | Integration health checks and successful user-flow tests |
| Confidentiality incidents | V1 rejects confidential use by product policy; no private-report telemetry exists | Zero private or embargoed evidence submissions during the public-only pilot | Submission warnings, URL/data classification, incident logs, and support review |

## Future Updates

### Phase 1 — V1.1 Live Contract Integration

- **Problem:** The contract is deployed, but the frontend remains a private
  fixture-only demonstration and no post-deployment transaction has been run.
- **User value:** Project owners and researchers can execute and independently
  verify the complete public-report workflow.
- **Changes:** Add the verified address through hosted configuration; generate
  or validate the ABI; implement real reads and writes for programs, policies,
  funding, reports, judgments, appeals, settlement, and reputation; add signing,
  pending, consensus, finalized, rejected, empty, retryable, and undetermined
  states; replace fixture metrics in live mode.
- **Integrations:** GenLayerJS, browser wallet, Studionet RPC, and Explorer deep
  links.
- **Conditions:** Reconfirm the deployed source and schema, use a safe public
  evidence pair, fund only a controlled test amount, and pass the complete smoke
  test without misrepresenting simulated Studionet transfers.
- **Success:** At least 5 safe report lifecycles complete on Studionet; every
  displayed live value reconciles with contract state; valid writes finalize at
  least 95% of the time.

### Phase 2 — V1.2 Public Pilot and Observability

- **Problem:** A single successful demonstration would not establish
  reliability, usability, or operational support.
- **User value:** Pilot teams receive repeatable onboarding, clear failure
  explanations, and auditable service health.
- **Changes:** Add program templates, evidence preflight checks, transaction
  history, structured error classification, opt-in funnel analytics, reliability
  dashboards, and exportable adjudication records.
- **Integrations:** GitHub metadata, Explorer transaction index, and privacy-safe
  product analytics.
- **Conditions:** Publish a project-level README and reproducible deployment
  record, provide a public application URL, define support and incident
  procedures, and recruit pilots without claiming adoption before it occurs.
- **Success:** Three funded pilot programs, 20 eligible public reports, at least
  80% end-to-end completion, and two repeat program owners.

### Phase 3 — V2 Multi-Persona Review and Stronger Appeals

- **Problem:** V1 uses one assessment instruction and one rerun-based business
  appeal; difficult cases may require explicitly different adversarial
  perspectives.
- **User value:** Researchers and projects receive a more robust explanation of
  exploit credibility, technical severity, and business impact.
- **Changes:** Add separate Security Skeptic and Impact Assessor personas,
  deterministic aggregation rules, richer verdict tiers only if payout mapping
  remains unambiguous, structured disagreement reasons, and an expanded appeal
  panel that cannot silently alter economic policy.
- **Integrations:** CVE/NVD/CVSS enrichment and optional domain-specific policy
  templates.
- **Conditions:** Build a labelled evaluation corpus, measure validator
  agreement, bound all additional model outputs, update storage migration
  strategy, and obtain independent contract review.
- **Success:** At least 90% first-attempt consensus on the controlled corpus,
  documented error analysis for every disagreement class, and no model-selected
  payout or recipient.

### Phase 4 — V3 Confidential Disclosure

- **Problem:** Public URLs cannot support legitimate unpatched vulnerability
  reports without disclosure risk.
- **User value:** Researchers can report serious issues before public patch
  release while preserving a verifiable disclosure timeline.
- **Changes:** Introduce encrypted evidence, commitment timestamps,
  maintainer-scoped access, patch-confirmation attestations, disclosure
  deadlines, controlled reveal, key recovery rules, and an emergency response
  process.
- **Integrations:** Threshold encryption or an independently reviewed key
  management design, encrypted object storage, and GitHub patch/advisory
  attestations.
- **Conditions:** Complete threat modelling, cryptographic design review,
  penetration testing, legal disclosure-policy review, and failure recovery
  drills. The feature must remain disabled until all conditions pass.
- **Success:** Zero unauthorized evidence disclosures in testing, successful
  recovery and reveal in every controlled drill, and full auditability of access
  and disclosure transitions.

### Phase 5 — V4 Production-Like Network and Ecosystem Scale

- **Problem:** Studionet deployment and private hosting are appropriate for a
  prototype but do not demonstrate durable production operation.
- **User value:** Programs gain stronger persistence, operational reliability,
  integration stability, and public auditability.
- **Changes:** Deploy a reviewed release to Bradbury, separate environments,
  implement durable indexing and monitoring, add treasury controls and rate
  limits, publish upgrade and migration procedures, and complete external
  security assessment.
- **Integrations:** Bradbury RPC and Explorer, production hosting, public source
  repository and CI, monitoring, GitHub App, and compatible treasury wallets.
- **Conditions:** Meet Phase 1–4 safety gates as applicable, resolve all audit
  findings, verify account and repository ownership, and complete rollback and
  incident response exercises.
- **Success:** At least 99% frontend read availability during the pilot window,
  at least 95% valid transaction finalization, p95 judgment finalization within
  the established service objective, three active integrations, and no
  unresolved high-severity audit finding.

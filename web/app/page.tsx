"use client";

import { useEffect, useMemo, useState } from "react";
import {
  STUDIONET,
  connectGenLayerWallet,
  hasLiveContract,
  isWalletAddress,
  observeWallet,
  type WalletAddress,
} from "./lib/genlayer";

type QueueItem = {
  id: string;
  title: string;
  repo: string;
  researcher: string;
  submitted: string;
  state: "appeal" | "settled" | "review";
  severity: "HIGH" | "MEDIUM" | "INVALID";
};

type PreviewState = "fixture" | "loading" | "empty" | "undetermined" | "error";

const queue: QueueItem[] = [
  {
    id: "VT-DEMO-01",
    title: "CVE-2024-4367",
    repo: "mozilla/pdf.js",
    researcher: "Fixture researcher A",
    submitted: "Fixture A",
    state: "appeal",
    severity: "HIGH",
  },
  {
    id: "VT-DEMO-02",
    title: "Prototype pollution in config merge",
    repo: "acme/edge-router",
    researcher: "Fixture researcher B",
    submitted: "Fixture B",
    state: "review",
    severity: "MEDIUM",
  },
  {
    id: "VT-DEMO-03",
    title: "Missing origin check in callback handler",
    repo: "northstar/auth-kit",
    researcher: "Fixture researcher C",
    submitted: "Fixture C",
    state: "settled",
    severity: "INVALID",
  },
];

const navItems = ["Queue", "Policy", "Reputation"];
const previewStates: { id: PreviewState; label: string }[] = [
  { id: "fixture", label: "Fixture" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "Empty" },
  { id: "undetermined", label: "Undetermined" },
  { id: "error", label: "Error" },
];

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "blue" | "amber" | "red";
}) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export default function Home() {
  const [activeNav, setActiveNav] = useState("Queue");
  const [selectedId, setSelectedId] = useState("VT-DEMO-01");
  const [previewState, setPreviewState] = useState<PreviewState>("fixture");
  const [walletAddress, setWalletAddress] = useState<WalletAddress | null>(null);
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const selected = useMemo(
    () => queue.find((item) => item.id === selectedId) ?? queue[0],
    [selectedId],
  );
  const walletConnected = Boolean(walletAddress);
  const wrongNetwork = walletConnected && walletChainId !== STUDIONET.chainId;
  const contractConfigured = hasLiveContract();

  useEffect(() => {
    return observeWallet({
      onAccountsChanged(accounts) {
        const nextAddress = accounts[0];
        if (!nextAddress || !isWalletAddress(nextAddress)) {
          setWalletAddress(null);
          setWalletChainId(null);
          return;
        }
        setWalletAddress(nextAddress);
      },
      onChainChanged(chainId) {
        setWalletChainId(chainId);
      },
    });
  }, []);

  const connectWallet = async () => {
    setWalletError(null);
    if (walletConnected) {
      setWalletAddress(null);
      setWalletChainId(null);
      return;
    }
    setWalletLoading(true);
    try {
      const connection = await connectGenLayerWallet();
      setWalletAddress(connection.address);
      setWalletChainId(connection.chainId);
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "Wallet connection failed.");
    } finally {
      setWalletLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <div className="grain" aria-hidden="true" />

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span>V</span></div>
          <div>
            <div className="brand-name">VulnTriage</div>
            <div className="brand-sub">DAO / SECURITY ADJUDICATION</div>
          </div>
        </div>

        <nav className="topnav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <button
              className={activeNav === item ? "nav-link active" : "nav-link"}
              key={item}
              onClick={() => setActiveNav(item)}
              aria-current={activeNav === item ? "page" : undefined}
            >
              {item}
              {item === "Queue" && <span className="nav-count">03</span>}
            </button>
          ))}
        </nav>

        <div className="topbar-actions">
          <Pill tone={wrongNetwork ? "red" : walletConnected ? "green" : "neutral"}>
            <span className={wrongNetwork ? "network-dot wrong" : walletConnected ? "network-dot" : "fixture-dot"} />
            {wrongNetwork ? "WRONG NETWORK" : walletConnected ? "STUDIONET" : "STUDIONET TARGET"}
          </Pill>
          <button
            className={walletConnected ? "wallet-button connected" : "wallet-button"}
            onClick={connectWallet}
            disabled={walletLoading}
          >
            <span className="wallet-orb" />
            {walletLoading
              ? "Connecting…"
              : walletConnected && walletAddress
                ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                : "Connect wallet"}
          </button>
        </div>
      </header>

      {wrongNetwork && (
        <div className="network-warning" role="alert">
          <span>!</span>
          Wallet is not on GenLayer Studionet (chain 61999). Reconnect to request a network switch.
        </div>
      )}
      {walletError && <div className="wallet-error" role="status"><span>!</span>{walletError}</div>}
      <div className="data-mode-banner" role="status">
        <Pill tone="amber">DEMO DATA</Pill>
        <span>
          {contractConfigured
            ? "A valid contract address is configured, but live reads remain disabled until its deployed API is verified."
            : "No contract is connected. Every report, verdict, balance, timeline, and payout below is an illustrative fixture."}
        </span>
      </div>

      <section className="hero">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> GENLAYER ADJUDICATION LAYER</p>
          <h1>Security verdicts,<br /><em>backed by evidence.</em></h1>
          <p className="hero-copy">
            A public, validator-checked path from vulnerability report to fair bounty.
            Two sources in. One accountable on-chain outcome.
          </p>
        </div>
        <div className="hero-annotation">
          <div className="annotation-kicker">DEMO CASE</div>
          <div className="annotation-title">Mozilla / PDF.js</div>
          <div className="annotation-meta"><span className="fixture-orb" /> Fixture only · no GEN locked</div>
        </div>
      </section>

      <section className="metric-grid" aria-label="Product model">
        <article className="metric-card metric-highlight">
          <div className="metric-top"><span>EVIDENCE MODEL</span><Pill tone="green">PUBLIC</Pill></div>
          <div className="metric-value">02 <small>SOURCES</small></div>
          <div className="metric-foot"><span>Researcher report</span><span>Official patch</span></div>
        </article>
        <article className="metric-card">
          <div className="metric-top"><span>VERDICT TIERS</span><span className="metric-icon">◌</span></div>
          <div className="metric-value">03</div>
          <div className="metric-foot"><span>HIGH</span><span>MEDIUM · INVALID</span></div>
        </article>
        <article className="metric-card">
          <div className="metric-top"><span>CONSENSUS RULE</span><span className="metric-icon">◎</span></div>
          <div className="metric-word">Stable fields</div>
          <div className="metric-foot"><span>Independent rerun</span><span>Exact decision match</span></div>
        </article>
        <article className="metric-card metric-note">
          <div className="metric-top"><span>LIVE CONTRACT</span><Pill tone={contractConfigured ? "amber" : "neutral"}>{contractConfigured ? "API PENDING" : "NOT CONNECTED"}</Pill></div>
          <div className="policy-copy">Severity uses public evidence. Researcher reputation is excluded from judgment.</div>
          <div className="metric-foot"><span>Target</span><span>Studionet · 61999</span></div>
        </article>
      </section>

      <div className="content-grid">
        <section className="queue-panel panel">
          <div className="panel-head">
            <div>
              <div className="panel-label">{activeNav === "Queue" ? "DEMO REPORTS" : "PRODUCT MODULE"}</div>
              <h2>{activeNav === "Queue" ? "Adjudication state lab" : activeNav}</h2>
            </div>
            {activeNav === "Queue" && (
              <div className="panel-tools">
                <button className="filter-button" disabled title="Available when live contract reads are integrated">All statuses <span>⌄</span></button>
                <button className="new-report-button" disabled title="Available after the Studionet contract is deployed">+ Submit report</button>
              </div>
            )}
          </div>

          {activeNav === "Queue" && (
            <>
              <div className="state-switcher" aria-label="Preview frontend states">
                <span>STATE PREVIEW</span>
                {previewStates.map((state) => (
                  <button
                    key={state.id}
                    className={previewState === state.id ? "state-chip active" : "state-chip"}
                    onClick={() => setPreviewState(state.id)}
                    aria-pressed={previewState === state.id}
                  >
                    {state.label}
                  </button>
                ))}
              </div>
              <QueueState state={previewState} selectedId={selected.id} onSelect={setSelectedId} />
              <div className="queue-footer">
                <span><span className="fixture-dot" /> Demo fixture · 3 sample reports</span>
                <button className="text-button" disabled title="Available after contract integration">View all reports ↗</button>
              </div>
            </>
          )}

          {activeNav === "Policy" && <PolicyPreview />}
          {activeNav === "Reputation" && <ReputationPreview />}
        </section>

        <aside className="detail-panel panel">
          <div className="detail-head">
            <div>
              <div className="panel-label">DEMO FIXTURE / {selected.id}</div>
              <h2>{selected.title}</h2>
              <div className="detail-repo"><span className="repo-dot" /> {selected.repo}</div>
            </div>
            <Pill tone={selected.severity === "HIGH" ? "red" : selected.severity === "MEDIUM" ? "amber" : "neutral"}>{selected.severity} · DEMO</Pill>
          </div>

          <div className="detail-status">
            <span className="fixture-orb" />
            <div><strong>Demo judgment preview</strong><span>Illustrative appeal window · no on-chain transaction</span></div>
            <span className="status-step">FIXTURE</span>
          </div>

          <div className="section-label">DUAL-SOURCE EVIDENCE</div>
          <div className="evidence-stack">
            <EvidenceCard tag="RESEARCHER REPORT" title="Arbitrary JavaScript execution in PDF.js" source="codeanlabs.com" tone="green" icon="↗" />
            <EvidenceCard tag="IMMUTABLE OFFICIAL PATCH" title="Remove eval from font loader" source="mozilla/pdf.js · commit 85e64b5" tone="blue" icon="⌘" />
          </div>

          <div className="section-label">EXPECTED CONSENSUS FINDINGS</div>
          <div className="finding-grid">
            <div className="finding-card"><span>VERDICT</span><strong className="finding-red">HIGH</strong><small>demo oracle</small></div>
            <div className="finding-card"><span>EXPLOITABILITY</span><strong>Practical</strong><small>expected classification</small></div>
            <div className="finding-card"><span>IMPACT SCOPE</span><strong>Material</strong><small>expected classification</small></div>
            <div className="finding-card"><span>POLICY FACTOR</span><strong>100%</strong><small>frozen demo policy</small></div>
          </div>

          <div className="assessment-copy">
            <div className="assessment-quote">“</div>
            <p>Demo rationale: attacker-controlled FontMatrix data reached dynamically generated code; the upstream patch validates the matrix and removes the font-loader eval path.</p>
            <span>ILLUSTRATIVE SUMMARY · NOT AN ON-CHAIN RESULT</span>
          </div>

          <div className="trace-box">
            <div className="trace-head"><span className="section-label">EXPECTED CONTRACT FLOW</span><span className="trace-live"><span className="fixture-dot" /> NOT ON-CHAIN</span></div>
            <TraceRow index="01" title="Read two public sources" meta="Leader and validators fetch independently" done />
            <TraceRow index="02" title="Match stable decision fields" meta="Verdict · exploitability · impact scope" done />
            <TraceRow index="03" title="Business appeal before settlement" meta="One report-level re-judgment" active />
          </div>

          <div className="appeal-layers">
            <div><span>PROTOCOL APPEAL</span><strong>Transaction consensus review</strong><small>GenLayer network layer</small></div>
            <div><span>BUSINESS APPEAL</span><strong>Report re-judgment</strong><small>VulnTriage contract layer</small></div>
          </div>

          <div className="payout-card">
            <div><span className="section-label">DEMO POLICY OUTCOME</span><strong>8,000 <small>GEN</small></strong><span className="payout-sub">Illustrative only · not reserved or transferred</span></div>
            <button className="appeal-button" disabled title="Requires a verified deployed contract and a real transaction">Contract required</button>
          </div>
          <div className="demo-disclaimer"><span>i</span> Studionet native transfers are simulated. Settlement must be finalized and verified before the UI may describe a payout as received.</div>

          <div className="lifecycle-strip" aria-label="Planned GenLayer transaction lifecycle">
            {["Signing", "Pending", "Proposing", "Committing", "Revealing", "Accepted", "Finalized"].map((step) => <span key={step}>{step}</span>)}
          </div>
        </aside>
      </div>

      <footer className="app-footer">
        <span>VulnTriage DAO <i>·</i> public evidence, neutral adjudication</span>
        <span>GenLayer Studio <i>·</i> temporary persistence <i>·</i> simulated transfers <i>·</i> v0.2 demo</span>
      </footer>
    </main>
  );
}

function QueueState({ state, selectedId, onSelect }: { state: PreviewState; selectedId: string; onSelect: (id: string) => void }) {
  if (state === "loading") {
    return <div className="state-panel" aria-live="polite"><div className="state-spinner" /><strong>Reading contract state</strong><p>Waiting for a verified Studionet response.</p></div>;
  }
  if (state === "empty") {
    return <div className="state-panel"><span className="state-symbol">○</span><strong>No reports yet</strong><p>The program has no submitted public reports.</p></div>;
  }
  if (state === "undetermined") {
    return <div className="state-panel state-amber"><span className="state-symbol">≋</span><strong>Consensus undetermined</strong><p>Validators did not reach equivalence. No INVALID verdict or reputation change was recorded.</p><button disabled>Retry after contract integration</button></div>;
  }
  if (state === "error") {
    return <div className="state-panel state-red"><span className="state-symbol">!</span><strong>Evidence could not be read</strong><p>The report remains SUBMITTED and can be retried. Infrastructure failure is not a verdict.</p></div>;
  }
  return (
    <div className="queue-table" role="table" aria-label="Demo vulnerability reports">
      <div className="queue-row queue-header" role="row">
        <span role="columnheader">REPORT</span><span role="columnheader">RESEARCHER</span><span role="columnheader">FIXTURE</span><span role="columnheader">EXAMPLE STATE</span><span aria-hidden="true" />
      </div>
      {queue.map((item) => (
        <button
          className={selectedId === item.id ? "queue-row queue-item selected" : "queue-row queue-item"}
          key={item.id}
          onClick={() => onSelect(item.id)}
          role="row"
          aria-selected={selectedId === item.id}
        >
          <span className="report-cell" role="cell">
            <span className={`severity-rail severity-${item.severity.toLowerCase()}`} aria-hidden="true" />
            <span><strong>{item.title}</strong><small>{item.id} · {item.repo}</small></span>
          </span>
          <span className="mono" role="cell">{item.researcher}</span>
          <span className="muted" role="cell">{item.submitted}</span>
          <span role="cell">
            {item.state === "appeal" && <Pill tone="amber">Appeal example</Pill>}
            {item.state === "review" && <Pill tone="blue">Review example</Pill>}
            {item.state === "settled" && <Pill tone="green">Settlement example</Pill>}
          </span>
          <span className="row-arrow" aria-hidden="true">→</span>
        </button>
      ))}
    </div>
  );
}

function PolicyPreview() {
  return (
    <div className="module-preview">
      <Pill tone="amber">DEMO POLICY</Pill>
      <h3>Frozen payout mapping</h3>
      <p>The contract will snapshot policy text and payout factors when a report is submitted. The model never chooses the payout.</p>
      <div className="policy-tiers">
        <div><span>HIGH</span><strong>100%</strong><small>Material, practically exploitable</small></div>
        <div><span>MEDIUM</span><strong>50%</strong><small>Real, constrained impact</small></div>
        <div><span>INVALID</span><strong>0%</strong><small>Readable evidence does not substantiate</small></div>
      </div>
    </div>
  );
}

function ReputationPreview() {
  return (
    <div className="module-preview">
      <Pill tone="blue">SETTLEMENT-GATED</Pill>
      <h3>Researcher reputation</h3>
      <p>Reputation updates only after settlement. It is excluded from severity judgment to prevent historical bias.</p>
      <div className="reputation-empty">
        <span>○</span>
        <strong>No on-chain reputation loaded</strong>
        <small>A verified contract address and finalized settlements are required.</small>
      </div>
    </div>
  );
}

function EvidenceCard({ tag, title, source, tone, icon }: { tag: string; title: string; source: string; tone: "green" | "blue"; icon: string }) {
  return (
    <div className="evidence-card">
      <div className={`evidence-icon ${tone}`}>{icon}</div>
      <div className="evidence-main"><span>{tag}</span><strong>{title}</strong><small>{source}</small></div>
      <span className={`verified-dot ${tone}`} title="Fixture source format verified">✓</span>
    </div>
  );
}

function TraceRow({ index, title, meta, done, active }: { index: string; title: string; meta: string; done?: boolean; active?: boolean }) {
  return (
    <div className="trace-row">
      <span className={done ? "trace-index done" : active ? "trace-index active" : "trace-index"}>{done ? "✓" : index}</span>
      <div><strong>{title}</strong><small>{meta}</small></div>
      {active && <span className="trace-pulse" />}
    </div>
  );
}

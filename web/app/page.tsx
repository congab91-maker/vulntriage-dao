"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { TransactionHash } from "genlayer-js/types";
import {
  DEPLOYMENT,
  PENDING_STORAGE_KEY,
  STUDIONET,
  connectGenLayerWallet,
  createReadClient,
  explainWalletError,
  formatGen,
  isWalletAddress,
  monitorTransaction,
  observeWallet,
  parseGenToWei,
  readContractSnapshot,
  writeContract,
  type ContractSnapshot,
  type GenLayerClient,
  type PendingTransaction,
  type Program,
  type Report,
  type TransactionPhase,
  type WalletAddress,
} from "./lib/genlayer";

type Section = "Reports" | "Programs" | "Reputation";
type ActionState = PendingTransaction & { message: string; terminal: boolean; successful: boolean };

const readClient = createReadClient();
const transactionPhases: TransactionPhase[] = [
  "SIGNING",
  "SUBMITTED",
  "PENDING",
  "PROPOSING",
  "COMMITTING",
  "REVEALING",
  "ACCEPTED",
  "READY_TO_FINALIZE",
  "FINALIZED",
];

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "blue" | "amber" | "red" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatTimestamp(timestamp: number) {
  if (!timestamp) return "Not set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(timestamp * 1000));
}

function readField(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function severityTone(verdict: Report["verdict"]): "neutral" | "amber" | "red" {
  if (verdict === "HIGH") return "red";
  if (verdict === "MEDIUM") return "amber";
  return "neutral";
}

export default function Home() {
  const [section, setSection] = useState<Section>("Reports");
  const [snapshot, setSnapshot] = useState<ContractSnapshot | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [readLoading, setReadLoading] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<WalletAddress | null>(null);
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [walletClient, setWalletClient] = useState<GenLayerClient | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const restoredPending = useRef(false);

  const wrongNetwork = Boolean(walletAddress) && walletChainId !== STUDIONET.chainId;

  const refresh = useCallback(async (researcher: WalletAddress | null = walletAddress) => {
    setReadLoading(true);
    setReadError(null);
    try {
      const next = await readContractSnapshot(readClient, researcher);
      setSnapshot(next);
      setSelectedReportId((current) => current ?? next.reports[0]?.reportId ?? null);
      setSelectedProgramId((current) => current ?? next.programs[0]?.programId ?? null);
    } catch (error) {
      setReadError(error instanceof Error ? error.message : "Unable to read the Studionet contract.");
    } finally {
      setReadLoading(false);
    }
  }, [walletAddress]);

  const persistAction = useCallback((next: ActionState | null) => {
    setAction(next);
    if (typeof window === "undefined") return;
    if (!next || next.terminal) {
      window.localStorage.removeItem(PENDING_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify({
      hash: next.hash,
      action: next.action,
      phase: next.phase,
      submittedAt: next.submittedAt,
    } satisfies PendingTransaction));
  }, []);

  const resumeMonitoring = useCallback(async (pending: PendingTransaction) => {
    setActionError(null);
    persistAction({ ...pending, message: "Resuming transaction monitoring.", terminal: false, successful: false });
    try {
      const finalView = await monitorTransaction(readClient, pending.hash, (_transaction, view) => {
        persistAction({ ...pending, phase: view.phase, message: view.message, terminal: view.terminal, successful: view.successful });
      });
      if (finalView.successful) await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to resume transaction monitoring.");
    }
  }, [persistAction, refresh]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  useEffect(() => {
    return observeWallet({
      onAccountsChanged(accounts) {
        const address = accounts[0];
        if (!isWalletAddress(address)) {
          setWalletAddress(null);
          setWalletChainId(null);
          setWalletClient(null);
          return;
        }
        setWalletAddress(address);
        setWalletClient(null);
        setWalletError("Wallet account changed. Reconnect before submitting another transaction.");
      },
      onChainChanged(chainId) {
        setWalletChainId(chainId);
      },
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (restoredPending.current) return;
    restoredPending.current = true;
    const serialized = window.localStorage.getItem(PENDING_STORAGE_KEY);
    if (!serialized) return;
    try {
      const value = JSON.parse(serialized) as Partial<PendingTransaction>;
      if (
        typeof value.hash === "string"
        && /^0x[0-9a-fA-F]{64}$/.test(value.hash)
        && typeof value.action === "string"
        && typeof value.submittedAt === "number"
      ) {
        const restored: PendingTransaction = {
          hash: value.hash as TransactionHash,
          action: value.action,
          phase: value.phase ?? "SUBMITTED",
          submittedAt: value.submittedAt,
        };
        const timeout = window.setTimeout(() => void resumeMonitoring({
            ...restored,
          }), 0);
        return () => window.clearTimeout(timeout);
      } else {
        window.localStorage.removeItem(PENDING_STORAGE_KEY);
      }
    } catch {
      window.localStorage.removeItem(PENDING_STORAGE_KEY);
    }
  }, [resumeMonitoring]);

  const selectedReport = useMemo(
    () => snapshot?.reports.find((report) => report.reportId === selectedReportId) ?? snapshot?.reports[0] ?? null,
    [selectedReportId, snapshot],
  );
  const reportProgram = useMemo(
    () => snapshot?.programs.find((program) => program.programId === selectedReport?.programId) ?? null,
    [selectedReport, snapshot],
  );
  const selectedProgram = useMemo(
    () => snapshot?.programs.find((program) => program.programId === selectedProgramId) ?? snapshot?.programs[0] ?? null,
    [selectedProgramId, snapshot],
  );
  const selectedPolicy = reportProgram ? snapshot?.policies[reportProgram.programId] ?? null : null;

  const connectWallet = async () => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      const connection = await connectGenLayerWallet();
      setWalletAddress(connection.address);
      setWalletChainId(connection.chainId);
      setWalletClient(connection.client);
      await refresh(connection.address);
    } catch (error) {
      setWalletError(explainWalletError(error));
    } finally {
      setWalletLoading(false);
    }
  };

  const submitWrite = async (label: string, functionName: string, args: Array<string | number | bigint | boolean>, value = 0n) => {
    setActionError(null);
    if (!walletAddress || !walletClient) {
      setActionError("Connect a wallet before submitting a transaction.");
      return;
    }
    if (wrongNetwork) {
      setActionError(`Switch the wallet to Studionet (${STUDIONET.chainId}) before submitting.`);
      return;
    }
    const submittedAt = Date.now();
    setAction({ hash: "0x" as TransactionHash, action: label, phase: "SIGNING", submittedAt, message: "Confirm this transaction in your wallet.", terminal: false, successful: false });
    try {
      const hash = await writeContract(walletClient, functionName, args, value);
      const pending: PendingTransaction = { hash, action: label, phase: "SUBMITTED", submittedAt };
      persistAction({ ...pending, message: "Transaction submitted to GenLayer.", terminal: false, successful: false });
      const finalView = await monitorTransaction(walletClient, hash, (_transaction, view) => {
        persistAction({ ...pending, phase: view.phase, message: view.message, terminal: view.terminal, successful: view.successful });
      });
      if (finalView.successful) await refresh(walletAddress);
    } catch (error) {
      const message = explainWalletError(error);
      setActionError(message);
      setAction((current) => current?.phase === "SIGNING" ? null : current);
    }
  };

  const createProgram = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const cap = parseGenToWei(readField(form, "report_cap"));
      if (cap <= 0n) throw new Error("Report cap must be greater than zero.");
      await submitWrite("Create program", "create_program", [
        readField(form, "name"),
        readField(form, "repo_owner"),
        readField(form, "repo_name"),
        readField(form, "policy_text"),
        BigInt(readField(form, "high_bps")),
        BigInt(readField(form, "medium_bps")),
        cap,
      ]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Program input is invalid.");
    }
  };

  const fundProgram = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const value = parseGenToWei(readField(form, "amount"));
      if (value <= 0n) throw new Error("Funding amount must be greater than zero.");
      await submitWrite("Fund program", "fund_program", [BigInt(readField(form, "program_id"))], value);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Funding input is invalid.");
    }
  };

  const submitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await submitWrite("Submit report", "submit_report", [
        BigInt(readField(form, "program_id")),
        readField(form, "report_url"),
        readField(form, "evidence_url"),
        readField(form, "claimed_impact"),
      ]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Report input is invalid.");
    }
  };

  const appealReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedReport) return;
    const form = new FormData(event.currentTarget);
    await submitWrite("Appeal report", "appeal_report", [BigInt(selectedReport.reportId), readField(form, "appeal_reason")]);
  };

  const activePrograms = snapshot?.programs.filter((program) => program.active).length ?? 0;
  const reservedWei = snapshot?.programs.reduce((total, program) => total + program.reservedBalanceWei, 0n) ?? 0n;
  const settledReports = snapshot?.reports.filter((report) => report.status === "SETTLED").length ?? 0;

  return (
    <main className="app-shell" id="main-content">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="grain" aria-hidden="true" />

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span>V</span></div>
          <div><div className="brand-name">VulnTriage</div><div className="brand-sub">DAO / SECURITY ADJUDICATION</div></div>
        </div>
        <nav className="topnav" aria-label="Product sections">
          {(["Reports", "Programs", "Reputation"] as Section[]).map((item) => (
            <button key={item} className={section === item ? "nav-link active" : "nav-link"} onClick={() => setSection(item)} aria-current={section === item ? "page" : undefined}>
              {item}
              {item === "Reports" && <span className="nav-count">{snapshot?.reports.length ?? 0}</span>}
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          <Pill tone={wrongNetwork ? "red" : walletAddress ? "green" : "blue"}>
            <span className={wrongNetwork ? "network-dot wrong" : "network-dot"} />
            {wrongNetwork ? "WRONG NETWORK" : "STUDIONET 61999"}
          </Pill>
          <button className={walletAddress ? "wallet-button connected" : "wallet-button"} onClick={connectWallet} disabled={walletLoading}>
            {walletLoading ? "Connecting…" : walletAddress ? shortAddress(walletAddress) : "Connect wallet"}
          </button>
        </div>
      </header>

      {(wrongNetwork || walletError) && (
        <div className="network-warning" role="alert">
          <strong>{wrongNetwork ? "Wrong network." : "Wallet notice."}</strong>
          <span>{wrongNetwork ? `Switch to GenLayer Studionet, chain ${STUDIONET.chainId}.` : walletError}</span>
          <button onClick={connectWallet}>Reconnect</button>
        </div>
      )}

      <section className="hero">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> LIVE STUDIONET CONTRACT</p>
          <h1>Security verdicts,<br /><em>backed by evidence.</em></h1>
          <p className="hero-copy">Researchers submit a public report and official patch or advisory. GenLayer validators independently read both sources, agree on stable decision fields, and make the result enforceable on-chain.</p>
        </div>
        <div className="hero-annotation">
          <div className="annotation-kicker">VERIFIED DEPLOYMENT</div>
          <a className="annotation-title" href={DEPLOYMENT.explorer} target="_blank" rel="noreferrer">{shortAddress(DEPLOYMENT.address)} ↗</a>
          <div className="annotation-meta"><span className="network-dot" /> Studionet · reads enabled</div>
        </div>
      </section>

      <section className="metric-grid" aria-label="Current on-chain state">
        <Metric label="REPORTS READ" value={String(snapshot?.reports.length ?? 0)} detail={readLoading ? "Refreshing…" : `Next ID ${snapshot?.nextReportId ?? "—"}`} />
        <Metric label="ACTIVE PROGRAMS" value={String(activePrograms)} detail={`${snapshot?.programs.length ?? 0} loaded from contract`} />
        <Metric label="RESERVED" value={formatGen(reservedWei)} unit="GEN" detail="Studionet simulated balance" />
        <Metric label="SETTLED REPORTS" value={String(settledReports)} detail="Derived from contract state" />
      </section>

      {readError && (
        <div className="read-error" role="alert">
          <div><strong>Contract read failed</strong><span>{readError}</span></div>
          <button onClick={() => void refresh()}>Retry read</button>
        </div>
      )}

      {action && <TransactionPanel action={action} canResume={Boolean(actionError)} onResume={() => void resumeMonitoring(action)} />}
      {actionError && <div className="action-error" role="alert"><strong>Transaction not completed</strong><span>{actionError}</span></div>}

      {section === "Reports" && (
        <div className="content-grid">
          <section className="queue-panel panel">
            <div className="panel-head"><div><div className="panel-label">ON-CHAIN REPORTS</div><h2>Adjudication queue</h2></div><button className="refresh-button" onClick={() => void refresh()} disabled={readLoading}>{readLoading ? "Reading…" : "Refresh"}</button></div>
            <ReportQueue reports={snapshot?.reports ?? []} programs={snapshot?.programs ?? []} selectedId={selectedReport?.reportId ?? null} onSelect={setSelectedReportId} loading={readLoading} />
            <SubmitReportForm key={selectedProgram?.programId ?? "no-program"} programs={snapshot?.programs ?? []} defaultProgramId={selectedProgram?.programId ?? null} onSubmit={submitReport} disabled={!walletClient || wrongNetwork || Boolean(action && !action.terminal)} />
          </section>
          <aside className="detail-panel panel">
            <ReportDetail report={selectedReport} program={reportProgram} policy={selectedPolicy} walletAddress={walletAddress} now={Math.floor((snapshot?.loadedAt ?? 0) / 1000)} busy={Boolean(action && !action.terminal)} onJudge={() => selectedReport && void submitWrite("Judge report", "judge_report", [BigInt(selectedReport.reportId)])} onAppeal={appealReport} onSettle={() => selectedReport && void submitWrite("Settle report", "settle_report", [BigInt(selectedReport.reportId)])} />
          </aside>
        </div>
      )}

      {section === "Programs" && (
        <div className="program-layout">
          <section className="panel programs-panel">
            <div className="panel-head"><div><div className="panel-label">BOUNTY POOLS</div><h2>Programs from contract state</h2></div></div>
            <ProgramList programs={snapshot?.programs ?? []} selectedId={selectedProgram?.programId ?? null} onSelect={setSelectedProgramId} />
          </section>
          <section className="panel forms-panel">
            <CreateProgramForm onSubmit={createProgram} disabled={!walletClient || wrongNetwork || Boolean(action && !action.terminal)} />
            <FundProgramForm key={selectedProgram?.programId ?? "no-program"} programs={snapshot?.programs ?? []} defaultProgramId={selectedProgram?.programId ?? null} onSubmit={fundProgram} disabled={!walletClient || wrongNetwork || Boolean(action && !action.terminal)} />
          </section>
        </div>
      )}

      {section === "Reputation" && (
        <section className="panel reputation-panel">
          <div className="panel-head"><div><div className="panel-label">SETTLEMENT-GATED</div><h2>Researcher reputation</h2></div></div>
          {!walletAddress ? <EmptyState title="Connect a wallet" copy="The contract indexes reputation by researcher address. Reads begin after wallet connection." /> : snapshot?.reputation ? (
            <div className="reputation-grid">
              <Metric label="VALID REPORTS" value={String(snapshot.reputation.validReports)} detail={`${snapshot.reputation.highReports} high · ${snapshot.reputation.mediumReports} medium`} />
              <Metric label="INVALID REPORTS" value={String(snapshot.reputation.invalidReports)} detail="Updated only at settlement" />
              <Metric label="SETTLED" value={String(snapshot.reputation.totalSettledReports)} detail="Exact on-chain count" />
              <Metric label="TOTAL PAYOUT" value={formatGen(snapshot.reputation.totalPayoutWei)} unit="GEN" detail="Studionet simulated transfer total" />
            </div>
          ) : null}
        </section>
      )}

      <footer className="app-footer">
        <span>VulnTriage DAO · consensus-based, evidence-backed adjudication</span>
        <span><a href={DEPLOYMENT.transactionExplorer} target="_blank" rel="noreferrer">Deployment transaction ↗</a> · Studionet persistence is temporary · native transfers are simulated</span>
      </footer>
    </main>
  );
}

function Metric({ label, value, unit, detail }: { label: string; value: string; unit?: string; detail: string }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span></div><div className="metric-value">{value} {unit && <small>{unit}</small>}</div><div className="metric-foot"><span>{detail}</span></div></article>;
}

function TransactionPanel({ action, canResume, onResume }: { action: ActionState; canResume: boolean; onResume: () => void }) {
  const current = transactionPhases.indexOf(action.phase);
  return (
    <section className={`transaction-panel ${action.terminal ? action.successful ? "success" : "failed" : ""}`} aria-live="polite">
      <div className="transaction-copy"><span className="panel-label">TRANSACTION LIFECYCLE</span><strong>{action.action}</strong><p>{action.message}</p>{action.hash !== "0x" && <a href={`https://explorer-studio.genlayer.com/tx/${action.hash}`} target="_blank" rel="noreferrer">{shortAddress(action.hash)} ↗</a>}</div>
      <div className="lifecycle-strip" aria-label={`Current transaction phase: ${action.phase}`}>
        {transactionPhases.map((phase, index) => <span key={phase} className={phase === action.phase ? "current" : index < current ? "complete" : ""}>{phase.replaceAll("_", " ")}</span>)}
      </div>
      {canResume && !action.terminal && action.phase !== "SIGNING" && <button className="secondary-button" onClick={onResume}>Resume monitoring</button>}
    </section>
  );
}

function ReportQueue({ reports, programs, selectedId, onSelect, loading }: { reports: Report[]; programs: Program[]; selectedId: number | null; onSelect: (id: number) => void; loading: boolean }) {
  if (loading && reports.length === 0) return <EmptyState title="Reading contract state" copy="Loading programs, reports, policies, and verdicts from Studionet." loading />;
  if (reports.length === 0) return <EmptyState title="No reports on-chain" copy="Submit a public, already-patched report to begin the workflow." />;
  return (
    <div className="queue-table" role="table" aria-label="On-chain vulnerability reports">
      <div className="queue-row queue-header" role="row"><span role="columnheader">REPORT</span><span role="columnheader">RESEARCHER</span><span role="columnheader">STATUS</span><span role="columnheader">VERDICT</span><span aria-hidden="true" /></div>
      {reports.map((report) => {
        const program = programs.find((item) => item.programId === report.programId);
        return <button className={selectedId === report.reportId ? "queue-row queue-item selected" : "queue-row queue-item"} key={report.reportId} onClick={() => onSelect(report.reportId)} role="row" aria-selected={selectedId === report.reportId}>
          <span className="report-cell" role="cell"><span className={`severity-rail severity-${report.verdict.toLowerCase()}`} aria-hidden="true" /><span><strong>Report #{report.reportId}</strong><small>{program ? `${program.repoOwner}/${program.repoName}` : `Program #${report.programId}`}</small></span></span>
          <span className="mono" role="cell">{shortAddress(report.researcher)}</span>
          <span role="cell"><Pill tone="blue">{report.status}</Pill></span>
          <span role="cell"><Pill tone={severityTone(report.verdict)}>{report.verdict}</Pill></span>
          <span className="row-arrow" aria-hidden="true">→</span>
        </button>;
      })}
    </div>
  );
}

function ReportDetail({ report, program, policy, walletAddress, now, busy, onJudge, onAppeal, onSettle }: { report: Report | null; program: Program | null; policy: { highBps: number; mediumBps: number; text: string } | null | undefined; walletAddress: WalletAddress | null; now: number; busy: boolean; onJudge: () => void; onAppeal: (event: FormEvent<HTMLFormElement>) => void; onSettle: () => void }) {
  if (!report) return <EmptyState title="Select a report" copy="A report's public evidence, verdict, reasoning, and available contract actions will appear here." />;
  const canAppeal = report.status === "JUDGED" && report.appealCount === 0 && now < report.appealDeadline && Boolean(walletAddress) && (walletAddress?.toLowerCase() === report.researcher.toLowerCase() || walletAddress?.toLowerCase() === program?.owner.toLowerCase());
  const canSettle = report.status === "JUDGED_FINAL" || (report.status === "JUDGED" && now >= report.appealDeadline);
  const payoutFactor = report.verdict === "HIGH" ? policy?.highBps : report.verdict === "MEDIUM" ? policy?.mediumBps : 0;
  const projectedPayout = payoutFactor === undefined ? null : report.reservedCapWei * BigInt(payoutFactor) / 10_000n;
  return (
    <>
      <div className="detail-head"><div><div className="panel-label">REPORT #{report.reportId}</div><h2>{program ? `${program.repoOwner}/${program.repoName}` : `Program #${report.programId}`}</h2><div className="detail-repo">Submitted {formatTimestamp(report.submissionTimestamp)}</div></div><Pill tone={severityTone(report.verdict)}>{report.verdict}</Pill></div>
      <div className="detail-status"><span className="network-dot" /><div><strong>{report.status}</strong><span>{report.status === "JUDGED" ? `Appeal deadline ${formatTimestamp(report.appealDeadline)}` : "Contract state is finalized for this stage"}</span></div><span className="status-step">{report.confidence}%</span></div>
      <div className="section-label">PUBLIC DUAL-SOURCE EVIDENCE</div>
      <div className="evidence-stack"><EvidenceLink label="RESEARCHER REPORT" url={report.reportUrl} /><EvidenceLink label="OFFICIAL PATCH / ADVISORY" url={report.evidenceUrl} /></div>
      <div className="section-label">CONSENSUS FINDINGS</div>
      <div className="finding-grid"><Finding label="VERDICT" value={report.verdict} /><Finding label="EXPLOITABILITY" value={report.exploitability || "Pending"} /><Finding label="IMPACT SCOPE" value={report.impactScope || "Pending"} /><Finding label="POLICY FACTOR" value={payoutFactor === undefined ? "Unknown" : `${payoutFactor / 100}%`} /></div>
      <Assessment label="SUMMARY" copy={report.summary || "Judgment has not been triggered."} />
      {report.evidenceAlignment && <Assessment label="EVIDENCE ALIGNMENT" copy={report.evidenceAlignment} />}
      {report.impact && <Assessment label="IMPACT" copy={report.impact} />}
      {report.limitations && <Assessment label="LIMITATIONS" copy={report.limitations} />}
      <div className="payout-card"><div><span className="section-label">CONTRACT OUTCOME</span><strong>{report.status === "SETTLED" ? formatGen(report.payoutAmountWei) : projectedPayout === null ? "—" : formatGen(projectedPayout)} <small>GEN</small></strong><span className="payout-sub">{report.status === "SETTLED" ? "Settlement recorded on-chain" : "Projected from frozen policy; not paid yet"}</span></div></div>
      <div className="report-actions">
        {report.status === "SUBMITTED" && <button className="primary-button" onClick={onJudge} disabled={busy || !walletAddress}>Trigger AI judgment</button>}
        {report.status === "JUDGED" && <form onSubmit={onAppeal}><label htmlFor="appeal_reason">Business appeal reason</label><textarea id="appeal_reason" name="appeal_reason" required maxLength={1000} placeholder="Explain the factual or policy issue…" disabled={!canAppeal || busy} /><button className="secondary-button" disabled={!canAppeal || busy}>Appeal report</button>{!canAppeal && <small>Only the program owner or researcher can appeal once before the deadline.</small>}</form>}
        {(report.status === "JUDGED" || report.status === "JUDGED_FINAL") && <button className="primary-button" onClick={onSettle} disabled={!canSettle || busy || !walletAddress}>Settle report</button>}
      </div>
      <div className="demo-disclaimer"><span>i</span> Studionet native transfers are simulated. “Settled” means the contract recorded and scheduled the transfer in this hosted development environment.</div>
    </>
  );
}

function EvidenceLink({ label, url }: { label: string; url: string }) {
  let host = url;
  try { host = new URL(url).host; } catch { /* Contract validation already restricts URLs. */ }
  return <a className="evidence-card" href={url} target="_blank" rel="noreferrer"><div className="evidence-icon blue" aria-hidden="true">↗</div><div className="evidence-main"><span>{label}</span><strong>{host}</strong><small>{url}</small></div></a>;
}

function Finding({ label, value }: { label: string; value: string }) {
  return <div className="finding-card"><span>{label}</span><strong>{value}</strong></div>;
}

function Assessment({ label, copy }: { label: string; copy: string }) {
  return <div className="assessment-copy"><span>{label}</span><p>{copy}</p></div>;
}

function SubmitReportForm({ programs, defaultProgramId, onSubmit, disabled }: { programs: Program[]; defaultProgramId: number | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void; disabled: boolean }) {
  return <form className="contract-form inline-form" onSubmit={onSubmit}><div className="form-heading"><span className="panel-label">RESEARCHER FLOW</span><h3>Submit public evidence</h3></div><label>Program<select name="program_id" defaultValue={defaultProgramId ?? ""} required disabled={disabled}>{programs.filter((program) => program.active).map((program) => <option value={program.programId} key={program.programId}>#{program.programId} · {program.repoOwner}/{program.repoName}</option>)}</select></label><label>Researcher report URL<input type="url" name="report_url" required autoComplete="off" placeholder="https://github.com/owner/public-report…" disabled={disabled} /></label><label>Official patch or advisory URL<input type="url" name="evidence_url" required autoComplete="off" placeholder="https://github.com/owner/repo/commit/40-char-hash…" disabled={disabled} /></label><label className="full-field">Claimed impact<textarea name="claimed_impact" required maxLength={1000} placeholder="Describe exploitability and affected security properties…" disabled={disabled} /></label><button className="primary-button" disabled={disabled || programs.length === 0}>Submit report</button></form>;
}

function ProgramList({ programs, selectedId, onSelect }: { programs: Program[]; selectedId: number | null; onSelect: (id: number) => void }) {
  if (programs.length === 0) return <EmptyState title="No programs on-chain" copy="Connect the owner wallet and create the first bounty program." />;
  return <div className="program-list">{programs.map((program) => <button key={program.programId} className={selectedId === program.programId ? "program-row selected" : "program-row"} onClick={() => onSelect(program.programId)}><div><span className="panel-label">PROGRAM #{program.programId}</span><strong>{program.name}</strong><small>{program.repoOwner}/{program.repoName}</small></div><div className="program-balances"><span>{formatGen(program.availableBalanceWei)} GEN available</span><span>{formatGen(program.reservedBalanceWei)} GEN reserved</span><Pill tone={program.active ? "green" : "neutral"}>{program.active ? "ACTIVE" : "INACTIVE"}</Pill></div></button>)}</div>;
}

function CreateProgramForm({ onSubmit, disabled }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; disabled: boolean }) {
  return <form className="contract-form" onSubmit={onSubmit}><div className="form-heading"><span className="panel-label">OWNER FLOW</span><h3>Create a program</h3></div><label>Program name<input name="name" required maxLength={128} autoComplete="off" placeholder="Public security bounty…" disabled={disabled} /></label><label>Repository owner<input name="repo_owner" required maxLength={100} autoComplete="off" spellCheck={false} placeholder="apache…" disabled={disabled} /></label><label>Repository name<input name="repo_name" required maxLength={100} autoComplete="off" spellCheck={false} placeholder="logging-log4j2…" disabled={disabled} /></label><label>Report cap (GEN)<input name="report_cap" type="text" inputMode="decimal" required autoComplete="off" placeholder="0.001…" disabled={disabled} /></label><label>HIGH payout (bps)<input name="high_bps" type="number" min="2" max="10000" defaultValue="10000" required disabled={disabled} /></label><label>MEDIUM payout (bps)<input name="medium_bps" type="number" min="1" max="9999" defaultValue="5000" required disabled={disabled} /></label><label className="full-field">Policy text<textarea name="policy_text" required maxLength={4000} placeholder="Define evidence requirements and severity criteria…" disabled={disabled} /></label><button className="primary-button" disabled={disabled}>Create program</button></form>;
}

function FundProgramForm({ programs, defaultProgramId, onSubmit, disabled }: { programs: Program[]; defaultProgramId: number | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void; disabled: boolean }) {
  return <form className="contract-form fund-form" onSubmit={onSubmit}><div className="form-heading"><span className="panel-label">ESCROW FLOW</span><h3>Fund a program</h3></div><label>Program<select name="program_id" defaultValue={defaultProgramId ?? ""} required disabled={disabled}>{programs.filter((program) => program.active).map((program) => <option value={program.programId} key={program.programId}>#{program.programId} · {program.name}</option>)}</select></label><label>Amount (GEN)<input name="amount" type="text" inputMode="decimal" required autoComplete="off" placeholder="1.0…" disabled={disabled} /></label><button className="primary-button" disabled={disabled || programs.length === 0}>Fund program</button></form>;
}

function EmptyState({ title, copy, loading = false }: { title: string; copy: string; loading?: boolean }) {
  return <div className="state-panel" aria-live="polite">{loading ? <div className="state-spinner" /> : <span className="state-symbol" aria-hidden="true">○</span>}<strong>{title}</strong><p>{copy}</p></div>;
}

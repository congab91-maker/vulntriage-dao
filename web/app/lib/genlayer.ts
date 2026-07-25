import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import {
  TransactionStatus,
  transactionsStatusNumberToName,
  type GenLayerTransaction,
  type TransactionHash,
} from "genlayer-js/types";

export type WalletAddress = `0x${string}`;
export type GenLayerClient = ReturnType<typeof createClient>;

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: "accountsChanged" | "chainChanged", handler: (value: unknown) => void) => void;
  removeListener?: (event: "accountsChanged" | "chainChanged", handler: (value: unknown) => void) => void;
};

export type GenLayerConnection = {
  address: WalletAddress;
  chainId: number | null;
  client: GenLayerClient;
};

export type Program = {
  programId: number;
  owner: WalletAddress;
  name: string;
  repoOwner: string;
  repoName: string;
  active: boolean;
  currentPolicyVersion: number;
  reportCapWei: bigint;
  availableBalanceWei: bigint;
  reservedBalanceWei: bigint;
};

export type Policy = {
  version: number;
  text: string;
  highBps: number;
  mediumBps: number;
};

export type Report = {
  reportId: number;
  programId: number;
  researcher: WalletAddress;
  reportUrl: string;
  evidenceUrl: string;
  claimedImpact: string;
  submissionTimestamp: number;
  policyVersion: number;
  status: string;
  verdict: "PENDING" | "HIGH" | "MEDIUM" | "INVALID";
  vulnerabilityConfirmed: boolean;
  exploitability: string;
  impactScope: string;
  confidence: number;
  summary: string;
  evidenceAlignment: string;
  impact: string;
  limitations: string;
  appealCount: number;
  appealDeadline: number;
  cancellationDeadline: number;
  reservedCapWei: bigint;
  payoutAmountWei: bigint;
  settlementScheduled: boolean;
};

export type Reputation = {
  totalSettledReports: number;
  validReports: number;
  invalidReports: number;
  highReports: number;
  mediumReports: number;
  totalPayoutWei: bigint;
};

export type ContractSnapshot = {
  programs: Program[];
  policies: Record<number, Policy>;
  reports: Report[];
  reputation: Reputation | null;
  nextProgramId: number;
  nextReportId: number;
  loadedAt: number;
};

export type TransactionPhase =
  | "SIGNING"
  | "SUBMITTED"
  | "PENDING"
  | "PROPOSING"
  | "COMMITTING"
  | "REVEALING"
  | "ACCEPTED"
  | "READY_TO_FINALIZE"
  | "FINALIZED"
  | "UNDETERMINED"
  | "CANCELED"
  | "TIMEOUT"
  | "FAILED";

export type TransactionView = {
  phase: TransactionPhase;
  terminal: boolean;
  successful: boolean;
  message: string;
};

export type PendingTransaction = {
  hash: TransactionHash;
  action: string;
  phase: TransactionPhase;
  submittedAt: number;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export const STUDIONET = {
  chainId: 61999,
  hexChainId: "0xf22f",
  rpc: "https://studio.genlayer.com/api",
  name: "GenLayer Studionet",
} as const;

export const DEPLOYMENT = {
  address: "0x140Bc1D1ee108271B5ec46c6363Ba0DAa69C49a8" as WalletAddress,
  transactionHash:
    "0xa8955e14185e080869f768a8974ebbfca53b52ef0a2ad74ff4077840d45b0aa5" as TransactionHash,
  explorer:
    "https://explorer-studio.genlayer.com/address/0x140Bc1D1ee108271B5ec46c6363Ba0DAa69C49a8",
  transactionExplorer:
    "https://explorer-studio.genlayer.com/tx/0xa8955e14185e080869f768a8974ebbfca53b52ef0a2ad74ff4077840d45b0aa5",
} as const;

export const PENDING_STORAGE_KEY = "vulntriage.pending.v1";
const MAX_LIST_ITEMS = 50;
const RPC_RETRY_DELAYS_MS = [350, 900];
const RETRIABLE_RPC_ERROR = /all \d+ execution slots occupied|server busy|temporar(?:y|ily)|timed? ?out|timeout|too many requests|\b429\b|\b502\b|\b503\b|\b504\b/i;

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function readWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const delay = RPC_RETRY_DELAYS_MS[attempt];
      if (delay === undefined || !RETRIABLE_RPC_ERROR.test(message)) throw error;
      await sleep(delay);
    }
  }
}

export function isWalletAddress(value: unknown): value is WalletAddress {
  return typeof value === "string"
    && /^0x[0-9a-fA-F]{40}$/.test(value)
    && !/^0x0{40}$/i.test(value);
}

export function parseChainId(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value !== "string" || !/^(?:0x[0-9a-fA-F]+|[0-9]+)$/.test(value)) return null;
  const parsed = Number.parseInt(value, value.startsWith("0x") ? 16 : 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parseGenToWei(value: string): bigint {
  const normalized = value.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(normalized)) {
    throw new Error("Enter a non-negative GEN amount with at most 18 decimals.");
  }
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0") || "0");
}

export function formatGen(value: bigint, maximumFractionDigits = 4): string {
  const whole = value / 10n ** 18n;
  const fraction = (value % 10n ** 18n).toString().padStart(18, "0");
  const visible = fraction.slice(0, maximumFractionDigits).replace(/0+$/, "");
  return visible ? `${whole}.${visible}` : whole.toString();
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} returned an unexpected value.`);
  }
  return value as Record<string, unknown>;
}

function toBigInt(value: unknown, label: string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  throw new Error(`${label} is not an unsigned integer.`);
}

function toNumber(value: unknown, label: string): number {
  const parsed = toBigInt(value, label);
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`${label} exceeds the safe UI range.`);
  return Number(parsed);
}

function toStringValue(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`${label} is not a string.`);
  return value;
}

function toBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${label} is not a boolean.`);
  return value;
}

export function decodeProgram(value: unknown): Program {
  const row = asRecord(value, "Program");
  const owner = row.owner;
  if (!isWalletAddress(owner)) throw new Error("Program owner is not a valid address.");
  return {
    programId: toNumber(row.program_id, "program_id"),
    owner,
    name: toStringValue(row.name, "name"),
    repoOwner: toStringValue(row.repo_owner, "repo_owner"),
    repoName: toStringValue(row.repo_name, "repo_name"),
    active: toBoolean(row.active, "active"),
    currentPolicyVersion: toNumber(row.current_policy_version, "current_policy_version"),
    reportCapWei: toBigInt(row.report_cap_wei, "report_cap_wei"),
    availableBalanceWei: toBigInt(row.available_balance_wei, "available_balance_wei"),
    reservedBalanceWei: toBigInt(row.reserved_balance_wei, "reserved_balance_wei"),
  };
}

export function decodePolicy(value: unknown): Policy {
  const row = asRecord(value, "Policy");
  return {
    version: toNumber(row.version, "version"),
    text: toStringValue(row.text, "text"),
    highBps: toNumber(row.high_bps, "high_bps"),
    mediumBps: toNumber(row.medium_bps, "medium_bps"),
  };
}

export function decodeReport(value: unknown): Report {
  const row = asRecord(value, "Report");
  const researcher = row.researcher;
  const verdict = row.verdict;
  if (!isWalletAddress(researcher)) throw new Error("Report researcher is not a valid address.");
  if (verdict !== "PENDING" && verdict !== "HIGH" && verdict !== "MEDIUM" && verdict !== "INVALID") {
    throw new Error("Report verdict is not supported by this deployment.");
  }
  return {
    reportId: toNumber(row.report_id, "report_id"),
    programId: toNumber(row.program_id, "program_id"),
    researcher,
    reportUrl: toStringValue(row.report_url, "report_url"),
    evidenceUrl: toStringValue(row.evidence_url, "evidence_url"),
    claimedImpact: toStringValue(row.claimed_impact, "claimed_impact"),
    submissionTimestamp: toNumber(row.submission_timestamp, "submission_timestamp"),
    policyVersion: toNumber(row.policy_version, "policy_version"),
    status: toStringValue(row.status, "status"),
    verdict,
    vulnerabilityConfirmed: toBoolean(row.vulnerability_confirmed, "vulnerability_confirmed"),
    exploitability: toStringValue(row.exploitability, "exploitability"),
    impactScope: toStringValue(row.impact_scope, "impact_scope"),
    confidence: toNumber(row.confidence, "confidence"),
    summary: toStringValue(row.summary, "summary"),
    evidenceAlignment: toStringValue(row.evidence_alignment, "evidence_alignment"),
    impact: toStringValue(row.impact, "impact"),
    limitations: toStringValue(row.limitations, "limitations"),
    appealCount: toNumber(row.appeal_count, "appeal_count"),
    appealDeadline: toNumber(row.appeal_deadline, "appeal_deadline"),
    cancellationDeadline: toNumber(row.cancellation_deadline, "cancellation_deadline"),
    reservedCapWei: toBigInt(row.reserved_cap, "reserved_cap"),
    payoutAmountWei: toBigInt(row.payout_amount, "payout_amount"),
    settlementScheduled: toBoolean(row.settlement_scheduled, "settlement_scheduled"),
  };
}

export function decodeReputation(value: unknown): Reputation {
  const row = asRecord(value, "Reputation");
  return {
    totalSettledReports: toNumber(row.total_settled_reports, "total_settled_reports"),
    validReports: toNumber(row.valid_reports, "valid_reports"),
    invalidReports: toNumber(row.invalid_reports, "invalid_reports"),
    highReports: toNumber(row.high_reports, "high_reports"),
    mediumReports: toNumber(row.medium_reports, "medium_reports"),
    totalPayoutWei: toBigInt(row.total_payout, "total_payout"),
  };
}

export function transactionStatusName(transaction: GenLayerTransaction): TransactionStatus | null {
  if (transaction.statusName && Object.values(TransactionStatus).includes(transaction.statusName)) {
    return transaction.statusName;
  }
  const status = transaction.status;
  if (typeof status === "number") {
    return transactionsStatusNumberToName[String(status) as keyof typeof transactionsStatusNumberToName] ?? null;
  }
  return null;
}

export function classifyTransaction(transaction: GenLayerTransaction): TransactionView {
  const status = transactionStatusName(transaction);
  if (!status) return { phase: "PENDING", terminal: false, successful: false, message: "Waiting for network status." };

  if (status === TransactionStatus.UNINITIALIZED) {
    return { phase: "PENDING", terminal: false, successful: false, message: "Waiting for network status." };
  }

  if (status === TransactionStatus.FINALIZED) {
    const receipts = transaction.consensus_data?.leader_receipt ?? [];
    const executionFailed = transaction.txExecutionResultName === "FINISHED_WITH_ERROR" || receipts.length === 0 || receipts.some((receipt) => {
      const result = receipt.result as unknown as { status?: string } | undefined;
      return receipt.execution_result !== "SUCCESS" || Boolean(receipt.error) || result?.status === "error";
    });
    if (executionFailed) {
      return { phase: "FAILED", terminal: true, successful: false, message: "Finalized, but contract execution failed." };
    }
    return { phase: "FINALIZED", terminal: true, successful: true, message: "Finalized with successful contract execution." };
  }

  if (status === TransactionStatus.UNDETERMINED) {
    return { phase: "UNDETERMINED", terminal: true, successful: false, message: "Validators did not reach consensus; contract state was not updated." };
  }
  if (status === TransactionStatus.CANCELED) {
    return { phase: "CANCELED", terminal: true, successful: false, message: "The transaction was canceled." };
  }
  if (status === TransactionStatus.VALIDATORS_TIMEOUT || status === TransactionStatus.LEADER_TIMEOUT) {
    return { phase: "TIMEOUT", terminal: true, successful: false, message: "Consensus timed out. Verify state before retrying." };
  }
  if (status === TransactionStatus.APPEAL_COMMITTING) {
    return { phase: "COMMITTING", terminal: false, successful: false, message: "Protocol appeal votes are committing." };
  }
  if (status === TransactionStatus.APPEAL_REVEALING) {
    return { phase: "REVEALING", terminal: false, successful: false, message: "Protocol appeal votes are revealing." };
  }

  const phase = status as TransactionPhase;
  const messages: Partial<Record<TransactionPhase, string>> = {
    PENDING: "Queued by the GenLayer network.",
    PROPOSING: "A leader is executing the contract.",
    COMMITTING: "Validators are committing votes.",
    REVEALING: "Validators are revealing votes.",
    ACCEPTED: "Consensus accepted; waiting for finality.",
    READY_TO_FINALIZE: "Finality window completed; ready to finalize.",
  };
  return { phase, terminal: false, successful: false, message: messages[phase] ?? `Network status: ${status}.` };
}

export function explainWalletError(error: unknown): string {
  const candidate = error as { code?: number; message?: string; shortMessage?: string } | null;
  if (candidate?.code === 4001 || /user rejected|denied/i.test(candidate?.message ?? "")) {
    return "Signature request rejected. No transaction was submitted.";
  }
  if (/insufficient funds/i.test(candidate?.message ?? "")) {
    return "Insufficient GEN for this transaction.";
  }
  if (/chain|network/i.test(candidate?.message ?? "")) {
    return `Wallet network mismatch. Switch to ${STUDIONET.name} (${STUDIONET.chainId}).`;
  }
  return candidate?.shortMessage || candidate?.message || "The wallet request failed.";
}

async function readChainId(provider: EthereumProvider): Promise<number | null> {
  return parseChainId(await provider.request({ method: "eth_chainId" }));
}

export function createReadClient(): GenLayerClient {
  return createClient({ chain: studionet });
}

export async function connectGenLayerWallet(): Promise<GenLayerConnection> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No browser wallet detected. Install MetaMask or another EVM wallet.");
  }

  const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts?.[0];
  if (!isWalletAddress(address)) throw new Error("The wallet did not return a valid address.");

  const client = createClient({ chain: studionet, account: address });
  await client.connect("studionet");
  const chainId = await readChainId(window.ethereum);
  return { client, address, chainId };
}

export function observeWallet({
  onAccountsChanged,
  onChainChanged,
}: {
  onAccountsChanged: (accounts: string[]) => void;
  onChainChanged: (chainId: number | null) => void;
}) {
  if (typeof window === "undefined") return () => undefined;
  const provider = window.ethereum;
  if (!provider?.on) return () => undefined;

  const accountsHandler = (value: unknown) => {
    onAccountsChanged(Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
  };
  const chainHandler = (value: unknown) => onChainChanged(parseChainId(value));
  provider.on("accountsChanged", accountsHandler);
  provider.on("chainChanged", chainHandler);

  return () => {
    provider.removeListener?.("accountsChanged", accountsHandler);
    provider.removeListener?.("chainChanged", chainHandler);
  };
}

export async function readContractSnapshot(
  client: Pick<GenLayerClient, "readContract">,
  researcher?: WalletAddress | null,
): Promise<ContractSnapshot> {
  const rawIds = await readWithRetry(() => client.readContract({
    address: DEPLOYMENT.address,
    functionName: "get_next_ids",
    args: [],
    jsonSafeReturn: true,
  }));
  if (!Array.isArray(rawIds) || rawIds.length !== 2) throw new Error("get_next_ids returned an unexpected value.");
  const nextProgramId = toNumber(rawIds[0], "next_program_id");
  const nextReportId = toNumber(rawIds[1], "next_report_id");
  const firstProgramId = Math.max(1, nextProgramId - MAX_LIST_ITEMS);
  const firstReportId = Math.max(1, nextReportId - MAX_LIST_ITEMS);

  const programs = await Promise.all(
    Array.from({ length: nextProgramId - firstProgramId }, (_, index) => firstProgramId + index).map(async (programId) =>
      decodeProgram(await readWithRetry(() => client.readContract({
        address: DEPLOYMENT.address,
        functionName: "get_program",
        args: [BigInt(programId)],
        jsonSafeReturn: true,
      }))),
    ),
  );
  const reports = await Promise.all(
    Array.from({ length: nextReportId - firstReportId }, (_, index) => firstReportId + index).map(async (reportId) =>
      decodeReport(await readWithRetry(() => client.readContract({
        address: DEPLOYMENT.address,
        functionName: "get_report",
        args: [BigInt(reportId)],
        jsonSafeReturn: true,
      }))),
    ),
  );
  const policyEntries = await Promise.all(programs.map(async (program) => {
    const policy = decodePolicy(await readWithRetry(() => client.readContract({
      address: DEPLOYMENT.address,
      functionName: "get_policy",
      args: [BigInt(program.programId), BigInt(program.currentPolicyVersion)],
      jsonSafeReturn: true,
    })));
    return [program.programId, policy] as const;
  }));
  const reputation = researcher
    ? decodeReputation(await readWithRetry(() => client.readContract({
        address: DEPLOYMENT.address,
        functionName: "get_reputation",
        args: [researcher],
        jsonSafeReturn: true,
      })))
    : null;

  return {
    programs: programs.sort((a, b) => b.programId - a.programId),
    policies: Object.fromEntries(policyEntries),
    reports: reports.sort((a, b) => b.reportId - a.reportId),
    reputation,
    nextProgramId,
    nextReportId,
    loadedAt: Date.now(),
  };
}

export async function writeContract(
  client: Pick<GenLayerClient, "writeContract">,
  functionName: string,
  args: Array<string | number | bigint | boolean>,
  value = 0n,
): Promise<TransactionHash> {
  return client.writeContract({
    address: DEPLOYMENT.address,
    functionName,
    args,
    value,
  }) as Promise<TransactionHash>;
}

export async function monitorTransaction(
  client: Pick<GenLayerClient, "getTransaction">,
  hash: TransactionHash,
  onUpdate: (transaction: GenLayerTransaction, view: TransactionView) => void,
  options: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<TransactionView> {
  const intervalMs = options.intervalMs ?? 4_000;
  const timeoutMs = options.timeoutMs ?? 15 * 60_000;
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const transaction = await client.getTransaction({ hash });
      const view = classifyTransaction(transaction);
      onUpdate(transaction, view);
      if (view.terminal) return view;
      lastError = undefined;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  const suffix = lastError instanceof Error ? ` Last RPC error: ${lastError.message}` : "";
  throw new Error(`Monitoring timed out. The transaction may still be processing; resume with its hash.${suffix}`);
}

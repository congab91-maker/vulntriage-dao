import assert from "node:assert/strict";
import test from "node:test";
import type { GenLayerTransaction, TransactionHash } from "genlayer-js/types";
import {
  DEPLOYMENT,
  STUDIONET,
  classifyTransaction,
  decodeProgram,
  decodeReport,
  explainWalletError,
  formatGen,
  isWalletAddress,
  monitorTransaction,
  parseChainId,
  parseGenToWei,
  readContractSnapshot,
  writeContract,
  type GenLayerClient,
} from "../app/lib/genlayer.ts";

const txHash = `0x${"a".repeat(64)}` as TransactionHash;

test("deployment uses the verified Studionet contract and transaction", () => {
  assert.equal(DEPLOYMENT.address, "0x140Bc1D1ee108271B5ec46c6363Ba0DAa69C49a8");
  assert.equal(DEPLOYMENT.transactionHash, "0xa8955e14185e080869f768a8974ebbfca53b52ef0a2ad74ff4077840d45b0aa5");
  assert.equal(STUDIONET.chainId, 61999);
  assert.equal(STUDIONET.rpc, "https://studio.genlayer.com/api");
});

test("accepts only nonzero 20-byte hexadecimal wallet addresses", () => {
  assert.equal(isWalletAddress(`0x${"1".repeat(40)}`), true);
  assert.equal(isWalletAddress(`0x${"0".repeat(40)}`), false);
  assert.equal(isWalletAddress("test"), false);
  assert.equal(isWalletAddress("0x1234"), false);
  assert.equal(isWalletAddress(null), false);
});

test("normalizes strict hexadecimal and decimal chain IDs", () => {
  assert.equal(parseChainId("0xf22f"), STUDIONET.chainId);
  assert.equal(parseChainId("61999"), STUDIONET.chainId);
  assert.equal(parseChainId(61999), STUDIONET.chainId);
  assert.equal(parseChainId("61999junk"), null);
  assert.equal(parseChainId("wrong"), null);
});

test("parses GEN without floating-point precision", () => {
  assert.equal(parseGenToWei("1"), 1_000_000_000_000_000_000n);
  assert.equal(parseGenToWei("0.000000000000000001"), 1n);
  assert.equal(parseGenToWei("12.5"), 12_500_000_000_000_000_000n);
  assert.throws(() => parseGenToWei("1.0000000000000000001"));
  assert.throws(() => parseGenToWei("-1"));
});

test("formats GEN values for reviewer-facing state", () => {
  assert.equal(formatGen(2_000_000_000_000_000_000n), "2");
  assert.equal(formatGen(1_999_000_000_000_000_000n), "1.999");
  assert.equal(formatGen(1n), "0");
});

test("decodes JSON-safe program and report values", () => {
  const program = decodeProgram({
    program_id: 1,
    owner: `0x${"1".repeat(40)}`,
    name: "Program",
    repo_owner: "apache",
    repo_name: "logging-log4j2",
    active: true,
    current_policy_version: 1,
    report_cap_wei: "1000000000000000",
    available_balance_wei: "1999000000000000000",
    reserved_balance_wei: "1000000000000000",
  });
  assert.equal(program.availableBalanceWei, 1_999_000_000_000_000_000n);

  const report = decodeReport({
    report_id: 1,
    program_id: 1,
    researcher: `0x${"2".repeat(40)}`,
    report_url: "https://github.com/example/report",
    evidence_url: "https://github.com/apache/logging-log4j2/commit/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    claimed_impact: "RCE",
    submission_timestamp: 1,
    policy_version: 1,
    status: "JUDGED",
    verdict: "HIGH",
    vulnerability_confirmed: true,
    exploitability: "PRACTICAL",
    impact_scope: "MATERIAL",
    confidence: 98,
    summary: "Confirmed",
    evidence_alignment: "Aligned",
    impact: "Material",
    limitations: "Public evidence only",
    appeal_count: 0,
    appeal_deadline: 2,
    cancellation_deadline: 2,
    reserved_cap: "1000000000000000",
    payout_amount: 0,
    settlement_scheduled: false,
  });
  assert.equal(report.verdict, "HIGH");
  assert.equal(report.reservedCapWei, 1_000_000_000_000_000n);
});

test("does not treat FINALIZED as success when execution failed", () => {
  const failed = classifyTransaction({
    statusName: "FINALIZED",
    consensus_data: { final: true, leader_receipt: [{ execution_result: "ERROR", error: "boom" }] },
  } as GenLayerTransaction);
  assert.deepEqual(failed, {
    phase: "FAILED",
    terminal: true,
    successful: false,
    message: "Finalized, but contract execution failed.",
  });
});

test("requires successful execution receipts after finalization", () => {
  const successful = classifyTransaction({
    status: 7,
    consensus_data: { final: true, leader_receipt: [{ execution_result: "SUCCESS", error: null }] },
  } as GenLayerTransaction);
  assert.equal(successful.phase, "FINALIZED");
  assert.equal(successful.successful, true);
  assert.equal(successful.terminal, true);
});

test("classifies consensus failure and timeout states as terminal failures", () => {
  assert.equal(classifyTransaction({ statusName: "UNINITIALIZED" } as GenLayerTransaction).phase, "PENDING");
  assert.equal(classifyTransaction({ statusName: "UNDETERMINED" } as GenLayerTransaction).phase, "UNDETERMINED");
  assert.equal(classifyTransaction({ statusName: "CANCELED" } as GenLayerTransaction).phase, "CANCELED");
  assert.equal(classifyTransaction({ statusName: "LEADER_TIMEOUT" } as GenLayerTransaction).phase, "TIMEOUT");
  assert.equal(classifyTransaction({ statusName: "VALIDATORS_TIMEOUT" } as GenLayerTransaction).terminal, true);
});

test("retries a transient Studionet capacity error before decoding reads", async () => {
  let attempts = 0;
  const client = {
    async readContract({ functionName }: { functionName: string }) {
      if (functionName !== "get_next_ids") throw new Error(`Unexpected ${functionName}`);
      attempts += 1;
      if (attempts === 1) throw new Error("Server busy: all 8 execution slots occupied, retry later");
      return [1, 1];
    },
  } as unknown as Pick<GenLayerClient, "readContract">;

  const snapshot = await readContractSnapshot(client);
  assert.equal(attempts, 2);
  assert.deepEqual(snapshot.programs, []);
  assert.deepEqual(snapshot.reports, []);
});

test("maps wallet rejection without implying a submitted transaction", () => {
  assert.equal(explainWalletError({ code: 4001, message: "User rejected" }), "Signature request rejected. No transaction was submitted.");
});

test("contract snapshot calls the deployed read API and decodes state", async () => {
  const calls: string[] = [];
  const client = {
    async readContract({ functionName }: { functionName: string }) {
      calls.push(functionName);
      if (functionName === "get_next_ids") return [2, 2];
      if (functionName === "get_program") return {
        program_id: 1, owner: `0x${"1".repeat(40)}`, name: "Program", repo_owner: "apache", repo_name: "logging-log4j2", active: true,
        current_policy_version: 1, report_cap_wei: 1, available_balance_wei: 2, reserved_balance_wei: 1,
      };
      if (functionName === "get_report") return {
        report_id: 1, program_id: 1, researcher: `0x${"2".repeat(40)}`, report_url: "https://github.com/report", evidence_url: "https://github.com/evidence",
        claimed_impact: "impact", submission_timestamp: 1, policy_version: 1, status: "SUBMITTED", verdict: "PENDING", vulnerability_confirmed: false,
        exploitability: "", impact_scope: "", confidence: 0, summary: "", evidence_alignment: "", impact: "", limitations: "", appeal_count: 0,
        appeal_deadline: 0, cancellation_deadline: 2, reserved_cap: 1, payout_amount: 0, settlement_scheduled: false,
      };
      if (functionName === "get_policy") return { version: 1, text: "Policy", high_bps: 10000, medium_bps: 5000 };
      if (functionName === "get_reputation") return { total_settled_reports: 0, valid_reports: 0, invalid_reports: 0, high_reports: 0, medium_reports: 0, total_payout: 0 };
      throw new Error(`Unexpected ${functionName}`);
    },
  } as unknown as Pick<GenLayerClient, "readContract">;

  const snapshot = await readContractSnapshot(client, `0x${"2".repeat(40)}`);
  assert.deepEqual(calls, ["get_next_ids", "get_program", "get_report", "get_policy", "get_reputation"]);
  assert.equal(snapshot.programs[0].repoName, "logging-log4j2");
  assert.equal(snapshot.reports[0].status, "SUBMITTED");
  assert.equal(snapshot.reputation?.totalSettledReports, 0);
});

test("write adapter forwards real method, arguments, value, and address", async () => {
  let received: unknown;
  const client = {
    async writeContract(args: unknown) { received = args; return txHash; },
  } as unknown as Pick<GenLayerClient, "writeContract">;
  const result = await writeContract(client, "fund_program", [1n], 10n);
  assert.equal(result, txHash);
  assert.deepEqual(received, { address: DEPLOYMENT.address, functionName: "fund_program", args: [1n], value: 10n });
});

test("monitoring exposes intermediate consensus state before final success", async () => {
  const statuses: GenLayerTransaction[] = [
    { statusName: "PROPOSING" },
    { statusName: "REVEALING" },
    { statusName: "FINALIZED", consensus_data: { final: true, leader_receipt: [{ execution_result: "SUCCESS", error: null }] } },
  ] as GenLayerTransaction[];
  const phases: string[] = [];
  const client = {
    async getTransaction() { return statuses.shift() ?? statuses[statuses.length - 1]; },
  } as unknown as Pick<GenLayerClient, "getTransaction">;
  const result = await monitorTransaction(client, txHash, (_transaction, view) => phases.push(view.phase), { intervalMs: 0, timeoutMs: 100 });
  assert.deepEqual(phases, ["PROPOSING", "REVEALING", "FINALIZED"]);
  assert.equal(result.successful, true);
});

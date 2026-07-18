import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export type WalletAddress = `0x${string}`;

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: "accountsChanged" | "chainChanged", handler: (value: unknown) => void) => void;
  removeListener?: (event: "accountsChanged" | "chainChanged", handler: (value: unknown) => void) => void;
};

export type GenLayerConnection = {
  address: WalletAddress;
  chainId: number | null;
  client: ReturnType<typeof createClient>;
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
};

const rawContractAddress =
  process.env.NEXT_PUBLIC_VULNTRIAGE_CONTRACT_ADDRESS?.trim() || null;

export function isWalletAddress(value: unknown): value is WalletAddress {
  return typeof value === "string"
    && /^0x[0-9a-fA-F]{40}$/.test(value)
    && !/^0x0{40}$/i.test(value);
}

export const CONTRACT_ADDRESS = isWalletAddress(rawContractAddress)
  ? rawContractAddress
  : null;

export function hasLiveContract() {
  return CONTRACT_ADDRESS !== null;
}

export function parseChainId(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number.parseInt(value, value.startsWith("0x") ? 16 : 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

async function readChainId(provider: EthereumProvider): Promise<number | null> {
  return parseChainId(await provider.request({ method: "eth_chainId" }));
}

export async function connectGenLayerWallet(): Promise<GenLayerConnection> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No browser wallet detected. Install MetaMask or another EVM wallet.");
  }

  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];
  const address = accounts?.[0];

  if (!isWalletAddress(address)) {
    throw new Error("The wallet did not return a valid address.");
  }

  const client = createClient({
    chain: studionet,
    account: address,
  });

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
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const provider = window.ethereum;
  const subscribe = provider?.on;
  if (!provider || !subscribe) {
    return () => undefined;
  }

  const accountsHandler = (value: unknown) => {
    onAccountsChanged(Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
  };
  const chainHandler = (value: unknown) => onChainChanged(parseChainId(value));

  subscribe.call(provider, "accountsChanged", accountsHandler);
  subscribe.call(provider, "chainChanged", chainHandler);

  return () => {
    provider.removeListener?.("accountsChanged", accountsHandler);
    provider.removeListener?.("chainChanged", chainHandler);
  };
}

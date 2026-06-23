export const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export const formatSOL = (n: number) => `${n.toFixed(4)} SOL`;

export const shortAddr = (addr: string | null | undefined, head = 4, tail = 4) =>
  addr ? `${addr.slice(0, head)}…${addr.slice(-tail)}` : "";

export const explorerTx = (sig: string, cluster: "devnet" | "mainnet-beta" = "devnet") =>
  `https://explorer.solana.com/tx/${sig}?cluster=${cluster}`;

export const explorerAddr = (addr: string, cluster: "devnet" | "mainnet-beta" = "devnet") =>
  `https://explorer.solana.com/address/${addr}?cluster=${cluster}`;
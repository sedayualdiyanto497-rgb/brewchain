import { clusterApiUrl, PublicKey } from "@solana/web3.js";

export const SOLANA_CLUSTER = "devnet" as const;
export const SOLANA_ENDPOINT = clusterApiUrl(SOLANA_CLUSTER);

/**
 * Merchant wallet (placeholder devnet). Replace with the cafe's real
 * Devnet address before testing real payments. Using a fixed devnet test
 * address (Solana sandbox burn address) so transfers route somewhere
 * deterministic during demos.
 */
export const MERCHANT_WALLET = new PublicKey(
  "1nc1nerator11111111111111111111111111111111",
);

export const SIGN_IN_MESSAGE = (nonce: string) =>
  `Selamat datang di BrewChain ☕\n\nTandatangani pesan ini untuk login secara aman.\n\nNonce: ${nonce}\nJaringan: ${SOLANA_CLUSTER}`;
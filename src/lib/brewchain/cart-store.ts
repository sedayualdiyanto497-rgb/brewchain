import { useSyncExternalStore } from "react";

export type CartItem = {
  productId: string;
  name: string;
  imageUrl: string | null;
  priceIdr: number;
  priceSol: number;
  quantity: number;
};

const KEY = "brewchain.cart";
let listeners = new Set<() => void>();
let cache: CartItem[] | null = null;

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: CartItem[]) {
  cache = next;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export const cart = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get(): CartItem[] {
    return read();
  },
  add(item: CartItem) {
    const items = [...read()];
    const idx = items.findIndex((i) => i.productId === item.productId);
    if (idx >= 0) items[idx] = { ...items[idx], quantity: items[idx].quantity + item.quantity };
    else items.push(item);
    write(items);
  },
  setQty(productId: string, qty: number) {
    write(read().map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i)));
  },
  remove(productId: string) {
    write(read().filter((i) => i.productId !== productId));
  },
  clear() {
    write([]);
  },
};

export function useCart() {
  return useSyncExternalStore(
    cart.subscribe,
    () => cart.get(),
    () => [] as CartItem[],
  );
}
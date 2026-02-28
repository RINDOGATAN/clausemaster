function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1];
}

export function useCurrency() {
  const code = getCookie("currency") === "USD" ? "USD" : "EUR";
  const symbol = code === "USD" ? "$" : "\u20AC";

  function formatPrice(amount: number, period?: string): string {
    const formatted = amount >= 1000 ? amount.toLocaleString("en") : String(amount);
    return `${symbol}${formatted}${period ? period : ""}`;
  }

  return { symbol, code, formatPrice } as const;
}

"use client";

import { useCurrency } from "@/hooks/useCurrency";

interface PriceProps {
  amount: number;
  period?: string;
}

export function Price({ amount, period }: PriceProps) {
  const { formatPrice } = useCurrency();
  return <>{formatPrice(amount, period)}</>;
}

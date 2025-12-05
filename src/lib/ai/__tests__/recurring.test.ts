// Глобальные объявления тестовых функций для TypeScript (без зависимостей)
declare global {
  function describe(name: string, fn: () => void): void;
  function it(name: string, fn: () => void): void;
  function expect(actual: unknown): {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
  };
}

import { findRecurringCandidates } from "@/lib/ai/recurring";

function tx(
  title: string,
  dateISO: string,
  amount = 9.99,
  budget: string | null = null,
) {
  return {
    title,
    amount,
    type: "expense" as const,
    budget_folder_id: budget,
    created_at: dateISO,
  };
}

describe("recurring heuristics", () => {
  it("detects weekly cadence with ±2 day drift", () => {
    const base = new Date("2025-01-01");
    const ds = [new Date(base), new Date(base), new Date(base), new Date(base)];
    ds[1].setDate(ds[1].getDate() + 7);
    ds[2].setDate(ds[2].getDate() + 14 + 1); // +1 day drift
    ds[3].setDate(ds[3].getDate() + 21 - 2); // -2 day drift
    const txs = ds.map((d) => tx("Spotify Premium", d.toISOString(), 9.99));
    const c = findRecurringCandidates(txs);
    expect(c[0].cadence).toBe("weekly");
  });

  it("detects monthly cadence with ±5 day drift", () => {
    const ds = ["2025-01-03", "2025-02-03", "2025-03-06", "2025-04-28"].map(
      (s) => new Date(s),
    );
    const txs = ds.map((d) => tx("Netflix", d.toISOString(), 15));
    const c = findRecurringCandidates(txs);
    expect(c[0].cadence).toBe("monthly");
  });

  it("computes median amount", () => {
    const ds = ["2025-01-01", "2025-01-08", "2025-01-15"].map(
      (s) => new Date(s),
    );
    const txs = ds.map((d, i) => tx("Gym", d.toISOString(), [20, 22, 25][i]));
    const c = findRecurringCandidates(txs);
    expect(Math.round(c[0].avg_amount)).toBe(22);
  });

  it("filters false positives (insufficient occurrences)", () => {
    const txs = ["2025-01-01", "2025-01-08"].map((s) =>
      tx("RareService", s, 5),
    );
    const c = findRecurringCandidates(txs);
    expect(c.length).toBe(0);
  });
});

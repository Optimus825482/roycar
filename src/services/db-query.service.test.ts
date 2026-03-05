import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateQuery,
  extractSqlQueries,
  hasSqlQuery,
  executeSafeQuery,
} from "./db-query.service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { $queryRawUnsafe: vi.fn() },
}));

describe("validateQuery", () => {
  it("rejects empty query", () => {
    expect(validateQuery("")).toEqual({ safe: false, reason: "Boş sorgu." });
    expect(validateQuery("   ")).toEqual({ safe: false, reason: "Boş sorgu." });
  });

  it("rejects non-SELECT queries", () => {
    expect(validateQuery("DELETE FROM applications")).toMatchObject({
      safe: false,
      reason: expect.stringContaining("SELECT"),
    });
    expect(validateQuery("INSERT INTO x VALUES (1)")).toMatchObject({
      safe: false,
    });
    expect(validateQuery("UPDATE applications SET status = 'new'")).toMatchObject({
      safe: false,
    });
    expect(validateQuery("DROP TABLE x")).toMatchObject({ safe: false });
  });

  it("allows SELECT queries", () => {
    expect(validateQuery("SELECT * FROM applications")).toEqual({
      safe: true,
    });
    expect(validateQuery("  SELECT id, full_name FROM applications WHERE id = 1")).toEqual({
      safe: true,
    });
  });

  it("allows WITH (CTE) queries", () => {
    expect(
      validateQuery("WITH t AS (SELECT 1) SELECT * FROM t")
    ).toEqual({ safe: true });
  });

  it("rejects forbidden patterns", () => {
    expect(validateQuery("SELECT * FROM applications; DELETE FROM applications")).toMatchObject({
      safe: false,
      reason: expect.stringMatching(/Yasaklı|DELETE/),
    });
    expect(validateQuery("SELECT pg_catalog.version()")).toMatchObject({
      safe: false,
    });
  });

  it("rejects multiple statements (semicolon)", () => {
    const r = validateQuery("SELECT 1; SELECT 2");
    expect(r.safe).toBe(false);
    expect(r.reason).toMatch(/Çoklu|;/);
  });

  it("allows single trailing semicolon", () => {
    // Code strips trailing semicolon; validation checks for multiple
    const r = validateQuery("SELECT 1 FROM applications;");
    expect(r.safe).toBe(true);
  });
});

describe("extractSqlQueries", () => {
  it("extracts single query from tags", () => {
    expect(
      extractSqlQueries("Here is the result: [SQL_QUERY]SELECT 1[/SQL_QUERY]")
    ).toEqual(["SELECT 1"]);
  });

  it("extracts multiple queries", () => {
    const text = `
      First: [SQL_QUERY]SELECT * FROM a[/SQL_QUERY]
      Second: [SQL_QUERY]SELECT * FROM b LIMIT 10[/SQL_QUERY]
    `;
    expect(extractSqlQueries(text)).toEqual([
      "SELECT * FROM a",
      "SELECT * FROM b LIMIT 10",
    ]);
  });

  it("returns empty array when no tags", () => {
    expect(extractSqlQueries("No SQL here")).toEqual([]);
  });

  it("trims extracted query", () => {
    expect(
      extractSqlQueries("[SQL_QUERY]  SELECT 1  [/SQL_QUERY]")
    ).toEqual(["SELECT 1"]);
  });
});

describe("hasSqlQuery", () => {
  it("returns true when tag present", () => {
    expect(hasSqlQuery("Answer: [SQL_QUERY]SELECT 1[/SQL_QUERY]")).toBe(true);
    expect(hasSqlQuery("[SQL_QUERY]")).toBe(true);
  });

  it("returns false when tag absent", () => {
    expect(hasSqlQuery("Just text")).toBe(false);
  });
});

describe("executeSafeQuery", () => {
  beforeEach(() => {
    vi.mocked(prisma.$queryRawUnsafe).mockReset();
  });

  it("returns success true and data for valid SELECT", async () => {
    const mockData = [{ id: 1, name: "test" }];
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue(mockData as never);

    const result = await executeSafeQuery("SELECT * FROM applications");
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockData);
    expect(result.rowCount).toBe(1);
  });

  it("returns success false when validateQuery says unsafe", async () => {
    const result = await executeSafeQuery("DELETE FROM applications");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it("returns success false and error when query throws", async () => {
    vi.mocked(prisma.$queryRawUnsafe).mockRejectedValue(
      new Error("Connection failed")
    );

    const result = await executeSafeQuery("SELECT * FROM applications");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Connection failed");
    expect(result.data).toBeUndefined();
  });

  it("appends LIMIT 50 when SELECT has no LIMIT", async () => {
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([] as never);

    await executeSafeQuery("SELECT * FROM x");
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringMatching(/\sLIMIT\s+50\s*$/i)
    );
  });

  it("returns success false on timeout (5s)", async () => {
    vi.useFakeTimers();
    vi.mocked(prisma.$queryRawUnsafe).mockReturnValue(
      new Promise<never>(() => {}) // never resolves
    );

    const resultPromise = executeSafeQuery("SELECT 1");
    await vi.advanceTimersByTimeAsync(6000);
    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/zaman aşımı|5s/);
    expect(result.data).toBeUndefined();
    vi.useRealTimers();
  });
});

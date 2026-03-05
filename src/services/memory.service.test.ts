import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildMemoryContext } from "./memory.service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
  },
}));

vi.mock("@/lib/embedding", () => ({
  generateEmbedding: vi.fn().mockReturnValue(new Array(1536).fill(0.1)),
}));

describe("memory.service", () => {
  describe("buildMemoryContext", () => {
    beforeEach(() => {
      vi.mocked(prisma.$queryRawUnsafe).mockReset();
      vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([]);
    });

    it("returns empty string when no memories recalled", async () => {
      vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([]);
      const result = await buildMemoryContext("test query");
      expect(result).toBe("");
    });

    it("returns formatted context when memories exist", async () => {
      const mockRows = [
        {
          id: "1",
          layer: "semantic",
          content: "c1",
          summary: "Özet 1",
          entity_type: null,
          entity_id: null,
          source_type: "chat",
          importance: 0.8,
          created_at: new Date(),
          score: 0.9,
        },
      ];
      vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue(mockRows as never);
      const result = await buildMemoryContext("soru");
      expect(result).toContain("--- Hafıza Bağlamı");
      expect(result).toContain("Hafıza Sonu ---");
      expect(result).toContain("[semantic]");
      expect(result).toContain("Özet 1");
      expect(result).toContain("önem: 0.8");
    });

    it("deduplicates memories by id (entity first, then general)", async () => {
      const sameId = "100";
      vi.mocked(prisma.$queryRawUnsafe)
        .mockResolvedValueOnce([
          {
            id: sameId,
            layer: "strategic",
            content: "gen",
            summary: "General",
            entity_type: null,
            entity_id: null,
            source_type: "evaluation",
            importance: 0.5,
            created_at: new Date(),
            score: 0.7,
          },
        ] as never)
        .mockResolvedValueOnce([
          {
            id: sameId,
            layer: "semantic",
            content: "ent",
            summary: "Entity",
            entity_type: "candidate",
            entity_id: "cand-1",
            source_type: "chat",
            importance: 0.9,
            created_at: new Date(),
            score: 0.8,
          },
        ] as never);
      const result = await buildMemoryContext("q", {
        entityId: "cand-1",
      });
      expect(result).toContain("Entity");
      expect(result).not.toContain("General");
      expect((result.match(/\[semantic\]|\[strategic\]/g) || []).length).toBe(1);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createChatSession,
  getChatMessages,
  getChatSessions,
} from "./chat.service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatSession: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    chatMessage: {
      findMany: vi.fn(),
    },
  },
}));

describe("chat.service", () => {
  beforeEach(() => {
    vi.mocked(prisma.chatSession.create).mockReset();
    vi.mocked(prisma.chatSession.findMany).mockReset();
    vi.mocked(prisma.chatMessage.findMany).mockReset();
  });

  describe("createChatSession", () => {
    it("creates session with default title when title not provided", async () => {
      vi.mocked(prisma.chatSession.create).mockResolvedValue({
        id: 1n,
        adminUserId: 5n,
        title: "Sohbet - 5.3.2025",
        isArchived: false,
        updatedAt: new Date(),
        createdAt: new Date(),
      } as never);

      const session = await createChatSession(5n);
      expect(session.id).toBe(1n);
      expect(prisma.chatSession.create).toHaveBeenCalledWith({
        data: {
          adminUserId: 5n,
          title: expect.stringMatching(/Sohbet - .+/),
        },
      });
    });

    it("creates session with given title", async () => {
      vi.mocked(prisma.chatSession.create).mockResolvedValue({
        id: 2n,
        adminUserId: 5n,
        title: "Özel Başlık",
        isArchived: false,
        updatedAt: new Date(),
        createdAt: new Date(),
      } as never);

      const session = await createChatSession(5n, "Özel Başlık");
      expect(session.title).toBe("Özel Başlık");
      expect(prisma.chatSession.create).toHaveBeenCalledWith({
        data: { adminUserId: 5n, title: "Özel Başlık" },
      });
    });
  });

  describe("getChatMessages", () => {
    it("returns messages ordered by createdAt asc", async () => {
      const mockMessages = [
        { id: 1n, role: "user", content: "Merhaba", createdAt: new Date() },
        { id: 2n, role: "assistant", content: "Selam", createdAt: new Date() },
      ];
      vi.mocked(prisma.chatMessage.findMany).mockResolvedValue(
        mockMessages as never,
      );

      const messages = await getChatMessages(10n);
      expect(messages).toHaveLength(2);
      expect(prisma.chatMessage.findMany).toHaveBeenCalledWith({
        where: { chatSessionId: 10n },
        orderBy: { createdAt: "asc" },
      });
    });
  });

  describe("getChatSessions", () => {
    it("excludes archived when includeArchived is false", async () => {
      vi.mocked(prisma.chatSession.findMany).mockResolvedValue([]);
      await getChatSessions(3n, false);
      expect(prisma.chatSession.findMany).toHaveBeenCalledWith({
        where: { adminUserId: 3n, isArchived: false },
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { messages: true } } },
      });
    });

    it("includes archived when includeArchived is true", async () => {
      vi.mocked(prisma.chatSession.findMany).mockResolvedValue([]);
      await getChatSessions(3n, true);
      expect(prisma.chatSession.findMany).toHaveBeenCalledWith({
        where: { adminUserId: 3n },
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { messages: true } } },
      });
    });
  });
});

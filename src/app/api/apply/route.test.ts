import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import * as evaluationService from "@/services/evaluation.service";
import * as emailService from "@/services/email.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findMany: vi.fn(),
    },
    formConfig: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
    department: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/services/evaluation.service", () => ({
  triggerEvaluation: vi.fn(),
}));

vi.mock("@/services/email.service", () => ({
  sendApplicationConfirmation: vi.fn().mockResolvedValue(undefined),
}));

function reqWithBody(body: object): NextRequest {
  return new NextRequest("http://localhost/api/apply", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validBody = {
  formConfigId: 1,
  fullName: "Test User",
  email: "test@example.com",
  phone: "+905551234567",
};

describe("POST /api/apply — validasyon", () => {
  it("returns 400 when required fields are missing", async () => {
    const res = await POST(reqWithBody({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(
      /Zorunlu|eksik|formConfigId|fullName|email|phone/i
    );
  });

  it("returns 400 when fullName is missing", async () => {
    const res = await POST(
      reqWithBody({
        formConfigId: 1,
        email: "test@example.com",
        phone: "+905551234567",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await POST(
      reqWithBody({
        formConfigId: 1,
        fullName: "Test User",
        email: "not-an-email",
        phone: "+905551234567",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/e-posta|email/i);
  });

  it("returns 400 when formConfigId is missing", async () => {
    const res = await POST(
      reqWithBody({
        fullName: "Test",
        email: "a@b.com",
        phone: "1",
      })
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/apply — Prisma & services mocked", () => {
  const createdApp = {
    id: 1n,
    applicationNo: "MR-2025-abc123",
  };

  beforeEach(() => {
    vi.mocked(prisma.application.findMany).mockResolvedValue([]);
    vi.mocked(prisma.formConfig.findFirst).mockResolvedValue({
      id: 1n,
      title: "Test Form",
      isPublished: true,
      isActive: true,
    } as never);
    vi.mocked(prisma.department.findUnique).mockResolvedValue({
      name: "Test Dept",
    } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
      const mockTx = {
        application: {
          create: vi.fn().mockResolvedValue(createdApp),
          update: vi.fn().mockResolvedValue(createdApp),
        },
        applicationResponse: {
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return cb(mockTx as never) as Promise<typeof createdApp>;
    });
    vi.mocked(evaluationService.triggerEvaluation).mockImplementation(() => {});
    vi.mocked(emailService.sendApplicationConfirmation).mockResolvedValue(
      undefined
    );
  });

  it("returns 201 with applicationNo and id for valid body", async () => {
    const res = await POST(reqWithBody(validBody));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.applicationNo).toBeDefined();
    expect(data.data.id).toBeDefined();
    expect(prisma.application.findMany).toHaveBeenCalled();
    expect(prisma.formConfig.findFirst).toHaveBeenCalledWith({
      where: { id: 1n, isPublished: true, isActive: true },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(evaluationService.triggerEvaluation).toHaveBeenCalledWith(1n);
    expect(emailService.sendApplicationConfirmation).toHaveBeenCalled();
  });

  it("returns 400 when duplicate (same form + email + same answers)", async () => {
    const bodyWithAnswers = {
      ...validBody,
      answers: {
        "1": { answerText: "Same answer" },
      },
    };
    vi.mocked(prisma.application.findMany).mockResolvedValue([
      {
        id: 1n,
        email: "test@example.com",
        formConfigId: 1n,
        responses: [
          { questionId: 1n, answerText: "Same answer", answerJson: null },
        ],
      },
    ] as never);

    const res = await POST(reqWithBody(bodyWithAnswers));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/zaten başvuru|aynı cevaplarla/i);
  });

  it("returns 404 when form not found (not active/published)", async () => {
    vi.mocked(prisma.formConfig.findFirst).mockResolvedValue(null);

    const res = await POST(reqWithBody(validBody));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/form|bulunamadı/i);
  });
});

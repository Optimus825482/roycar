import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { sendMailMock } = vi.hoisted(() => ({
  sendMailMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: sendMailMock,
    }),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemSetting: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import {
  sendApplicationConfirmation,
  sendStatusChangeEmail,
} from "./email.service";

describe("email.service", () => {
  beforeEach(() => {
    sendMailMock.mockClear();
  });

  afterEach(() => {
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  });

  describe("sendApplicationConfirmation", () => {
    it("does not call sendMail when SMTP is not configured", async () => {
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      await sendApplicationConfirmation({
        email: "test@test.com",
        fullName: "Test User",
        applicationNo: "A001",
        departmentName: "IT",
      });
      expect(sendMailMock).not.toHaveBeenCalled();
    });

    it("calls sendMail with expected args when SMTP is configured", async () => {
      process.env.SMTP_USER = "noreply@test.com";
      process.env.SMTP_PASS = "secret";
      await sendApplicationConfirmation({
        email: "user@example.com",
        fullName: "Ali Veli",
        applicationNo: "A002",
        departmentName: "İnsan Kaynakları",
      });
      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const call = sendMailMock.mock.calls[0][0];
      expect(call.to).toBe("user@example.com");
      expect(call.subject).toContain("A002");
      expect(call.html).toContain("Ali Veli");
      expect(call.html).toContain("İnsan Kaynakları");
    });
  });

  describe("sendStatusChangeEmail", () => {
    it("does not call sendMail when SMTP is not configured", async () => {
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      await sendStatusChangeEmail({
        email: "user@test.com",
        fullName: "Test",
        applicationNo: "A003",
        departmentName: "HR",
        status: "shortlisted",
      });
      expect(sendMailMock).not.toHaveBeenCalled();
    });

    it("calls sendMail with status-specific subject when SMTP configured", async () => {
      process.env.SMTP_USER = "noreply@test.com";
      process.env.SMTP_PASS = "secret";
      await sendStatusChangeEmail({
        email: "user@example.com",
        fullName: "Veli",
        applicationNo: "A004",
        departmentName: "IT",
        status: "shortlisted",
      });
      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const call = sendMailMock.mock.calls[0][0];
      expect(call.to).toBe("user@example.com");
      expect(call.subject).toMatch(/Ön Elemeyi Geçti|shortlisted/i);
      expect(call.html).toContain("Veli");
    });
  });
});

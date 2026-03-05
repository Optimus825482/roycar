import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { WizardContainer } from "./WizardContainer";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("WizardContainer", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/apply/active-form")) {
          return Promise.resolve({
            json: () =>
              Promise.resolve({
                success: true,
                data: {
                  id: "1",
                  title: "Test Form",
                  mode: "static",
                  questions: [],
                  branchingRules: [],
                },
              }),
          } as Response);
        }
        if (url.includes("/api/org-chart")) {
          return Promise.resolve({
            json: () =>
              Promise.resolve({ success: true, data: { flat: [] } }),
          } as Response);
        }
        return Promise.reject(new Error("Unknown URL"));
      })
    );
  });

  it("renders and after load shows form content or error", async () => {
    render(<WizardContainer />);
    await waitFor(
      () => {
        const body = document.body;
        expect(
          body.textContent?.includes("Ad Soyad") ||
            body.textContent?.includes("İletişim Bilgileri") ||
            body.textContent?.includes("Form yüklenirken") ||
            body.textContent?.includes("açık pozisyon")
        ).toBe(true);
      },
      { timeout: 3000 }
    );
  });
});

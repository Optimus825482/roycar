import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ApplicationDetailModal } from "./ApplicationDetailModal";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("ApplicationDetailModal", () => {
  const onClose = vi.fn();
  const onUpdate = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
    onUpdate.mockClear();
  });

  it("renders nothing when open is false", () => {
    render(
      <ApplicationDetailModal
        applicationId="1"
        open={false}
        onClose={onClose}
        onUpdate={onUpdate}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("fetches and displays application when open with id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/admin/applications/")) {
          return Promise.resolve({
            json: () =>
              Promise.resolve({
                success: true,
                data: {
                  id: "1",
                  applicationNo: "MR-2025-001",
                  fullName: "Test User",
                  email: "test@example.com",
                  phone: "+905551234567",
                  photoPath: null,
                  status: "new",
                  submittedAt: "2025-01-01T00:00:00Z",
                  department: { id: "1", name: "IT" },
                  positionTitle: "Developer",
                  formConfig: { id: "1", title: "Form", mode: "static" },
                  responses: [],
                  evaluation: null,
                },
              }),
          } as Response);
        }
        return Promise.reject(new Error("Unknown URL"));
      })
    );

    render(
      <ApplicationDetailModal
        applicationId="1"
        open={true}
        onClose={onClose}
        onUpdate={onUpdate}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Test User" })).toBeInTheDocument();
    });
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });
});

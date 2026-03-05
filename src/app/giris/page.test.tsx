import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockSignIn = vi.fn();
vi.mock("next-auth/react", () => ({ signIn: (...args: unknown[]) => mockSignIn(...args) }));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

describe("LoginPage", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockSignIn.mockClear();
  });

  it("renders login form with title and submit button", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { name: /Yönetim Paneli/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Giriş Yap/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Kullanıcı Adı/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
  });

  it("calls signIn with credentials on submit", async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null });
    render(<LoginPage />);
    fireEvent.change(screen.getByRole("textbox", { name: /Kullanıcı Adı/i }), { target: { value: "admin" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /Giriş Yap/i }));
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        username: "admin",
        password: "secret",
        redirect: false,
      });
    });
  });
});

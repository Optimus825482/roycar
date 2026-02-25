import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Input Sanitization ───

export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (typeof result[key] === "string") {
      (result as Record<string, unknown>)[key] = sanitizeInput(
        result[key] as string,
      );
    }
  }
  return result;
}

// ─── F&B Career System Utility Functions ───

export function generateApplicationNo(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `MR-${year}-${random}`;
}

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export function apiSuccess<T>(data: T, message?: string): ApiResponse<T> {
  // Serialize BigInt values to strings for JSON compatibility
  const serialized = JSON.parse(
    JSON.stringify({ success: true, data, message }, (_k, v) =>
      typeof v === "bigint" ? v.toString() : v,
    ),
  );
  return serialized;
}

export function apiError(error: string, status = 400): Response {
  return Response.json({ success: false, error }, { status });
}

import { describe, it, expect } from "vitest";
import { sanitizeError } from "@/lib/safe-error";

describe("sanitizeError", () => {
  it("returns the fallback for unknown errors", () => {
    expect(sanitizeError(new Error("relation \"users\" violates constraint x"))).toBe(
      "Something went wrong. Please try again."
    );
    expect(sanitizeError("weird", "Custom fallback")).toBe("Custom fallback");
  });
  it("bubbles up Supabase auth messages (already user-safe)", () => {
    expect(sanitizeError({ name: "AuthApiError", message: "Invalid login credentials" })).toBe(
      "Invalid login credentials"
    );
  });
  it("gives a generic message for 4xx without leaking detail", () => {
    const out = sanitizeError({ name: "PostgrestError", message: "column foo does not exist", status: 400 });
    expect(out).toBe("Request was rejected. Please check your input and try again.");
    expect(out).not.toContain("column");
  });
  it("never leaks DB internals for 5xx", () => {
    const out = sanitizeError({ name: "PostgrestError", message: "deadlock on table secret_table", status: 500 });
    expect(out).not.toContain("secret_table");
  });
});

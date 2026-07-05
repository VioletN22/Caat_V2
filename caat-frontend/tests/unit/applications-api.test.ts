import { describe, it, expect, vi, beforeEach } from "vitest";

// Controllable singleton mock, hoisted so the SUT sees it at module load.
const state = vi.hoisted(() => ({
  userId: "user-1" as string | null,
  resolver: (() => ({ data: null, error: null })) as (ctx: { table: string; op: string }) => {
    data?: unknown;
    error?: { message: string } | null;
  },
  calls: [] as { table: string; method: string; args: unknown[] }[],
}));

vi.mock("@/lib/current-user", () => ({
  getClientUserId: () => Promise.resolve(state.userId),
}));

// Keep the error passthrough deterministic so tests can assert on the message.
vi.mock("@/lib/safe-error", () => ({
  sanitizeError: (e: unknown) =>
    typeof e === "object" && e && "message" in e ? String((e as { message: string }).message) : "error",
}));

vi.mock("@/lib/supabase/client", () => {
  const build = (table: string) => {
    const ctx = { table, op: "select" as const };
    const b: Record<string, unknown> = {};
    const rec = (method: string, args: unknown[]) => state.calls.push({ table, method, args });
    const pass =
      (op?: string) =>
      (...args: unknown[]) => {
        if (op) (ctx as { op: string }).op = op;
        rec(op ?? "filter", args);
        return b;
      };
    for (const m of ["select", "eq", "in", "order", "ilike", "limit"]) {
      b[m] = (...args: unknown[]) => {
        rec(m, args);
        return b;
      };
    }
    b.insert = pass("insert");
    b.update = pass("update");
    b.delete = pass("delete");
    b.then = (f: (v: unknown) => unknown, r?: (e: unknown) => unknown) =>
      Promise.resolve(state.resolver(ctx)).then(f, r);
    b.maybeSingle = () => Promise.resolve(state.resolver(ctx));
    b.single = () => Promise.resolve(state.resolver(ctx));
    return b;
  };
  const client = { from: (t: string) => build(t) };
  return { supabase: client, getBrowserClient: () => client };
});

import {
  fetchApplications,
  addApplication,
  updateApplication,
  deleteApplication,
  searchSchools,
  fetchUnimportedBookmarkCount,
  importBookmarkedSchools,
  fetchGlobalReadinessSignals,
} from "@/app/(main)/applications/api";

beforeEach(() => {
  state.userId = "user-1";
  state.resolver = () => ({ data: null, error: null });
  state.calls = [];
});

describe("auth guard", () => {
  it("throws Not authenticated when there is no user id", async () => {
    state.userId = null;
    await expect(fetchApplications()).rejects.toThrow("Not authenticated");
  });
});

describe("fetchApplications", () => {
  it("returns the rows on success", async () => {
    state.resolver = () => ({ data: [{ id: "a1" }, { id: "a2" }], error: null });
    const rows = await fetchApplications();
    expect(rows).toHaveLength(2);
  });

  it("throws the sanitized error when the query fails", async () => {
    state.resolver = () => ({ data: null, error: { message: "boom" } });
    await expect(fetchApplications()).rejects.toThrow("boom");
  });
});

describe("addApplication", () => {
  it("seeds intended_majors from the profile and returns the new row", async () => {
    state.resolver = (ctx) => {
      if (ctx.table === "profiles") return { data: { target_majors: ["CS", "", "Law"] }, error: null };
      if (ctx.table === "user_school_applications" && ctx.op === "insert")
        return { data: { id: "a9", school_id: 5 }, error: null };
      return { data: null, error: null };
    };
    const row = await addApplication(5);
    expect(row).toEqual({ id: "a9", school_id: 5 });
    const insertCall = state.calls.find((c) => c.table === "user_school_applications" && c.method === "insert");
    // Blank major names are filtered out before insert.
    expect((insertCall!.args[0] as { intended_majors: string[] }).intended_majors).toEqual(["CS", "Law"]);
  });

  it("throws the sanitized error on insert failure", async () => {
    state.resolver = (ctx) =>
      ctx.op === "insert" ? { data: null, error: { message: "insert failed" } } : { data: { target_majors: [] }, error: null };
    await expect(addApplication(5)).rejects.toThrow("insert failed");
  });
});

describe("updateApplication / deleteApplication", () => {
  it("scopes the update to the caller and resolves on success", async () => {
    await expect(updateApplication("a1", { status: "applying" })).resolves.toBeUndefined();
    const eqCalls = state.calls.filter((c) => c.method === "eq");
    // Every write is scoped by id AND user_id (defense in depth).
    expect(eqCalls.some((c) => c.args[0] === "user_id")).toBe(true);
  });

  it("throws when the update errors", async () => {
    state.resolver = () => ({ data: null, error: { message: "nope" } });
    await expect(updateApplication("a1", { status: "applying" })).rejects.toThrow("nope");
  });

  it("deletes and resolves on success", async () => {
    await expect(deleteApplication("a1")).resolves.toBeUndefined();
    expect(state.calls.some((c) => c.method === "delete")).toBe(true);
  });
});

describe("searchSchools", () => {
  it("returns [] for a blank query without hitting the DB", async () => {
    expect(await searchSchools("   ")).toEqual([]);
    expect(state.calls).toHaveLength(0);
  });

  it("escapes SQL LIKE wildcards so user input is a literal (C2)", async () => {
    state.resolver = () => ({ data: [{ id: 1, name: "x", country: "AU" }], error: null });
    await searchSchools("100%_off\\");
    const ilike = state.calls.find((c) => c.method === "ilike");
    // % _ and \ must be backslash-escaped inside the %...% wrapper.
    expect(ilike!.args[1]).toBe("%100\\%\\_off\\\\%");
  });

  it("throws the sanitized error on failure", async () => {
    state.resolver = () => ({ data: null, error: { message: "search failed" } });
    await expect(searchSchools("mit")).rejects.toThrow("search failed");
  });
});

describe("fetchUnimportedBookmarkCount", () => {
  it("counts bookmarked schools that have no application yet", async () => {
    state.resolver = (ctx) => {
      if (ctx.table === "user_bookmarked_schools")
        return { data: [{ school_id: 1 }, { school_id: 2 }, { school_id: 3 }], error: null };
      if (ctx.table === "user_school_applications") return { data: [{ school_id: 2 }], error: null };
      return { data: [], error: null };
    };
    expect(await fetchUnimportedBookmarkCount()).toBe(2);
  });
});

describe("importBookmarkedSchools", () => {
  it("returns early with skipped == bookmark count when nothing to import", async () => {
    state.resolver = (ctx) => {
      if (ctx.table === "user_bookmarked_schools") return { data: [{ school_id: 1 }], error: null };
      if (ctx.table === "user_school_applications") return { data: [{ school_id: 1 }], error: null };
      return { data: [], error: null };
    };
    const res = await importBookmarkedSchools();
    expect(res.added).toEqual([]);
    expect(res.skipped).toBe(1);
    // No insert was attempted.
    expect(state.calls.some((c) => c.method === "insert")).toBe(false);
  });

  it("inserts only the un-imported schools and reports counts", async () => {
    state.resolver = (ctx) => {
      if (ctx.table === "user_bookmarked_schools")
        return { data: [{ school_id: 1 }, { school_id: 2 }, { school_id: 3 }], error: null };
      if (ctx.table === "user_school_applications" && ctx.op === "select")
        return { data: [{ school_id: 2 }], error: null };
      if (ctx.table === "profiles") return { data: { target_majors: [] }, error: null };
      if (ctx.table === "user_school_applications" && ctx.op === "insert")
        return { data: [{ id: "n1", school_id: 1 }, { id: "n3", school_id: 3 }], error: null };
      return { data: [], error: null };
    };
    const res = await importBookmarkedSchools();
    expect(res.added).toHaveLength(2);
    expect(res.skipped).toBe(1); // 3 bookmarks - 2 inserted
    const insertCall = state.calls.find((c) => c.method === "insert");
    expect((insertCall!.args[0] as unknown[]).length).toBe(2);
  });
});

describe("fetchGlobalReadinessSignals", () => {
  it("derives booleans from the presence of any draft / document", async () => {
    state.resolver = (ctx) => {
      if (ctx.table === "essay_drafts") return { data: [{ id: "d1" }], error: null };
      if (ctx.table === "documents") return { data: [], error: null };
      return { data: [], error: null };
    };
    expect(await fetchGlobalReadinessSignals()).toEqual({ essayDrafted: true, keyDocsUploaded: false });
  });
});

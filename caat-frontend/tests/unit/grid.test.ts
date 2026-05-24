import { describe, it, expect } from "vitest";
import {
  COLS, buildOccupied, hasConflict, exceedsBounds, isPlacementValid,
  findFirstFit, getDefaultSize, autoLayout, getGridHeight, pixelToCell,
  type GridRect, type PartialRect,
} from "@/lib/grid";

const rect = (id: string, x: number, y: number, w: number, h: number): GridRect => ({ id, x, y, w, h });

describe("buildOccupied", () => {
  it("marks every cell a widget covers", () => {
    const occ = buildOccupied([rect("a", 0, 0, 2, 2)]);
    expect(occ.has("0,0")).toBe(true);
    expect(occ.has("1,1")).toBe(true);
    expect(occ.has("2,0")).toBe(false);
  });
  it("excludes the given id", () => {
    const occ = buildOccupied([rect("a", 0, 0, 2, 2)], "a");
    expect(occ.size).toBe(0);
  });
});

describe("hasConflict", () => {
  const occ = buildOccupied([rect("a", 0, 0, 2, 2)]);
  it("detects overlap", () => {
    expect(hasConflict({ x: 1, y: 1, w: 2, h: 2 }, occ)).toBe(true);
  });
  it("allows non-overlapping placement", () => {
    expect(hasConflict({ x: 2, y: 0, w: 2, h: 2 }, occ)).toBe(false);
  });
});

describe("exceedsBounds", () => {
  it("rejects out-of-bounds rects", () => {
    expect(exceedsBounds({ x: -1, y: 0, w: 1, h: 1 })).toBe(true);
    expect(exceedsBounds({ x: 0, y: -1, w: 1, h: 1 })).toBe(true);
    expect(exceedsBounds({ x: 3, y: 0, w: 2, h: 1 })).toBe(true); // 3+2 > COLS(4)
    expect(exceedsBounds({ x: 0, y: 0, w: 0, h: 1 })).toBe(true);
    expect(exceedsBounds({ x: 0, y: 0, w: 1, h: 0 })).toBe(true);
  });
  it("accepts in-bounds rects", () => {
    expect(exceedsBounds({ x: 0, y: 0, w: COLS, h: 1 })).toBe(false);
    expect(exceedsBounds({ x: 2, y: 5, w: 2, h: 3 })).toBe(false);
  });
});

describe("isPlacementValid", () => {
  const all = [rect("a", 0, 0, 2, 2)];
  it("is false when out of bounds", () => {
    expect(isPlacementValid({ x: 3, y: 0, w: 2, h: 1 }, all)).toBe(false);
  });
  it("is false when colliding", () => {
    expect(isPlacementValid({ x: 1, y: 1, w: 2, h: 2 }, all)).toBe(false);
  });
  it("is true on a free, in-bounds spot", () => {
    expect(isPlacementValid({ x: 2, y: 0, w: 2, h: 2 }, all)).toBe(true);
  });
  it("ignores self when excludeId given (moving a widget onto itself)", () => {
    expect(isPlacementValid({ x: 0, y: 0, w: 2, h: 2 }, all, "a")).toBe(true);
  });
});

describe("findFirstFit", () => {
  it("returns top-left when grid is empty", () => {
    expect(findFirstFit(2, 2, [])).toEqual({ x: 0, y: 0 });
  });
  it("places to the right of an existing widget when it fits", () => {
    expect(findFirstFit(2, 2, [rect("a", 0, 0, 2, 2)])).toEqual({ x: 2, y: 0 });
  });
  it("wraps to the next row when the row is full", () => {
    const full = [rect("a", 0, 0, 2, 2), rect("b", 2, 0, 2, 2)];
    expect(findFirstFit(2, 2, full)).toEqual({ x: 0, y: 2 });
  });
});

describe("getDefaultSize", () => {
  it("returns known widget sizes", () => {
    expect(getDefaultSize("calendar")).toEqual({ w: 2, h: 4 });
    expect(getDefaultSize("todo")).toEqual({ w: 2, h: 3 });
  });
  it("falls back to 2x2 for unknown widgets", () => {
    expect(getDefaultSize("mystery")).toEqual({ w: 2, h: 2 });
  });
});

describe("autoLayout", () => {
  it("keeps positioned widgets and auto-places the rest without overlap", () => {
    const input: PartialRect[] = [
      { id: "a", widgetId: "calendar", positioned: true, x: 0, y: 0, w: 2, h: 2 },
      { id: "b", widgetId: "todo", positioned: false, x: 0, y: 0, w: 2, h: 2 },
      { id: "c", widgetId: "todo", positioned: false, x: 0, y: 0, w: 2, h: 2 },
    ];
    const out = autoLayout(input);
    expect(out).toHaveLength(3);
    // no two widgets share a cell
    const occ = new Set<string>();
    for (const r of out) for (let c = r.x; c < r.x + r.w; c++) for (let y = r.y; y < r.y + r.h; y++) {
      expect(occ.has(`${c},${y}`)).toBe(false);
      occ.add(`${c},${y}`);
    }
  });
});

describe("getGridHeight", () => {
  it("returns 4 for an empty grid", () => {
    expect(getGridHeight([])).toBe(4);
  });
  it("returns the bottom edge of the lowest widget", () => {
    expect(getGridHeight([rect("a", 0, 0, 2, 2), rect("b", 2, 3, 2, 4)])).toBe(7);
  });
});

describe("pixelToCell", () => {
  it("clamps columns within the grid", () => {
    const { col } = pixelToCell(99999, 0, 800);
    expect(col).toBeLessThanOrEqual(COLS - 1);
    expect(col).toBeGreaterThanOrEqual(0);
  });
  it("never returns negative cells", () => {
    expect(pixelToCell(-50, -50, 800)).toEqual({ col: 0, row: 0 });
  });
});

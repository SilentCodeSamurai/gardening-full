import { describe, expect, it } from "vitest";

import { DEFAULT_GRID_SIZE } from "@/components/spatial-layout-editor/spatial-layout-editor.defaults";
import { getViewportWorldGridBackgroundProps } from "@/components/spatial-layout-editor/spatial-layout-editor.utils";

describe("getViewportWorldGridBackgroundProps", () => {
  it("uses period gridStep * scale and phases position from viewport translate", () => {
    const v = { x: 37, y: -12, scale: 1 };
    const grid = 16;
    const { backgroundSize, backgroundPosition } = getViewportWorldGridBackgroundProps(v, grid);
    const period = grid * v.scale;
    expect(backgroundSize).toBe(`${period}px ${period}px`);
    const [px, py] = backgroundPosition.split(" ").map((s) => parseFloat(s));
    expect(px).toBeCloseTo(v.x - Math.floor(v.x / period) * period);
    expect(py).toBeCloseTo(v.y - Math.floor(v.y / period) * period);
  });

  it("uses caller-supplied default grid step value when editor passes DEFAULT_GRID_SIZE", () => {
    const { backgroundSize } = getViewportWorldGridBackgroundProps(
      { x: 0, y: 0, scale: 2 },
      DEFAULT_GRID_SIZE,
    );
    expect(backgroundSize).toBe(`${DEFAULT_GRID_SIZE * 2}px ${DEFAULT_GRID_SIZE * 2}px`);
  });
});

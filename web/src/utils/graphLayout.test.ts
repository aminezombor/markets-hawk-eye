import { describe, expect, it } from "vitest";
import type { GraphEdge, GraphNode, VisibleGraph } from "../types/graph";
import {
  analyzeConnectedComponents,
  calculateEvidenceRailPosition,
  calculateGraphViewport,
  prepareComponentLayout
} from "./graphLayout";

function node(id: string): GraphNode {
  return { id, name: id, sector: [], tags: [], sources: [] };
}

function edge(from: string, to: string, index: number): GraphEdge {
  return {
    id: `edge-${index}`,
    from,
    to,
    source: from,
    target: to,
    sources: [],
    tags: []
  };
}

const graph: VisibleGraph = {
  nodes: [node("a"), node("b"), node("c"), node("orphan")],
  edges: [edge("a", "b", 1), edge("b", "c", 2)]
};

describe("graph component layout", () => {
  it("finds the primary component and isolated records", () => {
    const components = analyzeConnectedComponents(graph);
    expect(components).toHaveLength(2);
    expect(components[0]).toMatchObject({ size: 3, edgeCount: 2, isPrimary: true, isIsolated: false });
    expect(components[1]).toMatchObject({ nodeIds: ["orphan"], isIsolated: true });
  });

  it("pins isolated records without mutating source nodes", () => {
    const prepared = prepareComponentLayout(graph);
    const orphan = prepared.nodes.find((item) => item.id === "orphan");
    expect(orphan?.fx).toBeTypeOf("number");
    expect(orphan?.fy).toBeTypeOf("number");
    expect(prepared.isolatedNodeIds.has("orphan")).toBe(true);
    expect("fx" in graph.nodes[3]).toBe(false);
  });

  it("centers content inside asymmetric overlay insets", () => {
    const target = calculateGraphViewport(
      { minX: -100, maxX: 100, minY: -50, maxY: 50 },
      { width: 1200, height: 800 },
      { top: 20, right: 420, bottom: 100, left: 360 },
      30
    );
    expect(target.zoom).toBeGreaterThan(1);
    expect(target.centerX).toBeGreaterThan(0);
  });

  it("positions isolated evidence beyond the live main component bounds", () => {
    const rail = calculateEvidenceRailPosition(
      { minX: -180, maxX: 220, minY: -120, maxY: 160 },
      ["orphan-b", "orphan-a"]
    );
    expect(rail?.positions.get("orphan-a")?.x).toBeGreaterThan(220);
    expect(rail?.positions.get("orphan-a")?.y).toBeLessThan(rail?.positions.get("orphan-b")?.y ?? 0);
    expect(rail?.bounds.minX).toBeGreaterThan(220);
  });
});

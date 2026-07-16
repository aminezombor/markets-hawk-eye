import { Crosshair, Maximize2, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { GraphEdge, GraphNode, GraphViewportInsets, Selection, VisibleGraph } from "../types/graph";
import { getFactStatusStyle, getSemanticColor, withAlpha } from "../utils/colors";
import {
  calculateEvidenceRailPosition,
  calculateGraphViewport,
  prepareComponentLayout,
  type GraphBounds,
  type LayoutGraphNode
} from "../utils/graphLayout";
import { Legend } from "./Legend";

interface GraphCanvasProps {
  graph: VisibleGraph;
  theme: "light" | "dark";
  selection: Selection;
  highlightedNodeIds: Set<string>;
  highlightedEdgeIds: Set<string>;
  viewportInsets: GraphViewportInsets;
  onSelectNode: (nodeId: string) => void;
  onSelectEdge: (edgeId: string) => void;
  onBackgroundClick: () => void;
}

interface GraphBoundingBox {
  x: [number, number];
  y: [number, number];
}

function nodeRadius(node: GraphNode, selected: boolean, hovered: boolean): number {
  return 5.5 + (node.criticality ?? 0) * 0.85 + (node.market_importance ?? 0) * 0.45 +
    (selected ? 5 : 0) + (hovered ? 2.5 : 0);
}

function labelText(node: GraphNode, selected: boolean): string {
  const max = selected ? 48 : 34;
  return node.name.length > max ? `${node.name.slice(0, max - 1)}...` : node.name;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function intersects(
  box: { left: number; right: number; top: number; bottom: number },
  others: Array<{ left: number; right: number; top: number; bottom: number }>
): boolean {
  return others.some((other) => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top);
}

function getNodeDegreeMap(edges: GraphEdge[]): Map<string, number> {
  const degree = new Map<string, number>();
  for (const edge of edges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }
  return degree;
}

function labelPriority(node: LayoutGraphNode, degree: number, selected: boolean, hovered: boolean, highlighted: boolean): number {
  if (selected) return 10000;
  if (hovered) return 9000;
  if (highlighted) return 7000 + degree * 4;
  if (node.__layout.isIsolated) return 6200;
  const criticality = node.criticality ?? 0;
  const market = node.market_importance ?? 0;
  const red = String(node.color).toLowerCase() === "red" ? 34 : 0;
  const type = String(node.type ?? "").toLowerCase();
  const layer = type.includes("layer") || type.includes("sector_view") ? 24 : 0;
  return criticality * 18 + market * 7 + degree * 3 + red + layer;
}

function getSelectionNodeIds(
  selection: Selection,
  highlightedNodeIds: Set<string>,
  highlightedEdgeIds: Set<string>,
  edges: GraphEdge[]
): Set<string> {
  const focusIds = new Set(highlightedNodeIds);
  if (selection?.kind === "node") focusIds.add(selection.id);
  if (selection?.kind === "edge") {
    const selectedEdge = edges.find((edge) => edge.id === selection.id);
    if (selectedEdge) {
      focusIds.add(selectedEdge.from);
      focusIds.add(selectedEdge.to);
    }
  }
  for (const edge of edges) {
    if (highlightedEdgeIds.has(edge.id)) {
      focusIds.add(edge.from);
      focusIds.add(edge.to);
    }
  }
  return focusIds;
}

function normalizeBounds(box?: GraphBoundingBox): GraphBounds | undefined {
  if (!box) return undefined;
  return { minX: box.x[0], maxX: box.x[1], minY: box.y[0], maxY: box.y[1] };
}

export function GraphCanvas({
  graph,
  theme,
  selection,
  highlightedNodeIds,
  highlightedEdgeIds,
  viewportInsets,
  onSelectNode,
  onSelectEdge,
  onBackgroundClick
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<any>(null);
  const zoomFrameRef = useRef<number | null>(null);
  const previousSelectionRef = useRef<Selection>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  const selectedNodeId = selection?.kind === "node" ? selection.id : undefined;
  const selectedEdgeId = selection?.kind === "edge" ? selection.id : undefined;
  const prepared = useMemo(() => prepareComponentLayout(graph), [graph]);
  const degreeById = useMemo(() => getNodeDegreeMap(graph.edges), [graph.edges]);
  const focusNodeIds = useMemo(
    () => getSelectionNodeIds(selection, highlightedNodeIds, highlightedEdgeIds, graph.edges),
    [graph.edges, highlightedEdgeIds, highlightedNodeIds, selection]
  );
  const graphData = useMemo(() => ({ nodes: prepared.nodes, links: prepared.links }), [prepared]);
  const hasFocus = Boolean(selection || highlightedNodeIds.size || highlightedEdgeIds.size);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const updateSize = () => {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (bounds?.width && bounds?.height) {
        setSize({ width: Math.max(320, Math.round(bounds.width)), height: Math.max(320, Math.round(bounds.height)) });
      }
    };
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => {
      window.removeEventListener("resize", updateSize);
      observer.disconnect();
    };
  }, []);

  useEffect(() => () => {
    if (zoomFrameRef.current !== null) window.cancelAnimationFrame(zoomFrameRef.current);
  }, []);

  const fitToNodes = useCallback((nodeIds?: Set<string>, padding = 40, maxZoom = 1.45, duration = 650) => {
    const handle = graphRef.current;
    if (!handle) return;
    const filter = nodeIds?.size ? (nodeObject: LayoutGraphNode) => nodeIds.has(nodeObject.id) : undefined;
    const bounds = normalizeBounds(handle.getGraphBbox?.(filter));
    if (!bounds) {
      handle.zoomToFit?.(duration, padding, filter);
      return;
    }
    const target = calculateGraphViewport(bounds, size, viewportInsets, padding, 0.22, maxZoom);
    handle.centerAt?.(target.centerX, target.centerY, duration);
    handle.zoom?.(target.zoom, duration);
  }, [size, viewportInsets]);

  const positionEvidenceRail = useCallback(() => {
    const handle = graphRef.current;
    if (!handle || !prepared.isolatedNodeIds.size) return;
    const mainBounds = normalizeBounds(
      handle.getGraphBbox?.((nodeObject: LayoutGraphNode) => !nodeObject.__layout.isIsolated)
    );
    if (!mainBounds) return;

    const rail = calculateEvidenceRailPosition(mainBounds, [...prepared.isolatedNodeIds]);
    if (!rail) return;
    for (const node of prepared.nodes) {
      const position = rail.positions.get(node.id);
      if (!position) continue;
      node.x = position.x;
      node.y = position.y;
      node.fx = position.x;
      node.fy = position.y;
    }
    prepared.railBounds = rail.bounds;
  }, [prepared]);

  const runReadableOverview = useCallback(() => fitToNodes(undefined, 52, 1.45), [fitToNodes]);
  const runFitAll = useCallback(() => fitToNodes(undefined, 28, 1.2), [fitToNodes]);
  const runReset = useCallback(() => runReadableOverview(), [runReadableOverview]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      graphRef.current?.d3Force?.("charge")?.strength?.((nodeObject: LayoutGraphNode) =>
        nodeObject.__layout.isIsolated ? 0 : -110
      );
      graphRef.current?.d3Force?.("link")?.distance?.((link: GraphEdge) => 42 + (link.criticality ?? 0) * 8);
      graphRef.current?.d3ReheatSimulation?.();
      window.setTimeout(() => {
        positionEvidenceRail();
        runReadableOverview();
      }, 620);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [positionEvidenceRail, prepared, runReadableOverview]);

  useEffect(() => {
    const previous = previousSelectionRef.current;
    previousSelectionRef.current = selection;
    const timer = window.setTimeout(() => {
      if (selection) {
        fitToNodes(focusNodeIds.size ? focusNodeIds : undefined, 54, selection.kind === "node" ? 2.2 : 1.9);
      } else if (previous) {
        runReadableOverview();
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [fitToNodes, focusNodeIds, runReadableOverview, selection]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (selection) fitToNodes(focusNodeIds.size ? focusNodeIds : undefined, 54, 2.1);
      else runReadableOverview();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [fitToNodes, focusNodeIds, runReadableOverview, selection, viewportInsets]);

  const isEdgeFocused = useCallback((edge: GraphEdge) => {
    if (!hasFocus) return true;
    if (highlightedEdgeIds.has(edge.id) || selectedEdgeId === edge.id) return true;
    return highlightedNodeIds.has(edge.from) && highlightedNodeIds.has(edge.to);
  }, [hasFocus, highlightedEdgeIds, highlightedNodeIds, selectedEdgeId]);

  const drawEvidenceRail = useCallback((ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!prepared.railBounds || hasFocus) return;
    const { minX, maxX, minY, maxY } = prepared.railBounds;
    const pad = 8 / globalScale;
    ctx.save();
    roundedRect(ctx, minX, minY, maxX - minX, maxY - minY, 9 / globalScale);
    ctx.fillStyle = theme === "dark" ? "rgba(13, 23, 36, 0.5)" : "rgba(255, 255, 255, 0.56)";
    ctx.fill();
    ctx.setLineDash([5 / globalScale, 4 / globalScale]);
    ctx.strokeStyle = theme === "dark" ? "rgba(152, 166, 184, 0.26)" : "rgba(100, 113, 132, 0.3)";
    ctx.lineWidth = 1 / globalScale;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `700 ${10.5 / globalScale}px Inter, ui-sans-serif, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = theme === "dark" ? "rgba(200, 211, 225, 0.72)" : "rgba(65, 78, 96, 0.74)";
    const title = "UNCONNECTED EVIDENCE";
    const titleWidth = ctx.measureText(title).width;
    const handle = graphRef.current;
    const safeLeft = handle?.screen2GraphCoords?.(viewportInsets.left + 6, 0)?.x;
    const safeRight = handle?.screen2GraphCoords?.(size.width - viewportInsets.right - 6, 0)?.x;
    const titleCenter = typeof safeLeft === "number" && typeof safeRight === "number"
      ? Math.min(Math.max((minX + maxX) / 2, safeLeft + titleWidth / 2), safeRight - titleWidth / 2)
      : (minX + maxX) / 2;
    ctx.fillText(title, titleCenter, minY - pad);
    ctx.restore();
  }, [hasFocus, prepared.railBounds, size.width, theme, viewportInsets.left, viewportInsets.right]);

  const drawNode = useCallback((nodeObject: object, ctx: CanvasRenderingContext2D) => {
    const node = nodeObject as LayoutGraphNode;
    if (typeof node.x !== "number" || typeof node.y !== "number") return;
    const selected = node.id === selectedNodeId;
    const hovered = node.id === hoveredNodeId;
    const highlighted = highlightedNodeIds.has(node.id);
    const active = !hasFocus || selected || hovered || highlighted;
    const color = getSemanticColor(node.color, theme);
    const radius = nodeRadius(node, selected, hovered);

    ctx.save();
    ctx.globalAlpha = active ? 1 : 0.16;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = selected ? 2.8 : highlighted ? 1.8 : 1;
    ctx.strokeStyle = selected ? (theme === "dark" ? "#ffffff" : "#0c1220") : withAlpha(color, 0.88);
    ctx.stroke();

    if (String(node.color).toLowerCase() === "red") {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 4.5, 0, Math.PI * 2);
      ctx.strokeStyle = withAlpha(color, active ? 0.42 : 0.12);
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();
  }, [hasFocus, highlightedNodeIds, hoveredNodeId, selectedNodeId, theme]);

  const drawLabels = useCallback((ctx: CanvasRenderingContext2D, globalScale: number) => {
    const placed: Array<{ left: number; right: number; top: number; bottom: number }> = [];
    const handle = graphRef.current;
    const safeTopLeft = handle?.screen2GraphCoords?.(viewportInsets.left + 6, viewportInsets.top + 6);
    const safeBottomRight = handle?.screen2GraphCoords?.(
      size.width - viewportInsets.right - 6,
      size.height - viewportInsets.bottom - 6
    );
    const safeBounds = safeTopLeft && safeBottomRight
      ? {
          left: Math.min(safeTopLeft.x, safeBottomRight.x),
          right: Math.max(safeTopLeft.x, safeBottomRight.x),
          top: Math.min(safeTopLeft.y, safeBottomRight.y),
          bottom: Math.max(safeTopLeft.y, safeBottomRight.y)
        }
      : null;
    const labelLimit = hasFocus ? 42 : zoomScale > 2 ? 72 : zoomScale > 1.25 ? 48 : 26;
    const priorityFloor = hasFocus ? 0 : zoomScale > 1.25 ? 68 : 96;
    const candidates = prepared.nodes
      .filter((node) => typeof node.x === "number" && typeof node.y === "number")
      .map((node) => {
        const selected = node.id === selectedNodeId;
        const hovered = node.id === hoveredNodeId;
        const highlighted = highlightedNodeIds.has(node.id);
        return { node, selected, hovered, highlighted, priority: labelPriority(node, degreeById.get(node.id) ?? 0, selected, hovered, highlighted) };
      })
      .filter(({ node, selected, hovered, highlighted, priority }) =>
        selected || hovered || highlighted || (!hasFocus && (node.__layout.isIsolated || priority >= priorityFloor))
      )
      .sort((left, right) => right.priority - left.priority)
      .slice(0, labelLimit);

    for (const { node, priority, selected, hovered, highlighted } of candidates) {
      if (typeof node.x !== "number" || typeof node.y !== "number") continue;
      const forceVisible = selected || hovered || highlighted || (!hasFocus && node.__layout.isIsolated);
      const radius = nodeRadius(node, selected, hovered);
      const fontSize = (selected ? 13.5 : priority > 150 ? 12.5 : 11.5) / globalScale;
      const label = labelText(node, selected);
      const paddingX = 5.5 / globalScale;
      const paddingY = 3.5 / globalScale;
      const gap = 6 / globalScale;
      const height = fontSize + paddingY * 2.2;

      ctx.save();
      ctx.font = `${forceVisible ? 750 : 680} ${fontSize}px Inter, ui-sans-serif, system-ui`;
      const width = ctx.measureText(label).width + paddingX * 2;
      const placements = [
        { x: node.x - width / 2, y: node.y + radius + gap, textAlign: "center" as CanvasTextAlign, textX: node.x },
        { x: node.x - width / 2, y: node.y - radius - gap - height, textAlign: "center" as CanvasTextAlign, textX: node.x },
        { x: node.x + radius + gap, y: node.y - height / 2, textAlign: "left" as CanvasTextAlign, textX: node.x + radius + gap + paddingX },
        { x: node.x - radius - gap - width, y: node.y - height / 2, textAlign: "left" as CanvasTextAlign, textX: node.x - radius - gap - width + paddingX }
      ].map((placement) => {
        if (!safeBounds) return placement;
        const maxX = Math.max(safeBounds.left, safeBounds.right - width);
        const maxY = Math.max(safeBounds.top, safeBounds.bottom - height);
        const x = Math.min(Math.max(placement.x, safeBounds.left), maxX);
        const y = Math.min(Math.max(placement.y, safeBounds.top), maxY);
        return {
          ...placement,
          x,
          y,
          textX: placement.textAlign === "center" ? x + width / 2 : x + paddingX
        };
      });
      let chosen = placements[0];
      let box = { left: chosen.x, right: chosen.x + width, top: chosen.y, bottom: chosen.y + height };
      for (const placement of placements) {
        const nextBox = { left: placement.x, right: placement.x + width, top: placement.y, bottom: placement.y + height };
        if (!intersects(nextBox, placed) || forceVisible) {
          chosen = placement;
          box = nextBox;
          break;
        }
      }
      if (!forceVisible && intersects(box, placed)) {
        ctx.restore();
        continue;
      }

      roundedRect(ctx, chosen.x, chosen.y, width, height, 5 / globalScale);
      ctx.fillStyle = theme === "dark" ? "rgba(7, 16, 28, 0.82)" : "rgba(255, 255, 255, 0.88)";
      ctx.fill();
      ctx.strokeStyle = theme === "dark" ? "rgba(177, 200, 228, 0.2)" : "rgba(141, 154, 174, 0.32)";
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
      ctx.textAlign = chosen.textAlign;
      ctx.textBaseline = "middle";
      ctx.fillStyle = forceVisible
        ? theme === "dark" ? "rgba(246, 250, 255, 0.98)" : "rgba(9, 18, 31, 0.98)"
        : theme === "dark" ? "rgba(222, 233, 248, 0.88)" : "rgba(28, 41, 60, 0.88)";
      ctx.fillText(label, chosen.textX, chosen.y + height / 2);
      placed.push(box);
      ctx.restore();
    }
  }, [
    degreeById,
    hasFocus,
    highlightedNodeIds,
    hoveredNodeId,
    prepared.nodes,
    selectedNodeId,
    size.height,
    size.width,
    theme,
    viewportInsets.bottom,
    viewportInsets.left,
    viewportInsets.right,
    viewportInsets.top,
    zoomScale
  ]);

  const handleZoom = useCallback((transform: { k: number }) => {
    if (zoomFrameRef.current !== null) window.cancelAnimationFrame(zoomFrameRef.current);
    zoomFrameRef.current = window.requestAnimationFrame(() => {
      setZoomScale(transform.k);
      zoomFrameRef.current = null;
    });
  }, []);

  return (
    <section className="graph-shell" aria-label="Interactive strategic dependency map">
      <div className="graph-map-meta">
        <div>
          <strong>Strategic map</strong>
          <span>{graph.nodes.length} visible nodes / {graph.edges.length} visible edges</span>
          {prepared.isolatedNodeIds.size > 0 && <span>{prepared.isolatedNodeIds.size} unconnected evidence records</span>}
        </div>
      </div>

      <div className="graph-actions icon-button-row" aria-label="Map controls">
        <button type="button" className="icon-button" aria-label="Reset view" title="Reset view" onClick={runReset}><RotateCcw size={16} aria-hidden /></button>
        <button type="button" className="icon-button" aria-label="Readable overview" title="Readable overview" onClick={runReadableOverview}><Crosshair size={16} aria-hidden /></button>
        <button type="button" className="icon-button" aria-label="Fit all" title="Fit all" onClick={runFitAll}><Maximize2 size={16} aria-hidden /></button>
      </div>

      <div ref={containerRef} className="graph-canvas">
        {graph.nodes.length ? (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={size.width}
            height={size.height}
            backgroundColor={theme === "dark" ? "#07101c" : "#f6f8fb"}
            nodeId="id"
            linkSource="source"
            linkTarget="target"
            onRenderFramePre={drawEvidenceRail}
            nodeCanvasObject={drawNode}
            nodeCanvasObjectMode={() => "replace"}
            onRenderFramePost={drawLabels}
            nodePointerAreaPaint={(nodeObject, color, ctx) => {
              const node = nodeObject as LayoutGraphNode;
              if (typeof node.x !== "number" || typeof node.y !== "number") return;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x, node.y, nodeRadius(node, node.id === selectedNodeId, false) + 8, 0, Math.PI * 2);
              ctx.fill();
            }}
            linkColor={(edgeObject) => {
              const edge = edgeObject as GraphEdge;
              return withAlpha(getSemanticColor(edge.color, theme), isEdgeFocused(edge) ? 0.62 : 0.07);
            }}
            linkWidth={(edgeObject) => {
              const edge = edgeObject as GraphEdge;
              const selected = selectedEdgeId === edge.id || highlightedEdgeIds.has(edge.id);
              return Math.max(selected ? 1.8 : 0.8, (edge.criticality ?? 1) * 0.35 + (edge.dependency_risk ?? 0) * 0.25 + (selected ? 1.2 : 0));
            }}
            linkLineDash={(edgeObject) => getFactStatusStyle((edgeObject as GraphEdge).fact_status).dash}
            linkDirectionalArrowLength={(edgeObject) => isEdgeFocused(edgeObject as GraphEdge) ? 3.5 : 0}
            linkDirectionalArrowRelPos={0.78}
            linkDirectionalArrowColor={(edgeObject) => withAlpha(getSemanticColor((edgeObject as GraphEdge).color, theme), 0.68)}
            onNodeHover={(nodeObject) => setHoveredNodeId((nodeObject as GraphNode | null)?.id ?? null)}
            onNodeClick={(nodeObject) => onSelectNode((nodeObject as GraphNode).id)}
            onLinkClick={(edgeObject) => onSelectEdge((edgeObject as GraphEdge).id)}
            onBackgroundClick={onBackgroundClick}
            onZoom={handleZoom}
            cooldownTicks={100}
            minZoom={0.2}
            maxZoom={7}
          />
        ) : (
          <div className="empty-state"><strong>No nodes match these filters.</strong><span>Reset filters or widen the search to restore the map.</span></div>
        )}
      </div>
      <Legend />
    </section>
  );
}

import type {
  GraphComponentInfo,
  GraphEdge,
  GraphNode,
  GraphViewportInsets,
  VisibleGraph
} from "../types/graph";

export interface LayoutGraphNode extends GraphNode {
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  __layout: {
    componentId: string;
    isIsolated: boolean;
  };
}

export interface PreparedGraphLayout {
  nodes: LayoutGraphNode[];
  links: GraphEdge[];
  components: GraphComponentInfo[];
  isolatedNodeIds: Set<string>;
  railBounds?: GraphBounds;
}

export interface GraphBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface GraphViewportTarget {
  centerX: number;
  centerY: number;
  zoom: number;
}

export interface EvidenceRailPosition {
  positions: Map<string, { x: number; y: number }>;
  bounds: GraphBounds;
}

export function calculateEvidenceRailPosition(
  mainBounds: GraphBounds,
  isolatedNodeIds: string[]
): EvidenceRailPosition | undefined {
  if (!isolatedNodeIds.length) return undefined;

  const sortedIds = [...isolatedNodeIds].sort();
  const spacing = 54;
  const centerY = (mainBounds.minY + mainBounds.maxY) / 2;
  const startY = centerY - ((sortedIds.length - 1) * spacing) / 2;
  const railX = mainBounds.maxX + 138;
  const positions = new Map(
    sortedIds.map((nodeId, index) => [nodeId, { x: railX, y: startY + index * spacing }])
  );

  return {
    positions,
    bounds: {
      minX: railX - 104,
      maxX: railX + 104,
      minY: startY - 44,
      maxY: startY + (sortedIds.length - 1) * spacing + 44
    }
  };
}

export function analyzeConnectedComponents(graph: VisibleGraph): GraphComponentInfo[] {
  const adjacency = new Map(graph.nodes.map((node) => [node.id, new Set<string>()]));
  const validEdges = graph.edges.filter((edge) => adjacency.has(edge.from) && adjacency.has(edge.to));

  for (const edge of validEdges) {
    adjacency.get(edge.from)?.add(edge.to);
    adjacency.get(edge.to)?.add(edge.from);
  }

  const visited = new Set<string>();
  const components: Array<Omit<GraphComponentInfo, "id" | "isPrimary">> = [];

  for (const nodeId of [...adjacency.keys()].sort()) {
    if (visited.has(nodeId)) continue;
    const stack = [nodeId];
    const nodeIds: string[] = [];

    while (stack.length) {
      const current = stack.pop();
      if (!current || visited.has(current)) continue;
      visited.add(current);
      nodeIds.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) stack.push(neighbor);
      }
    }

    nodeIds.sort();
    const nodeSet = new Set(nodeIds);
    const edgeCount = validEdges.filter((edge) => nodeSet.has(edge.from) && nodeSet.has(edge.to)).length;
    components.push({
      nodeIds,
      size: nodeIds.length,
      edgeCount,
      isIsolated: nodeIds.length === 1 && edgeCount === 0
    });
  }

  components.sort((left, right) =>
    right.size - left.size ||
    right.edgeCount - left.edgeCount ||
    left.nodeIds[0].localeCompare(right.nodeIds[0])
  );

  return components.map((component, index) => ({
    ...component,
    id: `component-${index + 1}`,
    isPrimary: index === 0
  }));
}

export function prepareComponentLayout(graph: VisibleGraph): PreparedGraphLayout {
  const components = analyzeConnectedComponents(graph);
  const componentByNode = new Map<string, GraphComponentInfo>();
  for (const component of components) {
    for (const nodeId of component.nodeIds) componentByNode.set(nodeId, component);
  }

  const isolatedNodeIds = new Set(
    components.filter((component) => component.isIsolated).flatMap((component) => component.nodeIds)
  );
  const isolatedIds = [...isolatedNodeIds].sort();
  const primarySize = components.find((component) => component.isPrimary)?.size ?? graph.nodes.length;
  const estimatedExtent = Math.max(120, Math.round(Math.sqrt(Math.max(primarySize, 1)) * 28));
  const rail = calculateEvidenceRailPosition(
    { minX: -estimatedExtent, maxX: estimatedExtent, minY: -estimatedExtent, maxY: estimatedExtent },
    isolatedIds
  );

  const nodes = graph.nodes.map<LayoutGraphNode>((node) => {
    const component = componentByNode.get(node.id);
    const isolated = isolatedNodeIds.has(node.id);
    const position = rail?.positions.get(node.id);
    return {
      ...node,
      ...(position ? { x: position.x, y: position.y, fx: position.x, fy: position.y } : {}),
      __layout: {
        componentId: component?.id ?? "component-unknown",
        isIsolated: isolated
      }
    };
  });

  const links = graph.edges.map((edge) => ({
    ...edge,
    source: edge.from,
    target: edge.to
  }));

  return { nodes, links, components, isolatedNodeIds, railBounds: rail?.bounds };
}

export function calculateGraphViewport(
  bounds: GraphBounds,
  size: { width: number; height: number },
  insets: GraphViewportInsets,
  padding: number,
  minZoom = 0.25,
  maxZoom = 2
): GraphViewportTarget {
  const availableWidth = Math.max(1, size.width - insets.left - insets.right);
  const availableHeight = Math.max(1, size.height - insets.top - insets.bottom);
  const graphWidth = Math.max(1, bounds.maxX - bounds.minX);
  const graphHeight = Math.max(1, bounds.maxY - bounds.minY);
  const usableWidth = Math.max(1, availableWidth - padding * 2);
  const usableHeight = Math.max(1, availableHeight - padding * 2);
  const zoom = Math.max(minZoom, Math.min(maxZoom, usableWidth / graphWidth, usableHeight / graphHeight));
  const graphCenterX = (bounds.minX + bounds.maxX) / 2;
  const graphCenterY = (bounds.minY + bounds.maxY) / 2;
  const targetScreenX = insets.left + availableWidth / 2;
  const targetScreenY = insets.top + availableHeight / 2;

  return {
    centerX: graphCenterX - (targetScreenX - size.width / 2) / zoom,
    centerY: graphCenterY - (targetScreenY - size.height / 2) / zoom,
    zoom
  };
}

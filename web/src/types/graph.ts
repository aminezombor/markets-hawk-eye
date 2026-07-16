export type SemanticColor = "green" | "orange" | "red" | "blue" | "purple" | "grey" | string;

export type FactStatus = "known" | "inferred" | string;

export interface GraphManifest {
  project?: string;
  database?: string;
  title?: string;
  name?: string;
  version?: string;
  created?: string;
  updated?: string;
  node_count?: number;
  edge_count?: number;
  opportunity_count?: number;
  source_count?: number;
  safety_scope?: string;
  notes?: string[];
  [key: string]: unknown;
}

export interface GraphNode {
  id: string;
  name: string;
  type?: string;
  country?: string;
  region?: string;
  sector: string[];
  strategic_role?: string;
  description?: string;
  sovereignty_score?: number | null;
  criticality?: number | null;
  market_importance?: number | null;
  france_or_eu_fit?: number | null;
  color?: SemanticColor;
  confidence?: string;
  tags: string[];
  sources: string[];
  fact_status?: FactStatus;
  [key: string]: unknown;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  source: string;
  target: string;
  type?: string;
  dependency_category?: string;
  reason?: string;
  dependency_risk?: number | null;
  criticality?: number | null;
  replaceability?: number | null;
  time_to_substitute?: string;
  color?: SemanticColor;
  confidence?: string;
  sources: string[];
  fact_status?: FactStatus;
  tags: string[];
  unresolved?: boolean;
  [key: string]: unknown;
}

export interface Opportunity {
  id: string;
  title: string;
  type?: string;
  score?: number | null;
  reason?: string;
  affected_nodes: string[];
  dependency_types: string[];
  buyer_types: string[];
  criticality?: number | null;
  dependency_risk?: number | null;
  market_importance?: number | null;
  urgency?: number | null;
  accessibility?: number | null;
  france_fit?: number | null;
  eu_fit?: number | null;
  capital_intensity?: number | null;
  regulatory_friction?: number | null;
  incumbent_strength?: number | null;
  confidence?: string;
  sources: string[];
  unresolvedAffectedNodes?: string[];
  [key: string]: unknown;
}

export interface SourceRecord {
  id: string;
  title?: string;
  url?: string;
  type?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface RawGraphDataset {
  manifest?: GraphManifest;
  sources?: Record<string, Omit<SourceRecord, "id">> | SourceRecord[];
  nodes?: Array<Record<string, unknown>>;
  edges?: Array<Record<string, unknown>>;
  opportunities?: Array<Record<string, unknown>>;
}

export interface GraphDataset {
  id: string;
  label: string;
  manifest: GraphManifest;
  readme?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  renderableEdges: GraphEdge[];
  opportunities: Opportunity[];
  sources: SourceRecord[];
  sourceById: Map<string, SourceRecord>;
  nodeById: Map<string, GraphNode>;
  validationWarnings: ValidationWarning[];
}

export interface DatasetConfig {
  id: string;
  label: string;
  shortLabel: string;
  graphPath: string;
  readmePath: string;
  manifestPath: string;
  safetyBadge?: boolean;
  emphasis: string[];
  demoNodes: string[];
}

export interface DatasetStats {
  nodes: number;
  edges: number;
  opportunities: number;
  sources: number;
  knownEdges: number;
  inferredEdges: number;
  redBottlenecks: number;
  filteredNodes?: number;
  filteredEdges?: number;
}

export interface ValidationWarning {
  severity: "warning" | "info";
  kind: "missing_edge_node" | "missing_opportunity_node" | "missing_source";
  message: string;
  ownerId: string;
  missingId: string;
}

export interface FilterState {
  query: string;
  nodeTypes: string[];
  countries: string[];
  regions: string[];
  sectors: string[];
  colors: string[];
  confidences: string[];
  factStatuses: string[];
  edgeTypes: string[];
  dependencyCategories: string[];
  criticalityMin: number;
  sovereigntyMin: number;
  franceEuLens: boolean;
  bottlenecksOnly: boolean;
  opportunityConnectedOnly: boolean;
}

export interface FilterOptions {
  nodeTypes: string[];
  countries: string[];
  regions: string[];
  sectors: string[];
  colors: string[];
  confidences: string[];
  factStatuses: string[];
  edgeTypes: string[];
  dependencyCategories: string[];
}

export type Selection =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string }
  | { kind: "opportunity"; id: string }
  | null;

export interface VisibleGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphComponentInfo {
  id: string;
  nodeIds: string[];
  size: number;
  edgeCount: number;
  isPrimary: boolean;
  isIsolated: boolean;
}

export interface GraphViewportInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const defaultFilters: FilterState = {
  query: "",
  nodeTypes: [],
  countries: [],
  regions: [],
  sectors: [],
  colors: [],
  confidences: [],
  factStatuses: [],
  edgeTypes: [],
  dependencyCategories: [],
  criticalityMin: 0,
  sovereigntyMin: 0,
  franceEuLens: false,
  bottlenecksOnly: false,
  opportunityConnectedOnly: false
};

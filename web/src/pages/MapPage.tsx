import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DetailPanel } from "../components/DetailPanel";
import { GraphCanvas } from "../components/GraphCanvas";
import { Layout } from "../components/Layout";
import { Sidebar } from "../components/Sidebar";
import { StatBar } from "../components/StatBar";
import { datasetRegistry, getDatasetConfig } from "../data/datasetRegistry";
import type { FilterState, GraphDataset, GraphViewportInsets, Selection } from "../types/graph";
import { defaultFilters } from "../types/graph";
import {
  calculateDatasetStats,
  filterGraph,
  getFilterOptions,
  getSelectionHighlights,
  searchNodes
} from "../utils/graphSelectors";

interface MapPageProps {
  datasets: GraphDataset[];
  theme: "light" | "dark";
  onThemeToggle: () => void;
}

function cloneDefaultFilters(): FilterState {
  return {
    ...defaultFilters,
    nodeTypes: [],
    countries: [],
    regions: [],
    sectors: [],
    colors: [],
    confidences: [],
    factStatuses: [],
    edgeTypes: [],
    dependencyCategories: []
  };
}

function getInitialMenuState(): boolean {
  return !window.matchMedia("(max-width: 820px)").matches;
}

export function MapPage({ datasets, theme, onThemeToggle }: MapPageProps) {
  const [searchParams] = useSearchParams();
  const requestedDatasetId = searchParams.get("dataset");
  const requestedOpportunityId = searchParams.get("opportunity");
  const [activeDatasetId, setActiveDatasetId] = useState(requestedDatasetId || datasetRegistry[0].id);
  const [filters, setFilters] = useState<FilterState>(() => cloneDefaultFilters());
  const [selection, setSelection] = useState<Selection>(
    requestedOpportunityId ? { kind: "opportunity", id: requestedOpportunityId } : null
  );
  const [isMenuOpen, setIsMenuOpen] = useState(getInitialMenuState);
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia("(max-width: 820px)").matches);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 820px)");
    const update = () => {
      setIsNarrow(media.matches);
      setIsMenuOpen(!media.matches);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (requestedDatasetId && datasetRegistry.some((dataset) => dataset.id === requestedDatasetId)) {
      setActiveDatasetId(requestedDatasetId);
      setFilters(cloneDefaultFilters());
      setSelection(requestedOpportunityId ? { kind: "opportunity", id: requestedOpportunityId } : null);
      setIsMenuOpen(!window.matchMedia("(max-width: 820px)").matches);
    }
  }, [requestedDatasetId, requestedOpportunityId]);

  const activeDataset = useMemo(
    () => datasets.find((dataset) => dataset.id === activeDatasetId) ?? datasets[0],
    [activeDatasetId, datasets]
  );
  const activeConfig = useMemo(() => getDatasetConfig(activeDatasetId), [activeDatasetId]);
  const filterOptions = useMemo(
    () => activeDataset ? getFilterOptions(activeDataset) : {
      nodeTypes: [],
      countries: [],
      regions: [],
      sectors: [],
      colors: [],
      confidences: [],
      factStatuses: [],
      edgeTypes: [],
      dependencyCategories: []
    },
    [activeDataset]
  );
  const visibleGraph = useMemo(
    () => activeDataset ? filterGraph(activeDataset, filters) : { nodes: [], edges: [] },
    [activeDataset, filters]
  );
  const stats = useMemo(
    () => activeDataset ? calculateDatasetStats(activeDataset, visibleGraph) : {
      nodes: 0,
      edges: 0,
      opportunities: 0,
      sources: 0,
      knownEdges: 0,
      inferredEdges: 0,
      redBottlenecks: 0
    },
    [activeDataset, visibleGraph]
  );
  const searchResults = useMemo(
    () => activeDataset ? searchNodes(activeDataset, filters.query) : [],
    [activeDataset, filters.query]
  );
  const highlights = useMemo(
    () => activeDataset
      ? getSelectionHighlights(activeDataset, selection)
      : { nodeIds: new Set<string>(), edgeIds: new Set<string>() },
    [activeDataset, selection]
  );
  const viewportInsets = useMemo<GraphViewportInsets>(() => {
    if (isNarrow) {
      return {
        top: isMenuOpen ? 330 : 164,
        right: 44,
        bottom: selection ? 330 : 66,
        left: 44
      };
    }
    return {
      top: 18,
      right: selection ? 452 : 20,
      bottom: 126,
      left: isMenuOpen ? 372 : 20
    };
  }, [isMenuOpen, isNarrow, selection]);

  function handleDatasetChange(datasetId: string) {
    setActiveDatasetId(datasetId);
    setFilters(cloneDefaultFilters());
    setSelection(null);
    setIsMenuOpen(!window.matchMedia("(max-width: 820px)").matches);
  }

  function handleFilterChange(patch: Partial<FilterState>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function handleSelectNode(nodeId: string) {
    setSelection({ kind: "node", id: nodeId });
    setFilters((current) => ({ ...current, query: "" }));
    if (isNarrow) setIsMenuOpen(false);
  }

  if (!activeDataset) {
    return (
      <div className="boot-screen">
        <strong>Loading Markets HAWK-EYE</strong>
        <p>Loading local strategic dependency graph data...</p>
      </div>
    );
  }

  return (
    <div className={`map-page${isMenuOpen ? " menu-open" : ""}${selection ? " inspector-open" : ""}`}>
      <Layout
        controls={
          <Sidebar
            datasets={datasetRegistry}
            activeDatasetId={activeDatasetId}
            safetyBadge={Boolean(activeConfig.safetyBadge)}
            theme={theme}
            filters={filters}
            filterOptions={filterOptions}
            searchResults={searchResults}
            isOpen={isMenuOpen}
            onDatasetChange={handleDatasetChange}
            onThemeToggle={onThemeToggle}
            onToggleOpen={() => setIsMenuOpen((current) => !current)}
            onFilterChange={handleFilterChange}
            onResetFilters={() => setFilters(cloneDefaultFilters())}
            onSelectNode={handleSelectNode}
          />
        }
        graph={
          <GraphCanvas
            graph={visibleGraph}
            theme={theme}
            selection={selection}
            highlightedNodeIds={highlights.nodeIds}
            highlightedEdgeIds={highlights.edgeIds}
            viewportInsets={viewportInsets}
            onSelectNode={handleSelectNode}
            onSelectEdge={(edgeId) => setSelection({ kind: "edge", id: edgeId })}
            onBackgroundClick={() => setSelection(null)}
          />
        }
        inspector={
          <DetailPanel
            dataset={activeDataset}
            selection={selection}
            onClose={() => setSelection(null)}
            onSelectNode={handleSelectNode}
            onSelectEdge={(edgeId) => setSelection({ kind: "edge", id: edgeId })}
            onSelectOpportunity={(opportunityId) => setSelection({ kind: "opportunity", id: opportunityId })}
          />
        }
        statBar={<StatBar stats={stats} datasetLabel={activeDataset.label} />}
      />
    </div>
  );
}

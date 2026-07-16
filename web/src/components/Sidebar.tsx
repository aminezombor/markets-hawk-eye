import { Menu, Moon, SlidersHorizontal, Sun, X } from "lucide-react";
import type { DatasetConfig, FilterOptions, FilterState, GraphNode } from "../types/graph";
import { DatasetSelector } from "./DatasetSelector";
import { FilterPanel } from "./FilterPanel";
import { SafetyBadge } from "./SafetyBadge";
import { SearchBox } from "./SearchBox";

interface SidebarProps {
  datasets: DatasetConfig[];
  activeDatasetId: string;
  safetyBadge: boolean;
  theme: "light" | "dark";
  filters: FilterState;
  filterOptions: FilterOptions;
  searchResults: GraphNode[];
  isOpen: boolean;
  onDatasetChange: (datasetId: string) => void;
  onThemeToggle: () => void;
  onToggleOpen: () => void;
  onFilterChange: (patch: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onSelectNode: (nodeId: string) => void;
}

export function Sidebar({
  datasets,
  activeDatasetId,
  safetyBadge,
  theme,
  filters,
  filterOptions,
  searchResults,
  isOpen,
  onDatasetChange,
  onThemeToggle,
  onToggleOpen,
  onFilterChange,
  onResetFilters,
  onSelectNode
}: SidebarProps) {
  return (
    <aside className={`map-control-panel${isOpen ? " open" : ""}`}>
      <div className="brand-block control-header">
        <div className="brand-copy">
          <h1>Markets HAWK-EYE</h1>
          <p>Strategic Dependency Graph</p>
        </div>
        <div className="icon-button-row">
          <button type="button" className="icon-button" onClick={onThemeToggle} title="Switch light / dark mode">
            {theme === "light" ? <Moon size={17} aria-hidden /> : <Sun size={17} aria-hidden />}
          </button>
          <button type="button" className="icon-button" onClick={onToggleOpen} title={isOpen ? "Close menu" : "Open menu"}>
            {isOpen ? <X size={17} aria-hidden /> : <Menu size={17} aria-hidden />}
          </button>
        </div>
      </div>

      <DatasetSelector datasets={datasets} activeDatasetId={activeDatasetId} onChange={onDatasetChange} />

      {isOpen && (
        <div className="control-drawer">
          <div className="drawer-heading">
            <SlidersHorizontal size={15} aria-hidden />
            <span>Map controls</span>
          </div>

          {safetyBadge && <SafetyBadge />}

          <SearchBox
            query={filters.query}
            results={searchResults}
            onQueryChange={(query) => onFilterChange({ query })}
            onSelectNode={onSelectNode}
          />

          <FilterPanel filters={filters} options={filterOptions} onChange={onFilterChange} onReset={onResetFilters} />

        </div>
      )}
    </aside>
  );
}

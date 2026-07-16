import { datasetRegistry } from "./datasetRegistry";
import { normalizeGraph } from "./normalizeGraph";
import { validateGraph } from "./validateGraph";
import type { GraphDataset, RawGraphDataset } from "../types/graph";

async function fetchText(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.text();
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function loadDatasets(): Promise<GraphDataset[]> {
  const datasets = await Promise.all(
    datasetRegistry.map(async (config) => {
      const [rawGraph, readme] = await Promise.all([
        fetchJson<RawGraphDataset>(config.graphPath),
        fetchText(config.readmePath).catch(() => "")
      ]);
      const normalized = normalizeGraph(config.id, config.label, rawGraph, readme);
      const validationWarnings = validateGraph(normalized);

      return {
        ...normalized,
        validationWarnings
      };
    })
  );

  return datasets;
}

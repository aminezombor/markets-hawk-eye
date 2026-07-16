import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const sourceRoot = path.resolve(webRoot, "..", "strategic-dependency-graph");
const outputRoot = path.resolve(webRoot, "public", "data");

const datasets = [
  ["eu-ai-stack", "eu_ai_stack_graph_v0.json"],
  ["global-ai-stack", "global_ai_stack_graph_v0.json"],
  ["european-defence-stack", "european_defence_stack_graph_v0.json"],
  ["global-aerospace-stack", "global_aerospace_stack_graph_v0.json"],
  ["industrial-software-ot-stack", "industrial_software_ot_stack_graph_v0.json"]
];

async function copyIntoPublic(datasetId, graphFile) {
  const sourceDir = path.join(sourceRoot, "data", datasetId, "v0.1");
  const targetDir = path.join(outputRoot, datasetId, "v0.1");
  await mkdir(targetDir, { recursive: true });

  await Promise.all([
    copyFile(path.join(sourceDir, graphFile), path.join(targetDir, graphFile)),
    copyFile(path.join(sourceDir, "README.md"), path.join(targetDir, "README.md")),
    copyFile(path.join(sourceDir, "manifest.json"), path.join(targetDir, "manifest.json"))
  ]);
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await copyFile(
  path.join(sourceRoot, "project.manifest.json"),
  path.join(outputRoot, "project.manifest.json")
);

for (const [datasetId, graphFile] of datasets) {
  await copyIntoPublic(datasetId, graphFile);
}

console.log(`Synced ${datasets.length} datasets to ${path.relative(webRoot, outputRoot)}`);

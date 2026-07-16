import { ArrowRight, Database, Github, Network, ShieldCheck, Telescope } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import type { GraphDataset } from "../types/graph";

interface AboutPageProps {
  datasets: GraphDataset[];
}

const methodSteps = [
  ["01", "Collect", "Public-source records establish the actors, institutions, standards, layers, and market signals worth mapping."],
  ["02", "Normalize", "Every dataset is shaped into the same node, edge, opportunity, source, confidence, and fact-status model."],
  ["03", "Connect", "Known relationships stay distinct from inferred strategic hypotheses, so evidence and interpretation never collapse into one."],
  ["04", "Interrogate", "Search, filters, neighborhoods, sources, and bottleneck colors turn the graph into a tool for asking better market questions."]
];

const legendItems = [
  ["green", "Sovereign / controlled / resilient"],
  ["orange", "Dependent / exposed / replaceable with effort"],
  ["red", "Critical bottleneck / dangerous dependency"],
  ["blue", "Strategic enabler / institution / standard / infrastructure"],
  ["purple", "Opportunity / whitespace"],
  ["grey", "Unknown / low-confidence evidence"]
];

export function AboutPage({ datasets }: AboutPageProps) {
  const location = useLocation();
  const totals = useMemo(
    () => datasets.reduce(
      (sum, dataset) => ({
        nodes: sum.nodes + dataset.nodes.length,
        edges: sum.edges + dataset.renderableEdges.length,
        opportunities: sum.opportunities + dataset.opportunities.length,
        sources: sum.sources + dataset.sources.length,
        warnings: sum.warnings + dataset.validationWarnings.length
      }),
      { nodes: 0, edges: 0, opportunities: 0, sources: 0, warnings: 0 }
    ),
    [datasets]
  );

  useEffect(() => {
    if (!location.hash) return;
    const frame = window.requestAnimationFrame(() => {
      document.querySelector(location.hash)?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash]);

  return (
    <article className="about-page">
      <section className="about-intro page-band">
        <div className="about-intro-copy">
          <span className="about-kicker">Strategic dependency intelligence</span>
          <h1>Markets HAWK-EYE</h1>
          <p className="about-lede">
            A navigable map of where AI, defence, aerospace, and industrial markets become concentrated,
            exposed, strategically important, and buildable.
          </p>
          <p>
            The project turns scattered public evidence into inspectable systems. It does not claim to predict
            markets. It makes the structure behind a thesis visible enough to challenge.
          </p>
          <div className="about-actions">
            <Link to="/" className="about-primary-action">Explore the map <ArrowRight size={17} aria-hidden /></Link>
            <a href="https://github.com/aminezombor/markets-hawk-eye" target="_blank" rel="noreferrer" className="about-secondary-action">
              <Github size={17} aria-hidden /> View repository
            </a>
          </div>
        </div>
        <div className="about-hero-mark" aria-label="Markets HAWK-EYE logo" role="img" />
      </section>

      <section className="about-signal-strip" aria-label="Project totals">
        <div><strong>{datasets.length}</strong><span>Markets mapped</span></div>
        <div><strong>{totals.nodes}</strong><span>Strategic nodes</span></div>
        <div><strong>{totals.edges}</strong><span>Renderable edges</span></div>
        <div><strong>{totals.sources}</strong><span>Source records</span></div>
      </section>

      <section className="page-band about-figure-band">
        <div className="section-heading">
          <span>Product</span>
          <h2>A complicated market, held in one field of view.</h2>
          <p>Select a node to isolate its neighborhood, inspect related opportunities, trace supporting sources, and return to the whole system with one click.</p>
        </div>
        <figure className="about-map-figure">
          <img src="/markets-hawk-eye-map.png" alt="Markets HAWK-EYE strategic dependency map in dark mode" />
          <figcaption>The map keeps evidence, inference, and strategic interpretation visibly separate.</figcaption>
        </figure>
      </section>

      <section id="methodology" className="page-band about-method-band">
        <div className="section-heading">
          <span>Methodology</span>
          <h2>From public evidence to an interrogable graph.</h2>
          <p>The method is deliberately traceable. Each visual claim can be followed back to the records that shaped it.</p>
        </div>
        <div className="method-steps">
          {methodSteps.map(([number, title, copy]) => (
            <div key={number} className="method-step">
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="data" className="page-band about-data-band">
        <div className="section-heading">
          <span>Data scope</span>
          <h2>Five markets, one shared model.</h2>
          <p>Counts are read directly from the loaded datasets, so this inventory stays aligned with the map.</p>
        </div>
        <div className="dataset-inventory">
          {datasets.map((dataset) => (
            <article key={dataset.id} className="dataset-inventory-item">
              <div>
                <Database size={17} aria-hidden />
                <h3>{dataset.label}</h3>
              </div>
              <dl>
                <div><dt>Nodes</dt><dd>{dataset.nodes.length}</dd></div>
                <div><dt>Edges</dt><dd>{dataset.renderableEdges.length}</dd></div>
                <div><dt>Opportunities</dt><dd>{dataset.opportunities.length}</dd></div>
                <div><dt>Sources</dt><dd>{dataset.sources.length}</dd></div>
              </dl>
              <span>{dataset.validationWarnings.length ? `${dataset.validationWarnings.length} validation notes` : "No validation warnings"}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="page-band about-reading-band">
        <div className="section-heading">
          <span>Reading the map</span>
          <h2>Color describes strategic posture, not aesthetic grouping.</h2>
        </div>
        <div className="about-reading-grid">
          <div className="about-legend-list">
            {legendItems.map(([color, label]) => (
              <div key={color}><span className={`swatch swatch-${color}`} /><p>{label}</p></div>
            ))}
            <div><span className="edge-sample" /><p>Known relationship</p></div>
            <div><span className="edge-sample dashed" /><p>Inferred strategic relationship</p></div>
          </div>
          <div className="about-principles">
            <article><Network size={19} aria-hidden /><h3>Structure first</h3><p>Degree, neighborhood, and dependency paths reveal leverage that isolated company lists miss.</p></article>
            <article><ShieldCheck size={19} aria-hidden /><h3>Evidence stays visible</h3><p>Known and inferred edges remain distinct. Missing endpoints are excluded rather than silently repaired.</p></article>
            <article><Telescope size={19} aria-hidden /><h3>Directional, not absolute</h3><p>The map supports investigation and thesis formation. It is not a market forecast or investment recommendation.</p></article>
          </div>
        </div>
      </section>

      <section className="page-band about-integrity-band">
        <div>
          <span className="about-kicker">Integrity and limits</span>
          <h2>What this project can prove.</h2>
        </div>
        <div className="integrity-columns">
          <div><h3>It can show</h3><p>Documented actors, declared relationships, concentrated layers, exposed dependencies, recurring bottlenecks, and where further investigation is justified.</p></div>
          <div><h3>It cannot show</h3><p>Private contracts, undisclosed supplier terms, live procurement state, guaranteed market size, or whether an inferred strategic relationship is commercially active.</p></div>
          <div><h3>Unconnected evidence</h3><p>Records with no valid graph edge remain visible in a dedicated rail. They are kept close for context without manufacturing a relationship that the data cannot support.</p></div>
        </div>
      </section>

      <footer className="about-footer">
        <div className="site-brand-mark" aria-hidden />
        <p>Designed and built by <strong>Amine Zombor</strong> as a portfolio study in strategic systems, evidence, and market structure.</p>
        <Link to="/">Return to the map <ArrowRight size={16} aria-hidden /></Link>
      </footer>
    </article>
  );
}

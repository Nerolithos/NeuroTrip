import { useMemo } from 'react'
import rawMergedGraphHtml from '../../../../knowledge_graph/merged_graph.html?raw'

type MergedKnowledgeGraphProps = {
  isZh: boolean
}

const buildMergedGraphSrcDoc = (isZh: boolean) => {
  const styleOverride = `
<style id="map-knowledge-override">
  :root {
    --bg:#060b11;
    --panel:#0a1119;
    --panel-2:#0b141e;
    --ink:#dce9f0;
    --muted:#8aa0ad;
    --line:#1f3242;
    --line-strong:#315066;
    --accent:#73c6ea;
    --cross:#f0b638;
    --shadow:0 1px 2px rgba(0,0,0,.35),0 12px 30px rgba(0,0,0,.4);
  }
  html, body {
    height: 100%;
    overflow: hidden;
    background: var(--bg);
    color: var(--ink);
    font-family: "IBM Plex Mono", Menlo, Consolas, monospace;
  }
  header, aside, footer { background: var(--panel); }
  .title h1 { font-size: 15px; letter-spacing: .03em; text-transform: uppercase; }
  .title p { font-size: 11px; }
  .chip, .btn, .edge-card { border-radius: 6px; }
  .region-name { font-size: 15px; }
  .meta { font-size: 11px; }
  .tip { border: 1px solid var(--line-strong); }
</style>`

  const patchScript = `
<script>
  (() => {
    document.documentElement.setAttribute('data-theme', 'dark');

    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
      themeBtn.style.display = 'none';
    }

    if (!${isZh ? 'true' : 'false'}) {
      const title = document.querySelector('.title h1');
      if (title) title.textContent = 'Five-Domain Connectome';

      const subtitle = document.querySelector('.title p');
      if (subtitle) {
        subtitle.textContent = 'Merged cross-domain graph · edge color = domain · gold hubs = cross-domain nodes';
      }
    }
  })();
</script>`

  return `${rawMergedGraphHtml}\n${styleOverride}\n${patchScript}`
}

export const MergedKnowledgeGraph = ({ isZh }: MergedKnowledgeGraphProps) => {
  const srcDoc = useMemo(() => buildMergedGraphSrcDoc(isZh), [isZh])

  return (
    <iframe
      className="map-knowledge-frame"
      title={isZh ? '脑网络总图谱' : 'Merged neural knowledge graph'}
      srcDoc={srcDoc}
      loading="lazy"
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
    />
  )
}

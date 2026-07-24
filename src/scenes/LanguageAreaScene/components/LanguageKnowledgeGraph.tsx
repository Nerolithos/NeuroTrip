import { useMemo } from 'react'
import rawLanguageGraphHtml from '../../../../knowledge_graph/language_graph.html?raw'

type LanguageKnowledgeGraphProps = {
  isZh: boolean
}

const buildLanguageGraphSrcDoc = (isZh: boolean) => {
  const styleOverride = `
<style id="lang-knowledge-override">
  :root {
    --bg:#060b11;
    --panel:#0a1119;
    --panel-2:#0b141e;
    --ink:#dce9f0;
    --muted:#8aa0ad;
    --line:#1f3242;
    --line-strong:#315066;
    --accent:#73c6ea;
    --node:#5f7384;
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
  .chip, .btn, .kv span, .edge-card { border-radius: 6px; }
  .region-name { font-size: 15px; }
  .edge-card .flow { font-size: 12px; }
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
      if (title) title.textContent = 'Language Connectome';

      const subtitle = document.querySelector('.title p');
      if (subtitle) {
        subtitle.textContent = 'Circle = region · Diamond = function/cell · Edge = extracted connection · Color = evidence · Arrow = directed';
      }

      const panelEmpty = document.querySelector('.panel-empty');
      if (panelEmpty) {
        panelEmpty.innerHTML = 'Click any node<br>to inspect evidence and links';
      }
    }
  })();
</script>`

  return `${rawLanguageGraphHtml}\n${styleOverride}\n${patchScript}`
}

export const LanguageKnowledgeGraph = ({ isZh }: LanguageKnowledgeGraphProps) => {
  const srcDoc = useMemo(() => buildLanguageGraphSrcDoc(isZh), [isZh])

  return (
    <div className="vsc-knowledge-wrap">
      <iframe
        className="vsc-knowledge-frame"
        title={isZh ? '语言功能知识图谱' : 'Language function graph'}
        srcDoc={srcDoc}
        loading="eager"
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="no-referrer"
      />
    </div>
  )
}

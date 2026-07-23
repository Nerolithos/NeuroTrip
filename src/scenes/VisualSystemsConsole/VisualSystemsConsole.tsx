import { useEffect, useState } from 'react'
import eyeChartUrl from '../../../assets/House and Balloon Eye Test Explained | TikTok.jpg'
import { SceneFrame } from '../../components/SceneFrame'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import { useVisualSystemsStore } from '../../stores/visualSystemsStore'
import { getAstigmatismTestPatternDataUrl } from '../../visual/optics/astigmatismTestPattern'
import { ColorDeficiencyLab } from './components/ColorDeficiencyLab'
import { CorticalAtlas } from './components/CorticalAtlas'
import { LiveVisualFeed } from './components/LiveVisualFeed'
import { RefractionLab } from './components/RefractionLab'
import { SourceDrawer } from './components/SourceDrawer'
import { TerminalWindow } from './components/TerminalWindow'
import { VisualFieldRouting } from './components/VisualFieldRouting'
import './visualSystemsConsole.css'

export const VisualSystemsConsole = () => {
  const [showSources, setShowSources] = useState(false)
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'

  const visualInput = useVisualSystemsStore((state) => state.visualInput)
  const updateVisualInput = useVisualSystemsStore((state) => state.updateVisualInput)
  const setProbePoint = useVisualSystemsStore((state) => state.setProbePoint)
  const setFeedMode = useVisualSystemsStore((state) => state.setFeedMode)
  const setFeedSourceMode = useVisualSystemsStore((state) => state.setFeedSourceMode)
  const resetVisualInput = useVisualSystemsStore((state) => state.resetVisualInput)

  useEffect(() => {
    const nextSourceImage =
      visualInput.feedSourceMode === 'astigmatism-test-pattern'
        ? getAstigmatismTestPatternDataUrl(1024)
        : eyeChartUrl

    if (!nextSourceImage || nextSourceImage === visualInput.sourceImage) {
      return
    }

    updateVisualInput({ sourceImage: nextSourceImage })
  }, [updateVisualInput, visualInput.feedSourceMode, visualInput.sourceImage])

  return (
    <SceneFrame
      title={isZh ? '视觉系统控制台' : 'VISUAL SYSTEMS CONSOLE'}
      subtitle={isZh ? 'FACADE_DIAGNOSTICS / SESSION 01' : 'FACADE_DIAGNOSTICS / SESSION 01'}
      regionId="visual-cortex"
      previousPath="/"
      nextPath="/scene/amygdala"
    >
      <section className="vsc-shell" aria-label="Visual systems diagnostic terminal">
        <header className="vsc-headerline">
          <p>{isZh ? '光学信号已采集' : 'OPTICAL SIGNAL ACQUIRED'}</p>
          <p>{isZh ? '视网膜编码在线' : 'RETINAL ENCODING ONLINE'}</p>
          <p>{isZh ? '皮层重建待完成' : 'CORTICAL RECONSTRUCTION PENDING'}</p>
        </header>

        <div className="vsc-grid">
          <TerminalWindow
            id="A-01"
            title={isZh ? '实时视觉输入' : 'LIVE VISUAL FEED'}
            sourceTag="MACHADO_2009"
            sourceLabel={isZh ? '来源' : 'SOURCE'}
            status="active"
            className="vsc-window-live"
            toolbar={
              <div className="vsc-live-toolbar-stack">
                <div className="vsc-feed-mode-toggle" role="group" aria-label={isZh ? '显示模式' : 'Display mode'}>
                  <button
                    type="button"
                    className={visualInput.feedMode === 'split' ? 'active' : ''}
                    onClick={() => setFeedMode('split')}
                  >
                    {isZh ? '分屏' : 'Split'}
                  </button>
                  <button
                    type="button"
                    className={visualInput.feedMode === 'processed' ? 'active' : ''}
                    onClick={() => setFeedMode('processed')}
                  >
                    {isZh ? '处理' : 'Processed'}
                  </button>
                  <button
                    type="button"
                    className={visualInput.feedMode === 'difference' ? 'active' : ''}
                    onClick={() => setFeedMode('difference')}
                  >
                    {isZh ? '差异' : 'Difference'}
                  </button>
                </div>
                <div className="vsc-feed-source-toggle" role="group" aria-label={isZh ? '输入源' : 'Feed source'}>
                  <button
                    type="button"
                    className={visualInput.feedSourceMode === 'house-photo' ? 'active' : ''}
                    onClick={() => setFeedSourceMode('house-photo')}
                  >
                    {isZh ? '房子图' : 'House'}
                  </button>
                  <button
                    type="button"
                    className={visualInput.feedSourceMode === 'astigmatism-test-pattern' ? 'active' : ''}
                    onClick={() => setFeedSourceMode('astigmatism-test-pattern')}
                  >
                    {isZh ? '散光测试图' : 'Astig Test'}
                  </button>
                </div>
              </div>
            }
          >
            <LiveVisualFeed
              language={language}
              visualInput={visualInput}
              onProbeMove={(x, y) => {
                setProbePoint({ x, y })
              }}
              onProbeClick={(x, y) => {
                if (visualInput.probeLocked) {
                  updateVisualInput({ probeLocked: false })
                  return
                }

                updateVisualInput({
                  selectedVisualFieldPoint: { x, y },
                  probeLocked: true,
                })
              }}
            />
          </TerminalWindow>

          <TerminalWindow
            id="B-02"
            title={isZh ? '光路与屈光实验' : 'OPTICAL PATH / REFRACTION LAB'}
            sourceTag="OPTICS_APPROX"
            sourceLabel={isZh ? '来源' : 'SOURCE'}
            status="linked"
            className="vsc-window-refraction"
          >
            <RefractionLab language={language} visualInput={visualInput} onPatch={updateVisualInput} />
          </TerminalWindow>

          <TerminalWindow
            id="C-03"
            title={isZh ? '锥体响应与色觉缺陷' : 'CONE RESPONSE / COLOR DEFICIENCY'}
            sourceTag="MACHADO_2009"
            sourceLabel={isZh ? '来源' : 'SOURCE'}
            status="linked"
            className="vsc-window-color"
          >
            <ColorDeficiencyLab language={language} visualInput={visualInput} onPatch={updateVisualInput} />
          </TerminalWindow>

          <TerminalWindow
            id="D-04"
            title={isZh ? '视野路由映射' : 'VISUAL FIELD ROUTING'}
            sourceTag="ROUTING_MODEL"
            sourceLabel={isZh ? '来源' : 'SOURCE'}
            status="linked"
            className="vsc-window-routing"
          >
            <VisualFieldRouting language={language} visualInput={visualInput} />
          </TerminalWindow>

          <TerminalWindow
            id="E-05"
            title={isZh ? '皮层图谱与视觉区' : 'CORTICAL ATLAS / VISUAL TERRITORY'}
            sourceTag="HCP_MMP"
            sourceLabel={isZh ? '来源' : 'SOURCE'}
            status="linked"
            className="vsc-window-atlas"
            toolbar={
              <button type="button" onClick={() => setShowSources((current) => !current)}>
                {isZh ? '来源' : 'Sources'}
              </button>
            }
          >
            <CorticalAtlas language={language} visualInput={visualInput} onPatch={updateVisualInput} />
          </TerminalWindow>
        </div>

        <footer className="vsc-footer">
          <p>
            {isZh
              ? '这是教学用途的可视化模拟，不是临床视力检查、处方计算器或医疗诊断工具。'
              : 'This is an educational simulation. It is not a clinical eye test, prescription calculator, or diagnostic tool.'}
          </p>
          <button type="button" onClick={resetVisualInput}>
            {isZh ? '全部重置' : 'RESET ALL'}
          </button>
        </footer>

        <SourceDrawer language={language} open={showSources} />
      </section>
    </SceneFrame>
  )
}

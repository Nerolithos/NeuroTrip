import { corticalAreas } from '../../../data/corticalAreas'
import type { UiLanguage } from '../../../stores/uiLanguageStore'
import type { VisualInputState } from '../../../types/visualSystem'

type CorticalAtlasProps = {
  language: UiLanguage
  visualInput: VisualInputState
  onPatch: (patch: Partial<VisualInputState>) => void
}

export const CorticalAtlas = ({ language, visualInput, onPatch }: CorticalAtlasProps) => {
  const isZh = language === 'zh'

  return (
    <div className="vsc-atlas-panel">
      <div className="vsc-atlas-canvas" role="img" aria-label={isZh ? '皮层区域示意图' : 'Schematic cortical territory map'}>
        <svg viewBox="0 0 360 220">
          <path
            d="M34 130 C 58 60, 126 22, 200 26 C 284 30, 334 86, 324 146 C 314 198, 242 214, 170 204 C 92 193, 40 170, 34 130 Z"
            fill="rgba(150, 206, 221, 0.17)"
            stroke="rgba(197, 230, 238, 0.58)"
            strokeWidth="1.4"
          />
          {corticalAreas.map((area) => {
            const active = visualInput.selectedCorticalArea === area.id
            return (
              <g key={area.id}>
                <circle
                  cx={area.anchor.x * 3.3}
                  cy={area.anchor.y * 2}
                  r={active ? 8 : 5.6}
                  fill={active ? 'rgba(223, 255, 143, 0.94)' : 'rgba(182, 225, 238, 0.84)'}
                  onClick={() => onPatch({ selectedCorticalArea: area.id })}
                />
                <text
                  x={area.anchor.x * 3.3 + 9}
                  y={area.anchor.y * 2 + 3}
                  fill="rgba(231,244,252,0.94)"
                  fontSize="9"
                >
                  {area.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

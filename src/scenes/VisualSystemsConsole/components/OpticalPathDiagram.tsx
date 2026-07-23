import type { UiLanguage } from '../../../stores/uiLanguageStore'
import type { VisualInputState } from '../../../types/visualSystem'
import { InfoHint } from './InfoHint'

type OpticalPathDiagramProps = {
  language: UiLanguage
  visualInput: VisualInputState
}

export const OpticalPathDiagram = ({ language, visualInput }: OpticalPathDiagramProps) => {
  const isZh = language === 'zh'

  const inputPlaneHint: [string, string] = isZh
    ? ['入射面表示进入系统的光线方向。', '这部分用于观察不同方向细节的变化。']
    : ['Input plane represents incoming rays.', 'It helps show how direction-dependent detail is affected.']
  const refractivePlaneHint: [string, string] = isZh
    ? ['屈光面表示系统聚焦作用位置。', '球镜和柱镜会共同改变这里的会聚形态。']
    : ['Refractive plane marks where focusing happens.', 'Sphere and cylinder jointly change convergence shape there.']
  const imagePlaneHint: [string, string] = isZh
    ? ['成像面表示最终形成细节的位置。', '若两个主方向无法同时合焦，就会出现散光模糊。']
    : ['Image plane is where final detail is sampled.', 'Astigmatic blur appears when two meridians cannot focus together.']

  return (
    <div className="vsc-live-optical-diagram" aria-hidden="true">
      <div className="vsc-live-optical-graphic">
        <svg viewBox="0 0 360 120" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="360" height="120" fill="rgba(5,9,14,0.84)" />
          <line x1="26" y1="64" x2="334" y2="64" stroke="rgba(120,182,201,0.55)" strokeWidth="1" />

          <line x1="116" y1="16" x2="116" y2="112" stroke="rgba(255,208,127,0.8)" strokeWidth="2" />
          <line x1="224" y1="16" x2="224" y2="112" stroke="rgba(145,219,238,0.8)" strokeWidth="2" />
          <line x1="334" y1="12" x2="334" y2="112" stroke="rgba(236,244,252,0.94)" strokeWidth="2" />

          <line
            x1="18"
            y1="30"
            x2={224 + visualInput.sphereD * 8}
            y2={64 - visualInput.cylinderD * 6}
            stroke="rgba(248,255,163,0.88)"
            strokeWidth="1.8"
          />
          <line
            x1="18"
            y1="98"
            x2={224 + visualInput.sphereD * 8}
            y2={64 + visualInput.cylinderD * 6}
            stroke="rgba(248,255,163,0.88)"
            strokeWidth="1.8"
          />
        </svg>
      </div>

      <div className="vsc-optical-plane-hints">
        <div className="vsc-optical-plane-hint is-left" style={{ left: '32.2222%' }}>
          <InfoHint label={isZh ? '入射面' : 'Input Plane'} lines={inputPlaneHint} />
        </div>
        <div className="vsc-optical-plane-hint is-middle" style={{ left: '62.2222%' }}>
          <InfoHint label={isZh ? '屈光面' : 'Refractive Plane'} lines={refractivePlaneHint} />
        </div>
        <div className="vsc-optical-plane-hint is-right" style={{ left: '92.7778%' }}>
          <InfoHint label={isZh ? '成像面' : 'Image Plane'} lines={imagePlaneHint} />
        </div>
      </div>
    </div>
  )
}

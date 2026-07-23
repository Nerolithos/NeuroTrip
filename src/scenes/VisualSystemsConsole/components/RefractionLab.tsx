import { useMemo } from 'react'
import type { UiLanguage } from '../../../stores/uiLanguageStore'
import type { VisualInputState } from '../../../types/visualSystem'
import { computeOpticalApproximation } from '../../../visual/optics/refractionModel'

type RefractionLabProps = {
  language: UiLanguage
  visualInput: VisualInputState
  onPatch: (patch: Partial<VisualInputState>) => void
}

const presets: Array<{ label: string; labelZh: string; patch: Partial<VisualInputState> }> = [
  { label: 'Emmetropia', labelZh: '正视眼', patch: { sphereD: 0, cylinderD: 0, axisDeg: 90 } },
  {
    label: 'Myopia -3.00 D',
    labelZh: '近视 -3.00 D',
    patch: { sphereD: -3, cylinderD: 0, axisDeg: 90 },
  },
  {
    label: 'High myopia -8.00 D',
    labelZh: '高度近视 -8.00 D',
    patch: { sphereD: -8, cylinderD: 0, axisDeg: 90 },
  },
  {
    label: 'Hyperopia +3.00 D',
    labelZh: '远视 +3.00 D',
    patch: { sphereD: 3, cylinderD: 0, axisDeg: 90 },
  },
  {
    label: 'Astigmatism -2.00 x 90',
    labelZh: '散光 -2.00 x 90',
    patch: { sphereD: 0, cylinderD: -2, axisDeg: 90 },
  },
  {
    label: 'Astigmatism -2.00 x 180',
    labelZh: '散光 -2.00 x 180',
    patch: { sphereD: 0, cylinderD: -2, axisDeg: 180 },
  },
]

export const RefractionLab = ({ language, visualInput, onPatch }: RefractionLabProps) => {
  const isZh = language === 'zh'

  const opticalApproximation = useMemo(
    () =>
      computeOpticalApproximation({
        sphereD: visualInput.sphereD,
        cylinderD: visualInput.cylinderD,
        axisDeg: visualInput.axisDeg,
        objectDistanceM: visualInput.objectDistanceM,
        pupilDiameterMm: visualInput.pupilDiameterMm,
      }),
    [
      visualInput.axisDeg,
      visualInput.cylinderD,
      visualInput.objectDistanceM,
      visualInput.pupilDiameterMm,
      visualInput.sphereD,
    ],
  )

  return (
    <div className="vsc-refraction-lab">
      <div className="vsc-slider-grid">
        <label>
          <span>{isZh ? '球镜 (D)' : 'Sphere (D)'}: {visualInput.sphereD.toFixed(2)}</span>
          <input
            type="range"
            min={-10}
            max={8}
            step={0.25}
            value={visualInput.sphereD}
            onChange={(event) => onPatch({ sphereD: Number(event.target.value) })}
          />
        </label>
        <label>
          <span>{isZh ? '柱镜 (D)' : 'Cylinder (D)'}: {visualInput.cylinderD.toFixed(2)}</span>
          <input
            type="range"
            min={-6}
            max={0}
            step={0.25}
            value={visualInput.cylinderD}
            onChange={(event) => onPatch({ cylinderD: Number(event.target.value) })}
          />
        </label>
        <label>
          <span>{isZh ? '轴位 (deg)' : 'Axis (deg)'}: {Math.round(visualInput.axisDeg)}</span>
          <input
            type="range"
            min={0}
            max={180}
            step={1}
            value={visualInput.axisDeg}
            onChange={(event) => onPatch({ axisDeg: Number(event.target.value) })}
          />
        </label>
        <label>
          <span>
            {isZh ? '目标距离 (m)' : 'Object Distance (m)'}: {visualInput.objectDistanceM.toFixed(2)}
          </span>
          <input
            type="range"
            min={0.25}
            max={20}
            step={0.05}
            value={visualInput.objectDistanceM}
            onChange={(event) => onPatch({ objectDistanceM: Number(event.target.value) })}
          />
        </label>
        <label>
          <span>{isZh ? '瞳孔 (mm)' : 'Pupil (mm)'}: {visualInput.pupilDiameterMm.toFixed(1)}</span>
          <input
            type="range"
            min={2}
            max={8}
            step={0.1}
            value={visualInput.pupilDiameterMm}
            onChange={(event) => onPatch({ pupilDiameterMm: Number(event.target.value) })}
          />
        </label>
      </div>

      <div className="vsc-presets" aria-label={isZh ? '屈光预设' : 'Refraction presets'}>
        {presets.map((preset) => (
          <button key={preset.label} type="button" onClick={() => onPatch(preset.patch)}>
            {isZh ? preset.labelZh : preset.label}
          </button>
        ))}
      </div>

      <div className="vsc-optics-metrics">
        <p>
          <span>{isZh ? '离焦强度' : 'Defocus strength'}</span>
          <strong>{opticalApproximation.defocusStrength.toFixed(2)}</strong>
        </p>
        <p>
          <span>{isZh ? '散光方向性' : 'Astigmatic anisotropy'}</span>
          <strong>{opticalApproximation.anisotropyStrength.toFixed(2)}</strong>
        </p>
        <p>
          <span>{isZh ? '屈光类型' : 'Refractive regime'}</span>
          <strong>
            {opticalApproximation.refractiveRegime === 'myopia'
              ? isZh
                ? '近视'
                : 'Myopia'
              : opticalApproximation.refractiveRegime === 'hyperopia'
                ? isZh
                  ? '远视'
                  : 'Hyperopia'
                : isZh
                  ? '正视眼'
                  : 'Emmetropia'}
          </strong>
        </p>
        <p>
          <span>{isZh ? '焦点失配 (D)' : 'Focus mismatch (D)'}</span>
          <strong>{opticalApproximation.focusMismatchD.toFixed(2)}</strong>
        </p>
      </div>

      <div className="vsc-ray-diagram" aria-hidden="true">
        <svg viewBox="0 0 360 128" preserveAspectRatio="none">
          <rect x="0" y="0" width="360" height="128" fill="rgba(5,9,14,0.84)" />
          <line x1="26" y1="64" x2="334" y2="64" stroke="rgba(120,182,201,0.55)" strokeWidth="1" />
          <line x1="116" y1="20" x2="116" y2="108" stroke="rgba(255,208,127,0.8)" strokeWidth="2" />
          <line x1="224" y1="20" x2="224" y2="108" stroke="rgba(145,219,238,0.8)" strokeWidth="2" />
          <line x1="334" y1="16" x2="334" y2="112" stroke="rgba(236,244,252,0.94)" strokeWidth="2" />
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

      <p className="vsc-model-note">
        {isZh
          ? '当前光线图为示意图，用于说明参数变化趋势，不代表个体眼球光学系统的临床级成像。'
          : 'Ray paths are schematic and intended for educational trend inspection, not patient-specific ocular image formation.'}
      </p>
    </div>
  )
}

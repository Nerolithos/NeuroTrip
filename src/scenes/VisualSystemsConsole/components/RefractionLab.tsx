import { useMemo } from 'react'
import type { UiLanguage } from '../../../stores/uiLanguageStore'
import type { VisualInputState } from '../../../types/visualSystem'
import { computeOpticalApproximation } from '../../../visual/optics/refractionModel'
import { InfoHint } from './InfoHint'

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

  const sphereHint: [string, string] = isZh
    ? ['球镜控制整体前后对焦状态。', '绝对值越大，整体模糊通常越明显。']
    : ['Sphere controls overall near-far focus mismatch.', 'Larger magnitude generally increases global blur.']
  const cylinderHint: [string, string] = isZh
    ? ['柱镜控制两个方向的清晰度差异。', '绝对值越大，方向性模糊越明显。']
    : ['Cylinder controls directional blur difference.', 'Larger magnitude increases anisotropic blur.']
  const axisHint: [string, string] = isZh
    ? ['轴位只决定柱镜作用方向。', '当柱镜为 0 时，轴位变化不会改变图像。']
    : ['Axis only rotates cylinder direction.', 'When cylinder is 0, changing axis should not change the image.']
  const distanceHint: [string, string] = isZh
    ? ['目标距离改变当前对焦需求。', '越近通常越吃力，失焦可能增大。']
    : ['Object distance changes focusing demand.', 'Nearer targets usually increase mismatch pressure.']
  const pupilHint: [string, string] = isZh
    ? ['瞳孔影响模糊感受强度。', '瞳孔更大时，失焦更容易被看见。']
    : ['Pupil size modulates blur sensitivity.', 'Larger pupils make defocus more visible.']

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
          <span>
            <InfoHint label={isZh ? '球镜' : 'Sphere'} lines={sphereHint} /> (D):{' '}
            {visualInput.sphereD.toFixed(2)}
          </span>
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
          <span>
            <InfoHint label={isZh ? '柱镜' : 'Cylinder'} lines={cylinderHint} /> (D):{' '}
            {visualInput.cylinderD.toFixed(2)}
          </span>
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
          <span>
            <InfoHint label={isZh ? '轴位' : 'Axis'} lines={axisHint} /> (deg):{' '}
            {Math.round(visualInput.axisDeg)}
          </span>
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
            <InfoHint label={isZh ? '目标距离' : 'Object Distance'} lines={distanceHint} /> (m):{' '}
            {visualInput.objectDistanceM.toFixed(2)}
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
          <span>
            <InfoHint label={isZh ? '瞳孔' : 'Pupil'} lines={pupilHint} /> (mm):{' '}
            {visualInput.pupilDiameterMm.toFixed(1)}
          </span>
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

    </div>
  )
}

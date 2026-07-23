import { useMemo } from 'react'
import type { UiLanguage } from '../../../stores/uiLanguageStore'
import type { ColorDeficiencyType, VisualInputState } from '../../../types/visualSystem'
import { getColorDeficiencyProfile } from '../../../visual/color/machadoCvd'
import { deficiencyLabels } from '../../../visual/color/colorDeficiencyTypes'

type ColorDeficiencyLabProps = {
  language: UiLanguage
  visualInput: VisualInputState
  onPatch: (patch: Partial<VisualInputState>) => void
}

const deficiencyList: ColorDeficiencyType[] = [
  'normal',
  'protanomaly',
  'protanopia',
  'deuteranomaly',
  'deuteranopia',
  'tritanomaly',
  'tritanopia',
]

const deficiencyLabelsZh: Record<ColorDeficiencyType, string> = {
  normal: '正常三色视觉',
  protanomaly: '红弱',
  protanopia: '红盲',
  deuteranomaly: '绿弱',
  deuteranopia: '绿盲',
  tritanomaly: '蓝弱',
  tritanopia: '蓝盲',
}

export const ColorDeficiencyLab = ({ language, visualInput, onPatch }: ColorDeficiencyLabProps) => {
  const isZh = language === 'zh'

  const profile = useMemo(
    () =>
      getColorDeficiencyProfile(
        visualInput.colorDeficiencyType,
        visualInput.colorDeficiencySeverity,
      ),
    [visualInput.colorDeficiencySeverity, visualInput.colorDeficiencyType],
  )

  const response = useMemo(() => {
    const severity = profile.effectiveSeverity

    const lWeight =
      visualInput.colorDeficiencyType === 'protanomaly' ||
      visualInput.colorDeficiencyType === 'protanopia'
        ? 0.42
        : 0.18
    const mWeight =
      visualInput.colorDeficiencyType === 'deuteranomaly' ||
      visualInput.colorDeficiencyType === 'deuteranopia'
        ? 0.44
        : 0.24
    const sWeight =
      visualInput.colorDeficiencyType === 'tritanomaly' ||
      visualInput.colorDeficiencyType === 'tritanopia'
        ? 0.56
        : 0.31

    return {
      l: Math.max(0, 1 - severity * lWeight),
      m: Math.max(0, 1 - severity * mWeight),
      s: Math.max(0, 1 - severity * sWeight),
    }
  }, [
    profile.effectiveSeverity,
    visualInput.colorDeficiencyType,
  ])

  const regimeText =
    profile.regime === 'normal'
      ? isZh
        ? '当前分级: 正常三色视觉'
        : 'Current regime: normal trichromacy'
      : profile.regime === 'anomaly'
        ? isZh
          ? '当前分级: 色弱 (anomaly)'
          : 'Current regime: anomalous trichromacy'
        : isZh
          ? '当前分级: 色盲 (opia/dichromat endpoint)'
          : 'Current regime: opia / dichromatic endpoint'

  const thresholdText = isZh
    ? `临界分层: anomaly 上限≈${profile.anomalyMaxSeverity.toFixed(2)}，opia 起点≈${profile.opiaOnsetSeverity.toFixed(2)}`
    : `Threshold split: anomaly ceiling≈${profile.anomalyMaxSeverity.toFixed(2)}, opia onset≈${profile.opiaOnsetSeverity.toFixed(2)}`

  const effectiveText = isZh
    ? `生效强度(映射后): ${profile.effectiveSeverity.toFixed(2)}`
    : `Effective severity (mapped): ${profile.effectiveSeverity.toFixed(2)}`

  return (
    <div className="vsc-color-lab">
      <label>
        <span>{isZh ? '缺陷类型' : 'Deficiency Family'}</span>
        <select
          value={visualInput.colorDeficiencyType}
          onChange={(event) => onPatch({ colorDeficiencyType: event.target.value as ColorDeficiencyType })}
        >
          {deficiencyList.map((id) => (
            <option key={id} value={id}>
              {isZh ? deficiencyLabelsZh[id] : deficiencyLabels[id]}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>{isZh ? '严重度' : 'Severity'}: {visualInput.colorDeficiencySeverity.toFixed(2)}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={visualInput.colorDeficiencySeverity}
          onChange={(event) => onPatch({ colorDeficiencySeverity: Number(event.target.value) })}
        />
      </label>

      <p className="vsc-cvd-status">{regimeText}</p>
      <p className="vsc-cvd-status">{effectiveText}</p>
      <p className="vsc-cvd-threshold">{thresholdText}</p>

      <div className="vsc-lms-grid" aria-label={isZh ? '归一化 LMS 模型响应' : 'Normalized LMS model response'}>
        <div>
          <span>L</span>
          <strong>{response.l.toFixed(2)}</strong>
        </div>
        <div>
          <span>M</span>
          <strong>{response.m.toFixed(2)}</strong>
        </div>
        <div>
          <span>S</span>
          <strong>{response.s.toFixed(2)}</strong>
        </div>
      </div>

      <p className="vsc-model-note">
        {isZh
          ? '色弱与色盲采用分层映射：前者限制在 anomaly 区间，后者从 dichromat 阈值起步。'
          : 'Anomaly and opia are mapped in separated bands: anomaly is capped below the dichromat threshold, while opia starts from it.'}
      </p>
    </div>
  )
}

import { useMemo } from 'react'
import type { UiLanguage } from '../../../stores/uiLanguageStore'
import type { ColorDeficiencyType, VisualInputState } from '../../../types/visualSystem'
import { getColorDeficiencyProfile } from '../../../visual/color/machadoCvd'

type ColorDeficiencyLabProps = {
  language: UiLanguage
  visualInput: VisualInputState
  onPatch: (patch: Partial<VisualInputState>) => void
}

type DeficiencyFamily = 'protan' | 'deuteran' | 'tritan'

const familyOptions = [
  {
    id: 'protan' as const,
    ariaLabelZh: '红色缺陷族',
    ariaLabelEn: 'Red deficiency family',
    swatch: '#f05a5a',
    anomaly: 'protanomaly' as const,
    opia: 'protanopia' as const,
  },
  {
    id: 'deuteran' as const,
    ariaLabelZh: '绿色缺陷族',
    ariaLabelEn: 'Green deficiency family',
    swatch: '#4fd17a',
    anomaly: 'deuteranomaly' as const,
    opia: 'deuteranopia' as const,
  },
  {
    id: 'tritan' as const,
    ariaLabelZh: '蓝色缺陷族',
    ariaLabelEn: 'Blue deficiency family',
    swatch: '#4f97ff',
    anomaly: 'tritanomaly' as const,
    opia: 'tritanopia' as const,
  },
]

const familyFromType = (type: ColorDeficiencyType): DeficiencyFamily => {
  if (type === 'protanomaly' || type === 'protanopia') {
    return 'protan'
  }
  if (type === 'tritanomaly' || type === 'tritanopia') {
    return 'tritan'
  }
  return 'deuteran'
}

const typeFromFamilyAndSeverity = (
  family: DeficiencyFamily,
  severity: number,
  opiaOnset: number,
): ColorDeficiencyType => {
  const familyOption = familyOptions.find((option) => option.id === family)
  if (!familyOption) {
    return severity >= opiaOnset ? 'deuteranopia' : 'deuteranomaly'
  }

  return severity >= opiaOnset ? familyOption.opia : familyOption.anomaly
}

export const ColorDeficiencyLab = ({ language, visualInput, onPatch }: ColorDeficiencyLabProps) => {
  const isZh = language === 'zh'
  const activeFamily = familyFromType(visualInput.colorDeficiencyType)

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

    const lWeight = activeFamily === 'protan' ? 0.42 : 0.18
    const mWeight = activeFamily === 'deuteran' ? 0.44 : 0.24
    const sWeight = activeFamily === 'tritan' ? 0.56 : 0.31

    return {
      l: Math.max(0, 1 - severity * lWeight),
      m: Math.max(0, 1 - severity * mWeight),
      s: Math.max(0, 1 - severity * sWeight),
    }
  }, [
    activeFamily,
    profile.effectiveSeverity,
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

  const effectiveText = isZh
    ? `生效强度(映射后): ${profile.effectiveSeverity.toFixed(2)}`
    : `Effective severity (mapped): ${profile.effectiveSeverity.toFixed(2)}`

  return (
    <div className="vsc-color-lab">
      <div className="vsc-cvd-family-grid" role="group" aria-label={isZh ? '缺陷类型' : 'Deficiency family'}>
        {familyOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`vsc-cvd-family-btn ${activeFamily === option.id ? 'active' : ''}`}
            aria-label={isZh ? option.ariaLabelZh : option.ariaLabelEn}
            onClick={() =>
              onPatch({
                colorDeficiencyType: typeFromFamilyAndSeverity(
                  option.id,
                  visualInput.colorDeficiencySeverity,
                  profile.opiaOnsetSeverity,
                ),
              })
            }
          >
            <span className="vsc-cvd-family-swatch" style={{ backgroundColor: option.swatch }} aria-hidden="true" />
          </button>
        ))}
      </div>

      <label className="vsc-cvd-severity-block">
        <span>{isZh ? '严重度' : 'Severity'}: {visualInput.colorDeficiencySeverity.toFixed(2)}</span>
        <div className="vsc-cvd-severity-track">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={visualInput.colorDeficiencySeverity}
            onChange={(event) => {
              const nextSeverity = Number(event.target.value)
              onPatch({
                colorDeficiencySeverity: nextSeverity,
                colorDeficiencyType: typeFromFamilyAndSeverity(
                  activeFamily,
                  nextSeverity,
                  profile.opiaOnsetSeverity,
                ),
              })
            }}
          />
          <div className="vsc-cvd-threshold-marker" style={{ left: `${profile.opiaOnsetSeverity * 100}%` }}>
            <i aria-hidden="true" />
            <span>{isZh ? '弱/盲分界' : 'Weak/Blind boundary'}</span>
          </div>
        </div>
      </label>

      <p className="vsc-cvd-status">{regimeText}</p>
      <p className="vsc-cvd-status">{effectiveText}</p>

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
    </div>
  )
}

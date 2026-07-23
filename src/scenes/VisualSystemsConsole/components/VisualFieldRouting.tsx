import { useMemo } from 'react'
import type { UiLanguage } from '../../../stores/uiLanguageStore'
import type { VisualInputState } from '../../../types/visualSystem'
import { resolveVisualFieldRouting } from '../../../visual/routing/visualFieldRouting'

type VisualFieldRoutingProps = {
  language: UiLanguage
  visualInput: VisualInputState
}

export const VisualFieldRouting = ({ language, visualInput }: VisualFieldRoutingProps) => {
  const isZh = language === 'zh'

  const routing = useMemo(
    () => resolveVisualFieldRouting(visualInput.selectedVisualFieldPoint.x),
    [visualInput.selectedVisualFieldPoint.x],
  )

  const hemifieldText =
    routing.field === 'LEFT_FIELD'
      ? isZh
        ? '左侧视野由双眼视网膜右半区域共同编码。'
        : 'Left visual hemifield is encoded by right halves of both retinas.'
      : routing.field === 'RIGHT_FIELD'
        ? isZh
          ? '右侧视野由双眼视网膜左半区域共同编码。'
          : 'Right visual hemifield is encoded by left halves of both retinas.'
        : isZh
          ? '中央视野位于双侧半场交界，近中心凹输入参与双侧通路。'
          : 'Central field lies near the hemifield boundary with bilateral foveal contribution.'

  const chiasmText = isZh
    ? '视交叉规则：鼻侧纤维交叉，颞侧纤维同侧上行。'
    : 'Optic chiasm rule: nasal fibers decussate; temporal fibers remain ipsilateral.'

  const verticalRule =
    visualInput.selectedVisualFieldPoint.y < 0.5
      ? isZh
        ? '上视野主要投射到下方视网膜，再偏向距状裂下侧皮层映射。'
        : 'Upper visual field projects to inferior retina and tends toward ventral calcarine mapping.'
      : isZh
        ? '下视野主要投射到上方视网膜，再偏向距状裂上侧皮层映射。'
        : 'Lower visual field projects to superior retina and tends toward dorsal calcarine mapping.'

  return (
    <div className="vsc-routing-panel">
      <svg
        viewBox="0 0 360 180"
        className="vsc-routing-svg"
        aria-label={isZh ? '视觉通路路由示意图' : 'Visual pathway routing schematic'}
      >
        <rect x="0" y="0" width="360" height="180" fill="rgba(6,10,14,0.82)" />
        <circle cx="74" cy="90" r="26" fill="rgba(169, 218, 234, 0.24)" />
        <circle cx="134" cy="90" r="26" fill="rgba(169, 218, 234, 0.24)" />
        <path d="M160 74 Q 196 90 224 74" stroke="rgba(238,249,255,0.86)" strokeWidth="2" fill="none" />
        <path d="M160 106 Q 196 90 224 106" stroke="rgba(238,249,255,0.86)" strokeWidth="2" fill="none" />
        <circle cx="248" cy="66" r="12" fill={routing.targetLgn === 'left' || routing.targetLgn === 'bilateral' ? '#95e4ff' : 'rgba(103,128,143,0.35)'} />
        <circle cx="248" cy="114" r="12" fill={routing.targetLgn === 'right' || routing.targetLgn === 'bilateral' ? '#95e4ff' : 'rgba(103,128,143,0.35)'} />
        <rect x="286" y="44" width="56" height="26" rx="4" fill={routing.targetCortex === 'left' || routing.targetCortex === 'bilateral' ? 'rgba(222,255,170,0.88)' : 'rgba(87,107,84,0.35)'} />
        <rect x="286" y="110" width="56" height="26" rx="4" fill={routing.targetCortex === 'right' || routing.targetCortex === 'bilateral' ? 'rgba(222,255,170,0.88)' : 'rgba(87,107,84,0.35)'} />
      </svg>

      <p className="vsc-routing-text">{hemifieldText}</p>
      <p className="vsc-routing-text">{chiasmText}</p>
      <p className="vsc-routing-text">{verticalRule}</p>
      <p className="vsc-routing-note">
        {isZh ? '视觉半场发生交叉，并非“左眼到左脑、右眼到右脑”的简单对应。' : 'Visual hemifields cross. Eyes do not simply swap sides.'}
      </p>
    </div>
  )
}

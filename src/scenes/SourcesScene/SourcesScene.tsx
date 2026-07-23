import { SceneFrame } from '../../components/SceneFrame'
import { sources } from '../../data'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'

export const SourcesScene = () => {
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'

  return (
    <SceneFrame
      title={isZh ? '来源与边界' : 'Sources & Limits'}
      subtitle={
        isZh
          ? '科学依据、简化策略与不确定性边界。'
          : 'Scientific grounding, simplification choices, and uncertainty boundaries.'
      }
      previousPath="/map"
    >
      <div className="sources-grid">
        {sources.map((source) => (
          <article key={source.id} className="source-card">
            <h3>{source.name}</h3>
            <p>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.url}
              </a>
            </p>
            <p>
              <strong>{isZh ? '数据类型' : 'Data type'}:</strong> {source.dataType}
            </p>
            <p>
              <strong>{isZh ? '简化方式' : 'Simplification'}:</strong> {source.simplification}
            </p>
            <p>
              <strong>{isZh ? '用途范围' : 'Usage'}:</strong> {source.usageScope}
            </p>
            <p>
              <strong>{isZh ? '局限性' : 'Limitations'}:</strong> {source.limitations}
            </p>
          </article>
        ))}
      </div>
      <p className="prototype-note">
        {isZh
          ? '原型值用于叙事展示并经过归一化。后续阶段可替换为与数据集联动的处理管线。'
          : 'Prototype values are illustrative and normalized for storytelling. Future phases can replace these with dataset-linked pipelines.'}
      </p>
    </SceneFrame>
  )
}

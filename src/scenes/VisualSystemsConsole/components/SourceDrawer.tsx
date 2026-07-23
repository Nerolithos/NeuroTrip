import { visualSources } from '../../../data/visualSources'
import type { UiLanguage } from '../../../stores/uiLanguageStore'

type SourceDrawerProps = {
  language: UiLanguage
  open: boolean
}

export const SourceDrawer = ({ language, open }: SourceDrawerProps) => {
  const isZh = language === 'zh'

  if (!open) {
    return null
  }

  return (
    <aside className="vsc-source-drawer" aria-label={isZh ? '视觉系统参考来源' : 'Visual systems source references'}>
      <h4>{isZh ? '科学参考来源' : 'Scientific Sources'}</h4>
      <ul>
        {visualSources.map((source) => (
          <li key={source.id}>
            <strong>{source.title}</strong>
            <p>
              {source.authors} ({source.year})
            </p>
            <p>{source.limitations}</p>
          </li>
        ))}
      </ul>
    </aside>
  )
}

import type { PropsWithChildren, ReactNode } from 'react'

type TerminalWindowProps = PropsWithChildren<{
  id: string
  title: string
  sourceTag?: string
  sourceLabel?: string
  status?: 'idle' | 'active' | 'linked'
  toolbar?: ReactNode
  className?: string
}>

export const TerminalWindow = ({
  id,
  title,
  sourceTag,
  sourceLabel = 'SOURCE',
  status = 'idle',
  toolbar,
  className,
  children,
}: TerminalWindowProps) => {
  return (
    <section className={`vsc-window ${className ?? ''}`} data-status={status} aria-labelledby={`${id}-title`}>
      <header className="vsc-window-bar">
        <div className="vsc-window-meta">
          <span className={`vsc-status-light ${status}`} aria-hidden="true" />
          <span className="vsc-window-id">{id}</span>
          <h3 id={`${id}-title`}>{title}</h3>
        </div>
        <div className="vsc-window-tools">
          {sourceTag ? (
            <span className="vsc-source-tag">
              {sourceLabel}: {sourceTag}
            </span>
          ) : null}
          {toolbar}
        </div>
      </header>
      <div className="vsc-window-content">{children}</div>
    </section>
  )
}

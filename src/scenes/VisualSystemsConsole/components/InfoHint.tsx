import { useId, useState, type ReactNode } from 'react'

type InfoHintProps = {
  label: ReactNode
  lines: [string, string]
}

export const InfoHint = ({ label, lines }: InfoHintProps) => {
  const [open, setOpen] = useState(false)
  const tooltipId = useId()

  return (
    <span
      className="vsc-info-hint"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        className="vsc-info-hint-trigger"
        aria-describedby={open ? tooltipId : undefined}
      >
        {label}
      </button>
      <span id={tooltipId} role="tooltip" className={`vsc-info-hint-card ${open ? 'is-open' : ''}`}>
        <span>{lines[0]}</span>
        <span>{lines[1]}</span>
      </span>
    </span>
  )
}

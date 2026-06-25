import { useState } from 'react'
import { skills } from '../data/skills'

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      nodes.push(<h3 key={i} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 20, marginBottom: 6, letterSpacing: 0.1 }}>{line.slice(3)}</h3>)
    } else if (line.startsWith('# ')) {
      // skip — title shown in header
    } else if (line.startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      nodes.push(
        <pre key={i} style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '10px 12px',
          fontSize: 12,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          overflowX: 'auto',
          margin: '8px 0',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          whiteSpace: 'pre',
        }}>{codeLines.join('\n')}</pre>
      )
    } else if (line.startsWith('- ') || line.startsWith('  - ')) {
      const bullet = line.replace(/^ *- /, '')
      nodes.push(
        <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 3, marginLeft: 16, lineHeight: 1.6 }}>
          {renderInline(bullet)}
        </li>
      )
    } else if (/^\d+\. /.test(line)) {
      const item = line.replace(/^\d+\. /, '')
      nodes.push(
        <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 3, marginLeft: 16, lineHeight: 1.6, listStyleType: 'decimal' }}>
          {renderInline(item)}
        </li>
      )
    } else if (line.trim() === '') {
      nodes.push(<div key={i} style={{ height: 4 }} />)
    } else {
      nodes.push(
        <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 4 }}>
          {renderInline(line)}
        </p>
      )
    }
    i++
  }

  return nodes
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 4px', color: 'var(--primary)' }}>{part.slice(1, -1)}</code>
    }
    return part
  })
}

export default function SkillsView() {
  const [selected, setSelected] = useState(skills[0].slug)
  const skill = skills.find(s => s.slug === selected)!

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)', minHeight: 480 }}>
      {/* Sidebar */}
      <div style={{ borderRight: '1px solid var(--border)', background: 'var(--surface-2)' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Skills</span>
        </div>
        <nav>
          {skills.map(s => (
            <button
              key={s.slug}
              onClick={() => setSelected(s.slug)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: selected === s.slug ? 600 : 400,
                color: selected === s.slug ? 'var(--primary)' : 'var(--text-secondary)',
                background: selected === s.slug ? 'var(--primary-light)' : 'transparent',
                borderLeft: selected === s.slug ? '2px solid var(--primary)' : '2px solid transparent',
                transition: 'all 0.12s',
                lineHeight: 1.4,
              }}
            >
              {s.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: 560 }}>
        <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{skill.name}</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{skill.description}</p>
        </div>
        <div>{renderMarkdown(skill.content)}</div>
      </div>
    </div>
  )
}

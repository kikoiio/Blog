'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useShell } from '@/lib/shell-context'
import {
  executeCommand,
  loadCwd,
  loadHistory,
  queueOutput,
  renderPromptLine,
  saveCwd,
  saveHistory,
} from '@/lib/shell'

// tmux-style status line: a persistent prompt on every content page.
// Commands with output are queued and printed by the home terminal,
// so the whole site behaves like one continuous shell session.

export default function PromptLine() {
  const router = useRouter()
  const { files } = useShell()
  const [cwd, setCwd] = useState(() => (typeof window !== 'undefined' ? loadCwd() : '~'))
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Read the live DOM value; React state can lag behind rapid typing.
    const input = event.currentTarget.elements.namedItem('cmd')
    const typed = input instanceof HTMLInputElement ? input.value : value
    const trimmed = typed.trim()
    if (trimmed === '') return
    setValue('')

    const history = loadHistory()
    const nextHistory = history[history.length - 1] === trimmed ? history : [...history, trimmed].slice(-100)
    saveHistory(nextHistory)

    const result = executeCommand(trimmed, { files, cwd, history: nextHistory })
    if (result.cwd !== cwd) {
      setCwd(result.cwd)
      saveCwd(result.cwd)
    }

    if (result.action.type === 'navigate') {
      router.push(result.action.href)
      return
    }
    if (result.lines.length > 0) {
      queueOutput(result.lines)
    }
    router.push('/')
  }

  return (
    <div className="term-statusline">
      <form onSubmit={submit}>
        {renderPromptLine(cwd).map((span, index) =>
          span.className ? (
            <span key={index} className={span.className}>
              {span.text}
            </span>
          ) : (
            <span key={index}>{span.text}</span>
          )
        )}
        <input
          ref={inputRef}
          name="cmd"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => {
            document.body.dataset.commandOpen = 'true'
          }}
          onBlur={() => {
            delete document.body.dataset.commandOpen
          }}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="输入命令 (help 查看)"
          aria-label="终端命令输入"
        />
      </form>
      <span className="term-statusline-hint">↑↓ 历史 · Tab 补全</span>
    </div>
  )
}

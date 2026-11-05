'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useShell } from '@/lib/shell-context'
import {
  bootLines,
  completeInput,
  executeCommand,
  loadCwd,
  loadHistory,
  renderPromptLine,
  saveCwd,
  saveHistory,
  takeQueuedOutput,
  type ShellLine,
  type Span,
} from '@/lib/shell'

function OutputSpans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((span, index) =>
        span.className ? (
          <span key={index} className={span.className}>
            {span.text}
          </span>
        ) : (
          <span key={index}>{span.text}</span>
        )
      )}
    </>
  )
}

export default function Terminal() {
  const router = useRouter()
  const { files } = useShell()

  const [lines, setLines] = useState<ShellLine[]>(() => [
    ...bootLines(),
    ...(typeof window !== 'undefined' ? takeQueuedOutput() : []),
  ])
  const [input, setInput] = useState('')
  const [cwd, setCwd] = useState(() => (typeof window !== 'undefined' ? loadCwd() : '~'))
  const [history, setHistory] = useState<string[]>(() =>
    typeof window !== 'undefined' ? loadHistory() : []
  )
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [focused, setFocused] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const scrollToEnd = useCallback(() => {
    const screen = rootRef.current?.closest('.term-screen')
    if (screen) screen.scrollTop = screen.scrollHeight
  }, [])

  useEffect(() => {
    scrollToEnd()
  }, [lines, input, scrollToEnd])

  // Auto-focus on desktop only; mobile users tap to summon the keyboard.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
      inputRef.current?.focus()
    }
  }, [])

  const run = useCallback(
    (raw: string) => {
      const trimmed = raw.trim()
      const result = executeCommand(trimmed, { files, cwd, history })

      let nextHistory = history
      if (trimmed !== '' && history[history.length - 1] !== trimmed) {
        nextHistory = [...history, trimmed].slice(-100)
        setHistory(nextHistory)
        saveHistory(nextHistory)
      }
      setHistoryIndex(-1)

      if (result.cwd !== cwd) {
        setCwd(result.cwd)
        saveCwd(result.cwd)
      }

      if (result.action.type === 'clear') {
        setLines([])
        return
      }

      setLines((prev) => [
        ...prev,
        { spans: [...renderPromptLine(cwd), { text: raw }] },
        ...result.lines,
      ])
      setInput('')

      if (result.action.type === 'navigate') {
        router.push(result.action.href)
      }
    },
    [cwd, files, history, router]
  )

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const value = input
    if (event.key === 'Enter') {
      event.preventDefault()
      run(value)
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      const next = completeInput(value, { files, cwd })
      if (next.value !== value) setInput(next.value)
      if (next.candidates.length > 0) {
        setLines((prev) => [
          ...prev,
          { spans: [...renderPromptLine(cwd), { text: value }] },
          ...next.candidates,
        ])
      }
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (history.length === 0) return
      const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1)
      setHistoryIndex(nextIndex)
      setInput(history[nextIndex] ?? '')
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (historyIndex === -1) return
      const nextIndex = historyIndex + 1
      if (nextIndex >= history.length) {
        setHistoryIndex(-1)
        setInput('')
      } else {
        setHistoryIndex(nextIndex)
        setInput(history[nextIndex] ?? '')
      }
      return
    }
    if (event.key === 'l' && event.ctrlKey) {
      event.preventDefault()
      setLines([])
      return
    }
    if (event.key === 'c' && event.ctrlKey && !event.shiftKey) {
      event.preventDefault()
      setLines((prev) => [...prev, { spans: [...renderPromptLine(cwd), { text: `${value}^C` }] }])
      setInput('')
      return
    }
  }

  const promptSpans = renderPromptLine(cwd)

  return (
    <div className="term-buffer" ref={rootRef} onClick={() => inputRef.current?.focus()}>
      {lines.map((line, index) => (
        <div key={index} className="t-line">
          <OutputSpans spans={line.spans} />
        </div>
      ))}
      <div className={`t-line t-input-row${focused ? ' is-focused' : ''}`}>
        <OutputSpans spans={promptSpans} />
        <span className="t-echo">{input}</span>
        <span className={`t-caret${focused ? '' : ' is-idle'}`} aria-hidden="true" />
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="终端命令输入"
        />
      </div>
    </div>
  )
}

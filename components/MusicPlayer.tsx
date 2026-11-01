'use client'

import { useEffect, useState } from 'react'

const keyCount = 26

function getNoteForKey(key: string): number | undefined {
  const normalized = key.toUpperCase()
  if (normalized.length !== 1) return undefined
  const code = normalized.charCodeAt(0)
  if (code < 65 || code >= 65 + keyCount) return undefined
  return 48 + code - 65
}

export default function MusicPlayer() {
  const [status, setStatus] = useState<'idle' | 'ready' | 'unavailable'>('idle')
  const [volume, setVolume] = useState(0.5)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const note = getNoteForKey(event.key)
      if (note === undefined || event.metaKey || event.ctrlKey || event.altKey) return

      void import('bellowsjs')
        .then(({ play }) => play('pluck', note, { dur: '8n', vel: volume }))
        .then(() => setStatus('ready'))
        .catch(() => setStatus('unavailable'))
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [volume])

  return (
    <div className="music-player">
      <p>音乐系统 {status === 'ready' ? '✓' : status === 'unavailable' ? '不可用' : '待启动'}</p>
      <label className="music-volume">
        音量
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
          aria-label="音乐音量"
        />
      </label>
      <p className="music-hint">按 A-Z 键演奏</p>
    </div>
  )
}

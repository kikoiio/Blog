import { watch } from 'node:fs'
import { spawn } from 'node:child_process'
import { archiveRoot, projectRoot, syncArchive } from './archive.mjs'

await syncArchive()
let pending = false
let running = false
let timer
let closing = false

async function update() {
  if (closing) return
  if (running) { pending = true; return }
  running = true
  try {
    do {
      pending = false
      const result = await syncArchive()
      console.log(`Folio: synced ${result.photos} pictures`)
    } while (pending && !closing)
  } catch (error) {
    console.error('Folio: archive sync failed', error)
  } finally {
    running = false
  }
}

const watcher = archiveRoot ? watch(archiveRoot, { recursive: true }, (_event, filename) => {
  if (!filename || !/^(blogs|pictures)(\/|\\)/.test(filename)) return
  clearTimeout(timer)
  timer = setTimeout(update, 600)
}) : null

const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: 'inherit',
})

function stop(signal) {
  closing = true
  clearTimeout(timer)
  watcher?.close()
  child.kill(signal)
}
process.on('SIGINT', () => stop('SIGINT'))
process.on('SIGTERM', () => stop('SIGTERM'))
child.on('exit', (code) => {
  closing = true
  clearTimeout(timer)
  watcher?.close()
  process.exitCode = code ?? 1
})

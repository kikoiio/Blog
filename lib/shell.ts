import type { ShellFile } from '@/lib/shell-data'

// ============================================================
// aries@blog shell — a pure, static-export-friendly command
// kernel. Both the home terminal (Terminal.tsx) and the bottom
// status line (PromptLine.tsx) execute commands through here.
// ============================================================

export interface Span {
  text: string
  className?: string
}

export interface ShellLine {
  spans: Span[]
}

export type ShellAction =
  | { type: 'none' }
  | { type: 'navigate'; href: string }
  | { type: 'theme' }
  | { type: 'clear' }

export interface ShellContext {
  files: ShellFile[]
  cwd: string
  history?: string[]
}

export interface ShellResult {
  lines: ShellLine[]
  action: ShellAction
  cwd: string
}

// -- tiny span/line helpers ---------------------------------

const t = (text: string): Span => ({ text })

const c = (text: string, className: string): Span => ({ text, className })

const line = (...spans: Span[]): ShellLine => ({ spans })

const blank = (): ShellLine => line(t(''))

// -- session persistence (cwd / history / queued output) -----

export const SESSION_CWD_KEY = 'aries-term-cwd'
export const SESSION_HISTORY_KEY = 'aries-term-history'
export const SESSION_QUEUE_KEY = 'aries-term-output'
export const SESSION_CWD_EVENT = 'term-cwd-change'

export function defaultCwd(): string {
  return '~'
}

export function loadCwd(): string {
  if (typeof window === 'undefined') return defaultCwd()
  try {
    const saved = sessionStorage.getItem(SESSION_CWD_KEY)
    return typeof saved === 'string' && saved.startsWith('~') ? saved : defaultCwd()
  } catch {
    return defaultCwd()
  }
}

export function saveCwd(cwd: string): void {
  try {
    sessionStorage.setItem(SESSION_CWD_KEY, cwd)
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_CWD_EVENT))
  }
}

export function loadHistory(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(SESSION_HISTORY_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function saveHistory(history: string[]): void {
  try {
    sessionStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(history))
  } catch {
    // ignore
  }
}

export function queueOutput(lines: ShellLine[]): void {
  try {
    sessionStorage.setItem(SESSION_QUEUE_KEY, JSON.stringify(lines))
  } catch {
    // ignore
  }
}

export function takeQueuedOutput(): ShellLine[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(SESSION_QUEUE_KEY)
    if (!raw) return []
    sessionStorage.removeItem(SESSION_QUEUE_KEY)
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ShellLine[]) : []
  } catch {
    return []
  }
}

// -- virtual filesystem --------------------------------------
//
//   ~/articles/<routePath>.md        writings, grouped by category dirs
//   ~/photography/<slug>.md          photo albums
//   ~/README.md                      site manual

interface Vfs {
  dirs: Set<string>
  files: Map<string, ShellFile>
}

function readmeContent(files: ShellFile[]): string {
  const writings = files.filter((file) => file.layout === 'article')
  const albums = files.filter((file) => file.layout === 'photography')
  return [
    '# aries@blog',
    '',
    '这不是一个普通博客,是一个终端。',
    '没有侧栏,没有卡片,没有按钮——只有命令。',
    '',
    '## 试试这些',
    '',
    '- help        全部命令',
    '- ls          看看这里有什么',
    `- cat         直接在终端里读(共 ${writings.length} 篇文章)`,
    `- open        用带图的方式打开(${albums.length} 本摄影相册只能用这个)`,
    '',
    '## 文件都在哪',
    '',
    '- ~/articles/             技术笔记,按分类放',
    '- ~/photography/          摄影相册',
    '',
    'Tab 补全,↑↓ 翻历史。祝玩得开心。',
  ].join('\n')
}

function buildVfs(files: ShellFile[]): Vfs {
  const dirs = new Set<string>(['articles', 'photography'])
  const map = new Map<string, ShellFile>()

  map.set('README.md', {
    category: 'meta',
    content: readmeContent(files),
    date: files.length > 0 ? files[files.length - 1].date : '2026-01-01',
    href: '/',
    layout: 'article',
    photoCount: 0,
    routePath: 'README',
    slug: 'README',
    title: 'README',
  })

  for (const file of files) {
    const virtualPath =
      file.layout === 'photography' ? `photography/${file.slug}.md` : `articles/${file.routePath}.md`
    map.set(virtualPath, file)
    let dir = virtualPath.slice(0, virtualPath.lastIndexOf('/'))
    while (dir.includes('/')) {
      dirs.add(dir)
      dir = dir.slice(0, dir.lastIndexOf('/'))
    }
    dirs.add(dir)
  }

  return { dirs, files: map }
}

function parentOf(path: string): string {
  const index = path.lastIndexOf('/')
  return index === -1 ? '' : path.slice(0, index)
}

function baseName(path: string): string {
  const index = path.lastIndexOf('/')
  return index === -1 ? path : path.slice(index + 1)
}

// Resolve an input path (absolute '~/x', relative, with . and ..) against cwd.
// Returns '' for home, or a '/'-joined virtual path.
function resolvePath(cwd: string, input: string): string {
  const cwdSegments = cwd === '~' ? [] : cwd.slice(2).split('/')
  let segments: string[]
  if (input === '' ) {
    segments = cwdSegments
  } else if (input === '~' || input === '~/') {
    segments = []
  } else if (input.startsWith('~/')) {
    segments = input.slice(2).split('/')
  } else {
    segments = [...cwdSegments, ...input.split('/')]
  }

  const output: string[] = []
  for (const segment of segments) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') output.pop()
    else output.push(segment)
  }
  return output.join('/')
}

function cwdDisplay(virtualPath: string): string {
  return virtualPath === '' ? '~' : `~/${virtualPath}`
}

// Resolve a user-supplied operand to a file in the VFS. Paths may contain
// spaces (album names like `2025.9 HK.md`), so if the first token does not
// resolve, retry with all tokens joined and with a home-relative fallback.
function resolveOperandFile(
  vfs: Vfs,
  cwd: string,
  operands: string[]
): { path: string; file: ShellFile } | { missing: string } {
  if (operands.length === 0) return { missing: '' }
  const single = resolvePath(cwd, operands[0])
  const singleFile = vfs.files.get(single)
  if (singleFile) return { path: single, file: singleFile }
  const raw = operands.join(' ')
  for (const base of [cwd, '~']) {
    const candidate = resolvePath(base, raw)
    const file = vfs.files.get(candidate)
    if (file) return { path: candidate, file }
  }
  return { missing: raw }
}

function isDir(vfs: Vfs, path: string): boolean {
  return path === '' || vfs.dirs.has(path)
}

interface LsEntry {
  name: string
  isDir: boolean
  file?: ShellFile
}

function listDir(vfs: Vfs, path: string): LsEntry[] {
  const entries: LsEntry[] = []
  for (const dir of vfs.dirs) {
    if (parentOf(dir) === path && dir !== '') entries.push({ name: baseName(dir), isDir: true })
  }
  for (const [filePath, file] of vfs.files) {
    if (parentOf(filePath) === path) entries.push({ name: baseName(filePath), isDir: false, file })
  }
  entries.sort((left, right) => {
    if (left.isDir !== right.isDir) return left.isDir ? -1 : 1
    return left.name.localeCompare(right.name, undefined, { numeric: true })
  })
  return entries
}

function findFileBySlug(vfs: Vfs, query: string): ShellFile | undefined {
  const bare = query.replace(/\.md$/, '')
  for (const file of vfs.files.values()) {
    if (file.slug === bare || file.slug === query) return file
  }
  return undefined
}

function formatSize(content: string): string {
  const bytes = new TextEncoder().encode(content).length
  if (bytes < 1024) return `${bytes}B`
  return `${(bytes / 1024).toFixed(1)}K`
}

// -- output renderers -----------------------------------------

function promptSpans(cwd: string): Span[] {
  return [c('aries@blog', 't-user'), t(':'), c(cwd, 't-path'), t('$ ')]
}

export function renderPromptLine(cwd: string): Span[] {
  return promptSpans(cwd)
}

function articleHeadLines(file: ShellFile): ShellLine[] {
  const isPhotography = file.layout === 'photography'
  const meta = isPhotography ? `${file.photoCount} 张照片` : file.category
  const head: ShellLine[] = []
  if (file.title && file.title !== 'README') {
    head.push(line(c(file.title, 't-strong')))
    head.push(line(c(`${meta}${file.date ? `  ·  ${file.date}` : ''}`, 't-faint')))
    head.push(blank())
  }
  return head
}

function catLines(file: ShellFile): ShellLine[] {
  const output: ShellLine[] = articleHeadLines(file)
  let inCodeFence = false
  for (const raw of file.content.split('\n')) {
    const trimmed = raw.trimEnd()
    if (trimmed.startsWith('```')) {
      inCodeFence = !inCodeFence
      output.push(line(c(trimmed, 't-faint')))
      continue
    }
    if (/^!\[[^\]]*\]\([^)]*\)$/.test(trimmed)) {
      const alt = /^!\[([^\]]*)\]/.exec(trimmed)?.[1] ?? ''
      output.push(line(c(`    [图片: ${alt || '未命名'} — 用 open 打开可查看]`, 't-faint')))
      continue
    }
    if (/^#{1,6}\s/.test(trimmed)) {
      output.push(line(c(trimmed, 't-strong')))
      continue
    }
    if (/^>\s?/.test(trimmed)) {
      output.push(line(c(trimmed, 't-dim')))
      continue
    }
    if (/^[-*]\s/.test(trimmed)) {
      output.push(line(c('  · ', 't-accent'), t(trimmed.slice(2))))
      continue
    }
    output.push(line(c(trimmed, inCodeFence ? 't-dim' : 't-file')))
  }
  return output
}

function lsLines(vfs: Vfs, path: string, long: boolean): ShellLine[] {
  const entries = listDir(vfs, path)
  const output: ShellLine[] = [line(c(`total ${entries.length}`, 't-faint'))]
  if (!long) {
    for (const entry of entries) {
      output.push(
        line(entry.isDir ? c(`${entry.name}/`, 't-dir') : c(entry.name, entry.name === 'README.md' ? 't-exec' : 't-file'))
      )
    }
    return output
  }
  for (const entry of entries) {
    const perms = entry.isDir ? 'drwxr-xr-x' : '-rw-r--r--'
    if (entry.isDir) {
      output.push(line(c(perms, 't-faint'), t('   -         -     '), c(`${entry.name}/`, 't-dir')))
      continue
    }
    const file = entry.file!
    const size = formatSize(file.content)
    const label = entry.name === 'README.md' ? c(entry.name, 't-exec') : c(entry.name, 't-file')
    const spans: Span[] = [
      c(perms, 't-faint'),
      t(`  ${file.date || '-'}  ${size.padStart(5)}  `),
      label,
    ]
    if (file.title && file.title !== entry.name && file.title !== 'README') {
      spans.push(c(`  # ${file.title}`, 't-faint'))
    }
    output.push(line(...spans))
  }
  return output
}

function helpLines(): ShellLine[] {
  const rows: Array<[string, string]> = [
    ['help', '显示本帮助'],
    ['ls [-l] [路径]', '列出目录内容'],
    ['cd <目录>', '切换目录(支持 ~ .. .)'],
    ['pwd', '显示当前目录'],
    ['cat <文件>', '直接在终端里读文章'],
    ['open <文件|目录>', '用带图视图打开(相册必须用它)'],
    ['find <关键词>', '按标题搜索'],
    ['clear', '清屏(Ctrl+L 同效)'],
    ['history', '命令历史'],
    ['neofetch', '系统信息'],
    ['echo / date / whoami', '你懂的'],
  ]
  const output: ShellLine[] = [line(c('可用命令:', 't-dim')), blank()]
  for (const [cmd, desc] of rows) {
    output.push(line(t('  '), c(cmd.padEnd(22), 't-accent'), t(desc)))
  }
  output.push(blank())
  output.push(line(c('提示: Tab 补全 · ↑↓ 翻历史 · 所有文件都能 cat', 't-faint')))
  return output
}

function neofetchLines(files: ShellFile[]): ShellLine[] {
  const writings = files.filter((file) => file.layout === 'article').length
  const albums = files.filter((file) => file.layout === 'photography').length
  const oldest = files.reduce<string | null>((acc, file) => {
    if (!file.date) return acc
    return acc === null || file.date < acc ? file.date : acc
  }, null)
  const uptimeDays = oldest ? Math.max(1, Math.floor((Date.now() - new Date(oldest).getTime()) / 86400000)) : 1

  const art = [
    '     ▄▄▄▄▄▄▄     ',
    '   ▄█████████▄   ',
    '  ███████████▌   ',
    '  ███████████▌   ',
    '   ▀█████████▀   ',
    '     ▀▀▀▀▀▀▀     ',
  ]
  const artColors = ['t-error', 't-warn', 't-ok', 't-path', 't-user', 't-banner']

  const info: Array<[string, string]> = [
    ['OS', 'AriesOS 6.6-aries'],
    ['Host', 'field notes'],
    ['Shell', 'zsh 5.9 (没有插件,真的)'],
    ['Terminal', 'aries-term'],
    ['Files', `${writings} 篇文章 · ${albums} 本相册`],
    ['Uptime', `${uptimeDays} 天`],
    ['Theme', '极简素白 (Pure White)'],
  ]

  const output: ShellLine[] = [blank()]
  const rows = Math.max(art.length, info.length)
  for (let index = 0; index < rows; index += 1) {
    const spans: Span[] = []
    if (index < art.length) {
      spans.push(c(art[index], artColors[index % artColors.length]))
      spans.push(t('  '))
    } else {
      spans.push(t('                     '))
    }
    if (index === 0) {
      spans.push(c('aries', 't-user'), t('@'), c('blog', 't-path'))
    } else if (index === 1) {
      spans.push(c('──────────────', 't-faint'))
    } else if (index - 2 < info.length) {
      const [key, value] = info[index - 2]
      spans.push(c(`${key.padEnd(9)}`, 't-accent'), t(value))
    }
    output.push(line(...spans))
  }
  output.push(blank())
  return output
}

// -- command execution ----------------------------------------

export function executeCommand(rawInput: string, ctx: ShellContext): ShellResult {
  const input = rawInput.trim()
  const vfs = buildVfs(ctx.files)
  const cwd = ctx.cwd
  const noop: ShellAction = { type: 'none' }

  if (input === '') {
    return { lines: [], action: noop, cwd }
  }

  const tokens = input.split(/\s+/)
  const command = tokens[0]
  const args = tokens.slice(1)
  const flags = args.filter((arg) => arg.startsWith('-'))
  const operands = args.filter((arg) => !arg.startsWith('-'))

  switch (command) {
    case 'help':
    case '?':
      return { lines: helpLines(), action: noop, cwd }

    case 'pwd':
      return { lines: [line(c(cwdDisplay(cwd), 't-path'))], action: noop, cwd }

    case 'whoami':
      return { lines: [line(t('aries'))], action: noop, cwd }

    case 'date':
      return { lines: [line(t(new Date().toString()))], action: noop, cwd }

    case 'echo':
      return { lines: [line(t(args.join(' ')))], action: noop, cwd }

    case 'history': {
      const history = ctx.history ?? []
      const output = history.map((item, index) => line(c(`  ${String(index + 1).padStart(3)}  `, 't-faint'), t(item)))
      return { lines: output.length > 0 ? output : [line(c('还没有历史。', 't-dim'))], action: noop, cwd }
    }

    case 'clear':
      return { lines: [], action: { type: 'clear' }, cwd }

    case 'theme':
      return {
        lines: [line(c('当前为极简素白终端模式。', 't-dim'))],
        action: noop,
        cwd,
      }

    case 'ls': {
      const long = flags.some((flag) => flag.includes('l'))
      const target = resolvePath(cwd, operands[0] ?? '')
      if (isDir(vfs, target)) {
        return { lines: lsLines(vfs, target, long), action: noop, cwd }
      }
      if (vfs.files.has(target)) {
        return { lines: [line(c(operands[0] ?? target, 't-file'))], action: noop, cwd }
      }
      return { lines: [line(c(`ls: ${operands[0]}: No such file or directory`, 't-error'))], action: noop, cwd }
    }

    case 'cd': {
      const target = resolvePath(cwd, operands[0] ?? '~')
      if (!isDir(vfs, target)) {
        return {
          lines: [line(c(`cd: not a directory: ${operands[0] ?? '~'}`, 't-error'))],
          action: noop,
          cwd,
        }
      }
      return { lines: [], action: noop, cwd: cwdDisplay(target) }
    }

    case 'cat': {
      if (operands.length === 0) {
        return { lines: [line(c('cat: missing operand', 't-error'), c('  (试试: cat README.md)', 't-faint'))], action: noop, cwd }
      }
      const resolved = resolveOperandFile(vfs, cwd, operands)
      if ('file' in resolved) {
        return { lines: catLines(resolved.file), action: noop, cwd }
      }
      const catTarget = resolvePath(cwd, resolved.missing)
      if (isDir(vfs, catTarget)) {
        return { lines: [line(c(`cat: ${resolved.missing}: Is a directory`, 't-error'))], action: noop, cwd }
      }
      return { lines: [line(c(`cat: ${resolved.missing}: No such file or directory`, 't-error'))], action: noop, cwd }
    }

    case 'open':
    case 'less':
    case 'more':
    case 'vim':
    case 'vi': {
      if (operands.length === 0) {
        return {
          lines: [line(c(`usage: ${command} <文件|目录>`, 't-error'), c('  例: open ~/photography', 't-faint'))],
          action: noop,
          cwd,
        }
      }
      const raw = operands.join(' ') || operands[0] || ''
      const target = resolvePath(cwd, raw)
      const homeTarget = resolvePath('~', raw)
      const dirIndexPages: Record<string, string> = { '': '/', articles: '/articles', photography: '/photography' }
      // `open` is a navigation command, so it is forgiving: a bare name
      // like `photography` resolves from home even when cwd is elsewhere.
      if (isDir(vfs, target)) {
        return { lines: [], action: { type: 'navigate', href: dirIndexPages[target] ?? '/articles' }, cwd }
      }
      if (isDir(vfs, homeTarget)) {
        return { lines: [], action: { type: 'navigate', href: dirIndexPages[homeTarget] ?? '/articles' }, cwd }
      }
      const resolved = resolveOperandFile(vfs, cwd, operands)
      const file = 'file' in resolved ? resolved.file : findFileBySlug(vfs, raw)
      if (file) {
        const extra =
          file.layout === 'photography'
            ? [line(c('(相册要在浏览器视图里看,已为你打开)', 't-faint'))]
            : []
        return { lines: extra, action: { type: 'navigate', href: file.href }, cwd }
      }
      return { lines: [line(c(`open: cannot find: ${raw}`, 't-error'))], action: noop, cwd }
    }

    case 'find':
    case 'grep': {
      if (operands.length === 0) {
        return { lines: [line(c('usage: find <关键词>', 't-error'))], action: noop, cwd }
      }
      const query = operands.join(' ').toLowerCase()
      const matches: ShellLine[] = []
      for (const [virtualPath, file] of vfs.files) {
        if (file.title.toLowerCase().includes(query) || file.slug.toLowerCase().includes(query)) {
          matches.push(
            line(
              c(virtualPath, 't-accent'),
              c(`  # ${file.title}`, 't-faint'),
              c(`  → ${command} ${virtualPath}`, 't-dim')
            )
          )
        }
      }
      if (matches.length === 0) {
        return { lines: [line(c(`find: no match for '${operands.join(' ')}'`, 't-error'))], action: noop, cwd }
      }
      return { lines: matches, action: noop, cwd }
    }

    case 'neofetch':
      return { lines: neofetchLines(ctx.files), action: noop, cwd }

    case 'sudo':
      return {
        lines: [line(c('aries is not in the sudoers file.', 't-error'), c(' This incident will be reported.', 't-faint'))],
        action: noop,
        cwd,
      }

    case 'exit':
    case 'logout':
      return {
        lines: [line(c('没有 exit,这就是我的全部。', 't-dim'))],
        action: noop,
        cwd,
      }

    default:
      return {
        lines: [
          line(c(`zsh: command not found: ${command}`, 't-error')),
          line(c(`输入 help 查看可用命令。`, 't-faint')),
        ],
        action: noop,
        cwd,
      }
  }
}

// -- tab completion --------------------------------------------

export const COMMAND_NAMES = [
  'help',
  'ls',
  'cd',
  'pwd',
  'cat',
  'open',
  'less',
  'find',
  'theme',
  'clear',
  'history',
  'neofetch',
  'echo',
  'date',
  'whoami',
  'sudo',
  'exit',
]

export interface CompletionResult {
  value: string
  candidates: ShellLine[]
}

function commonPrefix(values: string[]): string {
  if (values.length === 0) return ''
  let prefix = values[0]
  for (const value of values) {
    while (!value.startsWith(prefix)) {
      prefix = prefix.slice(0, -1)
      if (prefix === '') return ''
    }
  }
  return prefix
}

export function completeInput(input: string, ctx: ShellContext): CompletionResult {
  const vfs = buildVfs(ctx.files)
  const cwd = ctx.cwd
  const endsWithSpace = /\s$/.test(input)
  const tokens = input.split(/\s+/).filter(Boolean)
  const completingCommand = tokens.length === 0 || (tokens.length === 1 && !endsWithSpace)

  if (completingCommand) {
    const prefix = tokens[0] ?? ''
    const matches = COMMAND_NAMES.filter((name) => name.startsWith(prefix))
    if (matches.length === 1) return { value: `${matches[0]} `, candidates: [] }
    if (matches.length > 1) {
      return {
        value: prefix + commonPrefix(matches),
        candidates: [line(t('  '), c(matches.join('   '), 't-dim'))],
      }
    }
    return { value: input, candidates: [] }
  }

  // completing a path argument
  const token = endsWithSpace ? '' : tokens[tokens.length - 1]
  const head = endsWithSpace ? input : input.slice(0, input.length - token.length)
  const slashIndex = token.lastIndexOf('/')
  const dirPart = slashIndex === -1 ? '' : token.slice(0, slashIndex + 1)
  const namePart = slashIndex === -1 ? token : token.slice(slashIndex + 1)

  const resolvedDir = resolvePath(cwd, dirPart === '' ? '.' : dirPart.replace(/\/$/, ''))
  if (!isDir(vfs, resolvedDir)) return { value: input, candidates: [] }

  const entries = listDir(vfs, resolvedDir)
  const matches = entries.filter((entry) => entry.name.startsWith(namePart))
  if (matches.length === 0) return { value: input, candidates: [] }

  const completions = matches.map((entry) => (entry.isDir ? `${entry.name}/` : entry.name))
  const completed = commonPrefix(completions)

  let value: string
  if (matches.length === 1) {
    value = head + dirPart + completions[0] + (matches[0].isDir ? '' : ' ')
  } else if (completed.length > namePart.length) {
    value = head + dirPart + completed
  } else {
    value = input
  }

  const candidates =
    matches.length > 1 && completed.length <= namePart.length
      ? [line(t('  '), c(completions.join('   '), 't-dim'))]
      : []
  return { value, candidates }
}

// -- boot sequence ---------------------------------------------

export function bootLines(): ShellLine[] {
  return [
    line(c('AriesOS 6.6-aries (tty1)', 't-banner')),
    blank(),
    line(t('欢迎来到 '), c('aries', 't-user'), t(' 的终端。这里没有菜单,只有命令。')),
    line(
      t('输入 '),
      c('help', 't-accent'),
      t(' 查看全部可用命令，'),
      c('ls', 't-accent'),
      t(' 浏览文件。')
    ),
    blank(),
  ]
}

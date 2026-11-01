import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(projectRoot, 'content/articles')
const destinationRoot = path.join(projectRoot, 'public/article-assets')

function copyAssets(sourceDirectory, destinationDirectory) {
  fs.mkdirSync(destinationDirectory, { recursive: true })

  for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDirectory, entry.name)
    const destinationPath = path.join(destinationDirectory, entry.name)

    if (entry.isDirectory()) {
      copyAssets(sourcePath, destinationPath)
    } else if (!entry.name.endsWith('.md')) {
      fs.copyFileSync(sourcePath, destinationPath)
    }
  }
}

fs.rmSync(destinationRoot, { force: true, recursive: true })
copyAssets(sourceRoot, destinationRoot)

const { execFileSync } = require('node:child_process')
const { existsSync } = require('node:fs')
const path = require('node:path')

module.exports = async function applyWindowsIconAfterPack(context) {
  if (context.electronPlatformName !== 'win32') {
    return
  }

  const projectRoot = context.packager.projectDir
  const rceditPath = path.join(
    projectRoot,
    'node_modules',
    'electron-winstaller',
    'vendor',
    'rcedit.exe'
  )
  const iconPath = path.join(projectRoot, 'resources', 'chmarkdown.ico')
  const executablePath = path.join(context.appOutDir, 'CHMarkDown.exe')

  for (const requiredPath of [rceditPath, iconPath, executablePath]) {
    if (!existsSync(requiredPath)) {
      throw new Error(`写入应用图标所需的文件不存在：${requiredPath}`)
    }
  }

  execFileSync(rceditPath, [executablePath, '--set-icon', iconPath], {
    stdio: 'inherit',
  })
  console.log(`已写入应用图标：${path.relative(projectRoot, executablePath)}`)
}

import { app, BrowserWindow, ipcMain, dialog, protocol, net, Menu, Tray, shell } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { createWindowCloseCoordinator } from './windowCloseCoordinator'
import {
  getAllNotes,
  addNote,
  updateNote,
  deleteNote,
  copyImage,
  saveImageFromBuffer,
} from './services/noteService'
import {
  createMarkdownDefaultName,
  readMarkdownFile,
  writeMarkdownFile,
  copyImageToExternalDir,
  saveImageBufferToExternalDir,
  copyImagesDirForSaveAs,
  resolveExternalImagePath,
} from './services/markdownFileService'
import {
  addRecentFile,
  clearRecentFiles,
  readRecentFiles,
  removeRecentFile,
} from './services/recentFileService'
import { readSessionState, writeSessionState } from './services/sessionService'
import { createAppSettingsStore } from './services/settingsService'
import type { DocumentExportInput } from './services/documentExportService'
import { extractMarkdownFilePath } from './fileOpenRequest'
import { resolveWindowCloseAction } from './windowClosePolicy'

const APP_NAME = 'CHMarkDown'
const APP_USER_MODEL_ID = 'com.chmarkdown.desktop'

app.setName(APP_NAME)
if (process.platform === 'win32') {
  app.setAppUserModelId(APP_USER_MODEL_ID)
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let mainWindowCloseCoordinator: ReturnType<typeof createWindowCloseCoordinator> | null = null
let rendererReady = false
let isQuitting = false
let systemSessionEnding = false
let settingsStore: ReturnType<typeof createAppSettingsStore> | null = null
const pendingOpenPaths: string[] = []
const extDirTokens = new Map<string, string>()
const PREVIEW_IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg',
])

function getRecentFilesPath(): string {
  return path.join(app.getPath('userData'), 'recent-files.json')
}

function getSessionStatePath(): string {
  return path.join(app.getPath('userData'), 'session.json')
}

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

function getSettingsStore(): ReturnType<typeof createAppSettingsStore> {
  if (!settingsStore) settingsStore = createAppSettingsStore(getSettingsPath())
  return settingsStore
}

function getImageDirectoryName(): string {
  return getSettingsStore().read().settings.imageDirectoryName
}

function focusMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function sendOpenFileRequest(filePath: string): void {
  if (!rendererReady || !mainWindow || mainWindow.isDestroyed()) {
    if (!pendingOpenPaths.some((item) => item.toLowerCase() === filePath.toLowerCase())) {
      pendingOpenPaths.push(filePath)
    }
    return
  }
  mainWindow.webContents.send('app:open-file-requested', filePath)
}

function flushPendingOpenPaths(): void {
  if (!rendererReady || !mainWindow || mainWindow.isDestroyed()) return
  while (pendingOpenPaths.length > 0) {
    const filePath = pendingOpenPaths.shift()
    if (filePath) mainWindow.webContents.send('app:open-file-requested', filePath)
  }
}

function requestMainWindowClose(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close()
  }
}

function requestApplicationExit(): void {
  isQuitting = true
  if (mainWindow && !mainWindow.isDestroyed()) {
    focusMainWindow()
    mainWindow.close()
    return
  }
  app.quit()
}

function sendFileCommand(command: 'open' | 'save' | 'save-as' | 'settings'): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app:file-command', command)
  }
}

function getWindowIconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'chmarkdown.ico')
    : path.join(__dirname, '../resources/chmarkdown.ico')
}

function syncTrayIcon(showTrayIcon: boolean): void {
  if (!showTrayIcon) {
    tray?.destroy()
    tray = null
    return
  }
  if (tray && !tray.isDestroyed()) return

  try {
    const nextTray = new Tray(getWindowIconPath())
    nextTray.setToolTip(APP_NAME)
    nextTray.setContextMenu(Menu.buildFromTemplate([
      {
        label: '打开 CHMarkDown',
        click: focusMainWindow,
      },
      { type: 'separator' },
      {
        label: '退出',
        click: requestApplicationExit,
      },
    ]))
    nextTray.on('click', focusMainWindow)
    tray = nextTray
  } catch (error) {
    tray = null
    console.error('Failed to create tray icon:', error)
    dialog.showErrorBox(
      '系统托盘不可用',
      '无法创建 CHMarkDown 托盘图标。为避免窗口无法恢复，关闭窗口时应用将正常退出。',
    )
  }
}

function installApplicationMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开…',
          accelerator: 'Ctrl+O',
          click: () => sendFileCommand('open'),
        },
        {
          label: '保存',
          accelerator: 'Ctrl+S',
          click: () => sendFileCommand('save'),
        },
        {
          label: '另存为…',
          accelerator: 'Ctrl+Shift+S',
          click: () => sendFileCommand('save-as'),
        },
        { type: 'separator' },
        {
          label: '偏好设置…',
          click: () => sendFileCommand('settings'),
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'Alt+F4',
          click: requestApplicationExit,
        },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '删除', role: 'delete' },
        { type: 'separator' },
        { label: '全选', role: 'selectAll' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '恢复默认大小', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '切换全屏', role: 'togglefullscreen' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize' },
        {
          label: '关闭',
          accelerator: 'Ctrl+W',
          click: requestMainWindowClose,
        },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 CHMarkDown',
          click: () => {
            const options = {
              type: 'info' as const,
              title: '关于 CHMarkDown',
              message: 'CHMarkDown',
              detail: `Windows 本地 Markdown 编辑与笔记工具\n版本 ${app.getVersion()}`,
              buttons: ['确定'],
            }
            if (mainWindow && !mainWindow.isDestroyed()) {
              void dialog.showMessageBox(mainWindow, options)
            } else {
              void dialog.showMessageBox(options)
            }
          },
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function registerProtocol(): void {
  protocol.handle('chmarkdown', (request) => {
    const relativePath = request.url.replace('chmarkdown://', '')
    const fullPath = path.join(app.getPath('userData'), relativePath)
    return net.fetch(pathToFileURL(fullPath).toString())
  })

  protocol.handle('chmarkdown-ext', (request) => {
    const url = new URL(request.url)
    const token = url.hostname
    const relativePath = url.pathname.replace(/^\//, '')
    const baseDir = extDirTokens.get(token)
    if (!baseDir) return new Response('Not Found', { status: 404 })
    if (!PREVIEW_IMAGE_EXTENSIONS.has(path.extname(relativePath).toLowerCase())) {
      return new Response('Forbidden', { status: 403 })
    }
    const resolvedPath = resolveExternalImagePath(baseDir, relativePath)
    if (!resolvedPath) return new Response('Not Found', { status: 404 })
    return net.fetch(pathToFileURL(resolvedPath).toString())
  })
}

function registerIpcHandlers(): void {
  ipcMain.on('app:renderer-ready', (event) => {
    if (mainWindow && event.sender === mainWindow.webContents) {
      rendererReady = true
      flushPendingOpenPaths()
    }
  })

  ipcMain.on('app:close-response', (event, requestId: number, allowClose: boolean) => {
    if (
      !mainWindow ||
      event.sender !== mainWindow.webContents ||
      !Number.isInteger(requestId) ||
      typeof allowClose !== 'boolean'
    ) {
      return
    }
    mainWindowCloseCoordinator?.handleDecision(requestId, allowClose)
  })

  ipcMain.handle('files:openMarkdown', async () => {
    if (!mainWindow) {
      throw new Error('应用窗口未就绪')
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '打开 Markdown 文件',
      filters: [{ name: 'Markdown 文件', extensions: ['md', 'markdown'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return readMarkdownFile(result.filePaths[0])
  })

  ipcMain.handle('files:openMarkdownPath', (_event, filePath: string) => {
    return readMarkdownFile(path.resolve(filePath))
  })

  ipcMain.handle('files:revealInFolder', (_event, filePath: unknown) => {
    if (typeof filePath !== 'string' || filePath.length === 0) return false
    const resolved = path.resolve(filePath)
    if (!fs.existsSync(resolved)) return false
    shell.showItemInFolder(resolved)
    return true
  })

  ipcMain.handle('files:getRecent', () => {
    return readRecentFiles(getRecentFilesPath())
  })

  ipcMain.handle('files:addRecent', (_event, filePath: string) => {
    return addRecentFile(getRecentFilesPath(), filePath)
  })

  ipcMain.handle('files:removeRecent', (_event, filePath: string) => {
    return removeRecentFile(getRecentFilesPath(), filePath)
  })

  ipcMain.handle('files:clearRecent', () => {
    clearRecentFiles(getRecentFilesPath())
  })

  ipcMain.handle('session:get', () => {
    return readSessionState(getSessionStatePath())
  })

  ipcMain.handle('session:save', (_event, state: unknown) => {
    return writeSessionState(getSessionStatePath(), state)
  })

  ipcMain.handle('settings:get', () => {
    return getSettingsStore().read()
  })

  ipcMain.handle('settings:save', (_event, settings: unknown) => {
    const saved = getSettingsStore().write(settings)
    syncTrayIcon(saved.showTrayIcon)
    return saved
  })

  ipcMain.handle('files:saveMarkdown', (_event, filePath: string, content: string) => {
    return writeMarkdownFile(filePath, content)
  })

  ipcMain.handle(
    'files:saveMarkdownAs',
    async (
      _event,
      suggestedName: string,
      content: string,
      sourceFilePath?: string | null,
    ) => {
      if (!mainWindow) {
        throw new Error('应用窗口未就绪')
      }
      const result = await dialog.showSaveDialog(mainWindow, {
        title: '另存为 Markdown 文件',
        defaultPath: createMarkdownDefaultName(suggestedName),
        filters: [{ name: 'Markdown 文件', extensions: ['md', 'markdown'] }],
      })
      if (result.canceled || !result.filePath) {
        return null
      }
      const destinationPath = path.resolve(result.filePath)
      const copiedImagesDir = sourceFilePath
        ? copyImagesDirForSaveAs(sourceFilePath, destinationPath, getImageDirectoryName())
        : null
      try {
        return writeMarkdownFile(destinationPath, content)
      } catch (error) {
        if (copiedImagesDir) {
          fs.rmSync(copiedImagesDir, { recursive: true, force: true })
        }
        throw error
      }
    }
  )

  ipcMain.handle('files:exportDocument', async (_event, input: DocumentExportInput) => {
    if (!mainWindow) {
      throw new Error('应用窗口未就绪')
    }
    if (
      !input ||
      typeof input.title !== 'string' ||
      typeof input.content !== 'string' ||
      (input.sourceFilePath != null && typeof input.sourceFilePath !== 'string')
    ) {
      throw new Error('导出文档参数无效')
    }

    const { prepareDocumentExport, writeDocumentExport } = await import(
      './services/documentExportService'
    )
    const plan = prepareDocumentExport(
      input,
      path.join(app.getPath('userData'), 'images'),
    )
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出文档',
      defaultPath: plan.defaultFileName,
      filters: plan.kind === 'zip'
        ? [{ name: 'ZIP 压缩包', extensions: ['zip'] }]
        : [{ name: 'Markdown 文件', extensions: ['md'] }],
    })
    if (result.canceled || !result.filePath) return null

    await writeDocumentExport(plan, result.filePath)
    return result.filePath
  })

  ipcMain.handle('ext-files:registerDir', (_event, fileDir: string) => {
    const resolvedDir = fs.realpathSync(path.resolve(fileDir))
    if (!fs.statSync(resolvedDir).isDirectory()) {
      throw new Error('外部 Markdown 文件目录无效')
    }
    const token = crypto.randomUUID()
    extDirTokens.set(token, resolvedDir)
    return token
  })

  ipcMain.handle('ext-files:unregisterDir', (_event, token: string) => {
    extDirTokens.delete(token)
  })

  ipcMain.handle('ext-files:uploadImage', async (_event, filePath: string) => {
    if (!mainWindow) {
      throw new Error('应用窗口未就绪')
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择图片',
      filters: [
        { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
      ],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    const copied = copyImageToExternalDir(
      result.filePaths[0],
      filePath,
      getImageDirectoryName(),
    )
    return copied.relativePath
  })

  ipcMain.handle('ext-files:pasteImage', (_event, filePath: string, buffer: ArrayBuffer, mimeType: string) => {
    const copied = saveImageBufferToExternalDir(
      Buffer.from(buffer),
      mimeType,
      filePath,
      getImageDirectoryName(),
    )
    return copied.relativePath
  })

  // Note handlers
  ipcMain.handle('notes:getAll', () => {
    return getAllNotes()
  })

  ipcMain.handle('notes:add', (_event, input) => {
    return addNote(input)
  })

  ipcMain.handle('notes:update', (_event, id: string, updates) => {
    return updateNote(id, updates)
  })

  ipcMain.handle('notes:delete', (_event, id: string) => {
    return deleteNote(id)
  })

  // Image upload via file dialog
  ipcMain.handle('notes:uploadImage', async () => {
    if (!mainWindow) {
      throw new Error('应用窗口未就绪')
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择图片',
      filters: [
        { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
      ],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return copyImage(result.filePaths[0])
  })

  // Image paste from clipboard
  ipcMain.handle('notes:pasteImage', (_event, buffer: ArrayBuffer, mimeType: string) => {
    return saveImageFromBuffer(Buffer.from(buffer), mimeType)
  })

}

function createWindow(): void {
  systemSessionEnding = false
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: APP_NAME,
    icon: getWindowIconPath(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })
  mainWindow = window
  rendererReady = false

  mainWindowCloseCoordinator = createWindowCloseCoordinator({
    requestCloseCheck: (requestId) => {
      if (!window.isDestroyed()) {
        window.webContents.send('app:close-requested', requestId)
      }
    },
    closeWindow: () => {
      if (!window.isDestroyed()) {
        window.close()
      }
    },
    onDecision: (allowClose) => {
      if (!allowClose) isQuitting = false
    },
  })

  window.webContents.on('render-process-gone', () => {
    rendererReady = false
    mainWindowCloseCoordinator?.cancelPendingRequest()
  })
  window.on('query-session-end', () => {
    systemSessionEnding = true
    isQuitting = true
  })
  window.on('close', (event) => {
    const action = resolveWindowCloseAction({
      systemSessionEnding,
      quitting: isQuitting,
      trayAvailable: Boolean(tray && !tray.isDestroyed()),
      rendererReady,
    })
    if (action === 'hide') {
      event.preventDefault()
      window.hide()
      return
    }
    if (action === 'confirm') {
      mainWindowCloseCoordinator?.handleClose(event)
    }
  })
  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null
      mainWindowCloseCoordinator = null
      rendererReady = false
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    window.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    focusMainWindow()
    const filePath = extractMarkdownFilePath(argv)
    if (filePath) sendOpenFileRequest(filePath)
  })

  app.on('open-file', (event, filePath) => {
    event.preventDefault()
    sendOpenFileRequest(path.resolve(filePath))
  })

  app.whenReady().then(() => {
    registerProtocol()
    registerIpcHandlers()
    const startupSettings = getSettingsStore().read().settings
    createWindow()
    installApplicationMenu()
    syncTrayIcon(startupSettings.showTrayIcon)

    const initialFilePath = extractMarkdownFilePath(process.argv)
    if (initialFilePath) {
      sendOpenFileRequest(initialFilePath)
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })
}

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

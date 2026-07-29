import { app, BrowserWindow, ipcMain, dialog, protocol, net, Menu } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createWindowCloseCoordinator } from './windowCloseCoordinator'
import {
  getAllNotes,
  addNote,
  updateNote,
  deleteNote,
  copyImage,
  saveImageFromBuffer,
  exportNoteFile,
} from './services/noteService'
import { hasManagedImages } from '../src/utils/markdownImageSize'

const APP_NAME = 'CHMarkDown'
const APP_USER_MODEL_ID = 'com.chmarkdown.desktop'

app.setName(APP_NAME)
if (process.platform === 'win32') {
  app.setAppUserModelId(APP_USER_MODEL_ID)
}

let mainWindow: BrowserWindow | null = null
let mainWindowCloseCoordinator: ReturnType<typeof createWindowCloseCoordinator> | null = null
let rendererReady = false

function requestMainWindowClose(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close()
  }
}

function installApplicationMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '退出',
          accelerator: 'Alt+F4',
          click: requestMainWindowClose,
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
              detail: 'Windows 本地 Markdown 笔记工具\n版本 0.1.0',
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
}

function registerIpcHandlers(): void {
  ipcMain.on('app:renderer-ready', (event) => {
    if (mainWindow && event.sender === mainWindow.webContents) {
      rendererReady = true
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

  // Export note
  ipcMain.handle('notes:exportNote', async (_event, noteId: string, noteTitle: string) => {
    if (!mainWindow) {
      throw new Error('应用窗口未就绪')
    }
    const hasImages = hasManagedImages(
      getAllNotes().find((n) => n.id === noteId)?.content || ''
    )
    const safeTitle = noteTitle.replace(/[<>:"/\\|?*]/g, '_') || '未命名笔记'
    const defaultExt = hasImages ? '.zip' : '.md'
    const filters = hasImages
      ? [{ name: 'ZIP 压缩包', extensions: ['zip'] }]
      : [{ name: 'Markdown 文件', extensions: ['md'] }]

    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出笔记',
      defaultPath: `${safeTitle}${defaultExt}`,
      filters,
    })
    if (result.canceled || !result.filePath) {
      return null
    }
    await exportNoteFile(noteId, result.filePath)
    return result.filePath
  })
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: APP_NAME,
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
  })

  window.webContents.on('render-process-gone', () => {
    rendererReady = false
    mainWindowCloseCoordinator?.cancelPendingRequest()
  })
  window.on('close', (event) => {
    if (rendererReady) {
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

app.whenReady().then(() => {
  registerProtocol()
  registerIpcHandlers()
  installApplicationMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

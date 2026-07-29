# 应用内确认弹窗与未保存修改处理实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 用 Vue 应用内异步确认弹窗替换所有 `window.confirm()`，并保证未保存笔记只有在真实保存成功、明确放弃或没有修改时才能离开。

**架构：** 在 `App.vue` 中挂载单例 `ConfirmDialog`，由 `useConfirm` 提供 Promise 风格结果；将未保存决策抽成无 DOM 依赖的纯异步函数。`NoteEditor` 通过异步保存 prop 等待 `NotesView` 的 IPC 结果，路由离开、笔记切换、新建和导出复用同一个保存入口。

**技术栈：** Electron 28、Vue 3、Vue Router 4、TypeScript、Vite 5、Vitest 1.6

---

## 文件结构

- 创建 `src/composables/useConfirm.ts`：维护单例确认状态和 Promise 解析。
- 创建 `src/components/ConfirmDialog.vue`：显示应用内遮罩、二至三个按钮及键盘取消行为。
- 创建 `src/utils/resolveUnsavedChanges.ts`：实现可独立测试的未保存决策状态机。
- 创建 `src/composables/useConfirm.test.ts`：验证确认请求解析和状态清理。
- 创建 `src/utils/resolveUnsavedChanges.test.ts`：验证保存、放弃、取消及失败分支。
- 修改 `src/App.vue`：挂载全局确认弹窗。
- 修改 `src/views/NotesView.vue`：统一笔记切换、新建、路由离开和持久化结果。
- 修改 `src/components/NoteEditor.vue`：等待真实保存结果并替换导出、删除确认。
- 修改 `src/components/TodoItem.vue`：替换待办删除确认。
- 修改 `package.json`、`package-lock.json`：加入 Vitest 和测试脚本。
- 修改 `node_modules/.package-lock.json`：保持仓库当前已跟踪的安装元数据一致；不提交新增依赖目录。

### 任务 1：建立 Vitest 回归测试入口

**文件：**
- 修改：`package.json`
- 修改：`package-lock.json`
- 修改：`node_modules/.package-lock.json`
- 创建：`src/composables/useConfirm.test.ts`
- 创建：`src/utils/resolveUnsavedChanges.test.ts`

- [ ] **步骤 1：安装测试依赖并添加脚本**

运行：

```powershell
npm install --save-dev vitest@1.6.1
```

在 `package.json` 的 scripts 中加入：

```json
"test": "vitest run"
```

- [ ] **步骤 2：编写确认状态失败测试**

创建 `src/composables/useConfirm.test.ts`：

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { useConfirm } from './useConfirm'

describe('useConfirm', () => {
  beforeEach(() => useConfirm().resolveConfirm('cancel'))

  it.each(['confirm', 'secondary', 'cancel'] as const)(
    'resolves %s and clears the active dialog',
    async (result) => {
      const { state, requestConfirm, resolveConfirm } = useConfirm()
      const pending = requestConfirm({
        title: '未保存修改',
        message: '请选择下一步操作',
        confirmText: '保存并离开',
        secondaryText: '放弃修改',
        cancelText: '取消',
      })

      expect(state.visible).toBe(true)
      resolveConfirm(result)

      await expect(pending).resolves.toBe(result)
      expect(state.visible).toBe(false)
    }
  )

  it('cancels the previous request when a new request replaces it', async () => {
    const { requestConfirm, resolveConfirm } = useConfirm()
    const first = requestConfirm({ title: '第一个', message: '第一个请求' })
    const second = requestConfirm({ title: '第二个', message: '第二个请求' })

    await expect(first).resolves.toBe('cancel')
    resolveConfirm('confirm')
    await expect(second).resolves.toBe('confirm')
  })
})
```

- [ ] **步骤 3：编写未保存决策失败测试**

创建 `src/utils/resolveUnsavedChanges.test.ts`，覆盖以下五个独立用例：

```ts
import { describe, expect, it, vi } from 'vitest'
import { resolveUnsavedChanges } from './resolveUnsavedChanges'

describe('resolveUnsavedChanges', () => {
  it('allows navigation without prompting when clean', async () => {
    const choose = vi.fn()
    const save = vi.fn()
    await expect(resolveUnsavedChanges({ dirty: false, choose, save })).resolves.toBe(true)
    expect(choose).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
  })

  it('allows navigation after a successful save', async () => {
    const save = vi.fn().mockResolvedValue(true)
    await expect(resolveUnsavedChanges({
      dirty: true,
      choose: async () => 'confirm',
      save,
    })).resolves.toBe(true)
    expect(save).toHaveBeenCalledOnce()
  })

  it('blocks navigation after a failed save', async () => {
    await expect(resolveUnsavedChanges({
      dirty: true,
      choose: async () => 'confirm',
      save: async () => false,
    })).resolves.toBe(false)
  })

  it('allows navigation without saving when changes are discarded', async () => {
    const save = vi.fn()
    await expect(resolveUnsavedChanges({
      dirty: true,
      choose: async () => 'secondary',
      save,
    })).resolves.toBe(true)
    expect(save).not.toHaveBeenCalled()
  })

  it('blocks navigation without saving when cancelled', async () => {
    const save = vi.fn()
    await expect(resolveUnsavedChanges({
      dirty: true,
      choose: async () => 'cancel',
      save,
    })).resolves.toBe(false)
    expect(save).not.toHaveBeenCalled()
  })
})
```

- [ ] **步骤 4：运行测试并验证红灯**

运行：

```powershell
npm test
```

预期：FAIL，错误指向缺少 `useConfirm` 和 `resolveUnsavedChanges` 模块；失败来自生产能力尚未实现，而不是测试语法错误。

### 任务 2：实现确认控制器和未保存决策

**文件：**
- 创建：`src/composables/useConfirm.ts`
- 创建：`src/utils/resolveUnsavedChanges.ts`
- 测试：`src/composables/useConfirm.test.ts`
- 测试：`src/utils/resolveUnsavedChanges.test.ts`

- [ ] **步骤 1：实现确认控制器最小 API**

`useConfirm.ts` 定义 `ConfirmResult`、`ConfirmOptions`、响应式 `state`、`requestConfirm()`、`resolveConfirm()` 和测试复位函数。新请求到达时，先以 `cancel` 解析旧请求；任意结果完成后将 `visible` 设为 `false` 并清空 resolver。

核心接口必须保持为：

```ts
export type ConfirmResult = 'confirm' | 'secondary' | 'cancel'

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  secondaryText?: string
  cancelText?: string
  danger?: boolean
}

export function useConfirm(): {
  state: Readonly<ConfirmState>
  requestConfirm: (options: ConfirmOptions) => Promise<ConfirmResult>
  resolveConfirm: (result: ConfirmResult) => void
}
```

- [ ] **步骤 2：实现未保存决策函数**

创建 `resolveUnsavedChanges.ts`：

```ts
import type { ConfirmResult } from '../composables/useConfirm'

interface ResolveUnsavedChangesOptions {
  dirty: boolean
  choose: () => Promise<ConfirmResult>
  save: () => Promise<boolean>
}

export async function resolveUnsavedChanges(
  options: ResolveUnsavedChangesOptions
): Promise<boolean> {
  if (!options.dirty) return true
  const result = await options.choose()
  if (result === 'secondary') return true
  if (result === 'confirm') return options.save()
  return false
}
```

- [ ] **步骤 3：运行测试验证绿灯**

运行：`npm test`

预期：两个测试文件全部通过，无未处理 Promise。

- [ ] **步骤 4：提交状态逻辑**

```powershell
git add package.json package-lock.json node_modules/.package-lock.json src/composables/useConfirm.ts src/composables/useConfirm.test.ts src/utils/resolveUnsavedChanges.ts src/utils/resolveUnsavedChanges.test.ts
git commit -m "test: 覆盖未保存修改决策"
```

### 任务 3：实现全局应用内确认弹窗

**文件：**
- 创建：`src/components/ConfirmDialog.vue`
- 修改：`src/App.vue`
- 测试：`src/composables/useConfirm.test.ts`

- [ ] **步骤 1：创建确认弹窗组件**

组件使用 `Teleport to="body"`，仅在 `state.visible` 时渲染固定遮罩。结构包含 `role="dialog"`、`aria-modal="true"`、标题、说明、可选次操作、取消和主操作按钮；主操作在 `danger` 时使用危险色。

交互规则：

```ts
const { state, resolveConfirm } = useConfirm()
const cancelButtonRef = ref<HTMLButtonElement | null>(null)

watch(() => state.visible, async (visible) => {
  if (visible) {
    await nextTick()
    cancelButtonRef.value?.focus()
  }
})

onUnmounted(() => resolveConfirm('cancel'))
```

遮罩自身点击和 Escape 均调用 `resolveConfirm('cancel')`，弹窗卡片内部点击不得冒泡取消。

- [ ] **步骤 2：在根组件挂载一次**

`App.vue` 导入 `ConfirmDialog`，在 `Toast` 之后加入：

```vue
<ConfirmDialog />
```

- [ ] **步骤 3：运行测试、类型检查和构建**

运行：

```powershell
npm test
npm exec vue-tsc -- --noEmit
npm run build
```

预期：测试、类型检查和构建均通过。

- [ ] **步骤 4：提交弹窗组件**

```powershell
git add src/App.vue src/components/ConfirmDialog.vue
git commit -m "feat: 添加应用内确认弹窗"
```

### 任务 4：修复笔记保存和离开流程

**文件：**
- 修改：`src/components/NoteEditor.vue`
- 修改：`src/views/NotesView.vue`
- 测试：`src/utils/resolveUnsavedChanges.test.ts`

- [ ] **步骤 1：将编辑器保存改为可等待结果**

`NoteEditor` props 新增：

```ts
saveNote: (data: { id: string; title: string; content: string }) => Promise<boolean>
```

移除 `save` emit，保留 `delete` emit。`handleSave()` 返回 `Promise<boolean>`，在无笔记时返回 `false`，未修改时返回 `true`，保存过程中复用同一个 Promise。捕获保存开始时的标题和正文快照；只有保存成功且当前值仍与快照相同时才清除 dirty 状态。

保存按钮在保存中禁用，并显示“保存中…”。`defineExpose` 暴露 `isDirty` 和异步 `save: handleSave`。

- [ ] **步骤 2：修复导出和删除确认**

导出有未保存修改时调用 `requestConfirm()`，按钮为“保存并导出”和“取消”。只有选择主操作且 `await handleSave()` 返回 `true` 时才调用 `exportNote`，删除固定 100ms 延时。

笔记删除时调用危险样式确认弹窗，只有结果为 `confirm` 才 emit delete。

- [ ] **步骤 3：让父级返回真实保存结果**

`NotesView.handleSave()` 改为 `Promise<boolean>`，明确让保存失败阻止后续操作：

- IPC 成功：更新列表、显示成功 toast、返回 `true`。
- IPC 失败：保留错误、显示 error toast、记录错误、返回 `false`。

模板将 `@save="handleSave"` 改为 `:save-note="handleSave"`。

- [ ] **步骤 4：统一切换、新建和路由离开检查**

新增 `canLeaveCurrentNote()`，调用 `resolveUnsavedChanges()`。确认弹窗文字固定为：

- 标题：“存在未保存的修改”
- 说明：“保存当前笔记后再继续，或放弃这些修改。”
- 主操作：“保存并离开”
- 次操作：“放弃修改”
- 取消：“取消”

`trySelectNote()` 和 `tryCreateNote()` 改为 async；选择当前 ID 直接返回。使用：

```ts
onBeforeRouteLeave(() => canLeaveCurrentNote())
```

确保侧栏导航也经过同一判断。

- [ ] **步骤 5：验证笔记流程**

运行：

```powershell
npm test
npm exec vue-tsc -- --noEmit
```

预期：全部通过，保存函数类型为 `Promise<boolean>`，路由守卫接受异步结果。

- [ ] **步骤 6：提交笔记修复**

```powershell
git add src/components/NoteEditor.vue src/views/NotesView.vue
git commit -m "fix: 正确处理未保存笔记"
```

### 任务 5：替换待办删除确认并完成回归

**文件：**
- 修改：`src/components/TodoItem.vue`
- 修改：`dist/index.html`
- 替换：`dist/assets/` 中由 Vite 生成的带哈希 CSS 和 JavaScript 文件
- 修改：`dist-electron/main.js`
- 修改：`dist-electron/preload.js`
- 替换：`dist-electron/` 中由 Vite 生成的带哈希 JavaScript 分块

- [ ] **步骤 1：替换待办删除确认**

`TodoItem` 导入 `useConfirm`，将 `handleDelete()` 改为 async。显示危险样式弹窗，标题“删除待办事项”，说明“删除后无法恢复，确定要继续吗？”，主操作“删除”，取消操作“取消”；只有 `confirm` 才 emit delete。

- [ ] **步骤 2：确认业务源码不再使用原生确认**

运行：

```powershell
rg -n "window\.confirm|window\.alert|window\.prompt" src electron
```

预期：无匹配，`rg` 退出码为 1。

- [ ] **步骤 3：运行完整验证**

运行：

```powershell
npm test
npm exec vue-tsc -- --noEmit
npm run build
git diff --check
```

预期：所有测试通过、类型检查退出 0、Vite 三段构建退出 0、差异检查退出 0。

- [ ] **步骤 4：检查范围和安全配置**

确认：

- `contextIsolation: true` 未改变。
- `nodeIntegration: false` 未改变。
- 没有新增运行时依赖。
- 本地 JSON 和图片 IPC 接口未改变。
- 仅剩基线之前已有的未跟踪 `node_modules` 目录噪音。

- [ ] **步骤 5：提交最终修复**

```powershell
git add src/components/TodoItem.vue dist dist-electron
git commit -m "fix: 避免原生确认框导致焦点失效"
```

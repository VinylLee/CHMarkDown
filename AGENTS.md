# AGENTS.md

## 项目目标

FlowDesk 是一个 Windows 本地效率工具。

第一版只实现：

- 待办事项
- Markdown 灵感记录
- 本地数据保存
- 本地图片插入

## 开发前要求

开始任务前先阅读：

- `docs/PRD.md`
- `docs/TECH_DESIGN.md`
- `docs/TASKS.md`
- 与当前任务相关的代码

修改前先说明：

1. 准备完成什么
2. 准备修改哪些文件
3. 如何验证结果

## 技术约束

- 使用 Electron、Vue 3、TypeScript 和 Vite
- 使用本地 JSON 文件保存数据
- 图片复制到应用自己的数据目录
- 不增加后端服务
- 不增加登录和云同步
- 不擅自更换技术栈
- 新增依赖前说明原因

## 修改规则

- 每次只完成用户指定的一个阶段
- 完成后停止，不自动进入下一阶段
- 不修改与当前任务无关的文件
- 不提前开发后续功能
- 不删除已有功能
- 不进行无关的大规模重构
- 优先采用简单实现

## Electron 安全规则

- 保持 `contextIsolation: true`
- 渲染进程不得直接访问 Node.js
- 本地文件操作必须通过 preload 和 IPC 完成
- 不得为了方便关闭安全配置

## 代码要求

- TypeScript 类型明确
- 组件职责清晰
- 错误不能静默忽略
- 用户可感知的失败需要显示提示
- 不为暂未提出的功能提前设计复杂扩展

## 测试要求

每次完成任务后：

- 运行类型检查
- 运行项目构建
- 测试当前阶段功能
- 检查已有功能是否受到影响

## GitHub 上传与发版流程

### 方式一：推送日常迭代

提交日常代码到 `main` 分支，自动触发 CI（测试 + 构建）：

```bash
git add .
git commit -m "feat: xxx"
git push
```

CI 会自动运行测试和构建，验证代码没问题。

### 方式二：发布新版本

一行命令完成版本升级 + 打 tag + 推送 + 触发 Release：

```bash
npm run release
```

等价于手动执行：

```bash
# 1. 升级版本号（patch），自动 commit
npm version patch --no-git-tag-version
git add package.json
git commit -m "chore: bump version"

# 2. 打 tag
git tag v$(node -p "require('./package.json').version")

# 3. 推送代码和 tag
git push
git push --tags
```

推送 tag 后 GitHub Actions 会自动：
1. 运行测试和构建（CI）
2. 打包成便携版 `.exe`
3. 创建 Release（草稿），附件含 `.exe`、`.zip`、`.7z`

> 去 GitHub 仓库 Releases 页面找到草稿，确认后点 **Publish release** 即可正式发布。

### 版本号规则

| 命令 | 版本变化 | 示例 |
|------|---------|------|
| `npm run version:patch` | 修复性发布 | 1.0.0 → 1.0.1 |
| `npm run version:minor` | 新增功能 | 1.0.0 → 1.1.0 |
| `npm run version:major` | 重大更新 | 1.0.0 → 2.0.0 |

## 完成后的汇报格式

1. 修改了哪些文件
2. 实现了什么
3. 如何测试
4. 是否存在未解决问题

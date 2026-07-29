# FlowDesk

Windows 本地效率工具 — 管理待办事项与灵感笔记，一切数据保存在本地。

## 功能

**待办事项**
- 新增、编辑、删除待办
- 高/中/低三级优先级标记
- 截止日期设置与按日期筛选
- 完成/未完成状态切换
- 删除前确认

**灵感笔记**
- 新建、编辑、删除笔记
- Markdown 书写与实时预览
- 插入本地图片，由应用统一管理存储
- 按最后修改时间排列

**通用能力**
- 系统托盘常驻，后台快速唤醒
- 未保存自动提示
- 窗口关闭二次确认
- 暗色主题适配

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Electron 28 |
| 前端 | Vue 3 + Vue Router |
| 构建 | Vite 5 |
| 语言 | TypeScript |
| 打包 | electron-builder（便携版） |
| 存储 | 本地 JSON 文件 |
| 测试 | Vitest |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发模式
npm run dev

# 运行测试
npm test

# 构建
npm run build
```

## 打包

```bash
# 打包为 Windows 便携版 exe
npm run package:portable

# 输出在 release/ 目录
```

## 推送与发版

详见 [AGENTS.md](AGENTS.md) 中的 GitHub 上传与发版流程。

## License

MIT

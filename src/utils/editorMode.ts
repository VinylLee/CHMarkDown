/**
 * 决定切换文档后编辑器应使用的显示模式。
 *
 * 默认打开模式只在程序启动后的第一个文档上生效；此后切换文档时保持用户
 * 当前使用的模式，避免每次切换都回到默认视图。
 */
export function resolveDocumentSwitchMode(
  hasAppliedDefaultMode: boolean,
  currentMode: EditorMode,
  defaultMode: EditorMode,
): EditorMode {
  return hasAppliedDefaultMode ? currentMode : defaultMode
}

---
name: chapter-html-integration
description: 将 knowledge_graph 下的章节 HTML 融合进对应章节场景，并统一为 NeuroTrip 第一章控制台风格。
---

# Chapter HTML Integration Skill

## 目标
将外部 HTML 知识图谱嵌入章节场景，替换旧模块区域，并满足交互与视觉统一要求。

## 约束
1. 章节源文件路径使用 knowledge_graph/<chapter>_graph.html。
2. 风格统一到第一章控制台（深色、边框、字体、信息密度）。
3. 支持图谱交互：
- 滚轮缩放
- 双击复位缩放
- 点击节点展示详情
- 点击空白恢复概览
4. 不破坏原章节路由和 SceneFrame 流程。

## 实施步骤
1. 新建组件
- 在 src/scenes/<ChapterScene>/components 下新增 <GraphName>.tsx。
- 使用 import rawHtml from '../../../../knowledge_graph/<file>.html?raw'。
- 用 iframe + srcDoc 嵌入，并注入 style/script 覆写统一主题。

2. HTML 适配
- 在源 HTML 中确保图谱脚本有以下行为：
- 节点点击 select(node)
- 空白点击 clearSelection() + 恢复默认侧栏
- wheel 事件执行 setZoomAtClient(...)
- dblclick 执行 resetZoom()
- toSvg 使用当前 viewBox 坐标映射

3. 场景替换
- 在章节主场景中删除被替代模块（例如 D-04/E-05）。
- 插入新的 TerminalWindow（或等效容器）承载图谱组件。
- 若是双窗合并为单窗，需要同步改 grid-template-areas。

4. 样式统一
- 新增容器样式：frame 边框、背景、圆角、最小高度。
- 统一文案层级：标题、副标题、操作提示。
- 英文模式下按需替换 HTML 内静态中文提示。

5. 验证
- npm run build
- npm test
- get_errors 检查改动文件

## 最小模板
```tsx
import rawHtml from '../../../../knowledge_graph/vision_graph.html?raw'

const srcDoc = `${rawHtml}\n<style>/* theme override */</style>\n<script>/* patch */</script>`

export const GraphFrame = () => {
  return <iframe srcDoc={srcDoc} sandbox="allow-scripts allow-same-origin" />
}
```

## 章节扩展建议
1. 每章一个 HTML：vision/fear/language/memory/sleep。
2. 每章一个组件 + 一个窗口容器类名，避免 CSS 互相污染。
3. 章节内的“恢复概览”文案统一，降低学习成本。

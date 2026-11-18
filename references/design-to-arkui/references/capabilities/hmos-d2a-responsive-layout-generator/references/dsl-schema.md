# DSL Schema 定义

## 输入DSL格式（嵌套树结构）

```typescript
// ArkUI 嵌套树格式的输入DSL
interface NestedInputDSL {
  page: {
    name: string // 页面名称
    width: number // 页面宽度
    height: number // 页面高度
  }
  ui: {
    styles?: {
      // 容器样式（可选）
      width?: number | string
      height?: number | string
      padding?: number | string | PaddingValue
      margin?: number | string | MarginValue
      backgroundColor?: string
    }
    children: Array<ComponentNode> // 组件嵌套树
  }
}

interface ComponentNode {
  id?: string // 组件标识（可选，若无则按"深度-序号"自动生成）
  componentName: string // 组件类型（Text, Button, Image, Column, Row等）
  meta?: {
    bbox?: [number, number, number, number] // [x1, y1, x2, y2] 绝对位置
    octoId?: string // 原始ID
    mergedFrom?: object // 多模态合并来源
  }
  styles?: Record<string, any> // 样式属性（fontColor, backgroundColor等）
  content?: string // 文本内容
  src?: string // 图片路径
  children?: Array<ComponentNode> // 子组件（容器组件）
}
```

## 响应式DSL输出格式（嵌套树结构）

```typescript
interface ResponsiveNestedDSL {
  metadata: { version: string; generator: string; timestamp: string; source: string }
  page: { name: string; width: number; height: number }
  layoutStrategy: LayoutStrategy // 根容器的布局策略
  ui: {
    styles?: { width?: any; height?: any; padding?: any; margin?: any; backgroundColor?: string }
    children: Array<ResponsiveComponentNode> // 响应式增强后的组件树
  }
  breakpoints: Array<BreakpointConfig>
  warnings: Array<string>
  suggestions: Array<string>
}

interface ResponsiveComponentNode {
  id: string // 唯一标识（自动生成）
  componentName: string // 组件类型
  meta?: { bbox?: [number, number, number, number]; octoId?: string }
  styles?: Record<string, any> // 原始样式保留
  content?: string
  src?: string
  layoutStrategy?: LayoutStrategy // 仅容器组件（Column/Row/Grid/Stack等）有
  responsive?: {
    // 响应式配置
    width: DimensionStrategy
    height: DimensionStrategy
    position?: PositionStrategy
    margin?: MarginStrategy
    padding?: PaddingStrategy
    breakpointOverrides?: Record<string, Partial<ResponsiveComponentNode["responsive"]>>
  }
  children?: Array<ResponsiveComponentNode> // 子组件
}

interface LayoutStrategy {
  type: "flex" | "grid" | "stack" | "mixed"
  direction?: "row" | "column"
  alignment?: { horizontal: string; vertical: string }
  wrap?: boolean
  gap?: number
  gridConfig?: { columns: string; rows: string; columnGap: number; rowGap: number }
}
```

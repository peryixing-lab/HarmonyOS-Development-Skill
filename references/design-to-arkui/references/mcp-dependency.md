# MCP 依赖检查（Pixso / Figma 路径前置门禁）

## 作用

进入 Pixso 或 Figma 路径前，先确认当前会话具备对应 MCP 工具；不具备时给出安装/配置引导并停止（**只给指引，不代装**）。

检查发生两个时机：

1. **入口**（**来源可判定后、需求澄清之前**）：见入口文档「MCP 依赖检查」；依赖不满足时直接停止并给出安装引导，**不进入需求澄清提问**；只有满足（或 Pixso 开发者直供豁免）后才澄清并 `init`。
2. **阶段 1**（复核并把结果落盘 `inputs-manifest.json.mcpDependencyCheck`）：见四条 `01-*` 阶段文件的「MCP 依赖检查」段。

## 依赖一览

| 设计来源 | 能力工具（官方名） | 会话中实际工具名 | 接入方式 |
|---|---|---|---|
| pixso | `get_node_dsl` / `get_screenshot` / `get_export_image` 等 | 会话中工具名 = 配置的服务器名 + 下划线 + 官方名，如 `pixso-mcp_get_node_dsl` | Pixso MCP（本地或远程，见下） |
| figma | `figma_to_code_convert` / `figma_to_code_fetch_screenshot` | 会话中工具名 = 服务器名 + 下划线 + 官方名，如 `anchor-d2c-mcp_figma_to_code_convert` | Anchor MCP（见下） |

接入端点与启动方式：

- Pixso MCP 本地形态：客户端内置，连接 `http://127.0.0.1:3667/mcp`
- Pixso MCP 远程形态：云端，连接 `https://pixso.cn/mcp`
- Anchor MCP：`npx -y anchor-d2c-mcp@latest stdio`

本地 / 远程任一满足即可（详见「引导」）。

## 检查方法（只问一句）

按「依赖一览」表的能力工具在会话工具列表中识别，**不绑定前缀**（前缀任意，实际名为 `服务器名_官方名`）：

- pixso：名称含 `get_node_dsl` / `get_screenshot` / `get_export_image` 等
- figma：名称含 `figma_to_code_`

- 有 → **满足**（satisfied），继续流程。
- 没有 → **不满足**，按下方引导停止。

为判定**不需要**运行 `deveco mcp list`、读取配置文件或探测端点——工具列表就是判定依据。若要向用户说明原因，可建议用户自查 `deveco mcp list`（未配置 / 被禁用 / 连接失败都会使工具不出现，用户据此修复）。

## 引导（给指引，不代装）

只提供就绪命令 / 配置片段 + 官方来源链接，**不代替用户执行安装**（安装是系统级操作，且装后需重启/重连 deveco 才生效）。

**展示要求：给用户展示时，每种接入方式必须一并给出其官方来源链接**：本地 → [Pixso 本地 MCP 官方文档](https://pixso.cn/developer/zh/mcp/local-mcp.html)；远程 → [Pixso 远程 MCP 官方文档](https://pixso.cn/developer/zh/mcp/remote-mcp.html)；Anchor（Figma）→ [anchor-d2c-mcp 源码](https://gitcode.com/OpenHarmonyToolkitsPlaza/anchor-d2c-mcp)。不得只给其中部分。

**通用收尾**：配置/装好并认证后，重启或重连 deveco，再对工作流说"继续"——会重新执行检查并按新状态放行或继续引导。

### Pixso 缺失：本地 / 远程二选一（命令或手动配置皆可）

**配置文件位置（手动配置方式）**：deveco 配置文件名是 `deveco.json`（或 `deveco.jsonc`，后者支持注释），可放在**全局 `~/.config/deveco/`** 或**项目根 / `.deveco/`**。把下列模板中的 `mcp` 键加入配置文件顶层（文件不存在则先建 `{}`；若已有 `mcp` 键，把模板里的条目并进去），保存后**重启/重连 deveco**。

**本地（客户端）**：

> 注：deveco 配置中 URL 型 MCP 记为 `remote`，本地客户端地址（`http://127.0.0.1:3667/mcp`）同样是 URL 型，与远程共用 `remote` 类型。

- 命令：`deveco mcp add pixso-mcp --url http://127.0.0.1:3667/mcp`
- 手动配置模板：

  ```jsonc
  {
    "mcp": {
      "pixso-mcp": {
        "type": "remote",
        "url": "http://127.0.0.1:3667/mcp"
      }
    }
  }
  ```

- 前提（官方）：安装并登录 Pixso 客户端（≥ 2.2.0），打开目标设计文件，在文件**顶栏左上角「MCP 配置入口」开启本地 MCP 开关**；默认端口 3667 非固定，与 IDE 插件双开时客户端会递增到 3668 等，以客户端实际显示为准；使用期间保持客户端打开登录、目标文件页签激活，账号需全功能/研发席位与文件查看权限。

**远程（免开客户端，认证二选一）**：

- 命令：`deveco mcp add pixso-mcp --url https://pixso.cn/mcp` → `deveco mcp auth pixso-mcp`（OAuth 2.1，推荐）；令牌方式见下方
- 手动配置模板（**OAuth 2.1 授权**，保存后运行 `deveco mcp auth pixso-mcp` 完成授权）：

  ```jsonc
  {
    "mcp": {
      "pixso-mcp": {
        "type": "remote",
        "url": "https://pixso.cn/mcp"
      }
    }
  }
  ```

- 手动配置模板（**个人访问令牌**，适合企业/自动化/无浏览器场景；令牌在 Pixso 工作台「用户中心 → 个人访问令牌」生成，见官方 remote-mcp 文档；**经环境变量引用、不写明文**；先设置环境变量 `PIXSO_TOKEN`）：

  ```jsonc
  {
    "mcp": {
      "pixso-mcp": {
        "type": "remote",
        "url": "https://pixso.cn/mcp",
        "headers": { "Token": "{env:PIXSO_TOKEN}" }
      }
    }
  }
  ```

  环境变量设置示例：Windows `setx PIXSO_TOKEN "你的令牌"`（新终端生效）；macOS/Linux `export PIXSO_TOKEN="你的令牌"`（可写入 `~/.zshrc` 等以持久）。令牌只经环境变量注入，**不得把令牌明文写进配置文件、命令或对话**；使用/测试后建议删除该 MCP 条目，或在 Pixso 用户中心撤销令牌。

- 目标需用**图层链接**（含 item-id）。

### Figma 缺失（Anchor MCP）

接入方式二选一（Node.js ≥ 20.18；官方源码 [anchor-d2c-mcp](https://gitcode.com/OpenHarmonyToolkitsPlaza/anchor-d2c-mcp)）。两种方式都需先配置环境变量 `FIGMA_ACCESS_TOKEN`（必填；Windows `setx FIGMA_ACCESS_TOKEN "figd_xxx"`，macOS/Linux `export FIGMA_ACCESS_TOKEN="figd_xxx"`；**不得把 token 明文写入命令、manifest、报告或回复**）。

**方式 A · 免安装（推荐，跟随版本）**——不装包，注册时由 deveco 自动下载运行：

- 命令注册（交互式）：`deveco mcp add`（不带名字）→ 按提示选 Location，name 填 `anchor-d2c-mcp`，类型选 **Local**，粘贴 `npx -y anchor-d2c-mcp@latest stdio`（CLI 不支持 `-- <命令数组>` 形态，一律用交互式注册或下方手动配置模板）
- 手动配置模板：

  ```jsonc
  {
    "mcp": {
      "anchor-d2c-mcp": {
        "type": "local",
        "command": ["npx", "-y", "anchor-d2c-mcp@latest", "stdio"],
        "environment": { "FIGMA_ACCESS_TOKEN": "{env:FIGMA_ACCESS_TOKEN}" },
        "timeout": 600000
      }
    }
  }
  ```

**方式 B · 全局安装（版本可控、启动快）**：

- 命令：先安装 `npm install -g anchor-d2c-mcp`（README 原文为 `pnpm`，等价换算），再交互式注册：`deveco mcp add`（不带名字）→ 类型选 **Local** → 粘贴 `anchor-d2c-mcp stdio`（手动配置时把下方模板的 `command` 改为 `["anchor-d2c-mcp", "stdio"]`）
- 手动配置模板（`command` 用本地命令）：

  ```jsonc
  {
    "mcp": {
      "anchor-d2c-mcp": {
        "type": "local",
        "command": ["anchor-d2c-mcp", "stdio"],
        "environment": { "FIGMA_ACCESS_TOKEN": "{env:FIGMA_ACCESS_TOKEN}" },
        "timeout": 600000
      }
    }
  }
  ```

- 调用失败按返回码引导：`missing_figma_access_token`（未配 token）/ `figma_http_401`（token 无效或过期，重新生成）/ `figma_http_403`（对该文件无权限）/ `figma_http_404`（URL 或 node-id 不存在）/ `figma_http_429`（限流，稍后重试）。
## 豁免

Pixso 路径下开发者直接提供 DSL JSON / 截图 / 本地资源、全程不调用 MCP 时，检查记录 `not-applicable` 并继续；其余情况不满足时停止。

## 落盘字段（阶段 1）

写入运行目录下的 `inputs-manifest.json.mcpDependencyCheck`：

- `satisfied`：允许继续获取 DSL/JSX。
- `not-satisfied`：按「引导」停止，blocked reason-code `dependency_unavailable`；`guidance` 填已给出的安装/配置建议。
- `not-applicable`：仅 Pixso 开发者提供输入场景，允许继续。

`evidence` 只记录从会话工具列表可直接得出的事实（检查了多少个工具、识别到哪些能力工具），与「只问一句、不读配置不探测端点」的检查口径一致；需要向用户说明失败原因时，由用户自查 `deveco mcp list`（未配置 / 被禁用 / 连接失败都会使工具不出现）。

```json
"mcpDependencyCheck": {
  "designSource": "pixso | figma",
  "requiredMcpServers": ["pixso-mcp | anchor-d2c-mcp"],
  "requiredToolPrefixes": ["<会话实际工具名前缀，如 pixso-mcp_ / anchor-d2c-mcp_>"],
  "status": "satisfied | not-satisfied | not-applicable",
  "evidence": {
    "inspectedToolCount": 0,
    "foundToolNames": ["<识别到的能力工具名，如 pixso-mcp_get_node_dsl>"]
  },
  "guidance": ""
}
```

# MasterGo MCP 接入

先确认使用网页版、桌面客户端还是企业私有化版本。网页登录本身不等于已授权 Magic MCP。

已有用户明确选择且可用的 MCP 时直接复用。首次接入默认依次尝试 Magic → Vibe → 社区插件：先引导配置 Magic 的个人访问令牌，并实际读取目标设计；Magic 不适用或无法完成目标取数时，再检查 MasterGo 桌面客户端及 Vibe 服务。仅使用网页版且没有可用桌面客户端时，跳过 Vibe。配置错误、服务未启动等问题先修复，不把工具列表可访问当作目标设计可读。两条官方通道均不适用或无法完成目标取数时，再说明原因并引导用户选择社区插件。Magic 的团队版要求不作为 Vibe 或全部官方 MCP 的统一门槛。社区插件继续沿用账号的文件权限和团队策略，不绕过权限限制。

## 工作流调用方式：独立 skill 脚本

本适配不向 Code 注册内置工具，也不要求在 Code 的 MCP 列表中注册服务。Code 通过现有命令执行能力运行 skill 脚本，脚本使用安装在外部目录的 MCP SDK，直接连接官方或社区服务。不要修改 Code 核心、工具注册表或模型工具权限实现。

助手先检查 Node.js 22.16+ 和 npm，在用户配置目录旁的独立 runtime 目录安装固定依赖，已有版本匹配时复用。`<runtime>`、`<skillRoot>` 均替换为绝对路径；Windows 使用实际盘符路径并给含空格路径加引号。安装过程沿用 Code 现有命令执行审批，不在技能提取目录或目标工程中写 node_modules。

```sh
npm install --prefix "<runtime>" --save-exact @modelcontextprotocol/sdk@1.29.0
```

连接信息保存到用户配置目录中的独立 `connection.json`，字段见下面各方案。它是单个连接描述，不是完整的 Code 配置文件。复用已授权的现有配置时，只提取对应连接的 type、command、environment 或 url、headers，并补上 server 名；不覆盖 Code 配置、不读取并输出令牌。environment 和 headers 的值只支持 `{env:NAME}` 引用，不支持内联密钥、配置继承或远程 OAuth 登录。禁用的配置必须保留 `enabled: false`，不能换通道绕过用户的禁用决定。

连接配置就绪并初始化 MasterGo 阶段 1 后，以以下内容创建 `<capture-config.json>`：

```json
{
  "operation": "tools",
  "server": "mastergo-magic",
  "runDir": ".deveco/design-to-arkts-fast/runs/<runId>"
}
```

在目标工程目录执行：

```sh
node "<skillRoot>/scripts/mastergo-capture.mjs" --config "<capture-config.json>" --connection "<connection.json>" --runtime "<runtime>"
```

脚本校验阶段、路径和只读规则后才建立连接；`tools` 返回实际服务中符合白名单的工具和 schema。允许 Magic 的 `getDesignSections`、`getDsl`、`getD2c`、`getDesignSvgs`、`getMeta`；Vibe 的 `get_frontend_code`、`get_selection_node`、`get_selection_code`、`get_screenshot`、`get_selection_image`、`get_variables`；社区的四个 `mastergo_api_*` 工具。使用实际工具名，兼容 `mcp_` / `mcp__` 前缀。

每次读取将配置改为 `{operation:"read",server,runDir,tool,arguments}`，再运行同一命令。脚本一次完成参数归一化、连接、调用和原始响应落盘；stdout 返回 `requestPath`、`responsePath`、`sha256`、`outputDir`、`isError`，不输出完整设计数据。归一化请求和响应均以私有文件保存，不覆盖不同内容；错误响应保留但退出非零，不能作为成功设计输入。随后使用 `mastergo-source.mjs` 导入和 Controller 校验。

脚本遵循命令执行权限，不复用 Code 内部 MCP 会话、MCP 单工具授权或插件钩子；不得把命令审批描述成 MCP 逐工具审批。用户明确禁止的服务、工具或数据访问同样不能通过脚本调用。只读限制由脚本及社区服务执行，脚本将证据输出限制在本次 run 内；命令执行本身不是操作系统级文件沙箱。每次命令创建独立客户端，在成功、失败或可处理的中断后关闭连接及其启动的 stdio 子进程；社区常驻服务和 MasterGo 插件仍由独立启动器管理，不随单次取数退出。

## 默认优先：Magic MCP

官方 Magic 文档要求账号为团队版及以上、设计文件位于有访问权限的团队。还需要 Node.js 18+、npm 8+，以及个人设置 → 安全设置生成的个人访问令牌。令牌由用户保存在本机环境变量 `MG_MCP_TOKEN`，不要粘贴到聊天、工程或设计产物中。

在同一 runtime 安装固定官方包：

```sh
npm install --prefix "<runtime>" --save-exact @mastergo/magic-mcp@0.2.10
```

独立 `connection.json` 示例：

```json
{
  "server": "mastergo-magic",
  "type": "local",
  "command": ["node", "<runtime>/node_modules/@mastergo/magic-mcp/dist/index.js", "--url=https://mastergo.com"],
  "environment": { "MG_MCP_TOKEN": "{env:MG_MCP_TOKEN}" },
  "enabled": true
}
```

使用安装包 package.json 的真实 bin 入口；本示例适用于固定 Magic 版本。用 Node 执行入口文件，避免 Windows 的 npx.cmd/shell 差异。环境变量由用户在运行 Code 的本机环境中设置，不传入命令行、capture 配置或设计产物。已有明确选择的官方连接优先复用其授权与安装目录；脚本仍独立建立客户端连接。

## 第二选择：Vibe MCP

需要 MasterGo 客户端已启动、文件已打开且 MCP 连接启用，不需要个人令牌。官方 Vibe 文档的准备项未列出会员或团队版门槛；按实际客户端连接和工具读取结果判断可用性，不据此承诺所有账号均免费或可用。

在 runtime 安装 `@mastergo/vibe-mcp@1.0.31`，从安装包 package.json 的 bin 字段取得实际 JavaScript 入口；以 Node 执行该入口，并传入 `--url=http://localhost:30678`。connection.json 使用 `server: "mastergo-vibe"`、`type: "local"`、上述 command 数组、`enabled: true`，不需要令牌。不要猜入口文件名或改为执行 Windows `.cmd` 文件。

本机端口可能变化，使用客户端显示的实际地址。官方帮助页中的旧工具名 `get_selection_code` / `get_selection_image` 在 1.0.31 已变为 `get_selection_node` / `get_frontend_code` / `get_screenshot`，必须先读取实际 tools schema，不能盲猜调用。

## 用户选择的社区插件 MCP

已实测的社区实现为 https://github.com/burnice-cn/mastergo-mcp-server ，固定提交 `0b710a4b9d8f580ccd91945b0328b22b7e398f51`，MIT。它通过普通插件 API 连接当前画布，本机 Streamable HTTP 地址为 `http://127.0.0.1:3000/mcp`，WebSocket 为 `ws://127.0.0.1:3000/bridge`。能否加载和导出仍取决于实际账号、文件权限与团队插件策略，不保证适用于所有套餐或私有版本。

助手按 `community/README.md` 下载固定提交、应用随包补丁并构建服务和插件，再用 `scripts/mastergo-community-start.mjs` 启动本机服务；启动器自动生成或复用私有配对凭据。已有安装时先复用，不要求客户手工处理依赖。

- 桌面客户端：可以导入构建后的 `mastergo-api-bridge/plugin/manifest.json` 并运行，本地调试无需发布到团队。
- 网页版：不能导入本地开发插件，需要先由发布者把插件发布到团队，再由成员在团队插件列表中找到并运行。团队发布后的网页版入口已由用户实际确认；每位成员仍需在自己的电脑上运行 DevEco 本机服务，并检查当前浏览器能否完成本机连接、节点读取和资源导出。

更新既有插件保留 manifest `id`，从原开发插件发布更新；修改本地文件不会自动更新团队已发布版本。团队发布与更新由有相应权限的发布者完成。

首次点击“连接 DevEco Code”，在本机系统确认框核对配对码后由用户点击“允许连接”；不要求用户获取个人 Token 或复制本机口令。本机服务直接弹出系统确认框，无需网页跳转；无法弹出时明确报错，保留手动连接兼容入口。配对后按当前文件保存本机连接，重新运行自动连接；主动断开会清除本机记录。助手不能代替用户提交真实配对确认。手动口令入口仅用于兼容。服务绑定 loopback，发布包不内嵌凭据。团队发布只是分发插件，每位成员仍需启动本机服务。

“后台运行”隐藏面板，可通过 `mastergo_connection_panel(action=show)` 唤回原实例。从插件菜单重新运行可能重启实例，此时自动恢复会建立新连接；点击 × 仍会结束插件。不要把重启后恢复等同于全程不断连。

社区 connection.json 使用：

```json
{
  "server": "mastergo-community",
  "type": "remote",
  "url": "http://127.0.0.1:3000/mcp",
  "enabled": true
}
```

同一脚本通过 Streamable HTTP 连接常驻服务。`tools` 发现四个 mastergo_api_* 工具，`read` 执行 mastergo_api_scheme、mastergo_api_call 请求。只允许白名单中的文档/节点读取与公开导出方法，拒绝 node.remove 和任意执行代码；node.export / node.exportAsync 的 maxBytes 固定为 3 MiB。先读取 mg.document、mg.getNodeById、node.findAll 核对文档及目标，再导出同一节点的 PNG 和资源。原始响应与实际调用参数一起落盘，导入契约使用 community/nodes，见 input-contract.md。

面板唤回 `mastergo_connection_panel` 属于连接管理操作，不在设计取数白名单内；使用已有外部 MCP 配置的管理工具，或在 MasterGo 菜单重新运行插件恢复连接，不扩大取数脚本白名单。

上游二进制序列化使用了沙箱没有的 btoa；随包补丁已改用纯 JavaScript Base64 编码，此修复此前通过真实 PNG 导出复核。不能把浏览器可用的 btoa 或 Node Buffer 假定为插件沙箱全局。上游精简节点摘要未提供完整字体、填充与组件属性，须结合真实截图和资源分析，缺失信息明确记录。一键配对与重启恢复已覆盖自动化测试，真实客户端验收仍需另行记录。

## 企业私有化

Magic 的 `--url` 支持指定服务地址，但不证明任意私有版本兼容。由用户/企业提供批准的域名、网络条件及认证配置；验证工具能否读取目标项目。企业 SSO、证书、API 版本不匹配时停止并说明原因，不退回抓 Cookie 或探测其他内网地址。Vibe 仅在企业客户端实际提供对应本地服务时可用。

该适配只调用设计读取/导出工具，不写回画布。官方服务可能提供编辑工具，脚本不允许调用；其他客户端自行连接时仍需独立限制工具暴露。MCP 本地运行不意味着模型调用、资源下载或 npm 安装均不访问外网。

官方依据（接入要求于 2026-10-22 核对，工具名以固定包的实际 schema 为准）：
- https://mastergo.com/help/ai-features/magic-mcp.html
- https://mastergo.com/help/ai-features/vibe-mcp.html
- https://github.com/mastergo-design/mastergo-magic-mcp

本次实际通过 MCP tools/list 检查的包版本为 Magic 0.2.10、Vibe 1.0.31；官方 MCP 的真实账号设计取数、私有化联调及真实 Full 视觉评分验收尚未完成，不得将协议检查或自动化测试描述为这些验收已通过。

## 执行权限与错误处理

本方案采用命令执行权限作为调用入口，不提供 MCP 逐工具弹窗或单独的文件编辑审批。命令授权已有明确范围时直接沿用；用户拒绝连接、关闭连接配置或禁止某项取数时，不得改用脚本或另一通道规避。脚本的工具白名单、`enabled=false` 和 run 路径校验是额外限制，不能替代宿主命令权限或操作系统隔离。

本地输入、资源大小、证据冲突与文件写入错误保留可操作说明；远端 SDK 错误只报告连接、工具列表、工具调用、超时或取消等类别，不回显服务端错误正文。连接与工具列表限时 30 秒，工具调用限时 120 秒，整个采集命令限时 180 秒；HTTP/SSE 读取沿用请求的取消信号，不能提前套用连接超时。

技能 SDK 固定版本由 `scripts/mastergo-connection.mjs` 的 `MASTERGO_SDK_VERSION` 定义。技能验证在独立 runtime 中执行，不借用 Code 核心 SDK，也不放入 Code 单元测试目录；离线环境预装相同版本并通过采集命令的 `--runtime` 参数指定目录。升级技能 SDK 时同步安装说明并完成独立协议验证，核心 SDK 升级不要求技能跟随升级。

# DevEco 社区 MasterGo 适配补丁

基于 `burnice-cn/mastergo-mcp-server` 的固定提交
`0b710a4b9d8f580ccd91945b0328b22b7e398f51`，上游许可证见 `LICENSE`。
补丁及文件列表、SHA-256 见 `manifest.json`。

包含只读方法限制、插件沙箱 Base64 导出、面板隐藏/唤回、按文档恢复连接、
一键本机配对及回归测试。不包含个人 Token、配对口令、本机路径或已生成安装包。

## 安装与更新

使用 Node.js 22.16+、Yarn 4.9.1。助手完成下载、构建与配置，不要求用户处理口令。
在独立目录检出上述固定提交。先检查工作区；已有本地修改时使用新的检出目录，
不要重置或覆盖用户修改。以本目录补丁绝对路径替换下列占位符：

```sh
node <skillRoot>/scripts/mastergo-community-verify.mjs <clean-community-checkout>
git apply --check <community>/deveco-community.patch
git apply <community>/deveco-community.patch
```

分别在 `mcp-server` 和 `mastergo-api-bridge` 目录执行：

```sh
yarn install --immutable
yarn build
yarn typecheck
yarn test
```

启动服务：

```sh
node <skillRoot>/scripts/mastergo-community-start.mjs <patched-community-checkout>
```

启动器在本机私有配置目录生成或复用随机凭据，只通过子进程环境传入服务，不打印凭据。
服务固定监听 `127.0.0.1:3000`，启用设计只读白名单。
skill 的独立 connection.json 配置 Streamable HTTP 地址 `http://127.0.0.1:3000/mcp`，
由 mastergo-capture.mjs 直接连接，无需向 Code 注册内置工具或新增 MCP 配置。
桌面客户端可导入构建后的 `mastergo-api-bridge/plugin/manifest.json`。
网页版不能导入本地开发插件；发布者先将插件发布到团队，成员再从团队插件列表运行。
团队发布后的网页版入口已由用户实际确认；每位成员仍需在本机启动服务并验证连接、读取与导出。
更新既有导入目录时备份后替换 `index.js`、`index.html`，保留客户端生成的 manifest `id`。
更新团队发布版本时沿用原插件 ID 再次发布，本地文件变化不会自动替换已发布版本。

## 用户操作

1. 插件点击“连接 DevEco Code”。
2. 在本机系统确认框核对配对码并点击“允许连接”，无需打开网页。
3. 连接自动保存于本机当前文档，下次运行自动连接。“断开连接”会删除此文件的本机记录。

助手可以检查服务和等待状态，但不得代替用户批准真实配对，也不得通过程序伪造确认结果跳过确认。
手动口令方式留在兼容入口，不需要 MasterGo 个人访问令牌。

系统确认框不展示凭据；凭据只经原始配对 WebSocket 返回。配对两分钟过期且只能确认一次，
支持拒绝/取消，关闭插件会取消弹窗。同一时刻只允许一个请求，并限制请求速率，
校验本机 Host 和 Origin；网页请求与插件消息都不能批准配对。
macOS 使用系统自带 osascript，Windows 使用 PowerShell / Windows Forms，Linux 需要 zenity 和桌面会话。
无法显示系统确认框时会明确报错，不会自动放行。旧 `/pairing/` 网页仅显示迁移提示，不再提供审批。
此机制防止任意网页静默配对，不用于隔离恶意本机进程。隐藏面板和重新启动插件是不同生命周期，
重启恢复会建立新连接。

## 验证边界

测试覆盖本地真实 HTTP/WebSocket 配对，以及插件主线程与 UI 脚本的宿主模拟运行。
macOS 系统确认框已在本机试运行并收到允许结果；Windows 系统确认框已在 Windows 实机验证，可正常弹出并返回允许结果，MasterGo 真客户端配对连接成功；Linux 的确认框尚未实机验证。
Windows 真客户端的配对连接验收已完成；真实设计 Full 工作流与视觉评分验收仍未完成，测试结果不能替代这两项验收。

## 凭据目录与权限

macOS/Linux 使用 `$XDG_CONFIG_HOME/deveco/mastergo`（未设置时为 `~/.config/deveco/mastergo`），目录 0700、凭据文件 0600。Windows 使用 `%APPDATA%\deveco\mastergo`，通过当前用户 SID 设置目录与已有凭据的 ACL；创建新凭据前先限制目录继承权限，设置失败则停止启动。旧版 Windows `.config` 目录不会被静默迁移，在新目录启动时，若没有配对凭据，需要重新配对。该保护不隔离同一用户的恶意进程或系统管理员。

## 补丁维护策略

这是固定上游提交加本仓库补丁的 vendoring 方案。安装前必须运行 `mastergo-community-verify.mjs`：核对 SHA-256、文件清单、上游提交和干净工作区，并执行严格 `git apply --check`，任何一项失败都停止应用。

更新上游时在独立干净目录重生成补丁，同步 manifest 的 baseCommit、files、patchSha256；不得直接对用户正在运行的插件目录重置或打补丁。发布或更新补丁前，在独立的社区仓检出目录执行上述校验，并对服务和插件分别执行 immutable 安装、构建、类型检查与测试。社区仓自己的验证不接入 Code 单元测试或门禁流水线；验证结果用于确认补丁兼容性，不等同于真实 MasterGo 客户端验收。

import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

export const MASTERGO_SDK_VERSION = "1.29.0"

// The SDK is installed in an external runtime, never resolved from Code's bundle.
export async function withMasterGoClient(connection, runtime, server, directory, signal, run) {
  const options = connectionOptions(connection, server, directory)
  const root = resolve(runtime)
  const manifest = JSON.parse(readFileSync(join(root, "node_modules/@modelcontextprotocol/sdk/package.json"), "utf8"))
  if (manifest.version !== MASTERGO_SDK_VERSION) throw new Error(`Install @modelcontextprotocol/sdk@${MASTERGO_SDK_VERSION} in the selected runtime`)
  const require = createRequire(join(root, "package.json"))
  const { Client } = await import(pathToFileURL(require.resolve("@modelcontextprotocol/sdk/client/index.js")).href)
  const client = new Client({ name: "mastergo-skill", version: "1.0.0" })
  const transport = await createTransport(require, options, signal)
  try {
    signal?.throwIfAborted()
    await remoteRequest("connection", signal, () => client.connect(transport, { signal, timeout: 30_000 }))
    // Only SDK failures cross the redaction boundary. Local evidence errors retain their actionable message.
    return await run({
      listTools: (...args) => remoteRequest("tool listing", signal, () => client.listTools(...args)),
      callTool: (...args) => remoteRequest("tool call", signal, () => client.callTool(...args)),
    })
  } finally {
    if (options.type === "remote") await transport.terminateSession().catch(() => {})
    // Cleanup must not hide the original capture error.
    await client.close().catch(() => {})
    await transport.close().catch(() => {})
  }
}

async function remoteRequest(operation, signal, request) {
  try {
    return await request()
  } catch (error) {
    // Never echo server messages: they may contain authorization headers or credentials.
    if (signal?.aborted) throw new Error(`MCP ${operation} cancelled or overall capture deadline reached`)
    if (error?.code === -32001 || error?.name === "TimeoutError")
      throw new Error(`MCP ${operation} timed out; narrow the request or check server responsiveness`)
    throw new Error(`MCP ${operation} failed; check server availability and target access`)
  }
}

function connectionOptions(connection, server, directory) {
  if (!connection || connection.server !== server) throw new Error("Connection server must match the capture server")
  if (connection.enabled === false) throw new Error("The selected connection is disabled")
  if (connection.type === "local") {
    if (
      !Array.isArray(connection.command) ||
      !connection.command.length ||
      connection.command.some((part) => typeof part !== "string" || !part || part.includes("\0"))
    ) {
      throw new Error("Local connection requires a command array; use node and an installed entry file")
    }
    if (/\.(?:cmd|bat)$/i.test(connection.command[0]))
      throw new Error("Use node and an installed entry file on Windows")
    return {
      type: "local",
      command: connection.command[0],
      args: connection.command.slice(1),
      cwd: directory,
      env: environmentValues(connection.environment),
      stderr: "pipe",
    }
  }
  if (connection.type !== "remote") throw new Error("Choose a local or remote connection")
  const url = new URL(connection.url)
  if (url.username || url.password || url.search || url.hash) throw new Error("Keep credentials out of the MCP URL")
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("Remote MCP requires HTTPS; HTTP is allowed only on loopback")
  }
  return { type: "remote", url, headers: environmentValues(connection.headers) }
}

function environmentValues(values = {}) {
  if (!values || typeof values !== "object" || Array.isArray(values))
    throw new Error("Environment and headers must be objects")
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => {
      const match = typeof value === "string" && /^\{env:([A-Za-z_][A-Za-z0-9_]*)\}$/.exec(value)
      if (!match) throw new Error("Connection environment and headers must use {env:NAME} references")
      const resolved = process.env[match[1]]
      if (!resolved) throw new Error(`Missing environment variable: ${match[1]}`)
      return [name, resolved]
    }),
  )
}

async function createTransport(require, options, signal) {
  if (options.type === "local") {
    const { StdioClientTransport } = await import(
      pathToFileURL(require.resolve("@modelcontextprotocol/sdk/client/stdio.js")).href
    )
    const transport = new StdioClientTransport(options)
    // Drain diagnostics without forwarding server output, which may contain credentials.
    transport.stderr?.resume()
    return transport
  }
  const { StreamableHTTPClientTransport } = await import(
    pathToFileURL(require.resolve("@modelcontextprotocol/sdk/client/streamableHttp.js")).href
  )
  return new StreamableHTTPClientTransport(options.url, {
    requestInit: { headers: options.headers, redirect: "error" },
    fetch: (url, init) =>
      fetch(url, {
        ...init,
        redirect: "error",
        // SDK request deadlines govern POST/SSE bodies (tool calls may take 120 seconds).
        // Bound session cleanup separately so an unresponsive DELETE cannot delay exit.
        signal: AbortSignal.any([signal, init?.signal, ...(init?.method === "DELETE" ? [AbortSignal.timeout(5_000)] : [])].filter(Boolean)),
      }),
  })
}

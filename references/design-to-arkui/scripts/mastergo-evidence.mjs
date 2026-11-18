import path from "node:path"
import fs from "node:fs/promises"
import { createHash, randomUUID } from "node:crypto"

export async function resolveOutputDir(directory, value) {
  if (!value) throw new Error("MCP capture requires an output directory inside the project")
  const root = await fs.realpath(directory)
  const destination = path.resolve(root, value)
  const relative = path.relative(root, destination)
  if (!relative || relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative))
    throw new Error("MCP capture output must be a directory inside the project")
  await relative.split(path.sep).reduce(async (previous, part) => {
    const current = path.join(await previous, part)
    const info = await fs.lstat(current).catch((error) => {
      if (error.code !== "ENOENT") throw error
    })
    if (info && (!info.isDirectory() || info.isSymbolicLink()))
      throw new Error("MCP capture output paths must be directories without symlinks")
    return current
  }, Promise.resolve(root))
  return destination
}

export async function capture(client, input, directory, signal) {
  signal?.throwIfAborted()
  if (input.operation === "tools")
    return { status: "available", server: input.server, tools: await listTools(client, signal) }
  const outputDir = await resolveOutputDir(directory, input.outputDir)
  if (!input.tool || !(await listTools(client, signal)).some((tool) => tool.name === input.tool))
    throw new Error("Select an available tool from the connected MCP server")
  signal?.throwIfAborted()
  await fs.mkdir(outputDir, { recursive: true })
  await resolveOutputDir(directory, outputDir)
  const request = { server: input.server, tool: input.tool, arguments: input.arguments ?? {} }
  const requestPath = path.join(outputDir, `mcp-${requestID(input)}-request.json`)
  await publishJson(requestPath, JSON.stringify(request, null, 2) + "\n")
  const response = await client.callTool({ name: input.tool, arguments: input.arguments ?? {} }, undefined, {
    signal,
    timeout: 120_000,
  })
  signal?.throwIfAborted()
  await resolveOutputDir(directory, outputDir)
  const evidence = await saveResponse(outputDir, input, response)
  return {
    status: "captured",
    server: input.server,
    tool: input.tool,
    ...evidence,
    requestPath,
    outputDir,
    isError: response.isError === true,
  }
}

async function listTools(client, signal) {
  const tools = []
  const cursors = new Set()
  let cursor
  for (let index = 0; index < 1000; index++) {
    signal?.throwIfAborted()
    const page = await client.listTools(cursor === undefined ? {} : { cursor }, { signal, timeout: 30_000 })
    tools.push(...page.tools)
    if (page.nextCursor === undefined) return tools
    if (cursors.has(page.nextCursor)) throw new Error("MCP list returned a duplicate cursor")
    cursors.add(page.nextCursor)
    cursor = page.nextCursor
  }
  throw new Error("MCP list exceeded 1000 pages")
}

function requestID(input) {
  return createHash("sha256")
    .update(JSON.stringify({ server: input.server, tool: input.tool, arguments: input.arguments ?? {} }))
    .digest("hex")
    .slice(0, 16)
}

async function saveResponse(outputDir, input, response) {
  const bytes = JSON.stringify(response, null, 2) + "\n"
  if (Buffer.byteLength(bytes) > 10 * 1024 * 1024)
    throw new Error("MCP response exceeds 10 MiB; narrow the request before capturing it")
  const id = requestID(input)
  const sha256 = createHash("sha256").update(bytes).digest("hex")
  // Failed attempts remain available for diagnosis without blocking a successful retry of the same request.
  const suffix = response.isError === true ? `-error-${sha256.slice(0, 16)}` : ""
  const file = path.join(outputDir, `mcp-${id}${suffix}.json`)
  await publishJson(file, bytes)
  return { responsePath: file, sha256 }
}

async function publishJson(file, bytes) {
  const temporary = path.join(path.dirname(file), `.mcp-${randomUUID()}.tmp`)
  await fs.writeFile(temporary, bytes, { flag: "wx", mode: 0o600 })
  try {
    await publishResponse(temporary, file, bytes)
  } finally {
    await fs.unlink(temporary)
  }
}

async function publishResponse(temporary, file, bytes) {
  // Linking publishes complete bytes without replacing another capture or following a leaf symlink.
  await fs.link(temporary, file).catch(async (error) => {
    if (error.code !== "EEXIST") throw error
    const info = await fs.lstat(file)
    if (!info.isFile() || info.isSymbolicLink())
      throw new Error("MCP evidence output must be a regular file without symlinks")
    if (info.size !== Buffer.byteLength(bytes) || (await fs.readFile(file, "utf8")) !== bytes)
      throw new Error("MCP response changed; start a new run instead of replacing evidence")
  })
}

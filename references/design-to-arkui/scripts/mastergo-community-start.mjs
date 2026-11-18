import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

if (!process.argv[2]) throw new Error('Usage: node mastergo-community-start.mjs <patched-community-checkout>');
const root = realpathSync(resolve(process.argv[2]));
const entry = join(root, 'mcp-server/dist/index.js');
if (!existsSync(entry)) throw new Error('Build the patched community MCP server first');
const config = process.platform === 'win32'
  ? process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
  : process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
const directory = join(config, 'deveco', 'mastergo');
mkdirSync(directory, { recursive: true, mode: 0o700 });
if (lstatSync(directory).isSymbolicLink()) throw new Error('The local credential directory must not be a symlink');
const file = join(directory, 'community-bridge-token.txt');
const stat = lstatSync(file, { throwIfNoEntry: false });
if (stat && (!stat.isFile() || stat.isSymbolicLink())) throw new Error('The local pairing credential must be a regular file');
protectCredential(directory, file, Boolean(stat));
if (!stat) writeFileSync(file, randomBytes(32).toString('hex') + '\n', { mode: 0o600, flag: 'wx' });
if (process.platform !== 'win32') chmodSync(file, 0o600);
const token = readFileSync(file, 'utf8').trim();
if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Invalid local pairing credential; repair the local configuration');

// Credentials stay in the child environment, never CLI arguments or console output.
const child = spawn(process.execPath, [entry], {
  cwd: join(root, 'mcp-server'),
  env: { ...process.env, MCP_HTTP_HOST: '127.0.0.1', MCP_HTTP_PORT: '3000',
    MASTERGO_BRIDGE_TOKEN: token, MASTERGO_BRIDGE_REQUEST_TIMEOUT_MS: '120000', DEVECO_MASTERGO_READ_ONLY: '1' },
  stdio: 'inherit',
});
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
child.on('error', () => { console.error('Unable to start the local MasterGo service'); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });

function protectCredential(directory, file, existing) {
  if (process.platform !== 'win32') {
    chmodSync(directory, 0o700);
    return;
  }
  // Restrict the directory before creating a secret; existing files need their own ACL reset.
  const script = `
$ErrorActionPreference = 'Stop'
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = New-Object System.Security.AccessControl.DirectorySecurity
$acl.SetOwner($sid)
$acl.SetAccessRuleProtection($true, $false)
$acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
Set-Acl -LiteralPath $env:DEVECO_CREDENTIAL_DIRECTORY -AclObject $acl
if ($env:DEVECO_CREDENTIAL_EXISTS -eq '1') {
  $fileAcl = New-Object System.Security.AccessControl.FileSecurity
  $fileAcl.SetOwner($sid)
  $fileAcl.SetAccessRuleProtection($true, $false)
  $fileAcl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($sid, 'FullControl', 'Allow'))
  Set-Acl -LiteralPath $env:DEVECO_CREDENTIAL_FILE -AclObject $fileAcl
}`;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    env: { ...process.env, DEVECO_CREDENTIAL_DIRECTORY: directory, DEVECO_CREDENTIAL_FILE: file, DEVECO_CREDENTIAL_EXISTS: existing ? '1' : '0' },
    stdio: 'ignore', timeout: 10_000, windowsHide: true,
  });
  if (result.error || result.status !== 0) throw new Error('Unable to protect local pairing credentials with Windows ACL; service not started');
}

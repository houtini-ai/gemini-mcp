import { spawn } from 'child_process';

const server = spawn('node', ['dist/index.js'], {
  cwd: 'C:\\MCP\\gemini-mcp',
  env: { ...process.env, GEMINI_API_KEY: 'REDACTED_API_KEY' },
  stdio: ['pipe', 'pipe', 'pipe']
});

server.stderr.on('data', d => process.stderr.write('[STDERR] ' + d));
server.stdout.on('data', d => {
  const text = d.toString();
  process.stdout.write('[STDOUT] ' + text + '\n');
});

// Send initialize
const init = JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1' } }
}) + '\n';

server.stdin.write(init);

setTimeout(() => {
  // Send tools/list
  const list = JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }) + '\n';
  server.stdin.write(list);
}, 1000);

setTimeout(() => {
  // Send gemini_chat call
  const call = JSON.stringify({
    jsonrpc: '2.0', id: 3, method: 'tools/call',
    params: { name: 'gemini_chat', arguments: { message: 'say hi', grounding: false } }
  }) + '\n';
  server.stdin.write(call);
}, 2000);

setTimeout(() => { server.kill(); process.exit(0); }, 8000);

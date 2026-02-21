const fs = require('fs');
const path = require('path');
const p = path.join('C:/MCP/gemini-mcp/dist/image-viewer/src/ui/image-viewer.html');
console.log('exists:', fs.existsSync(p));
if (fs.existsSync(p)) {
  console.log('size:', fs.statSync(p).size, 'bytes');
  const content = fs.readFileSync(p, 'utf-8');
  console.log('first 100 chars:', content.slice(0, 100));
}

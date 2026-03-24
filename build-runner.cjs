const { execSync } = require('child_process');
const run = (cmd) => {
  console.log('>', cmd);
  console.log(execSync(cmd, { cwd: 'D:\\mcp\\gemini-mcp', encoding: 'utf8', stdio: 'pipe' }));
};
try {
  run('git add -A');
  run('git status');
  run('git commit -m "feat: image/video/svg fixes, dynamic resize-for-transport, media server D: drive fix, README refresh\\n\\n- Drop thoughtSignature from tool result (was blowing 1MB MCP transport cap)\\n- Dynamic packet budget calculation replaces hardcoded MAX_PREVIEW_BYTES\\n- Fix media server toLowerCase() for Windows D:\\\\ drive path matching\\n- Rename iamge-embed.png typo, add image/svg/video embed screenshots\\n- Refresh README with writing style, SVG section, embed previews\\n- Add CLAUDE.md to .gitignore"');
  run('git push');
} catch(e) { console.error(e.stdout || e.stderr || e.message); }

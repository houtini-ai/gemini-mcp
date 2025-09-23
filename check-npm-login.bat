@echo off
echo Checking NPM login status...
cd /d "C:\MCP\gemini-mcp"
npm whoami
echo.
echo If you see your username (richardbaxterseo), you're ready to publish!
echo If you see an error, please run: npm login
pause
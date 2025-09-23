@echo off
echo Starting Gemini MCP Server (Node.js)...
echo.

REM Check if .env file exists
if not exist .env (
    echo Warning: .env file not found. Make sure GEMINI_API_KEY is set in your environment.
    echo.
)

REM Check if dist folder exists
if not exist dist (
    echo Building TypeScript sources...
    npm run build
    if errorlevel 1 (
        echo Build failed! Please check for errors.
        pause
        exit /b 1
    )
    echo.
)

echo Starting server...
node dist/index.js

echo.
echo Server stopped.
pause

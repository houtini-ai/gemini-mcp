@echo off
echo ============================================
echo  NPM Publication Script for @houtini/gemini-mcp
echo ============================================

cd /d "C:\MCP\gemini-mcp"

echo.
echo Step 1: Checking NPM login status...
npm whoami
if %errorlevel% neq 0 (
    echo ERROR: You are not logged into NPM!
    echo Please run: npm login
    echo Then re-run this script.
    pause
    exit /b 1
)

echo.
echo Step 2: Clean build...
if exist dist rmdir /s /q dist
npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo Step 3: Running linting...
npm run lint
if %errorlevel% neq 0 (
    echo WARNING: Linting issues found, but continuing...
)

echo.
echo Step 4: Running audit...
npm audit
echo Audit complete.

echo.
echo Step 5: Testing package creation (dry run)...
npm publish --dry-run
if %errorlevel% neq 0 (
    echo ERROR: Dry run failed!
    pause
    exit /b 1
)

echo.
echo ============================================
echo  DRY RUN SUCCESSFUL! 
echo ============================================
echo.
echo The package is ready to publish to NPM.
echo This will publish @houtini/gemini-mcp v1.0.0
echo.
set /p confirm="Are you sure you want to publish to NPM? (y/N): "
if /i not "%confirm%"=="y" (
    echo Publication cancelled.
    pause
    exit /b 0
)

echo.
echo Step 6: Publishing to NPM...
npm publish
if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo  SUCCESS! Package published to NPM!
    echo ============================================
    echo.
    echo Your package is now available at:
    echo https://www.npmjs.com/package/@houtini/gemini-mcp
    echo.
    echo Users can install it with:
    echo npm install -g @houtini/gemini-mcp
    echo.
) else (
    echo.
    echo ERROR: Publication failed!
    echo Please check the error messages above.
)

pause
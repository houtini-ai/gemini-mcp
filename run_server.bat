@echo off
set PYTHONPATH=%USERPROFILE%\AppData\Roaming\Python\Python313\site-packages;%PYTHONPATH%
set GEMINI_API_KEY=%GEMINI_API_KEY%
"C:\Python313\python.exe" "C:\dev\gemini-mcp\server.py"

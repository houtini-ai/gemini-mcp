# Changelog

All notable changes to @houtini/gemini-mcp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.3] - 2025-01-29

### Fixed
- **Logger Path Issue (#1)**: Fixed ENOENT error when running via npx on macOS/Unix systems
  - File logging now disabled by default to avoid directory permission issues
  - Logs only created when explicitly enabled via `GEMINI_MCP_LOG_FILE=true` environment variable
  - When enabled, logs are written to user home directory (`~/.gemini-mcp/logs/` on Unix, `C:\Users\username\.gemini-mcp\logs\` on Windows)
  - Console logging (stderr) only enabled in development mode or when `DEBUG_MCP=true`
  - Fallback to minimal error logging if directory creation fails
  - Cross-platform compatible with proper path handling for Windows, macOS, and Linux

### Changed
- Logging behaviour is now opt-in rather than default-on
- All console output goes to stderr to avoid corrupting MCP stdio communication
- Log directory uses user home directory for better cross-platform compatibility

### Added
- New environment variable: `GEMINI_MCP_LOG_FILE` (default: false) - Enable file logging
- New environment variable: `DEBUG_MCP` (default: false) - Enable console debugging
- Comprehensive logging documentation in README.md
- Graceful fallback when log directory creation fails

### Technical Details
- Logger now uses `os.homedir()` and `path.join()` for cross-platform paths
- Recursive directory creation with proper error handling
- Log files: 5MB max size, 5 files retained (rotating logs)
- No breaking changes - all existing configurations continue to work

### Thanks
Special thanks to @mattycrocks for the detailed bug report and workaround in issue #1.

## [1.4.2] - Previous Release
- See git history for earlier changes

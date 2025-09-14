# CLI Migration Guide

## Migrating from v1.x to v2.0 Enhanced CLI Experience

This guide helps you transition from the traditional CLI to the new enhanced interactive experience.

## 🚀 What's New in v2.0

### Core Enhancements
- **Interactive Dashboard**: Central command center for all operations
- **Welcome Experience**: Guided onboarding for new users
- **Power Mode**: Streamlined interface for expert users
- **Smart Suggestions**: Context-aware command recommendations
- **Achievement System**: Gamification to track progress
- **Enhanced Error Handling**: Intelligent error messages with recovery suggestions
- **Progress Indicators**: Visual feedback for long-running operations

## 📦 Installation

### Update the CLI
```bash
npm update -g @LanOnasis/cli
# or
npm install -g @LanOnasis/cli@latest
```

### Verify Installation
```bash
onasis --version
# Should show: 2.0.0
```

## 🔄 Command Changes

### Old vs New Command Structure

| Old Command (v1.x) | New Command (v2.0) | Notes |
|--------------------|-------------------|-------|
| `onasis memory create --title "X"` | `onasis memory create` | Now interactive by default |
| `onasis auth login` | `onasis init` | Full guided setup flow |
| `onasis memory search <query>` | `onasis search` or just `/` in dashboard | More intuitive search |
| `onasis config set` | `onasis settings` | Visual settings management |
| N/A | `onasis dashboard` | New interactive command center |
| N/A | `onasis power` | New expert mode |
| N/A | `onasis achievements` | New gamification features |

## 🎯 Quick Start Guide

### First Time Users
1. Run `onasis` without arguments to enter interactive mode
2. Follow the welcome experience for guided setup
3. Complete authentication
4. Explore the dashboard

### Existing Users
1. Run `onasis dashboard` to access the new command center
2. Your existing configuration is automatically migrated
3. Use `onasis power` for streamlined expert mode

## 🔧 Configuration Migration

### Automatic Migration
The CLI automatically migrates your v1.x configuration on first run:
- API endpoints
- Authentication tokens
- User preferences

### Manual Migration (if needed)
```bash
# Export old config
onasis config export > config-backup.json

# Import to new CLI
onasis settings import config-backup.json
```

## 💡 New Features Guide

### Interactive Dashboard
```bash
# Enter dashboard
onasis dashboard
# or simply
onasis

# Navigate with:
# - Number keys (1-6) for menu options
# - Arrow keys for navigation
# - Tab for auto-completion
# - ? for contextual help
```

### Power Mode (Expert Users)
```bash
# Enter power mode
onasis power

# Quick commands:
c -t "Title" -c "Content"     # Create memory
s cache                        # Search for "cache"
ls --limit 10                  # List recent memories
format json                    # Change output format

# Create aliases:
alias sc="search cache"
alias cm="create -t"
```

### Smart Command Recognition
```bash
# Natural language commands work everywhere:
"remember to update the API docs"
"find all memories about authentication"
"show me today's memories"
```

### Achievement System
```bash
# View achievements
onasis achievements

# Track progress
onasis stats
```

## 🔌 API Compatibility

### Breaking Changes
- None - All v1.x API calls remain compatible

### Deprecated Features
- `--no-interactive` flag (use `--expert` instead)
- `memory export` command (use `memory list --format json`)

## 🛠️ Troubleshooting

### Common Issues

#### Issue: Old commands not working
**Solution**: Most commands now default to interactive mode. Add `--expert` flag for non-interactive behavior.

#### Issue: Authentication errors after upgrade
**Solution**: Re-authenticate with `onasis init` or `onasis auth login`

#### Issue: Missing features from v1.x
**Solution**: Enable expert mode with `onasis power` for direct command access

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `CLI_VERBOSE` | Enable verbose logging | `false` |
| `CLI_OUTPUT_FORMAT` | Default output format | `table` |
| `CLI_OFFLINE` | Offline mode | `false` |
| `MEMORY_API_URL` | API endpoint | `https://api.LanOnasis.com` |

## 📚 Additional Resources

- **Interactive Help**: Type `?` anywhere in the CLI
- **Documentation**: `onasis help [command]`
- **Online Docs**: https://docs.LanOnasis.com/cli/v2
- **Support**: support@LanOnasis.com

## 🔄 Rollback Instructions

If you need to rollback to v1.x:
```bash
# Uninstall v2.0
npm uninstall -g @LanOnasis/cli

# Install specific v1.x version
npm install -g @LanOnasis/cli@1.5.2
```

## 📝 Feedback

We'd love to hear your feedback on the new CLI experience:
- GitHub Issues: https://github.com/LanOnasis/cli/issues
- Feature Requests: https://feedback.LanOnasis.com
- Discord: https://discord.gg/LanOnasis

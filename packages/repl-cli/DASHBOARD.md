# 🎨 LZero Dashboard

The **LZero Dashboard** is a beautiful, interactive Terminal User Interface (TUI) for managing your LanOnasis memory bank. Built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs), it provides an immersive, IDE-like experience for your second brain.

![Dashboard Preview](https://docs.lanonasis.com/assets/dashboard-preview.png)

## ✨ Features

### 🧭 Interactive Navigation
- **Arrow keys** (↑/↓) — Navigate through memories
- **Enter** — Open selected memory
- **ESC / q** — Go back or quit
- **?** — Show help overlay
- **/** — Jump to search

### 🔍 Real-time Semantic Search
- Live search with relevance scoring
- Instant results as you type
- Similarity percentage displayed

### 📊 Rich Memory Display
- **List view** — Browse all memories with titles and previews
- **Detail view** — Full memory content with metadata
- **Tags** — Color-coded tag display
- **Timestamps** — Creation and update dates

### 📈 Status Bar
- Connection status (● connected)
- Memory count
- Current user
- Active view mode

## 🚀 Usage

### Launch Dashboard Mode

```bash
# Using the dashboard command
lrepl dashboard

# Or use the --dashboard flag
lrepl start --dashboard

# Shorthand
onasis-repl dashboard
```

### Classic REPL Mode (Default)

```bash
# Standard REPL with command history and tab completion
lrepl start

# Or just
lrepl
```

## 🎮 Keyboard Shortcuts

### Global
| Key | Action |
|-----|--------|
| `?` | Toggle help overlay |
| `Ctrl+C` | Exit dashboard |

### List View
| Key | Action |
|-----|--------|
| `↑/↓` | Navigate memories |
| `Enter` | Open selected memory |
| `/` | Switch to search mode |
| `r` | Refresh memory list |
| `q` | Quit |

### Detail View
| Key | Action |
|-----|--------|
| `ESC` / `q` | Back to list |
| `e` | Edit memory |
| `d` | Delete memory |

### Search Mode
| Key | Action |
|-----|--------|
| `Type` | Enter search query |
| `Enter` | Execute search |
| `ESC` | Cancel and return to list |

## 🏗️ Architecture

```
src/ui/
├── DashboardApp.tsx          # Main dashboard container
├── components/
│   ├── StatusBar.tsx         # Bottom status bar
│   ├── MemoryList.tsx        # Memory list with navigation
│   ├── MemoryDetail.tsx      # Full memory view
│   ├── SearchBox.tsx         # Search interface
│   ├── HelpOverlay.tsx       # Keyboard shortcuts help
│   └── TextInput.tsx         # Text input component
└── index.tsx                 # UI exports
```

## 🎨 Design Philosophy

The dashboard follows the **"Concierge Service"** concept:

1. **Proactive** — Memories are visible and accessible immediately
2. **Contextual** — Rich metadata and relevance scores
3. **Fast** — Keyboard-driven, no mouse required
4. **Beautiful** — Colors, borders, and clear visual hierarchy
5. **Familiar** — IDE-like interface developers love

## 🔧 Technical Stack

- **Ink** — React for CLI rendering
- **React** — Component architecture
- **TypeScript** — Type safety
- **Memory Client** — Direct SDK integration

## 📝 Future Enhancements

- [ ] Memory creation/editing in dashboard
- [ ] Tag filtering sidebar
- [ ] Memory type icons
- [ ] Session auto-save indicator
- [ ] Activity timeline view
- [ ] Export/import functionality

---

**Made with ❤️ by the LanOnasis Team**

*Your second brain, now with a first-class interface.*

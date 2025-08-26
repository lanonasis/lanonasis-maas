# Archive Directory - Legacy Documentation & Scripts

**Archive Date**: 2025-08-26  
**CLI Version at Archive**: v1.5.2  
**Golden Contract**: Onasis-Core v0.1 Compliant

## 📦 Archive Purpose

This directory contains historical documentation and scripts that have been superseded by the professional CLI v1.5.2 interface. These files are preserved for:

- Historical reference and audit trails
- Understanding system evolution 
- Troubleshooting legacy deployments
- Learning from past implementation approaches

## 🗂️ Directory Structure

### `/legacy-docs/` - Archived Documentation
Historical setup guides, configuration documents, and implementation plans that have been replaced by CLI v1.5.2 functionality.

**Contents:**
- `DATABASE_SETUP_GUIDE.md` → Now: `onasis guide`
- `DEVELOPMENT_WORKSPACE.md` → Now: `onasis init`
- `MCP_CONFIGURATION_GUIDE.md` → Now: `onasis mcp status`
- `MEMORY_TABLES_ACCESS_GUIDE.md` → Now: `onasis memory --help`
- `SERVICE_ARCHITECTURE.md` → Now: `onasis service list`
- `VERCEL_DEPLOYMENT_GUIDE.md` → Now: `onasis deploy status`
- And other legacy setup documentation

### `/legacy-scripts/` - Archived Shell Scripts
Manual shell scripts that have been replaced by professional CLI commands.

**Contents:**
- `verify-services.sh` → Now: `onasis health`
- `setup-essential-secrets.sh` → Now: `onasis init && onasis login`
- `deploy.sh` → Now: `onasis deploy status`
- `confirm-all-services-intact.sh` → Now: `onasis status`
- `commercial-security-cleanup.sh` → Now: Built into CLI security
- Extension packaging and publishing scripts
- Manual authentication setup scripts

### `/deployment-history/` - Migration Records
Documentation of system migrations, implementations, and restoration processes.

**Contents:**
- Implementation summaries and audit reports
- Deployment synchronization plans
- Commercial readiness checklists
- Migration restoration logs
- Critical fixes implementation records
- Publishing and deployment summaries

### `/auth-migration/` - Authentication Evolution
Records of authentication system evolution from manual to Golden Contract compliance.

**Contents:**
- `OAUTH_CONFIGURATION_COMPLETE_FIX.md` - Legacy OAuth setup
- `SUPABASE_OAUTH_CONFIG.md` - Manual Supabase configuration  
- `SECURITY_CLEANUP_SUMMARY.md` - Security migration process
- `API_KEY_INTEGRATION_GUIDE.md` - Manual API key setup

### `/extension-docs/` - Extension Documentation
Historical documentation for VSCode, Cursor, and Windsurf extensions.

**Contents:**
- Extension publishing guides
- Azure CLI publishing documentation
- Extension testing and configuration guides
- Version-specific README files
- Troubleshooting and success confirmations

## 🔄 CLI v1.5.2 Migration Map

### Authentication Migration
| Archived Method | Current CLI v1.5.2 Command |
|----------------|---------------------------|
| Manual token configuration | `onasis login --vendor-key pk_xxx.sk_xxx` |
| Manual OAuth setup | `onasis login --oauth` |
| Config file editing | `onasis auth status` |
| Manual credential management | `onasis auth logout` |

### Service Management Migration  
| Archived Script | Current CLI v1.5.2 Command |
|----------------|---------------------------|
| `verify-services.sh` | `onasis health` |
| `confirm-all-services-intact.sh` | `onasis status` |
| `setup-essential-secrets.sh` | `onasis init && onasis login` |
| Manual service checks | `onasis service list` |

### Configuration Migration
| Archived Method | Current CLI v1.5.2 Command |
|----------------|---------------------------|
| Manual config editing | `onasis config set <key> <value>` |
| Environment variable setup | `onasis config list` |
| Manual file management | `onasis config reset` |

### Deployment Migration
| Archived Script | Current CLI v1.5.2 Command |
|----------------|---------------------------|
| `deploy.sh` | `onasis deploy status` |
| `deploy-separated.sh` | `onasis deploy health` |
| Manual deployment checks | `onasis service restart <name>` |

## ⚠️ Important Notes

### DO NOT USE ARCHIVED METHODS
The archived scripts and documentation are **deprecated** and should not be used for new implementations. They are preserved only for historical reference.

### Current Standards (CLI v1.5.2)
All operations should now use the professional CLI interface:
```bash
# Setup and initialization
onasis guide                    # Interactive setup guide
onasis init                    # Initialize configuration

# Authentication  
onasis login --vendor-key pk_xxx.sk_xxx  # Vendor key auth
onasis login --oauth                      # OAuth browser flow
onasis login                             # Interactive credentials

# System operations
onasis health                  # Comprehensive health check
onasis status                 # Quick status overview
onasis service list           # Service management

# Memory operations
onasis memory list            # List memories
onasis memory create          # Create memories
onasis memory search          # Search memories
```

### Golden Contract Compliance
CLI v1.5.2 implements **Onasis-Core v0.1** Golden Contract standards:
- Service discovery via `/.well-known/onasis.json`
- Vendor key authentication (`pk_*.sk_*` format)
- Request correlation with UUID tracking
- Enhanced CORS security compliance
- Uniform error envelope standardization

## 📚 Active Documentation

### Current Documentation Sources
- **Main README**: `../README.md` - Project overview and quick start
- **CLI README**: `../cli/README.md` - Comprehensive CLI documentation
- **Migration Guide**: `../CLI_MIGRATION_GUIDE.md` - Transition from legacy methods
- **Archive Log**: `../ARCHIVE_MIGRATION_LOG.md` - Detailed migration record

### Interactive Help
```bash
onasis guide                   # Interactive setup guide
onasis quickstart             # Essential commands reference  
onasis --help                 # Full command reference
onasis <command> --help       # Command-specific help
onasis completion             # Shell completion setup
```

## 🔍 Finding Information

### If You Need Legacy Information
1. **Check CLI first**: `onasis <relevant-command> --help`
2. **Search archive**: `grep -r "search_term" archive/`
3. **Check migration guide**: `../CLI_MIGRATION_GUIDE.md`
4. **Consult archive log**: `../ARCHIVE_MIGRATION_LOG.md`

### Common Legacy Lookups
```bash
# Find old deployment information
grep -r "deploy" archive/legacy-docs/

# Find old authentication setup
grep -r "auth\|oauth\|token" archive/auth-migration/

# Find old service configuration  
grep -r "service\|setup" archive/legacy-scripts/

# Find extension information
ls archive/extension-docs/
```

## ✅ Archive Validation

### Archive Integrity Check
```bash
# Verify all legacy scripts are archived
ls archive/legacy-scripts/ | wc -l    # Should show multiple files

# Verify documentation is archived
ls archive/legacy-docs/ | wc -l       # Should show multiple files

# Verify migration history is preserved
ls archive/deployment-history/ | wc -l # Should show migration records
```

### CLI v1.5.2 Validation
```bash
# Verify CLI is working
onasis --version               # Should show v1.5.2

# Verify Golden Contract compliance
onasis health                 # Should show healthy system

# Verify all functionality is accessible
onasis --help | grep Commands # Should show comprehensive command list
```

## 📞 Support

### For Current Operations
Use CLI v1.5.2 commands and documentation:
```bash
onasis guide                  # Interactive help
onasis quickstart            # Quick reference
onasis --help               # Full documentation
```

### For Historical Research
Contact the development team with specific questions about archived implementations.

---

**Remember**: All archived content is **deprecated**. Use CLI v1.5.2 for all current operations! 🚀
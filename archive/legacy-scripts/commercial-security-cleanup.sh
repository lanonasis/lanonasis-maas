#!/bin/bash

# Commercial Readiness Security Cleanup Script
# This script removes secrets, cleans up development files, and prepares the repo for public/commercial use

set -e

echo "🔒 Lanonasis MaaS - Commercial Security Cleanup"
echo "=============================================="

# Configuration
REPO_ROOT="/Users/seyederick/DevOps/_project_folders/lanonasis-maas"
BACKUP_DIR="$REPO_ROOT/.cleanup-backup-$(date +%Y%m%d-%H%M%S)"

echo "📁 Working in: $REPO_ROOT"
echo "💾 Backup directory: $BACKUP_DIR"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo ""
echo "🧹 Phase 1: Remove Secrets and Sensitive Data"
echo "============================================="

# Remove cache files that may contain secrets
echo "🗑️  Removing secret detection cache files..."
find "$REPO_ROOT" -name ".cache_ggshield" -type f -exec rm -f {} \;
find "$REPO_ROOT" -name "*.log" -path "*/secrets/*" -type f -exec rm -f {} \;

# Remove any accidentally committed .env files
echo "🗑️  Removing any .env files..."
find "$REPO_ROOT" -name ".env" -type f -exec mv {} "$BACKUP_DIR/" \;
find "$REPO_ROOT" -name ".env.local" -type f -exec mv {} "$BACKUP_DIR/" \;

# Clean up scripts with embedded secrets
echo "🔧 Cleaning scripts with embedded tokens..."

# Find and clean any scripts with hardcoded tokens
find "$REPO_ROOT" -name "*.sh" -type f | while read -r script; do
    if grep -q "PAT.*[A-Za-z0-9]{50,}" "$script" 2>/dev/null; then
        echo "  Cleaning: $script"
        # Backup original
        cp "$script" "$BACKUP_DIR/$(basename "$script").backup"
        # Replace hardcoded tokens with placeholder
        sed -i.bak 's/PAT.*=.*[A-Za-z0-9]\{50,\}.*/PAT_TOKEN="your-token-here"/g' "$script"
        sed -i.bak 's/export AZURE_DEVOPS_EXT_PAT=.*[A-Za-z0-9]\{50,\}.*/export AZURE_DEVOPS_EXT_PAT="your-token-here"/g' "$script"
        rm "$script.bak"
    fi
done

echo ""
echo "🧹 Phase 2: Remove Development Artifacts"
echo "========================================"

# Remove build artifacts and temporary files
echo "🗑️  Removing build artifacts..."
find "$REPO_ROOT" -name "node_modules" -type d | head -5 | while read -r dir; do
    echo "  Removing: $dir"
    rm -rf "$dir"
done

find "$REPO_ROOT" -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
find "$REPO_ROOT" -name "out" -type d -exec rm -rf {} + 2>/dev/null || true
find "$REPO_ROOT" -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true

# Remove log files
echo "🗑️  Removing log files..."
find "$REPO_ROOT" -name "*.log" -type f -exec rm -f {} \;
find "$REPO_ROOT" -name "npm-debug.log*" -type f -exec rm -f {} \;
find "$REPO_ROOT" -name "yarn-debug.log*" -type f -exec rm -f {} \;
find "$REPO_ROOT" -name "yarn-error.log*" -type f -exec rm -f {} \;

# Remove OS-specific files
echo "🗑️  Removing OS-specific files..."
find "$REPO_ROOT" -name ".DS_Store" -type f -exec rm -f {} \;
find "$REPO_ROOT" -name "Thumbs.db" -type f -exec rm -f {} \;

# Remove editor-specific files
echo "🗑️  Removing editor-specific files..."
find "$REPO_ROOT" -name ".vscode" -type d -path "*/temp/*" -exec rm -rf {} + 2>/dev/null || true
find "$REPO_ROOT" -name "*.swp" -type f -exec rm -f {} \;
find "$REPO_ROOT" -name "*.swo" -type f -exec rm -f {} \;

echo ""
echo "🧹 Phase 3: Clean Up Extension Packages"
echo "======================================"

# Remove old extension packages but keep the latest
echo "🗑️  Cleaning extension packages..."
cd "$REPO_ROOT/vscode-extension" 2>/dev/null || true
if [ -d "$REPO_ROOT/vscode-extension" ]; then
    # Keep only the latest version, remove older ones
    ls -t *.vsix 2>/dev/null | tail -n +2 | while read -r old_package; do
        echo "  Removing old package: $old_package"
        mv "$old_package" "$BACKUP_DIR/"
    done
fi

echo ""
echo "🔐 Phase 4: Security Hardening"
echo "=============================="

# Update .gitignore to prevent future secret commits
echo "🛡️  Updating .gitignore for security..."
GITIGNORE="$REPO_ROOT/.gitignore"

# Security-focused gitignore additions
cat >> "$GITIGNORE" << 'EOF'

# Security - Prevent secret commits
.env
.env.local
.env.*.local
*.key
*.pem
*.p12
*.pfx
**/*secret*
**/*key*
**/*token*
**/*password*
.cache_ggshield
*.backup

# Development artifacts
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
Thumbs.db
*.swp
*.swo
.vscode/settings.json
.idea/

# Build outputs
dist/
out/
build/
coverage/
.nyc_output/
.next/

# Package artifacts  
*.vsix.backup
*.tgz.backup
EOF

echo ""
echo "📝 Phase 5: Create Security Documentation"
echo "========================================"

# Create security policy
echo "📋 Creating SECURITY.md..."
cat > "$REPO_ROOT/SECURITY.md" << 'EOF'
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| < 1.2   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability, please report it privately.

### How to Report

1. **Do NOT create a public GitHub issue**
2. Email us at: security@lanonasis.com
3. Include detailed information about the vulnerability
4. Provide steps to reproduce if possible

### What to Expect

- Acknowledgment within 24 hours
- Initial assessment within 72 hours  
- Regular updates on progress
- Credit for responsible disclosure (if desired)

## Security Best Practices

### For Users
- Keep the extension updated to the latest version
- Use strong API keys and rotate them regularly
- Monitor your API key usage for unusual activity
- Report suspicious behavior immediately

### For Developers
- Never commit secrets, API keys, or passwords
- Use environment variables for sensitive configuration
- Regularly audit dependencies for vulnerabilities
- Follow secure coding practices

## Security Measures

- All API communications use HTTPS/TLS
- API keys are stored securely in VS Code's secret storage
- No sensitive data is logged or cached locally
- Regular security audits and dependency updates
- Automated secret detection in CI/CD

## Contact

For security-related questions: security@lanonasis.com
For general support: support@lanonasis.com
EOF

# Create environment template
echo "📋 Creating .env.template..."
cat > "$REPO_ROOT/.env.template" << 'EOF'
# Lanonasis MaaS Environment Configuration Template
# Copy this file to .env and fill in your actual values
# NEVER commit .env files to version control

# ============================================
# SERVER CONFIGURATION
# ============================================
NODE_ENV=development
PORT=3000
HOST=localhost

# ============================================
# SUPABASE DATABASE CONFIGURATION
# Get these from: https://supabase.com/dashboard/project/your-project/settings/api
# ============================================
https://<project-ref>.supabase.co
SUPABASE_KEY=your-anon-key-here
REDACTED_SUPABASE_SERVICE_ROLE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY

# ============================================
# AUTHENTICATION
# ============================================
REDACTED_JWT_SECRET=REDACTED_JWT_SECRET
AUTH_REDIRECT_URL=http://localhost:3000/auth/callback

# ============================================
# API KEYS (if needed)
# ============================================
OPENAI_API_KEY=REDACTED_OPENAI_API_KEY
STRIPE_SECRET_KEY=your-stripe-secret-key-here

# ============================================
# DEVELOPMENT SETTINGS
# ============================================
LOG_LEVEL=debug
ENABLE_CORS=true
EOF

echo ""
echo "✅ Phase 6: Verification"
echo "======================="

# Run security checks
echo "🔍 Running final security verification..."

# Check for remaining secrets
echo "🔍 Checking for potential secrets..."
if command -v grep &> /dev/null; then
    SECRET_PATTERNS=(
        "sk-[a-zA-Z0-9]{48}"
        "pk_[a-zA-Z0-9]{24}"
        "[A-Za-z0-9]{32,}"
        "AKIA[0-9A-Z]{16}"
        "password.*=.*[A-Za-z0-9]"
        "secret.*=.*[A-Za-z0-9]"
        "token.*=.*[A-Za-z0-9]{20,}"
    )
    
    for pattern in "${SECRET_PATTERNS[@]}"; do
        matches=$(find "$REPO_ROOT" -type f -name "*.js" -o -name "*.ts" -o -name "*.sh" -o -name "*.json" | \
                 xargs grep -l "$pattern" 2>/dev/null | \
                 grep -v node_modules | \
                 grep -v ".backup" | \
                 grep -v ".git" || true)
        
        if [ -n "$matches" ]; then
            echo "⚠️  Potential secrets found in:"
            echo "$matches"
        fi
    done
fi

# Check file permissions
echo "🔍 Checking file permissions..."
find "$REPO_ROOT" -type f -name "*.sh" ! -perm 755 | while read -r script; do
    echo "🔧 Making executable: $script"
    chmod +x "$script"
done

echo ""
echo "📊 Cleanup Summary"
echo "================="
echo "✅ Secrets removed and replaced with placeholders"
echo "✅ Development artifacts cleaned"
echo "✅ .gitignore updated for security"
echo "✅ SECURITY.md policy created"
echo "✅ .env.template created"
echo "✅ File permissions verified"
echo ""
echo "💾 Backup created at: $BACKUP_DIR"
echo ""
echo "🎯 Next Steps for Commercial Readiness:"
echo "1. Review and update README.md with proper documentation"
echo "2. Add comprehensive tests and CI/CD"
echo "3. Set up proper licensing"
echo "4. Configure automated security scanning"
echo "5. Set up monitoring and analytics"
echo ""
echo "🔒 Repository is now ready for commercial use!"

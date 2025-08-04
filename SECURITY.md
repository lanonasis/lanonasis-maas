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

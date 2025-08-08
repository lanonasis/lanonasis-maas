#!/usr/bin/env node

import { config } from 'dotenv';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Load environment variables
config();

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper functions for colored output
const log = {
  error: (msg: string) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  section: (msg: string) => console.log(`\n${colors.bright}${colors.blue}▶ ${msg}${colors.reset}`),
};

// Validation results tracker
interface ValidationResult {
  category: string;
  variable: string;
  status: 'success' | 'error' | 'warning';
  message: string;
}

const results: ValidationResult[] = [];

// Add result to tracker
const addResult = (category: string, variable: string, status: ValidationResult['status'], message: string) => {
  results.push({ category, variable, status, message });
};

// Validate basic environment setup
const validateBasicSetup = () => {
  log.section('Validating Basic Environment Setup');
  
  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    log.error('.env file not found. Copy .env.example to .env and configure it.');
    addResult('Setup', '.env', 'error', 'File not found');
    return false;
  }
  
  log.success('.env file found');
  addResult('Setup', '.env', 'success', 'File exists');
  
  // Check Node.js version
  const nodeVersion = process.versions.node;
  const majorVersion = parseInt(nodeVersion.split('.')[0]);
  if (majorVersion < 16) {
    log.error(`Node.js version ${nodeVersion} is too old. Minimum required: 16.x`);
    addResult('Setup', 'Node.js', 'error', `Version ${nodeVersion} too old`);
    return false;
  }
  
  log.success(`Node.js version ${nodeVersion} is compatible`);
  addResult('Setup', 'Node.js', 'success', `Version ${nodeVersion}`);
  
  return true;
};

// Validate core configuration
const validateCoreConfig = () => {
  log.section('Validating Core Configuration');
  
  const requiredVars = [
    'NODE_ENV',
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'SUPABASE_SERVICE_KEY',
    'JWT_SECRET',
    'OPENAI_API_KEY'
  ];
  
  let hasErrors = false;
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      log.error(`Missing required variable: ${varName}`);
      addResult('Core', varName, 'error', 'Missing');
      hasErrors = true;
    } else {
      log.success(`${varName} is configured`);
      addResult('Core', varName, 'success', 'Configured');
    }
  }
  
  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    log.error('JWT_SECRET must be at least 32 characters long');
    addResult('Core', 'JWT_SECRET', 'error', 'Too short');
    hasErrors = true;
  }
  
  // Validate Supabase URL format
  if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.startsWith('https://')) {
    log.error('SUPABASE_URL must be a valid HTTPS URL');
    addResult('Core', 'SUPABASE_URL', 'error', 'Invalid URL format');
    hasErrors = true;
  }
  
  return !hasErrors;
};

// Validate API key configuration
const validateApiKeyConfig = () => {
  log.section('Validating API Key Configuration');
  
  let hasErrors = false;
  
  // Check encryption key
  const encKey = process.env.API_KEY_ENCRYPTION_KEY;
  if (!encKey) {
    log.error('API_KEY_ENCRYPTION_KEY is required');
    addResult('API Key', 'API_KEY_ENCRYPTION_KEY', 'error', 'Missing');
    hasErrors = true;
  } else if (encKey.length !== 32) {
    log.error('API_KEY_ENCRYPTION_KEY must be exactly 32 characters');
    addResult('API Key', 'API_KEY_ENCRYPTION_KEY', 'error', `Invalid length: ${encKey.length}`);
    hasErrors = true;
  } else {
    log.success('API_KEY_ENCRYPTION_KEY is properly configured');
    addResult('API Key', 'API_KEY_ENCRYPTION_KEY', 'success', 'Valid');
  }
  
  // Check API key prefixes
  const devPrefix = process.env.API_KEY_PREFIX_DEVELOPMENT || 'sk_test_';
  const prodPrefix = process.env.API_KEY_PREFIX_PRODUCTION || 'sk_live_';
  
  if (process.env.NODE_ENV === 'production' && prodPrefix.includes('test')) {
    log.error('Production API key prefix should not contain "test"');
    addResult('API Key', 'API_KEY_PREFIX_PRODUCTION', 'error', 'Contains "test"');
    hasErrors = true;
  } else {
    log.success('API key prefixes are properly configured');
    addResult('API Key', 'Prefixes', 'success', `Dev: ${devPrefix}, Prod: ${prodPrefix}`);
  }
  
  // Check MCP configuration
  const mcpEnabled = process.env.MCP_ENABLED !== 'false';
  if (mcpEnabled) {
    log.info('MCP (Model Context Protocol) is enabled');
    addResult('API Key', 'MCP', 'success', 'Enabled');
    
    const mcpVars = [
      'MCP_ACCESS_REQUEST_EXPIRY_HOURS',
      'MCP_SESSION_TIMEOUT_HOURS',
      'MCP_MAX_TOOLS_PER_KEY'
    ];
    
    for (const varName of mcpVars) {
      const value = process.env[varName];
      if (value && isNaN(Number(value))) {
        log.warning(`${varName} should be a number, got: ${value}`);
        addResult('API Key', varName, 'warning', 'Invalid number format');
      }
    }
  } else {
    log.info('MCP is disabled');
    addResult('API Key', 'MCP', 'warning', 'Disabled');
  }
  
  return !hasErrors;
};

// Validate Redis configuration
const validateRedisConfig = () => {
  log.section('Validating Redis Configuration');
  
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    log.error('REDIS_URL is required for API key caching');
    addResult('Redis', 'REDIS_URL', 'error', 'Missing');
    return false;
  }
  
  try {
    new URL(redisUrl);
    log.success('REDIS_URL is valid');
    addResult('Redis', 'REDIS_URL', 'success', 'Valid URL');
  } catch (error) {
    log.error('REDIS_URL is not a valid URL');
    addResult('Redis', 'REDIS_URL', 'error', 'Invalid URL format');
    return false;
  }
  
  // Check Redis TTL settings
  const apiKeyTTL = process.env.REDIS_API_KEY_TTL || '300';
  const sessionTTL = process.env.REDIS_SESSION_TTL || '28800';
  
  if (Number(apiKeyTTL) < 60) {
    log.warning('REDIS_API_KEY_TTL is very low (< 60 seconds)');
    addResult('Redis', 'REDIS_API_KEY_TTL', 'warning', 'Low TTL');
  }
  
  log.success(`Redis TTL settings: API Keys=${apiKeyTTL}s, Sessions=${sessionTTL}s`);
  addResult('Redis', 'TTL Settings', 'success', `Keys=${apiKeyTTL}s, Sessions=${sessionTTL}s`);
  
  return true;
};

// Validate security configuration
const validateSecurityConfig = () => {
  log.section('Validating Security Configuration');
  
  const securityEnabled = process.env.SECURITY_ALERT_ENABLED !== 'false';
  if (securityEnabled) {
    log.success('Security alerts are enabled');
    addResult('Security', 'Alerts', 'success', 'Enabled');
    
    // Check thresholds
    const criticalThreshold = Number(process.env.SECURITY_ALERT_THRESHOLD_CRITICAL || '5');
    const highThreshold = Number(process.env.SECURITY_ALERT_THRESHOLD_HIGH || '10');
    
    if (criticalThreshold >= highThreshold) {
      log.warning('Critical threshold should be lower than high threshold');
      addResult('Security', 'Thresholds', 'warning', 'Invalid configuration');
    }
  } else {
    log.warning('Security alerts are disabled');
    addResult('Security', 'Alerts', 'warning', 'Disabled');
  }
  
  // Check anomaly detection
  const anomalyEnabled = process.env.ANOMALY_DETECTION_ENABLED !== 'false';
  if (anomalyEnabled) {
    log.success('Anomaly detection is enabled');
    addResult('Security', 'Anomaly Detection', 'success', 'Enabled');
    
    const sensitivity = Number(process.env.ANOMALY_DETECTION_SENSITIVITY || '0.85');
    if (sensitivity < 0 || sensitivity > 1) {
      log.warning('ANOMALY_DETECTION_SENSITIVITY should be between 0 and 1');
      addResult('Security', 'Sensitivity', 'warning', 'Out of range');
    }
  }
  
  // Check auto-suspension settings
  const failedAuth = Number(process.env.AUTO_SUSPEND_FAILED_AUTH_ATTEMPTS || '10');
  const rateLimitViolations = Number(process.env.AUTO_SUSPEND_RATE_LIMIT_VIOLATIONS || '50');
  
  if (failedAuth < 3) {
    log.warning('AUTO_SUSPEND_FAILED_AUTH_ATTEMPTS is very low (< 3)');
    addResult('Security', 'Auto-suspend', 'warning', 'Very sensitive');
  }
  
  return true;
};

// Validate enterprise features
const validateEnterpriseFeatures = () => {
  log.section('Validating Enterprise Features');
  
  // Check HSM configuration
  const hsmEnabled = process.env.HSM_ENABLED === 'true';
  if (hsmEnabled) {
    log.info('HSM (Hardware Security Module) is enabled');
    addResult('Enterprise', 'HSM', 'success', 'Enabled');
    
    const requiredHsmVars = ['HSM_MODULE_PATH', 'HSM_PIN'];
    let hsmValid = true;
    
    for (const varName of requiredHsmVars) {
      if (!process.env[varName]) {
        log.error(`${varName} is required when HSM is enabled`);
        addResult('Enterprise', varName, 'error', 'Missing');
        hsmValid = false;
      }
    }
    
    if (hsmValid && process.env.HSM_MODULE_PATH) {
      if (!fs.existsSync(process.env.HSM_MODULE_PATH)) {
        log.error('HSM_MODULE_PATH file does not exist');
        addResult('Enterprise', 'HSM Module', 'error', 'File not found');
      }
    }
  } else {
    log.info('HSM is disabled');
    addResult('Enterprise', 'HSM', 'info', 'Disabled');
  }
  
  // Check backup configuration
  const backupEnabled = process.env.BACKUP_ENABLED !== 'false';
  if (backupEnabled) {
    log.success('Backup is enabled');
    addResult('Enterprise', 'Backup', 'success', 'Enabled');
    
    if (process.env.BACKUP_S3_BUCKET) {
      const awsVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];
      let awsValid = true;
      
      for (const varName of awsVars) {
        if (!process.env[varName]) {
          log.error(`${varName} is required for S3 backups`);
          addResult('Enterprise', varName, 'error', 'Missing');
          awsValid = false;
        }
      }
    }
  }
  
  return true;
};

// Generate summary report
const generateReport = () => {
  log.section('Validation Summary');
  
  const errors = results.filter(r => r.status === 'error');
  const warnings = results.filter(r => r.status === 'warning');
  const successes = results.filter(r => r.status === 'success');
  
  console.log(`\n${colors.bright}Results:${colors.reset}`);
  console.log(`  ${colors.green}✓ Success: ${successes.length}${colors.reset}`);
  console.log(`  ${colors.yellow}⚠ Warnings: ${warnings.length}${colors.reset}`);
  console.log(`  ${colors.red}✗ Errors: ${errors.length}${colors.reset}`);
  
  if (errors.length > 0) {
    console.log(`\n${colors.bright}${colors.red}Errors to fix:${colors.reset}`);
    errors.forEach(e => {
      console.log(`  - ${e.category}/${e.variable}: ${e.message}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log(`\n${colors.bright}${colors.yellow}Warnings to review:${colors.reset}`);
    warnings.forEach(w => {
      console.log(`  - ${w.category}/${w.variable}: ${w.message}`);
    });
  }
  
  // Generate encryption key if needed
  if (!process.env.API_KEY_ENCRYPTION_KEY || process.env.API_KEY_ENCRYPTION_KEY.length !== 32) {
    console.log(`\n${colors.bright}${colors.cyan}Tip: Generate a secure API_KEY_ENCRYPTION_KEY:${colors.reset}`);
    const key = crypto.randomBytes(16).toString('hex');
    console.log(`  ${key}`);
  }
  
  return errors.length === 0;
};

// Main validation function
const main = async () => {
  console.log(`${colors.bright}${colors.blue}Memory as a Service - Environment Validation${colors.reset}`);
  console.log(`${colors.cyan}Validating environment configuration for API key integration...${colors.reset}\n`);
  
  // Run all validations
  const setupValid = validateBasicSetup();
  if (!setupValid) {
    generateReport();
    process.exit(1);
  }
  
  validateCoreConfig();
  validateApiKeyConfig();
  validateRedisConfig();
  validateSecurityConfig();
  validateEnterpriseFeatures();
  
  // Generate final report
  const isValid = generateReport();
  
  if (isValid) {
    console.log(`\n${colors.green}${colors.bright}✅ Environment validation passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bright}❌ Environment validation failed!${colors.reset}`);
    console.log(`${colors.yellow}Please fix the errors above and run validation again.${colors.reset}`);
    process.exit(1);
  }
};

// Run validation
main().catch(error => {
  console.error(`${colors.red}Unexpected error during validation:${colors.reset}`, error);
  process.exit(1);
});
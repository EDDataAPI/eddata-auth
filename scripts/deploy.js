#!/usr/bin/env node

/**
 * Ardent Auth Deployment Script
 * Manages Docker-based deployments for different environments
 */

const { execSync } = require('child_process')
const fs = require('fs')

const ENVIRONMENTS = {
  development: {
    compose: 'docker-compose.yml',
    env: '.env.development'
  },
  staging: {
    compose: 'docker-compose.staging.yml',
    env: '.env.staging'
  },
  production: {
    compose: 'docker-compose.production.yml',
    env: '.env.production'
  }
}

class DeploymentManager {
  constructor () {
    this.environment = process.env.NODE_ENV || 'development'
    this.verbose = process.argv.includes('--verbose')
  }

  log (message, level = 'info') {
    const timestamp = new Date().toISOString()
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅'
    console.log(`${prefix} [${timestamp}] ${message}`)
  }

  exec (command, options = {}) {
    if (this.verbose) {
      this.log(`Executing: ${command}`)
    }

    try {
      const result = execSync(command, {
        encoding: 'utf8',
        stdio: this.verbose ? 'inherit' : 'pipe',
        ...options
      })
      return result
    } catch (error) {
      this.log(`Command failed: ${command}`, 'error')
      this.log(error.message, 'error')
      throw error
    }
  }

  checkPrerequisites () {
    this.log('Checking prerequisites...')
    try {
      this.exec('docker --version')
      this.exec('docker-compose --version')
      this.log('Prerequisites satisfied')
    } catch (error) {
      this.log('Docker or Docker Compose not found', 'error')
      throw new Error('Missing required tools')
    }
  }

  build () {
    this.log('Building Docker image...')
    this.exec('docker build -t eddata-auth:latest .')
    this.log('Build complete')
  }

  deploy () {
    this.log(`Deploying to ${this.environment}...`)
    const config = ENVIRONMENTS[this.environment]

    if (fs.existsSync(config.compose)) {
      this.exec(`docker-compose -f ${config.compose} up -d`)
    } else {
      this.exec('docker-compose up -d')
    }

    this.log('Deployment complete')
  }

  status () {
    this.log('Checking service status...')
    this.exec('docker-compose ps')
  }

  logs () {
    this.log('Fetching logs...')
    this.exec('docker-compose logs -f --tail=100')
  }

  showHelp () {
    console.log(`
Ardent Auth Deployment Manager

Usage: node deploy.js [command] [options]

Commands:
  build       Build Docker images
  deploy      Deploy to environment
  status      Show deployment status
  logs        Show service logs
  help        Show this help

Options:
  --verbose   Show detailed output
  --env=ENV   Set environment (development|staging|production)

Environment: ${this.environment}
    `)
  }
}

// Main execution
async function main () {
  const command = process.argv[2] || 'help'
  const manager = new DeploymentManager()

  const envArg = process.argv.find(arg => arg.startsWith('--env='))
  if (envArg) {
    manager.environment = envArg.split('=')[1]
  }

  try {
    switch (command) {
      case 'build':
        manager.checkPrerequisites()
        manager.build()
        break

      case 'deploy':
        manager.checkPrerequisites()
        manager.build()
        manager.deploy()
        break

      case 'status':
        manager.status()
        break

      case 'logs':
        manager.logs()
        break

      default:
        manager.showHelp()
        break
    }
  } catch (error) {
    manager.log(error.message, 'error')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = DeploymentManager

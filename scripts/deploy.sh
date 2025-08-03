#!/bin/bash

# LanOnasis MaaS Deployment Script
# This script handles building and deploying the MaaS service, CLI, and SDK

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_ENV="${DEPLOY_ENV:-staging}"
BUILD_VERSION="${BUILD_VERSION:-$(date +%Y%m%d%H%M%S)}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
LanOnasis MaaS Deployment Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    build               Build all components (service, CLI, SDK)
    deploy              Deploy to specified environment
    publish-sdk         Publish SDK to NPM
    publish-cli         Publish CLI to NPM
    test                Run tests for all components
    docker              Build and push Docker images
    clean               Clean build artifacts
    help                Show this help message

Options:
    --env ENV          Deployment environment (staging|production)
    --version VERSION  Build version/tag
    --skip-tests       Skip running tests
    --skip-build       Skip building (use existing build)
    --force            Force deployment without confirmation
    --dry-run          Show what would be deployed without doing it

Environment Variables:
    DEPLOY_ENV         Deployment environment (default: staging)
    BUILD_VERSION      Build version (default: timestamp)
    NPM_TOKEN          NPM authentication token
    DOCKER_REGISTRY    Docker registry URL
    DOCKER_USERNAME    Docker registry username
    DOCKER_PASSWORD    Docker registry password

Examples:
    $0 build
    $0 deploy --env production --version v1.2.0
    $0 publish-sdk --version 1.2.0
    $0 docker --env production
    $0 test --skip-build

EOF
}

# Parse command line arguments
COMMAND=""
SKIP_TESTS=false
SKIP_BUILD=false
FORCE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        build|deploy|publish-sdk|publish-cli|test|docker|clean|help)
            COMMAND=$1
            shift
            ;;
        --env)
            DEPLOY_ENV=$2
            shift 2
            ;;
        --version)
            BUILD_VERSION=$2
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Default command
if [[ -z "$COMMAND" ]]; then
    COMMAND="help"
fi

# Utility functions
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null && [[ "$COMMAND" == "docker" ]]; then
        log_error "Docker is required for docker command"
        exit 1
    fi
    
    log_success "Dependencies checked"
}

install_dependencies() {
    log_info "Installing dependencies..."
    
    cd "$PROJECT_ROOT"
    npm ci
    
    cd "$PROJECT_ROOT/cli"
    npm ci
    
    cd "$PROJECT_ROOT/packages/lanonasis-sdk"
    npm ci
    
    log_success "Dependencies installed"
}

run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log_warning "Skipping tests"
        return
    fi
    
    log_info "Running tests..."
    
    cd "$PROJECT_ROOT"
    npm run test
    
    cd "$PROJECT_ROOT/packages/lanonasis-sdk"
    npm run test
    
    log_success "Tests completed"
}

build_service() {
    log_info "Building MaaS service..."
    
    cd "$PROJECT_ROOT"
    npm run build
    
    log_success "MaaS service built"
}

build_cli() {
    log_info "Building CLI..."
    
    cd "$PROJECT_ROOT/cli"
    npm run build
    
    log_success "CLI built"
}

build_sdk() {
    log_info "Building SDK..."
    
    cd "$PROJECT_ROOT/packages/lanonasis-sdk"
    npm run build
    
    log_success "SDK built"
}

build_all() {
    if [[ "$SKIP_BUILD" == true ]]; then
        log_warning "Skipping build"
        return
    fi
    
    install_dependencies
    run_tests
    build_service
    build_cli
    build_sdk
}

publish_sdk() {
    log_info "Publishing SDK to NPM..."
    
    if [[ -z "$NPM_TOKEN" ]]; then
        log_error "NPM_TOKEN environment variable is required"
        exit 1
    fi
    
    cd "$PROJECT_ROOT/packages/lanonasis-sdk"
    
    # Update version if specified
    if [[ "$BUILD_VERSION" != *$(date +%Y%m%d)* ]]; then
        npm version "$BUILD_VERSION" --no-git-tag-version
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "Dry run: would publish SDK version $(node -p "require('./package.json').version")"
        return
    fi
    
    echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
    npm publish --access public
    
    log_success "SDK published to NPM"
}

publish_cli() {
    log_info "Publishing CLI to NPM..."
    
    if [[ -z "$NPM_TOKEN" ]]; then
        log_error "NPM_TOKEN environment variable is required"
        exit 1
    fi
    
    cd "$PROJECT_ROOT/cli"
    
    # Update version if specified
    if [[ "$BUILD_VERSION" != *$(date +%Y%m%d)* ]]; then
        npm version "$BUILD_VERSION" --no-git-tag-version
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "Dry run: would publish CLI version $(node -p "require('./package.json').version")"
        return
    fi
    
    echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
    npm publish --access public
    
    log_success "CLI published to NPM"
}

build_docker() {
    log_info "Building Docker image..."
    
    cd "$PROJECT_ROOT"
    
    IMAGE_NAME="${DOCKER_REGISTRY:-lanonasis}/maas:${BUILD_VERSION}"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "Dry run: would build Docker image $IMAGE_NAME"
        return
    fi
    
    docker build -t "$IMAGE_NAME" .
    docker tag "$IMAGE_NAME" "${DOCKER_REGISTRY:-lanonasis}/maas:latest"
    
    if [[ -n "$DOCKER_REGISTRY" && -n "$DOCKER_USERNAME" && -n "$DOCKER_PASSWORD" ]]; then
        echo "$DOCKER_PASSWORD" | docker login "$DOCKER_REGISTRY" -u "$DOCKER_USERNAME" --password-stdin
        docker push "$IMAGE_NAME"
        docker push "${DOCKER_REGISTRY:-lanonasis}/maas:latest"
        log_success "Docker image pushed to registry"
    else
        log_success "Docker image built locally"
    fi
}

deploy_service() {
    log_info "Deploying MaaS service to $DEPLOY_ENV..."
    
    if [[ "$FORCE" != true ]] && [[ "$DRY_RUN" != true ]]; then
        read -p "Are you sure you want to deploy to $DEPLOY_ENV? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "Dry run: would deploy to $DEPLOY_ENV environment"
        return
    fi
    
    case $DEPLOY_ENV in
        staging)
            deploy_staging
            ;;
        production)
            deploy_production
            ;;
        *)
            log_error "Unknown environment: $DEPLOY_ENV"
            exit 1
            ;;
    esac
}

deploy_staging() {
    log_info "Deploying to staging environment..."
    
    # Update staging deployment
    if [[ -f "$PROJECT_ROOT/k8s/staging.yaml" ]]; then
        kubectl apply -f "$PROJECT_ROOT/k8s/staging.yaml"
    elif [[ -f "$PROJECT_ROOT/docker-compose.staging.yml" ]]; then
        docker-compose -f docker-compose.staging.yml up -d
    else
        log_error "No staging deployment configuration found"
        exit 1
    fi
    
    log_success "Deployed to staging"
}

deploy_production() {
    log_info "Deploying to production environment..."
    
    # Production deployment with health checks
    if [[ -f "$PROJECT_ROOT/k8s/production.yaml" ]]; then
        kubectl apply -f "$PROJECT_ROOT/k8s/production.yaml"
        kubectl rollout status deployment/lanonasis-maas -n production
    elif [[ -f "$PROJECT_ROOT/docker-compose.prod.yml" ]]; then
        docker-compose -f docker-compose.prod.yml up -d
        sleep 30  # Wait for service to start
    else
        log_error "No production deployment configuration found"
        exit 1
    fi
    
    # Health check
    if command -v curl &> /dev/null; then
        HEALTH_URL="${HEALTH_URL:-https://api.lanonasis.com/api/v1/health}"
        if curl -f "$HEALTH_URL" &> /dev/null; then
            log_success "Health check passed"
        else
            log_error "Health check failed"
            exit 1
        fi
    fi
    
    log_success "Deployed to production"
}

clean_build() {
    log_info "Cleaning build artifacts..."
    
    cd "$PROJECT_ROOT"
    rm -rf dist/ node_modules/.cache
    
    cd "$PROJECT_ROOT/cli"
    rm -rf dist/
    
    cd "$PROJECT_ROOT/packages/lanonasis-sdk"
    rm -rf dist/
    
    log_success "Build artifacts cleaned"
}

# Main execution
main() {
    log_info "Starting LanOnasis MaaS deployment script"
    log_info "Command: $COMMAND"
    log_info "Environment: $DEPLOY_ENV"
    log_info "Version: $BUILD_VERSION"
    
    check_dependencies
    
    case $COMMAND in
        build)
            build_all
            ;;
        deploy)
            build_all
            build_docker
            deploy_service
            ;;
        publish-sdk)
            build_sdk
            publish_sdk
            ;;
        publish-cli)
            build_cli
            publish_cli
            ;;
        test)
            install_dependencies
            run_tests
            ;;
        docker)
            build_service
            build_docker
            ;;
        clean)
            clean_build
            ;;
        help)
            show_help
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
    
    log_success "Deployment script completed successfully"
}

# Run main function
main "$@"
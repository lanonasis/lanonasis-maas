#!/bin/bash

# Enhanced Lanonasis MaaS Installation Script
# Inspired by mem0's one-command setup
# Provides complete development environment setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/lanonasis/lanonasis-maas.git"
INSTALL_DIR="$HOME/lanonasis-maas"
ENV_FILE="$INSTALL_DIR/.env"

# Functions
print_header() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║    🧠 Lanonasis Memory as a Service (MaaS) - Enhanced       ║"
    echo "║                                                              ║"
    echo "║    mem0-inspired architecture with advanced features        ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${CYAN}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

check_requirements() {
    print_step "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        echo "Visit: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi
    
    # Check Docker (optional but recommended)
    if command -v docker &> /dev/null; then
        print_success "Docker found - full development environment available"
        DOCKER_AVAILABLE=true
    else
        print_warning "Docker not found - some features will be limited"
        DOCKER_AVAILABLE=false
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed."
        exit 1
    fi
    
    print_success "System requirements check passed"
}

clone_repository() {
    print_step "Cloning Lanonasis MaaS repository..."
    
    if [ -d "$INSTALL_DIR" ]; then
        print_warning "Directory $INSTALL_DIR already exists"
        read -p "Do you want to remove it and continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$INSTALL_DIR"
        else
            print_error "Installation cancelled"
            exit 1
        fi
    fi
    
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    print_success "Repository cloned successfully"
}

setup_environment() {
    print_step "Setting up environment configuration..."
    
    if [ ! -f "$ENV_FILE" ]; then
        cp .env.example "$ENV_FILE"
        print_success "Environment file created from template"
    else
        print_warning "Environment file already exists"
    fi
    
    echo
    echo -e "${YELLOW}🔧 Environment Configuration${NC}"
    echo "Please provide the following configuration values:"
    echo
    
    # Supabase Configuration
    echo -e "${BLUE}Supabase Configuration:${NC}"
    read -p "Supabase URL: " SUPABASE_URL
    read -s -p "Supabase Service Key: " SUPABASE_SERVICE_KEY; echo
    read -s -p "Supabase Anon Key: " SUPABASE_ANON_KEY; echo
    
    # OpenAI Configuration (optional)
    echo
    echo -e "${BLUE}OpenAI Configuration (optional for embeddings):${NC}"
    read -s -p "OpenAI API Key (press Enter to skip): " OPENAI_API_KEY; echo
    
    # Vector Store Configuration
    echo
    echo -e "${BLUE}Vector Store Configuration:${NC}"
    echo "1) Local (simple, for development)"
    echo "2) Qdrant (recommended for production)"
    echo "3) Chroma (alternative vector store)"
    read -p "Choose vector store (1-3): " VECTOR_CHOICE
    
    case $VECTOR_CHOICE in
        1) VECTOR_STORE_PROVIDER="local" ;;
        2) VECTOR_STORE_PROVIDER="qdrant" ;;
        3) VECTOR_STORE_PROVIDER="chroma" ;;
        *) VECTOR_STORE_PROVIDER="local" ;;
    esac
    
    # Update .env file
    sed -i.bak "s|SUPABASE_URL=.*|SUPABASE_URL=$SUPABASE_URL|" "$ENV_FILE"
    sed -i.bak "s|SUPABASE_SERVICE_KEY=.*|SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY|" "$ENV_FILE"
    sed -i.bak "s|SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY|" "$ENV_FILE"
    
    if [ -n "$OPENAI_API_KEY" ]; then
        sed -i.bak "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_API_KEY|" "$ENV_FILE"
    fi
    
    echo "VECTOR_STORE_PROVIDER=$VECTOR_STORE_PROVIDER" >> "$ENV_FILE"
    
    rm "$ENV_FILE.bak"
    
    print_success "Environment configuration completed"
}

install_dependencies() {
    print_step "Installing dependencies..."
    
    # Main project dependencies
    npm ci
    
    # CLI dependencies
    cd cli
    npm ci
    npm run build
    cd ..
    
    # Dashboard dependencies
    if [ -d "dashboard" ]; then
        cd dashboard
        npm ci
        cd ..
    fi
    
    # SDK dependencies
    if [ -d "packages/lanonasis-sdk" ]; then
        cd packages/lanonasis-sdk
        npm ci
        cd ../..
    fi
    
    print_success "Dependencies installed successfully"
}

setup_database() {
    print_step "Setting up database schema..."
    
    if [ "$DOCKER_AVAILABLE" = true ]; then
        echo "Starting PostgreSQL with Docker..."
        docker-compose -f docker-compose.enhanced.yml up -d postgres
        
        # Wait for PostgreSQL to be ready
        echo "Waiting for PostgreSQL to be ready..."
        sleep 10
        
        print_success "Database setup completed with Docker"
    else
        print_warning "Docker not available - please set up PostgreSQL manually"
        echo "Run the following SQL files in your PostgreSQL database:"
        echo "1. src/db/schema.sql"
        echo "2. src/db/schema-enhanced-mem0.sql"
    fi
}

setup_vector_store() {
    print_step "Setting up vector store..."
    
    case $VECTOR_STORE_PROVIDER in
        "qdrant")
            if [ "$DOCKER_AVAILABLE" = true ]; then
                echo "Starting Qdrant with Docker..."
                docker-compose -f docker-compose.enhanced.yml up -d qdrant
                print_success "Qdrant vector store setup completed"
            else
                print_warning "Docker not available - please install Qdrant manually"
                echo "Visit: https://qdrant.tech/documentation/quick-start/"
            fi
            ;;
        "chroma")
            if [ "$DOCKER_AVAILABLE" = true ]; then
                echo "Starting Chroma with Docker..."
                docker-compose -f docker-compose.enhanced.yml --profile chroma up -d chroma
                print_success "Chroma vector store setup completed"
            else
                print_warning "Docker not available - please install Chroma manually"
                echo "Visit: https://docs.trychroma.com/getting-started"
            fi
            ;;
        "local")
            print_success "Local vector store configured (no additional setup required)"
            ;;
    esac
}

install_cli_globally() {
    print_step "Installing CLI globally..."
    
    cd cli
    npm link
    cd ..
    
    print_success "CLI installed globally as 'lanonasis' and 'onasis'"
}

run_tests() {
    print_step "Running tests to verify installation..."
    
    # Run basic tests
    npm test
    
    # Test CLI
    if command -v lanonasis &> /dev/null; then
        lanonasis --version
        print_success "CLI test passed"
    else
        print_warning "CLI not available in PATH"
    fi
}

print_completion() {
    echo
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║    🎉 Installation Complete!                                 ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${CYAN}Next Steps:${NC}"
    echo
    echo "1. Start the development environment:"
    if [ "$DOCKER_AVAILABLE" = true ]; then
        echo "   cd $INSTALL_DIR"
        echo "   docker-compose -f docker-compose.enhanced.yml up"
    else
        echo "   cd $INSTALL_DIR"
        echo "   npm run dev"
    fi
    echo
    echo "2. Test the CLI:"
    echo "   lanonasis --help"
    echo "   onasis guide"
    echo
    echo "3. Access the services:"
    echo "   • API: http://localhost:3000"
    echo "   • Dashboard: http://localhost:3001"
    echo "   • MCP Server: http://localhost:3002"
    if [ "$VECTOR_STORE_PROVIDER" = "qdrant" ]; then
        echo "   • Qdrant: http://localhost:6333"
    elif [ "$VECTOR_STORE_PROVIDER" = "chroma" ]; then
        echo "   • Chroma: http://localhost:8000"
    fi
    echo
    echo "4. Documentation:"
    echo "   • README: $INSTALL_DIR/README.md"
    echo "   • CLI Guide: $INSTALL_DIR/cli/README.md"
    echo "   • API Docs: http://localhost:3000/docs"
    echo
    echo -e "${YELLOW}Configuration files:${NC}"
    echo "   • Environment: $ENV_FILE"
    echo "   • Docker Compose: $INSTALL_DIR/docker-compose.enhanced.yml"
    echo
    echo -e "${PURPLE}Happy coding with Lanonasis MaaS! 🚀${NC}"
}

# Main installation flow
main() {
    print_header
    
    echo -e "${BLUE}This script will install Lanonasis Memory as a Service with enhanced features.${NC}"
    echo
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Installation cancelled"
        exit 1
    fi
    
    check_requirements
    clone_repository
    setup_environment
    install_dependencies
    setup_database
    setup_vector_store
    install_cli_globally
    run_tests
    print_completion
}

# Handle script interruption
trap 'print_error "Installation interrupted"; exit 1' INT TERM

# Run main function
main "$@"
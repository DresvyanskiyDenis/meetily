#!/usr/bin/env bash
#
# Meetily — Unified Build Script
# Builds the Tauri desktop app for the current platform or a specified target.
#
# Usage:
#   ./build.sh                  # Auto-detect platform & GPU, build
#   ./build.sh --platform mac   # Build for macOS (Metal/CoreML)
#   ./build.sh --platform win   # Build for Windows (Vulkan)
#   ./build.sh --platform linux # Build for Linux (OpenBLAS)
#   ./build.sh --gpu metal      # Override GPU feature
#   ./build.sh --gpu cpu        # Force CPU-only build
#   ./build.sh --clean          # Clean build artifacts first
#   ./build.sh --install-deps   # Install prerequisites (Rust, Node, pnpm)
#   ./build.sh --all            # Build for all platforms (requires each OS or cross-compile)
#
# Environment variables:
#   TAURI_GPU_FEATURE=metal|cuda|vulkan|coreml|openblas|hipblas|cpu
#   TAURI_SIGNING_PRIVATE_KEY=... (for update signing)
#
set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log()   { echo -e "${GREEN}[BUILD]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
info()  { echo -e "${CYAN}[INFO]${NC} $*"; }

# ── Source cargo env if available ───────────────────────────────────────────
# shellcheck source=/dev/null
[[ -f "$HOME/.cargo/env" ]] && source "$HOME/.cargo/env"

# ── Defaults ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
CLEAN=false
INSTALL_DEPS=false
BUILD_ALL=false
TARGET_PLATFORM=""
GPU_OVERRIDE=""

# ── Parse arguments ─────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --platform)
            TARGET_PLATFORM="$2"
            shift 2
            ;;
        --gpu)
            GPU_OVERRIDE="$2"
            shift 2
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        --install-deps)
            INSTALL_DEPS=true
            shift
            ;;
        --all)
            BUILD_ALL=true
            shift
            ;;
        --help|-h)
            head -20 "$0" | grep '^#' | sed 's/^# \?//'
            exit 0
            ;;
        *)
            err "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ── Detect current OS ──────────────────────────────────────────────────────
detect_os() {
    case "$(uname -s)" in
        Darwin*)  echo "mac" ;;
        Linux*)   echo "linux" ;;
        MINGW*|MSYS*|CYGWIN*) echo "win" ;;
        *)        echo "unknown" ;;
    esac
}

CURRENT_OS="$(detect_os)"

if [[ -z "$TARGET_PLATFORM" ]]; then
    TARGET_PLATFORM="$CURRENT_OS"
fi

# ── Prerequisite checks ────────────────────────────────────────────────────
check_command() {
    command -v "$1" &>/dev/null
}

install_prerequisites() {
    log "Checking and installing prerequisites..."

    # Node.js
    if ! check_command node; then
        warn "Node.js not found."
        if [[ "$CURRENT_OS" == "mac" ]]; then
            log "Installing Node.js via Homebrew..."
            brew install node
        elif [[ "$CURRENT_OS" == "linux" ]]; then
            log "Installing Node.js via NodeSource..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        else
            err "Please install Node.js 20+ from https://nodejs.org"
            exit 1
        fi
    fi
    info "Node.js $(node --version)"

    # pnpm
    if ! check_command pnpm; then
        log "Installing pnpm..."
        npm install -g pnpm
    fi
    info "pnpm $(pnpm --version)"

    # Rust
    if ! check_command cargo; then
        warn "Rust toolchain not found."
        log "Installing Rust via rustup..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        # shellcheck source=/dev/null
        source "$HOME/.cargo/env"
    fi
    info "Rust $(rustc --version | cut -d' ' -f2)"

    # CMake (needed for whisper.cpp compilation)
    if ! check_command cmake; then
        warn "CMake not found."
        if [[ "$CURRENT_OS" == "mac" ]]; then
            brew install cmake
        elif [[ "$CURRENT_OS" == "linux" ]]; then
            sudo apt-get install -y cmake
        fi
    fi
    info "CMake $(cmake --version | head -1 | cut -d' ' -f3)"

    # Platform-specific dependencies
    if [[ "$CURRENT_OS" == "linux" ]]; then
        log "Installing Linux system dependencies..."
        sudo apt-get update
        sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            libappindicator3-dev \
            librsvg2-dev \
            patchelf \
            libssl-dev \
            libgtk-3-dev \
            libayatana-appindicator3-dev \
            libasound2-dev \
            libclang-dev \
            llvm-dev \
            libomp-dev \
            pkg-config
    fi

    log "All prerequisites installed."
}

verify_prerequisites() {
    local missing=()

    check_command node   || missing+=("node")
    check_command cargo  || missing+=("cargo (Rust)")
    check_command cmake  || missing+=("cmake")

    # Check for pnpm (direct or via npx)
    if ! check_command pnpm; then
        if check_command npx; then
            info "pnpm not found globally, will use 'npx pnpm'"
            PNPM_CMD="npx pnpm"
        else
            missing+=("pnpm")
        fi
    else
        PNPM_CMD="pnpm"
    fi

    if [[ ${#missing[@]} -gt 0 ]]; then
        err "Missing prerequisites: ${missing[*]}"
        err "Run with --install-deps to install them automatically, or install manually."
        exit 1
    fi

    info "Node.js $(node --version)"
    info "Rust $(rustc --version 2>/dev/null | cut -d' ' -f2 || echo 'unknown')"
    info "CMake $(cmake --version 2>/dev/null | head -1 | cut -d' ' -f3 || echo 'unknown')"
}

# ── GPU feature detection ──────────────────────────────────────────────────
detect_gpu_feature() {
    local platform="$1"

    # User override
    if [[ -n "$GPU_OVERRIDE" ]]; then
        if [[ "$GPU_OVERRIDE" == "cpu" ]]; then
            echo ""
        else
            echo "$GPU_OVERRIDE"
        fi
        return
    fi

    # Environment variable override
    if [[ -n "${TAURI_GPU_FEATURE:-}" ]]; then
        if [[ "$TAURI_GPU_FEATURE" == "cpu" || "$TAURI_GPU_FEATURE" == "none" ]]; then
            echo ""
        else
            echo "$TAURI_GPU_FEATURE"
        fi
        return
    fi

    # Auto-detect
    case "$platform" in
        mac)
            local arch
            arch="$(uname -m)"
            if [[ "$arch" == "arm64" ]]; then
                echo "coreml"  # Apple Silicon: CoreML includes Metal
            else
                echo "metal"   # Intel Mac: Metal only
            fi
            ;;
        win)
            if check_command nvidia-smi && (check_command nvcc || [[ -n "${CUDA_PATH:-}" ]]); then
                echo "cuda"
            elif [[ -n "${VULKAN_SDK:-}" ]]; then
                echo "vulkan"
            else
                echo ""  # CPU-only
            fi
            ;;
        linux)
            if check_command nvidia-smi && (check_command nvcc || [[ -n "${CUDA_PATH:-}" ]]); then
                echo "cuda"
            elif check_command rocm-smi && (check_command hipcc || [[ -n "${ROCM_PATH:-}" ]]); then
                echo "hipblas"
            elif [[ -n "${VULKAN_SDK:-}" && -n "${BLAS_INCLUDE_DIRS:-}" ]]; then
                echo "vulkan"
            else
                echo "openblas"  # Default to OpenBLAS on Linux
            fi
            ;;
        *)
            echo ""
            ;;
    esac
}

# ── Clean ───────────────────────────────────────────────────────────────────
clean_build_artifacts() {
    log "Cleaning build artifacts..."
    cd "$FRONTEND_DIR"

    rm -rf node_modules .next .pnp.cjs out
    rm -rf src-tauri/target
    rm -rf target/

    log "Clean complete."
}

# ── Build function ──────────────────────────────────────────────────────────
build_for_platform() {
    local platform="$1"

    # Cross-compilation check
    if [[ "$platform" != "$CURRENT_OS" ]]; then
        err "Cross-compilation from $CURRENT_OS to $platform is not supported by Tauri."
        err ""
        err "Tauri requires building on the target platform natively."
        err "Options:"
        err "  1. Build on each platform directly (recommended)"
        err "  2. Use GitHub Actions CI/CD (workflows already exist in .github/workflows/)"
        err "  3. Use a VM or remote machine for the target platform"
        err ""
        err "GitHub Actions workflow: .github/workflows/release.yml"
        return 1
    fi

    local gpu_feature
    gpu_feature="$(detect_gpu_feature "$platform")"

    echo ""
    log "============================================"
    log "  Building Meetily for: $platform"
    [[ -n "$gpu_feature" ]] && log "  GPU acceleration: $gpu_feature" || log "  GPU acceleration: CPU-only"
    log "============================================"
    echo ""

    cd "$FRONTEND_DIR"

    # Install dependencies
    log "Installing dependencies..."
    $PNPM_CMD install

    # Build Next.js
    log "Building Next.js frontend..."
    $PNPM_CMD run build

    # Build Tauri with appropriate features
    if [[ -n "$gpu_feature" ]]; then
        log "Building Tauri app with --features $gpu_feature ..."
        $PNPM_CMD tauri build -- --features "$gpu_feature"
    else
        log "Building Tauri app (CPU-only)..."
        $PNPM_CMD tauri build
    fi

    echo ""
    log "Build complete!"
    echo ""

    # Show output artifacts
    show_artifacts "$platform"
}

# ── Show build artifacts ────────────────────────────────────────────────────
show_artifacts() {
    local platform="$1"
    local bundle_dir="$FRONTEND_DIR/src-tauri/target/release/bundle"

    log "Build artifacts:"
    echo ""

    case "$platform" in
        mac)
            if [[ -d "$bundle_dir/dmg" ]]; then
                info "DMG installer:"
                ls -lh "$bundle_dir/dmg/"*.dmg 2>/dev/null | awk '{print "  → " $NF " (" $5 ")"}'
            fi
            if [[ -d "$bundle_dir/macos" ]]; then
                info "App bundle:"
                ls -d "$bundle_dir/macos/"*.app 2>/dev/null | awk '{print "  → " $NF}'
            fi
            ;;
        win)
            if [[ -d "$bundle_dir/msi" ]]; then
                info "MSI installer:"
                ls -lh "$bundle_dir/msi/"*.msi 2>/dev/null | awk '{print "  → " $NF " (" $5 ")"}'
            fi
            if [[ -d "$bundle_dir/nsis" ]]; then
                info "NSIS installer:"
                ls -lh "$bundle_dir/nsis/"*.exe 2>/dev/null | awk '{print "  → " $NF " (" $5 ")"}'
            fi
            ;;
        linux)
            if [[ -d "$bundle_dir/deb" ]]; then
                info "DEB package:"
                ls -lh "$bundle_dir/deb/"*.deb 2>/dev/null | awk '{print "  → " $NF " (" $5 ")"}'
            fi
            if [[ -d "$bundle_dir/appimage" ]]; then
                info "AppImage:"
                ls -lh "$bundle_dir/appimage/"*.AppImage 2>/dev/null | awk '{print "  → " $NF " (" $5 ")"}'
            fi
            ;;
    esac

    echo ""
    info "All artifacts are in: $bundle_dir/"
}

# ── Main ────────────────────────────────────────────────────────────────────
main() {
    log "Meetily Build Script v0.3.0"
    echo ""

    # Install deps if requested
    if [[ "$INSTALL_DEPS" == true ]]; then
        install_prerequisites
        echo ""
    fi

    # Verify prerequisites
    verify_prerequisites
    echo ""

    # Clean if requested
    if [[ "$CLEAN" == true ]]; then
        clean_build_artifacts
        echo ""
    fi

    # Build
    if [[ "$BUILD_ALL" == true ]]; then
        log "Building for all platforms..."
        warn "Tauri does NOT support cross-compilation."
        warn "Each platform must be built on its native OS."
        echo ""

        local platforms_built=0

        # Build for current platform
        build_for_platform "$CURRENT_OS" && ((platforms_built++)) || true

        echo ""
        log "============================================"
        log "  Build Summary"
        log "============================================"
        info "Built for: $CURRENT_OS ($platforms_built platform(s))"
        echo ""
        warn "To build for other platforms, use one of:"
        info "  1. GitHub Actions (recommended):"
        info "     gh workflow run release.yml"
        info "     (builds macOS + Windows automatically)"
        echo ""
        info "  2. Build on each target machine:"
        info "     macOS:   ./build.sh --platform mac"
        info "     Windows: ./build.sh --platform win"
        info "     Linux:   ./build.sh --platform linux"
        echo ""
        info "  3. CI workflows available in .github/workflows/:"
        info "     build-macos.yml    → DMG + .app"
        info "     build-windows.yml  → MSI + NSIS"
        info "     build-linux.yml    → DEB + AppImage"
    else
        build_for_platform "$TARGET_PLATFORM"
    fi
}

main "$@"

#!/usr/bin/env bash
set -e

# Base directories
VENDOR_DIR="assets/vendor"
THREE_DIR="${VENDOR_DIR}/three"
UTILS_DIR="${VENDOR_DIR}/utils"
TWEEN_DIR="${VENDOR_DIR}/tween"
TAILWIND_DIR="${VENDOR_DIR}/tailwindcss"

echo "Creating vendor directories..."
mkdir -p "${THREE_DIR}" "${UTILS_DIR}" "${TWEEN_DIR}" "${TAILWIND_DIR}"

# Helper function to download file using curl or wget
download_file() {
    local url="$1"
    local dest="$2"
    echo "Downloading ${url} -> ${dest}..."
    if command -v curl >/dev/null 2>&1; then
        curl -sSL "${url}" -o "${dest}"
    elif command -v wget >/dev/null 2>&1; then
        wget -q "${url}" -O "${dest}"
    else
        echo "Error: Neither curl nor wget is available." >&2
        return 1
    fi
}

echo "=== Setup External Libraries (Latest / Three.js r185) ==="

# 1. Three.js (r185 -> v0.185.0) & Addons
THREE_VERSION="0.185.0"
download_file "https://unpkg.com/three@${THREE_VERSION}/build/three.module.js" "${THREE_DIR}/three.module.js"
download_file "https://unpkg.com/three@${THREE_VERSION}/examples/jsm/controls/OrbitControls.js" "${THREE_DIR}/OrbitControls.js"
download_file "https://unpkg.com/three@${THREE_VERSION}/examples/jsm/loaders/GLTFLoader.js" "${THREE_DIR}/GLTFLoader.js"

# 2. Utils (three@0.185.0)
download_file "https://unpkg.com/three@${THREE_VERSION}/examples/jsm/utils/BufferGeometryUtils.js" "${UTILS_DIR}/BufferGeometryUtils.js"
download_file "https://unpkg.com/three@${THREE_VERSION}/examples/jsm/utils/SkeletonUtils.js" "${UTILS_DIR}/SkeletonUtils.js"

# 3. Tween.js (Latest version 23.1.3)
TWEEN_VERSION="23.1.3"
download_file "https://unpkg.com/@tweenjs/tween.js@${TWEEN_VERSION}/dist/tween.umd.js" "${TWEEN_DIR}/tween.umd.js"

# 4. Tailwind CSS (Latest Play CDN)
download_file "https://cdn.tailwindcss.com" "${TAILWIND_DIR}/tailwindcss.js"

echo "=== All external libraries downloaded successfully! ==="

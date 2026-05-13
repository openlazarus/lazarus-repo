#!/bin/bash
set -e

LEFTHOOK_VERSION="2.1.5"

install_lefthook() {
  local os arch url

  os=$(uname -s)
  arch=$(uname -m)

  case "$os" in
    Darwin) os="MacOS" ;;
    Linux)  os="Linux" ;;
    *)      echo "Unsupported OS: $os" && exit 1 ;;
  esac

  case "$arch" in
    aarch64|arm64) arch="arm64" ;;
    x86_64)        arch="x86_64" ;;
    *)             echo "Unsupported architecture: $arch" && exit 1 ;;
  esac

  url="https://github.com/evilmartians/lefthook/releases/download/v${LEFTHOOK_VERSION}/lefthook_${LEFTHOOK_VERSION}_${os}_${arch}"

  echo "Downloading lefthook v${LEFTHOOK_VERSION} for ${os}/${arch}..."
  curl -fsSL -o /tmp/lefthook "$url"
  chmod +x /tmp/lefthook

  if [ -w /usr/local/bin ]; then
    mv /tmp/lefthook /usr/local/bin/lefthook
  else
    sudo mv /tmp/lefthook /usr/local/bin/lefthook
  fi
}

if ! command -v lefthook &> /dev/null; then
  install_lefthook
else
  echo "lefthook already installed: $(lefthook version)"
fi

lefthook install
echo "Git hooks installed."

if command -v corepack &> /dev/null; then
  corepack enable
  echo "Corepack enabled. pnpm pinned via packageManager fields in each package."
else
  echo "WARNING: corepack not found. Install Node 16.10+ and run 'corepack enable' before 'pnpm install'."
fi

echo "Done."

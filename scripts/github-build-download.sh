#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat <<'EOF'
Usage:
  scripts/github-build-download.sh debug
  scripts/github-build-download.sh release

Options:
  --branch BRANCH       Git branch/ref to build. Defaults to current branch.
  --out DIR             Download directory. Defaults to ./build-artifacts/<mode>.
  --allow-dirty         Continue even if local git working tree has uncommitted changes.

Requirements:
  gh CLI authenticated with repo access:
    gh auth login

Examples:
  scripts/github-build-download.sh debug
  scripts/github-build-download.sh release --branch main --out ~/Downloads/evidya-release
EOF
}

MODE="${1:-}"
if [[ -z "$MODE" || "$MODE" == "-h" || "$MODE" == "--help" ]]; then
    usage
    exit 0
fi
shift || true

BRANCH="$(git branch --show-current)"
OUT_DIR=""
ALLOW_DIRTY=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --branch)
            BRANCH="${2:-}"
            shift 2
            ;;
        --out)
            OUT_DIR="${2:-}"
            shift 2
            ;;
        --allow-dirty)
            ALLOW_DIRTY=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage
            exit 1
            ;;
    esac
done

case "$MODE" in
    debug)
        WORKFLOW="build-android.yml"
        ARTIFACT="debug-apk"
        ;;
    release)
        WORKFLOW="build-android-release.yml"
        ARTIFACT="android-bundle"
        ;;
    *)
        echo "Unknown mode: $MODE" >&2
        usage
        exit 1
        ;;
esac

if [[ -z "$BRANCH" ]]; then
    echo "Could not determine branch. Pass --branch BRANCH." >&2
    exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
    cat >&2 <<'EOF'
Missing dependency: gh

Install on Ubuntu/Debian:
  sudo apt update
  sudo apt install gh
  gh auth login
EOF
    exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
    echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
    exit 1
fi

if [[ "$ALLOW_DIRTY" != "1" && -n "$(git status --porcelain)" ]]; then
    cat >&2 <<'EOF'
Your local working tree has uncommitted changes.

GitHub Actions builds from the pushed branch, not from your local files.
Commit and push first, or rerun with --allow-dirty if you know the remote branch is already correct.
EOF
    git status --short >&2
    exit 1
fi

OUT_DIR="${OUT_DIR:-build-artifacts/$MODE}"
mkdir -p "$OUT_DIR"

echo "Triggering workflow: $WORKFLOW"
echo "Branch/ref: $BRANCH"
gh workflow run "$WORKFLOW" --ref "$BRANCH"

echo "Waiting for GitHub to create the workflow run..."
sleep 8

RUN_ID="$(gh run list \
    --workflow "$WORKFLOW" \
    --branch "$BRANCH" \
    --limit 1 \
    --json databaseId \
    --jq '.[0].databaseId')"

if [[ -z "$RUN_ID" || "$RUN_ID" == "null" ]]; then
    echo "Could not find the created workflow run." >&2
    exit 1
fi

echo "Watching run: $RUN_ID"
gh run watch "$RUN_ID" --exit-status

echo "Downloading artifact '$ARTIFACT' to: $OUT_DIR"
rm -rf "$OUT_DIR/$ARTIFACT"
gh run download "$RUN_ID" --name "$ARTIFACT" --dir "$OUT_DIR/$ARTIFACT"

echo
echo "Downloaded files:"
find "$OUT_DIR/$ARTIFACT" -type f -maxdepth 3 -print

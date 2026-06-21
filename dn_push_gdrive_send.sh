#!/usr/bin/env bash
set -euo pipefail

REPO="parabinda/moodleapp51"
WORKFLOW="build-android.yml"
BRANCH="main"
TO="parabinda@gmail.com"
SUBJECT="Android APK build link"
WORKDIR="$HOME/github-artifacts"
DOWNLOAD_DIR="$WORKDIR/download"
UNZIPPED_DIR="$WORKDIR/unzipped"
GDRIVE_REMOTE="${GDRIVE_REMOTE:-gdrive}"
GDRIVE_FOLDER="${GDRIVE_FOLDER:-EVidya_2026_Debug_Release}"
WAIT_TIMEOUT_SECONDS="${WAIT_TIMEOUT_SECONDS:-3600}"
POLL_SECONDS="${POLL_SECONDS:-30}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="${REPO_DIR:-$SCRIPT_DIR}"

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "$1 is not installed or not available in PATH."
        exit 1
    fi
}

require_command git
require_command gh
require_command rclone
require_command unzip
require_command msmtp

if ! rclone listremotes | grep -qx "${GDRIVE_REMOTE}:"; then
    echo "rclone remote '${GDRIVE_REMOTE}:' is not configured."
    echo "Run: rclone config"
    exit 1
fi

cd "$REPO_DIR"

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    echo "Current branch is '$CURRENT_BRANCH', expected '$BRANCH'."
    echo "Switch to $BRANCH first, or set BRANCH in this script."
    exit 1
fi

echo "Pushing $BRANCH to origin..."
git push origin "$BRANCH"

HEAD_SHA="$(git rev-parse HEAD)"
echo "Waiting for $WORKFLOW on $BRANCH at commit $HEAD_SHA..."

RUN_ID=""
RUN_URL=""
DEADLINE=$((SECONDS + WAIT_TIMEOUT_SECONDS))

while [ "$SECONDS" -lt "$DEADLINE" ]; do
    RUN_TSV="$(
        gh run list \
            --repo "$REPO" \
            --workflow "$WORKFLOW" \
            --limit 50 \
            --json databaseId,headBranch,headSha,status,conclusion,url \
            --jq "map(select(.headBranch == \"$BRANCH\" and .headSha == \"$HEAD_SHA\")) | sort_by(.databaseId) | reverse | .[0] | if . == null then \"\" else [.databaseId, .status, (.conclusion // \"\"), .url] | @tsv end"
    )"

    if [ -n "$RUN_TSV" ]; then
        IFS=$'\t' read -r RUN_ID RUN_STATUS RUN_CONCLUSION RUN_URL <<< "$RUN_TSV"

        if [ "$RUN_STATUS" = "completed" ]; then
            if [ "$RUN_CONCLUSION" = "success" ]; then
                echo "Workflow succeeded. Run ID: $RUN_ID"
                break
            fi

            echo "Workflow completed with conclusion: $RUN_CONCLUSION"
            echo "Run URL: $RUN_URL"
            exit 1
        fi

        echo "Workflow run $RUN_ID is $RUN_STATUS. Waiting ${POLL_SECONDS}s..."
    else
        echo "Workflow run has not appeared yet. Waiting ${POLL_SECONDS}s..."
    fi

    sleep "$POLL_SECONDS"
done

if [ -z "$RUN_ID" ] || [ "${RUN_STATUS:-}" != "completed" ] || [ "${RUN_CONCLUSION:-}" != "success" ]; then
    echo "Timed out waiting for a successful $WORKFLOW run for commit $HEAD_SHA."
    exit 1
fi

rm -rf "$DOWNLOAD_DIR" "$UNZIPPED_DIR"
mkdir -p "$DOWNLOAD_DIR" "$UNZIPPED_DIR"

echo "Downloading artifacts..."
gh run download "$RUN_ID" --repo "$REPO" --dir "$DOWNLOAD_DIR"

APK="$(find "$DOWNLOAD_DIR" -type f -name '*.apk' | head -n 1 || true)"
if [ -z "$APK" ]; then
    ZIP="$(find "$DOWNLOAD_DIR" -type f -name '*.zip' | head -n 1 || true)"

    if [ -z "$ZIP" ]; then
        echo "No APK or zip artifact found."
        find "$DOWNLOAD_DIR" -type f -print
        exit 1
    fi

    echo "Unzipping: $ZIP"
    unzip -o "$ZIP" -d "$UNZIPPED_DIR" >/dev/null
    APK="$(find "$UNZIPPED_DIR" -type f -name '*.apk' | head -n 1 || true)"
fi

if [ -z "$APK" ]; then
    echo "No APK found after downloading/unzipping artifacts."
    echo "Downloaded files:"
    find "$DOWNLOAD_DIR" -type f -print
    echo "Unzipped files:"
    find "$UNZIPPED_DIR" -type f -print
    exit 1
fi

APK_FILENAME="$(basename "$APK")"
APK_SIZE_BYTES="$(wc -c < "$APK")"
APK_SIZE_MB="$(awk "BEGIN { printf \"%.1f\", $APK_SIZE_BYTES / 1048576 }")"
REMOTE_PATH="${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/${APK_FILENAME}"

echo "Uploading to Google Drive: $REMOTE_PATH"
rclone copyto "$APK" "$REMOTE_PATH" --progress

echo "Creating public share link..."
PUBLIC_LINK="$(rclone link "$REMOTE_PATH")"

if [ -z "$PUBLIC_LINK" ]; then
    echo "Could not create public Google Drive link."
    exit 1
fi

{
    echo "To: $TO"
    echo "Subject: $SUBJECT"
    echo "MIME-Version: 1.0"
    echo "Content-Type: text/plain; charset=UTF-8"
    echo
    echo "The APK has been uploaded to Google Drive."
    echo
    echo "Download link:"
    echo "$PUBLIC_LINK"
    echo
    echo "File: $APK_FILENAME"
    echo "Size: ${APK_SIZE_MB}M"
    echo
    echo "Repository: $REPO"
    echo "Workflow: $WORKFLOW"
    echo "Branch: $BRANCH"
    echo "Commit: $HEAD_SHA"
    echo "Run ID: $RUN_ID"
    echo "Run URL: $RUN_URL"
} | msmtp "$TO"

echo "Mail sent to $TO with Google Drive link:"
echo "$PUBLIC_LINK"

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
MAIL_DIR="$WORKDIR/mail"
GDRIVE_REMOTE="${GDRIVE_REMOTE:-gdrive}"
GDRIVE_FOLDER="${GDRIVE_FOLDER:-EVidya_2026_Debug_Release}"

if ! command -v rclone >/dev/null 2>&1; then
    echo "rclone is not installed."
    echo "Install it first, then configure Google Drive:"
    echo "  sudo apt install rclone"
    echo "  rclone config"
    echo "Create a Google Drive remote named: $GDRIVE_REMOTE"
    exit 1
fi

if ! rclone listremotes | grep -qx "${GDRIVE_REMOTE}:"; then
    echo "rclone remote '${GDRIVE_REMOTE}:' is not configured."
    echo "Run:"
    echo "  rclone config"
    echo "Create a Google Drive remote named: $GDRIVE_REMOTE"
    exit 1
fi

mkdir -p "$DOWNLOAD_DIR" "$UNZIPPED_DIR" "$MAIL_DIR"

echo "Finding latest successful $WORKFLOW run on $BRANCH..."
RUN_ID="$(
    gh run list \
        --repo "$REPO" \
        --workflow "$WORKFLOW" \
        --limit 20 \
        --json databaseId,headBranch,conclusion \
        --jq "map(select(.headBranch == \"$BRANCH\" and .conclusion == \"success\")) | .[0].databaseId"
)"

if [ -z "$RUN_ID" ]; then
    echo "No successful run found for $WORKFLOW on $BRANCH."
    exit 1
fi

echo "Using run ID: $RUN_ID"

rm -rf "$DOWNLOAD_DIR" "$UNZIPPED_DIR" "$MAIL_DIR"
mkdir -p "$DOWNLOAD_DIR" "$UNZIPPED_DIR" "$MAIL_DIR"

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
    exit 1
fi

RUN_URL="$(gh run view "$RUN_ID" --repo "$REPO" --json url --jq .url)"
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
    echo "Run ID: $RUN_ID"
    echo "Run URL: $RUN_URL"
} | msmtp "$TO"

echo "Mail sent to $TO with Google Drive link:"
echo "$PUBLIC_LINK"

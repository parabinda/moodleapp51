#!/usr/bin/env bash
set -euo pipefail

REPO="parabinda/moodleapp51"
WORKFLOW="build-android.yml"
BRANCH="main"
TO="parabinda@gmail.com"
SUBJECT="Android APK build"
WORKDIR="$HOME/github-artifacts"
DOWNLOAD_DIR="$WORKDIR/download"
UNZIPPED_DIR="$WORKDIR/unzipped"
MAIL_DIR="$WORKDIR/mail"

mkdir -p "$DOWNLOAD_DIR" "$UNZIPPED_DIR"

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
    echo "Downloaded files:"
    find "$DOWNLOAD_DIR" -type f -print
    echo "Unzipped files:"
    find "$UNZIPPED_DIR" -type f -print
    exit 1
fi

BOUNDARY="====apk-boundary-$(date +%s)==="
RUN_URL="$(gh run view "$RUN_ID" --repo "$REPO" --json url --jq .url)"
APK_FILENAME="$(basename "$APK")"
ZIP_ATTACHMENT="$MAIL_DIR/${APK_FILENAME}.zip"

echo "Creating zip attachment: $ZIP_ATTACHMENT"
zip -j -9 "$ZIP_ATTACHMENT" "$APK" >/dev/null

ATTACHMENT_BYTES="$(wc -c < "$ZIP_ATTACHMENT")"
ATTACHMENT_SIZE_MB="$(awk "BEGIN { printf \"%.1f\", $ATTACHMENT_BYTES / 1048576 }")"
FILENAME="$(basename "$ZIP_ATTACHMENT")"

echo "Sending zip attachment: $ZIP_ATTACHMENT (${ATTACHMENT_SIZE_MB}M)"

{
    echo "To: $TO"
    echo "Subject: $SUBJECT"
    echo "MIME-Version: 1.0"
    echo "Content-Type: multipart/mixed; boundary=\"$BOUNDARY\""
    echo
    echo "--$BOUNDARY"
    echo "Content-Type: text/plain; charset=UTF-8"
    echo
    echo "Attached is a zip file containing the latest successful APK."
    echo
    echo "Zip attachment: $FILENAME"
    echo "Zip size: ${ATTACHMENT_SIZE_MB}M"
    echo
    echo "Repository: $REPO"
    echo "Workflow: $WORKFLOW"
    echo "Branch: $BRANCH"
    echo "Run ID: $RUN_ID"
    echo "Run URL: $RUN_URL"
    echo
    echo "--$BOUNDARY"
    echo "Content-Type: application/zip; name=\"$FILENAME\""
    echo "Content-Transfer-Encoding: base64"
    echo "Content-Disposition: attachment; filename=\"$FILENAME\""
    echo
    base64 "$ZIP_ATTACHMENT"
    echo
    echo "--$BOUNDARY--"
} | timeout 180s msmtp "$TO"

echo "Mail sent to $TO with zip attachment: $FILENAME"

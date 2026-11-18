#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${MANHUNT_VERSION_CODE:?Set the versionCode of the release being verified}"
: "${MANHUNT_VERSION_NAME:?Set the versionName of the release being verified}"
# The pinned image is the Node environment used for the 1.0.3 reference rebuild.
node_image=node@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53
docker run --rm --platform linux/amd64 --user "$(id -u):$(id -g)" -e npm_config_cache=/tmp/npm-cache \
    -v "$PWD:/app" -w /app "$node_image" \
    sh -lc 'npm ci --no-audit --no-fund && npm test && npm run build:release && npx cap sync android'
docker build --platform linux/amd64 -f infra/android.Dockerfile -t in-the-zone-android-build .
docker run --rm --platform linux/amd64 -e APP_UID="$(id -u)" -e APP_GID="$(id -g)" \
    -e MANHUNT_UNSIGNED_RELEASE=1 -e MANHUNT_VERSION_CODE -e MANHUNT_VERSION_NAME \
    -v "$PWD:/app" -v in-the-zone-review-gradle:/root/.gradle \
    in-the-zone-android-build bash /app/scripts/unsigned-in-container.sh
mkdir -p artifacts
cp android/app/build/outputs/apk/release/app-release-unsigned.apk \
    "artifacts/in-the-zone-${MANHUNT_VERSION_CODE}-unsigned.apk"
printf 'Unsigned release APK: artifacts/in-the-zone-%s-unsigned.apk\n' "$MANHUNT_VERSION_CODE"

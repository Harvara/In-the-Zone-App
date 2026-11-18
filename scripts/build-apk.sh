#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
docker run --rm --platform linux/amd64 --user "$(id -u):$(id -g)" -e npm_config_cache=/tmp/npm-cache -v "$PWD:/app" -w /app node@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 sh -lc 'npm ci --no-audit --no-fund && npm run build && npx cap sync'
docker build --platform linux/amd64 -f infra/android.Dockerfile -t manhunt-android-build .
docker run --rm --platform linux/amd64 -e APP_UID="$(id -u)" -e APP_GID="$(id -g)" -v "$PWD:/app" -v manhunt-gradle-cache:/root/.gradle -v manhunt-debug-signing:/root/.android manhunt-android-build sh /app/scripts/android-build-in-container.sh
mkdir -p artifacts
cp android/app/build/outputs/apk/debug/app-debug.apk artifacts/in-the-zone-debug.apk
printf 'APK: %s/artifacts/in-the-zone-debug.apk\n' "$PWD"

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${MANHUNT_KEYSTORE_FILE:?Absolute path to the release keystore required}"
: "${MANHUNT_STORE_PASSWORD:?Required}"
: "${MANHUNT_KEY_ALIAS:?Required}"
: "${MANHUNT_KEY_PASSWORD:?Required}"
: "${MANHUNT_VERSION_CODE:?Increasing integer required}"
: "${MANHUNT_VERSION_NAME:?Release version required}"
[[ "$MANHUNT_KEYSTORE_FILE" = /* && -f "$MANHUNT_KEYSTORE_FILE" ]] || { echo 'Keystore must be an existing absolute path.' >&2; exit 1; }
docker run --rm --platform linux/amd64 --user "$(id -u):$(id -g)" -e npm_config_cache=/tmp/npm-cache -v "$PWD:/app" -w /app node@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 sh -lc 'npm ci --no-audit --no-fund && npm test && npm run build:release && npx cap sync android'
docker build --platform linux/amd64 -f infra/android.Dockerfile -t manhunt-android-build .
# Password values are inherited, not embedded in command arguments or repository files.
docker run --rm --platform linux/amd64 -e APP_UID="$(id -u)" -e APP_GID="$(id -g)" \
    -e MANHUNT_KEYSTORE_FILE=/signing/release.keystore \
    -e MANHUNT_STORE_PASSWORD -e MANHUNT_KEY_ALIAS -e MANHUNT_KEY_PASSWORD \
    -e MANHUNT_VERSION_CODE -e MANHUNT_VERSION_NAME \
    -v "$MANHUNT_KEYSTORE_FILE:/signing/release.keystore:ro" \
    -v "$PWD:/app" -v manhunt-gradle-cache:/root/.gradle \
    manhunt-android-build bash /app/scripts/release-in-container.sh
mkdir -p artifacts
cp android/app/build/outputs/apk/release/app-release.apk "artifacts/in-the-zone-${MANHUNT_VERSION_CODE}.apk"
cp android/app/build/outputs/bundle/release/app-release.aab "artifacts/in-the-zone-${MANHUNT_VERSION_CODE}.aab"
printf 'Release APK/AAB: %s/artifacts (versionCode %s)\n' "$PWD" "$MANHUNT_VERSION_CODE"

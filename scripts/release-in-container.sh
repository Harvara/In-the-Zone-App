#!/usr/bin/env bash
set -euo pipefail
trap 'chown -R "$APP_UID:$APP_GID" /app' EXIT
cd /app/android
sh gradlew --no-daemon :app:assembleRelease :app:bundleRelease :app:testReleaseUnitTest :app:lintRelease
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --verbose app/build/outputs/apk/release/app-release.apk

#!/usr/bin/env bash
set -euo pipefail
trap 'chown -R "$APP_UID:$APP_GID" /app' EXIT
cd /app/android
sh gradlew --no-daemon :app:clean :app:assembleRelease :app:testReleaseUnitTest :app:lintRelease

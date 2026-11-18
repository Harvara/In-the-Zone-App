#!/usr/bin/env sh
set -eu
trap 'chown -R "$APP_UID:$APP_GID" /app' EXIT
cd /app/android
sh gradlew --no-daemon :app:assembleDebug :app:testDebugUnitTest :app:lintDebug

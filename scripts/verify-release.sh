#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
unsigned_apk="${1:-artifacts/in-the-zone-5-unsigned.apk}"
[[ -f "$unsigned_apk" ]] || { echo "Unsigned APK missing: $unsigned_apk" >&2; exit 1; }
unsigned_apk="$(realpath "$unsigned_apk")"
docker build --platform linux/amd64 -f infra/android.Dockerfile -t in-the-zone-android-build .
extra_mounts=()
extra_args=()
if [[ $# -ge 2 ]]; then
    [[ -f "$2" ]] || { echo "Official APK missing: $2" >&2; exit 1; }
    extra_mounts=(-v "$(realpath "$2"):/reference/official.apk:ro")
    extra_args=(--official-apk /reference/official.apk)
fi
docker run --rm --platform linux/amd64 --user "$(id -u):$(id -g)" \
    -v "$PWD:/source:ro" -v "$unsigned_apk:/reference/unsigned.apk:ro" \
    "${extra_mounts[@]}" in-the-zone-android-build \
    /opt/apk-verification/bin/python /source/scripts/verify-apk.py \
    /reference/unsigned.apk "${extra_args[@]}"

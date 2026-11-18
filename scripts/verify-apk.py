#!/usr/bin/env python3
"""Reconstruct and verify the exact official APK without its private signing key."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import urllib.request
import zipfile


def sha256(path):
    with path.open('rb') as stream:
        digest = hashlib.sha256()
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
        return digest.hexdigest()


def verify_signature(path, expected):
    apksigner = Path(os.environ['ANDROID_HOME']) / 'build-tools/36.0.0/apksigner'
    result = subprocess.run(
        [str(apksigner), 'verify', '--verbose', '--print-certs', str(path)],
        capture_output=True, text=True,
    )
    if result.returncode:
        raise ValueError('APK signature verification failed: ' + result.stderr.strip())
    fingerprints = re.findall(r'^Signer #\d+ certificate SHA-256 digest: ([a-f0-9]+)$',
                              result.stdout, re.MULTILINE)
    if fingerprints != [expected]:
        raise ValueError('Signing certificate differs from the release reference.')


def report_differences(official, rebuilt):
    """Diagnostics only: no entries are exempted from the exact final comparison."""
    with zipfile.ZipFile(official) as a, zipfile.ZipFile(rebuilt) as b:
        names_a, names_b = set(a.namelist()), set(b.namelist())
        for name in sorted(names_a ^ names_b):
            print('Entry missing from one APK: ' + name, file=sys.stderr)
        for name in sorted(names_a & names_b):
            if a.read(name) != b.read(name):
                print('Different entry: ' + name, file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('unsigned_apk', type=Path)
    parser.add_argument('--official-apk', type=Path,
                        help='Use a saved official APK instead of downloading it.')
    parser.add_argument('--reference', type=Path,
                        default=Path(__file__).resolve().parent.parent /
                        'releases/android-1.0.3-5.json')
    args = parser.parse_args()
    reference = json.loads(args.reference.read_text())
    if reference['schema'] != 1:
        raise ValueError('Unsupported release reference schema.')
    for name in ('apk_sha256', 'signer_sha256'):
        if not re.fullmatch(r'[a-f0-9]{64}', reference[name]):
            raise ValueError('Invalid reference fingerprint: ' + name)
    with tempfile.TemporaryDirectory(prefix='in-the-zone-verify-') as directory:
        temporary = Path(directory)
        official = args.official_apk
        if official is None:
            url = reference['download_url']
            if not url.startswith('https://'):
                raise ValueError('Official download must use HTTPS.')
            official = temporary / 'official.apk'
            with urllib.request.urlopen(url, timeout=60) as response:
                if not response.url.startswith('https://'):
                    raise ValueError('Download redirected away from HTTPS.')
                with official.open('wb') as output:
                    while chunk := response.read(1024 * 1024):
                        output.write(chunk)
        if sha256(official) != reference['apk_sha256']:
            raise ValueError('Official APK SHA-256 differs from this release. '
                             'Use the matching archived APK or release reference.')
        verify_signature(official, reference['signer_sha256'])

        import apksigcopier
        reconstructed = temporary / 'reconstructed.apk'
        try:
            apksigcopier.do_copy(str(official), str(args.unsigned_apk), str(reconstructed))
            if sha256(reconstructed) != reference['apk_sha256']:
                raise ValueError('Reconstructed APK differs from the official APK.')
            verify_signature(reconstructed, reference['signer_sha256'])
        except (apksigcopier.APKSigCopierError, ValueError):
            report_differences(official, args.unsigned_apk)
            raise
        print(json.dumps({
            'result': 'PASS',
            'source_tag': reference['source_tag'],
            'version_name': reference['version_name'],
            'version_code': reference['version_code'],
            'official_apk_sha256': reference['apk_sha256'],
            'reconstructed_apk_sha256': sha256(reconstructed),
            'unsigned_apk_sha256': sha256(args.unsigned_apk),
            'signer_sha256': reference['signer_sha256'],
            'signature_verified': True,
            'byte_identical': True,
        }, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, zipfile.BadZipFile) as error:
        sys.exit('FAIL: ' + str(error))

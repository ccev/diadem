#!/usr/bin/env python3
"""Package an unsigned Xcode device archive on macOS; never export or sign it."""

import plistlib
from pathlib import Path
import re
import stat
import subprocess
import sys
import tempfile
import zipfile


def validate_ipa(path, version, build_number):
    """Check the actual ZIP, including executable modes and embedded frameworks."""
    with zipfile.ZipFile(path) as ipa:
        names = ipa.namelist()
        root = "Payload/App.app/"
        if not names or any(
            name != "Payload/" and not name.startswith(root) for name in names
        ):
            raise ValueError("IPA must contain only Payload/App.app")
        if ipa.testzip() is not None:
            raise ValueError("IPA ZIP checksum failure")
        info = plistlib.loads(ipa.read(root + "Info.plist"))
        expected = {
            "CFBundleIdentifier": "ee.malt.diadem",
            "CFBundlePackageType": "APPL",
            "CFBundleShortVersionString": version,
            "CFBundleVersion": str(build_number),
            "CFBundleSupportedPlatforms": ["iPhoneOS"],
        }
        for key, value in expected.items():
            if info.get(key) != value:
                raise ValueError(f"Unexpected {key}: {info.get(key)!r}, expected {value!r}")
        if any(
            name.endswith("embedded.mobileprovision") or "/_CodeSignature/" in name
            for name in names
        ):
            raise ValueError("Expected an unsigned app without provisioning/signatures")

        binaries = [root + info["CFBundleExecutable"]]
        frameworks = [
            name for name in names
            if name.startswith(root + "Frameworks/") and name.endswith(".framework/Info.plist")
        ]
        # The CocoaPods embed phase must survive unsigned archiving.
        # CapacitorCordova's podspec sets module_name = 'Cordova'.
        for framework in ("Capacitor", "Cordova"):
            if root + f"Frameworks/{framework}.framework/Info.plist" not in frameworks:
                raise ValueError(f"Missing embedded {framework} framework")
        for plist in frameworks:
            framework_info = plistlib.loads(ipa.read(plist))
            binaries.append(plist.removesuffix("Info.plist") + framework_info["CFBundleExecutable"])
        binaries.extend(name for name in names if name.endswith(".dylib"))
        for binary in binaries:
            entry = ipa.getinfo(binary)
            mode = entry.external_attr >> 16
            if not entry.file_size or not stat.S_ISREG(mode) or not mode & stat.S_IXUSR:
                raise ValueError(f"Missing executable contents/permissions: {binary}")
        return binaries


def package_ipa(app, output, version, build_number):
    app, output = Path(app).resolve(), Path(output).resolve()
    if app.name != "App.app" or not app.is_dir():
        raise ValueError("Expected archived Products/Applications/App.app")
    # Fresh staging avoids stale Payload contents. ditto preserves bundle modes/symlinks.
    with tempfile.TemporaryDirectory(prefix="diadem-ipa-") as staging:
        payload = Path(staging) / "Payload"
        payload.mkdir()
        subprocess.run(["ditto", str(app), str(payload / "App.app")], check=True)
        subprocess.run([
            "ditto", "-c", "-k", "--norsrc", "--keepParent", str(payload), str(output)
        ], check=True)
        binaries = validate_ipa(output, version, build_number)
        for binary in binaries:
            executable = str(Path(staging) / binary)
            subprocess.run(["xcrun", "lipo", "-verify_arch", "arm64", executable], check=True)
            # arm64 alone is not enough: Apple Silicon simulators also use it.
            build = subprocess.check_output([
                "xcrun", "vtool", "-arch", "arm64", "-show-build", executable
            ], text=True)
            if not re.search(r"^\s*platform IOS\s*$", build, re.MULTILINE):
                raise ValueError(f"Not an iOS device binary: {binary}")
    print(f"Validated unsigned device IPA: {output.name}")


if __name__ == "__main__":
    if len(sys.argv) != 5:
        sys.exit("Usage: package_unsigned_ipa.py App.app output.ipa version build_number")
    package_ipa(*sys.argv[1:])

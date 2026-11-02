"""Portable fixture tests; these do not substitute for an Xcode/device build."""

import plistlib
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch
import zipfile

from package_unsigned_ipa import package_ipa, validate_ipa


class UnsignedIpaTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.output = Path(self.temp.name) / "unsigned.ipa"
        self.root = "Payload/App.app/"
        self.info = {
            "CFBundleIdentifier": "ee.malt.diadem",
            "CFBundlePackageType": "APPL",
            "CFBundleShortVersionString": "0.12.0",
            "CFBundleVersion": "12",
            "CFBundleSupportedPlatforms": ["iPhoneOS"],
            "CFBundleExecutable": "App",
        }
        self.files = {self.root + "App": (b"fixture executable", 0o755)}
        for name in ("Capacitor", "Cordova", "CapacitorGeolocation"):
            root = self.root + f"Frameworks/{name}.framework/"
            self.files[root + "Info.plist"] = (
                plistlib.dumps({"CFBundleExecutable": name}), 0o644
            )
            self.files[root + name] = (b"fixture framework", 0o755)

    def validate(self):
        self.files[self.root + "Info.plist"] = (plistlib.dumps(self.info), 0o644)
        with zipfile.ZipFile(self.output, "w") as ipa:
            for name, (contents, mode) in self.files.items():
                entry = zipfile.ZipInfo(name)
                entry.create_system = 3
                entry.external_attr = (stat.S_IFREG | mode) << 16
                ipa.writestr(entry, contents)
        return validate_ipa(self.output, "0.12.0", "12")

    def test_valid_layout_returns_app_and_all_framework_binaries(self):
        self.assertEqual(len(self.validate()), 4)

    def test_version_and_build_number_must_match_tagged_source(self):
        for key in ("CFBundleShortVersionString", "CFBundleVersion"):
            with self.subTest(key=key):
                original = self.info[key]
                self.info[key] = "999"
                with self.assertRaisesRegex(ValueError, key):
                    self.validate()
                self.info[key] = original

    def test_simulator_plist_rejected(self):
        self.info["CFBundleSupportedPlatforms"] = ["iPhoneSimulator"]
        with self.assertRaisesRegex(ValueError, "CFBundleSupportedPlatforms"):
            self.validate()

    def test_extra_top_level_app_rejected(self):
        self.files["App.app/App"] = (b"wrong layout", 0o755)
        with self.assertRaisesRegex(ValueError, "only Payload/App.app"):
            self.validate()

    def test_unsigned_artifact_rejects_signing_material(self):
        for name in ("embedded.mobileprovision", "_CodeSignature/CodeResources"):
            with self.subTest(name=name):
                self.files[self.root + name] = (b"fixture", 0o644)
                with self.assertRaisesRegex(ValueError, "unsigned app"):
                    self.validate()
                del self.files[self.root + name]

    def test_missing_embedded_framework_rejected(self):
        del self.files[self.root + "Frameworks/Capacitor.framework/Info.plist"]
        with self.assertRaisesRegex(ValueError, "Missing embedded Capacitor"):
            self.validate()

    def test_missing_executable_rejected(self):
        del self.files[self.root + "App"]
        with self.assertRaises(KeyError):
            self.validate()

    def test_empty_or_nonexecutable_binary_rejected(self):
        for contents, mode in ((b"", 0o755), (b"binary", 0o644)):
            with self.subTest(contents=contents, mode=mode):
                self.files[self.root + "App"] = (contents, mode)
                with self.assertRaisesRegex(ValueError, "contents/permissions"):
                    self.validate()

    def test_missing_framework_executable_rejected(self):
        del self.files[self.root + "Frameworks/Capacitor.framework/Capacitor"]
        with self.assertRaises(KeyError):
            self.validate()

    @patch("package_unsigned_ipa.subprocess.check_output")
    @patch("package_unsigned_ipa.subprocess.run")
    @patch("package_unsigned_ipa.validate_ipa")
    def test_native_platform_check_rejects_arm64_simulator(self, validate, run, output):
        app = Path(self.temp.name) / "App.app"
        app.mkdir()
        validate.return_value = [self.root + "App"]
        output.return_value = "    platform IOSSIMULATOR\n"
        with self.assertRaisesRegex(ValueError, "Not an iOS device binary"):
            package_ipa(app, self.output, "0.12.0", "12")
        self.assertEqual(run.call_args.args[0][:4], ["xcrun", "lipo", "-verify_arch", "arm64"])
        output.return_value = "    platform IOS\n"
        package_ipa(app, self.output, "0.12.0", "12")


if __name__ == "__main__":
    unittest.main()

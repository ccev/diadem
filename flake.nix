{
  description = "Diadem native (Capacitor) dev shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
          config.android_sdk.accept_license = true;
        };

        android = pkgs.androidenv.composeAndroidPackages {
          platformVersions = [ "34" "35" ];
          buildToolsVersions = [ "34.0.0" "35.0.0" ];
          includeEmulator = false;
          includeSystemImages = false;
          includeNDK = false;
        };
        androidSdk = android.androidsdk;
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            pkgs.nodejs_22
            pkgs.pnpm
            pkgs.jdk17
            pkgs.gradle
            androidSdk
          ];

          ANDROID_HOME = "${androidSdk}/libexec/android-sdk";
          ANDROID_SDK_ROOT = "${androidSdk}/libexec/android-sdk";
          JAVA_HOME = "${pkgs.jdk17}";

          shellHook = ''
            export PATH="$ANDROID_HOME/platform-tools:$PATH"
            echo "Diadem native dev shell — node $(node -v), java $(java -version 2>&1 | head -1)"
          '';
        };
      });
}

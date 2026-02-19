let
  pkgs = import <nixpkgs> { };

  libraries = with pkgs;[
    webkitgtk_4_1
    gtk3
    cairo
    gdk-pixbuf
    glib
    dbus
    librsvg
    libsoup_3
    libclang
    ffmpeg
  ];

  packages = with pkgs; [
    pkg-config
    dbus
    glib
    gtk3
    libsoup_3
    webkitgtk_4_1
    librsvg
    ffmpeg
    libclang
    libclang.lib
    nodejs
    gcc
    glibc
    glibc.dev
  ];
in
pkgs.mkShell {
  buildInputs = packages;

  shellHook =
    ''
      export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath libraries}:$LD_LIBRARY_PATH
      export XDG_DATA_DIRS=${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS
      export WEBKIT_DISABLE_COMPOSITING_MODE=1
      export LIBCLANG_PATH="${pkgs.libclang.lib}/lib"
      export BINDGEN_EXTRA_CLANG_ARGS="-isystem ${pkgs.glibc.dev}/include -isystem ${pkgs.libclang.lib}/lib/clang/$(${pkgs.libclang}/bin/clang --version | grep -oP '\d+\.\d+\.\d+' | head -1)/include -isystem ${pkgs.ffmpeg.dev}/include"
      export FFMPEG_DIR="${pkgs.ffmpeg}"
      export PKG_CONFIG_PATH="${pkgs.ffmpeg.dev}/lib/pkgconfig:$PKG_CONFIG_PATH"
    '';
}
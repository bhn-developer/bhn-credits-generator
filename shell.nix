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
  ];

  packages = with pkgs; [
    pkg-config
    dbus
    glib
    gtk3
    libsoup_3
    webkitgtk_4_1
    # appimageTools
    librsvg
  ];
in
pkgs.mkShell {
  buildInputs = packages;

  shellHook =
    ''
      export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath libraries}:$LD_LIBRARY_PATH
      export XDG_DATA_DIRS=${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS
      export WEBKIT_DISABLE_COMPOSITING_MODE=1
    '';
}
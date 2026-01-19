# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[('frontend', 'frontend'), ('api_server.py', '.'), ('backend_core.py', '.'), ('install_backend.py', '.')],
    hiddenimports=['uvicorn', 'uvicorn.config', 'uvicorn.server', 'fastapi', 'starlette', 'starlette.responses', 'starlette.staticfiles', 'starlette.middleware', 'starlette.middleware.cors', 'httpx', 'webview', 'vdf', 'zipfile', 'asyncio'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='GameLatest_Debug',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='GameLatest_Debug',
)

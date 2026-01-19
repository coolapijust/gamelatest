import sys, os
from pathlib import Path
from PyInstaller.utils.hooks import collect_all

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[os.getcwd()],
    binaries=[],
    datas=[],
    hiddenimports=[
        'uvicorn', 'uvicorn.config', 'uvicorn.server', 'uvicorn.loops',
        'fastapi', 'starlette', 'starlette.routing', 'starlette.responses',
        'httpx', 'httpx._client', 'httpx._transports',
        'webview', 'webview.dom',
        'vdf', 'zipfile', 'asyncio',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='GameLatest',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)

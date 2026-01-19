# -*- mode: python ; coding: utf-8 -*-
import os
from PyInstaller.utils.hooks import collect_all, collect_data_files, collect_submodules

block_cipher = None

# 在 Analysis 之前收集所有模块
starlette_hidden = collect_submodules('starlette')
fastapi_hidden = collect_submodules('fastapi')

additional_hidden = [
    'typing_extensions',
    'httpx',
    'httpcore',
    'websockets',
    'wsproto',
    'uvicorn',
    'uvicorn.config',
    'uvicorn.server',
    'uvicorn.main',
    'vdf',
    'zipfile',
    'asyncio',
    'webview',
    'markupsafe',
    'pydantic',
    'pydantic_core',
    'anyio',
    'click',
]

# 合并所有 hidden imports
all_hidden = additional_hidden + starlette_hidden + fastapi_hidden

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        ('frontend', 'frontend'),
        ('api_server.py', '.'),
        ('backend_core.py', '.'),
        ('install_backend.py', '.'),
    ],
    hiddenimports=all_hidden,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

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
    icon=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='GameLatest_Debug',
)

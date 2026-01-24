from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from starlette.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import asyncio
import sys
from pathlib import Path
from backend_core import backend
from install_backend import InstallBackend
from workshop_manifest import WorkshopManifestProcessor

install_backend = InstallBackend(backend)
workshop_processor = WorkshopManifestProcessor(backend)

app = FastAPI(title="Game Latest API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    BASE_DIR = Path(sys._MEIPASS)
else:
    BASE_DIR = Path(__file__).parent

frontend_dir = BASE_DIR / "frontend" / "dist"
app.mount("/assets", StaticFiles(directory=str(frontend_dir / "assets")), name="assets")

class ConfigUpdate(BaseModel):
    key: str
    value: str

class RepoAdd(BaseModel):
    name: str
    repo: str

@app.on_event("startup")
async def startup():
    backend.load_config()
    backend.load_game_names_cache()

@app.on_event("shutdown")
async def shutdown():
    await backend.close()
    await install_backend.close()
    await backend.cleanup_temp()

@app.get("/")
async def serve_frontend():
    return FileResponse(str(frontend_dir / "index.html"))

@app.get("/api/status")
async def get_status():
    steam_path = backend.get_steam_path()
    unlocker_type = backend.detect_unlocker_type()
    return {
        "steam_path": str(steam_path) if steam_path else None,
        "unlocker_type": unlocker_type,
        "config": backend.config
    }

@app.get("/api/config")
async def get_config():
    return backend.config

@app.post("/api/config")
async def update_config(update: ConfigUpdate):
    backend.config[update.key] = update.value
    backend.save_config()
    return {"success": True}

@app.get("/api/steam/path")
async def get_steam_path():
    path = backend.get_steam_path()
    return {"path": str(path) if path else None}

@app.get("/api/game-names")
async def get_game_names():
    return {"game_names": backend.game_names_cache}

@app.get("/api/game-names/progress")
async def get_game_names_progress():
    return backend.game_names_progress

@app.get("/api/install/progress")
async def get_install_progress():
    return backend.install_progress

@app.post("/api/install/reset-progress")
async def reset_install_progress():
    backend.install_progress = {"current": 0, "total": 0, "status": "idle", "step": "", "message": "", "appid": None}
    install_backend.reset_cancel()
    return {"success": True}

@app.post("/api/install/cancel")
async def cancel_install():
    install_backend.request_cancel()
    return {"success": True}

@app.get("/api/files")
async def get_files():
    return {"files": backend.list_installed_files()}

@app.get("/api/repos")
async def get_repos():
    return {
        "builtin": backend.get_builtin_repos(),
        "custom": backend.get_custom_repos()
    }

@app.post("/api/repos/add")
async def add_repo(repo: RepoAdd):
    custom = backend.config.setdefault("Custom_Repos", {"github": []})
    custom["github"].append({"name": repo.name, "repo": repo.repo})
    backend.save_config()
    return {"success": True}

@app.delete("/api/repos/{name}")
async def remove_repo(name: str):
    custom = backend.config.get("Custom_Repos", {})
    github = custom.get("github", [])
    custom["github"] = [r for r in github if r.get("name") != name]
    backend.save_config()
    return {"success": True}

@app.get("/api/github/rate-limit")
async def check_rate_limit():
    return await backend.check_github_rate_limit()

@app.get("/api/network/check")
async def check_network():
    return await backend.check_network()

@app.get("/api/games/search/{name}")
async def search_games(name: str):
    return {"games": await backend.search_game_by_name(name)}

@app.get("/api/games/{appid}")
async def get_game_details(appid: str):
    return await backend.get_game_details(appid)

@app.post("/api/games/preload")
async def preload_game_names():
    backend.preload_game_names()
    return {"success": True, "message": "开始预加载"}

@app.get("/api/manifest/{appid}")
async def get_manifest(appid: str, repo: str):
    manifest = await backend.get_github_manifest(appid, repo)
    if not manifest:
        raise HTTPException(status_code=404, detail="清单未找到")
    return manifest

@app.get("/api/repos/search-all/{appid}")
async def search_all_repos(appid: str):
    results = await install_backend.search_all_repos_for_appid(appid)
    return {"results": results}

class InstallRequest(BaseModel):
    appid: str
    repo: Optional[str] = ""
    add_all_dlc: bool = False
    fix_workshop: bool = False

@app.post("/api/install")
async def install_game(request: InstallRequest):
    print(f"[Install] 收到入库请求: AppID={request.appid}, Repo={request.repo or 'N/A'}")
    print(f"[Install] 选项: DLC={request.add_all_dlc}, Workshop={request.fix_workshop}")
    try:
        if request.repo:
            results = await install_backend.search_repos_for_appid(request.appid)
            target = next((r for r in results if r["repo"] == request.repo), None)
            if not target:
                raise HTTPException(status_code=404, detail="在指定仓库中未找到清单")
            files = [f for f in target.get("files", []) if f.get("type") == "blob"]
            result = await install_backend.download_from_github(request.appid, request.repo, target["sha"], files, request.add_all_dlc, request.fix_workshop)
            source = f"GitHub ({request.repo})"
        else:
            raise HTTPException(status_code=400, detail="请指定仓库")
        
        if result.get("success"):
            return {"success": True, "message": f"已从 {source} 入库 AppID {request.appid}: {result.get('message', '')}"}
        raise HTTPException(status_code=500, detail=result.get("message", "入库失败"))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class FileDeleteRequest(BaseModel):
    filename: str
    file_type: str

@app.delete("/api/files/{filename}")
async def delete_file(filename: str, request: FileDeleteRequest = None):
    if request:
        result = backend.delete_file(filename, request.file_type)
    else:
        result = backend.delete_file(filename, "steamtools")
    return result

@app.get("/api/help/qa")
async def get_help_qa():
    return {
        "QA1": "Github_Personal_Token(个人访问令牌)可在Github设置的最底下开发者选项中找到",
        "QA2": "Force_Unlocker: 强制指定解锁工具, 填入 'steamtools' 或 'greenluma'",
        "QA3": "Custom_Repos: 自定义清单库配置，github数组用于添加GitHub仓库"
    }

@app.post("/api/install/workshop")
async def install_workshop(workshop_input: str):
    print(f"[Install] 创意工坊入库: {workshop_input}")
    result = await workshop_processor.process_workshop(workshop_input)
    if result:
        return {"success": True, "message": f"已从创意工坊入库: {workshop_input}"}
    raise HTTPException(status_code=500, detail="创意工坊入库失败")

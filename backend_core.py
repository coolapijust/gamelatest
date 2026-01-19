"""
Core Backend - 核心后端模块

功能:
- 配置管理 (load_config, save_config)
- Steam 路径检测
- 解锁器类型检测
- 游戏名缓存管理
- 基础 API 调用 (GitHub, Steam Store)
- 已入库文件管理

依赖模块:
- zip_manifest.py: ZIP 格式清单库处理
- workshop_manifest.py: 创意工坊处理
- buqiuren_manifest.py: 不求人仓库处理
"""

import json, asyncio, httpx, winreg, re, shutil
from pathlib import Path
from typing import Dict, List, Optional

MODULE_ID = "CoreBackend"

CONFIG_PATH = Path("./config.json")
GAMENAMES_CACHE_PATH = Path("./gamenames_cache.json")
DEFAULT_CONFIG = {
    "Github_Personal_Token": "",
    "Custom_Steam_Path": "",
    "Force_Unlocker": "",
    "Disable_All_ZIP_Repos": True,
    "Custom_Repos": {"github": [], "zip": []}
}

class CoreBackend:
    def __init__(self):
        self.config = {}
        self.steam_path = None
        self.unlocker_type = None
        self.game_names_cache = {}
        self.game_names_progress = {"current": 0, "total": 0, "status": "idle", "last_appid": None}
        self.install_progress = {"current": 0, "total": 0, "status": "idle", "step": "", "message": "", "appid": None}
        self.search_cache = {}
        self.search_cache_ttl = 3600
        self.client = httpx.AsyncClient(verify=False, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        self.temp_path = Path("./temp")
        self.temp_path.mkdir(parents=True, exist_ok=True)

    def _log(self, level: str, msg: str, extra: Dict = None):
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        extra_str = f" | {extra}" if extra else ""
        print(f"[{timestamp}] [{MODULE_ID}] [{level}] {msg}{extra_str}")

    async def close(self): await self.client.aclose()

    def load_config(self) -> Dict:
        if not CONFIG_PATH.exists():
            self.save_config(DEFAULT_CONFIG)
            self.config = DEFAULT_CONFIG.copy()
            return self.config
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                self.config = {**DEFAULT_CONFIG, **json.load(f)}
                if "Custom_Repos" not in self.config:
                    self.config["Custom_Repos"] = {"github": [], "zip": []}
            return self.config
        except Exception as e:
            self._log("ERROR", f"加载配置失败: {e}")
            self.config = DEFAULT_CONFIG.copy()
            return self.config

    def save_config(self, config: Dict = None):
        try:
            with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump(config or self.config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            self._log("ERROR", f"保存配置失败: {e}")

    def load_game_names_cache(self):
        try:
            if GAMENAMES_CACHE_PATH.exists():
                with open(GAMENAMES_CACHE_PATH, "r", encoding="utf-8") as f:
                    self.game_names_cache = json.load(f)
                    self._log("INFO", f"已加载缓存: {len(self.game_names_cache)} 个游戏名")
        except Exception as e:
            self._log("WARNING", f"加载缓存失败: {e}")
            self.game_names_cache = {}

    def save_game_names_cache(self):
        try:
            with open(GAMENAMES_CACHE_PATH, "w", encoding="utf-8") as f:
                json.dump(self.game_names_cache, f, indent=2, ensure_ascii=False)
        except Exception as e:
            self._log("ERROR", f"保存缓存失败: {e}")

    def get_game_name(self, appid: str) -> Optional[str]:
        return self.game_names_cache.get(appid)

    def preload_game_names(self):
        asyncio.create_task(self._preload_game_names_async())

    async def _preload_game_names_async(self):
        self._log("INFO", "开始预加载游戏名...")
        files = self.list_installed_files()
        if not files:
            self._log("INFO", "暂无已入库文件")
            return
        appids = list(set(f.get("appid") for f in files if f.get("appid")))
        self.game_names_progress = {"current": 0, "total": len(appids), "status": "loading", "last_appid": None}
        appids_to_load = [aid for aid in appids if aid not in self.game_names_cache]
        if not appids_to_load:
            self._log("INFO", "全部命中缓存")
            self.game_names_progress = {"current": 0, "total": 0, "status": "completed", "last_appid": None}
            return
        preload_limit = 10
        appids_to_load = appids_to_load[:preload_limit]
        semaphore = asyncio.Semaphore(5)
        async def fetch(appid, idx):
            async with semaphore:
                try:
                    details = await self.get_game_details(appid)
                    if details and details.get("name"):
                        self.game_names_cache[appid] = details["name"]
                        self._log("INFO", f"[{idx+1}/{len(appids_to_load)}] {appid}: {details['name']}")
                except Exception as e:
                    self._log("WARNING", f"{appid} 失败: {e}")
        await asyncio.gather(*[fetch(a, i) for i, a in enumerate(appids_to_load)])
        self.save_game_names_cache()
        self._log("INFO", f"预加载完成: {len(self.game_names_cache)} 个")
        self.game_names_progress = {"current": len(appids_to_load), "total": len(appids_to_load), "status": "completed", "last_appid": None}

    def is_installing(self) -> bool: return self.install_progress.get("status") == "running"

    def get_steam_path(self) -> Optional[Path]:
        try:
            custom = self.config.get("Custom_Steam_Path", "").strip()
            if custom and Path(custom).exists():
                self.steam_path = Path(custom)
                return self.steam_path
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Software\Valve\Steam')
            self.steam_path = Path(winreg.QueryValueEx(key, 'SteamPath')[0])
            return self.steam_path
        except: return None

    def detect_unlocker_type(self) -> Optional[str]:
        if not self.steam_path: self.get_steam_path()
        if not self.steam_path: return None
        force = self.config.get("Force_Unlocker", "").strip()
        if force: return force
        plugin = self.get_plugin_path()
        if plugin and plugin.exists() and any(plugin.glob("*.lua")): return "steamtools"
        greenluma = self.get_greenluma_path()
        if greenluma and greenluma.exists() and any(greenluma.glob("*.txt")): return "greenluma"
        return None

    def get_plugin_path(self) -> Optional[Path]:
        if not self.steam_path: self.get_steam_path()
        return self.steam_path / "config" / "stplug-in" if self.steam_path else None

    def get_greenluma_path(self) -> Optional[Path]:
        if not self.steam_path: self.get_steam_path()
        return self.steam_path / "AppList" if self.steam_path else None

    def get_depotcache_path(self) -> Optional[Path]:
        if not self.steam_path: self.get_steam_path()
        return self.steam_path / "depotcache" if self.steam_path else None

    async def check_github_rate_limit(self) -> Dict:
        token = self.config.get("Github_Personal_Token", "").strip()
        headers = {'Authorization': f'Bearer {token}'} if token else {}
        try:
            resp = await self.client.get("https://api.github.com/rate_limit", headers=headers)
            core = resp.json().get("resources", {}).get("core", {})
            return {"remaining": core.get("remaining", 0), "limit": core.get("limit", 60)}
        except: return {"remaining": 0}

    async def check_network(self):
        try:
            resp = await self.client.get("https://mips.kugou.com/check/iscn?&format=json", timeout=5)
            data = resp.json()
            return {"is_cn": bool(data.get("flag")), "country": data.get("country", "")}
        except: return {"is_cn": True}

    async def search_game_by_name(self, name: str) -> List[Dict]:
        cache_key = name.lower().strip()
        if cache_key in self.search_cache:
            cached = self.search_cache[cache_key]
            if cached.get("expires", 0) > asyncio.get_event_loop().time():
                self._log("INFO", f"搜索命中缓存: {name}")
                return cached["results"]
        results = []
        try:
            resp = await self.client.get(f"https://store.steampowered.com/api/storesearch?l=schinese&cc=cn&term={name}")
            data = resp.json()
            if data.get("total"):
                for item in data.get("items", [])[:10]:
                    game_info = {"appid": str(item.get("id")), "name": item.get("name"), "schinese_name": item.get("name")}
                    results.append(game_info)
                    self.game_names_cache[game_info["appid"]] = game_info["name"]
        except Exception as e:
            self._log("ERROR", f"搜索失败: {e}")
        self.search_cache[cache_key] = {"results": results, "expires": asyncio.get_event_loop().time() + self.search_cache_ttl}
        return results

    async def get_game_details(self, appid: str) -> Optional[Dict]:
        try:
            resp = await self.client.get(f"https://store.steampowered.com/api/appdetails?appids={appid}&l=schinese")
            data = resp.json()
            if appid in data and data[appid].get("success"):
                return data[appid].get("data", {})
        except: pass
        return None

    async def get_github_manifest(self, appid: str, repo: str) -> Optional[Dict]:
        token = self.config.get("Github_Personal_Token", "").strip()
        headers = {'Authorization': f'Bearer {token}'} if token else {}
        try:
            url = f"https://api.github.com/repos/{repo}/branches/{appid}"
            resp = await self.client.get(url, headers=headers)
            if resp.status_code not in [200, 404]: return None
            data = resp.json()
            if "commit" in data:
                tree_url = data["commit"]["commit"]["tree"]["url"]
                tree_resp = await self.client.get(tree_url, headers=headers)
                tree_data = tree_resp.json()
                if "tree" in tree_data:
                    return {"sha": data["commit"]["sha"], "files": tree_data["tree"], "update_date": data["commit"]["commit"]["author"]["date"]}
        except: pass
        return None

    def get_builtin_repos(self) -> List[str]:
        return ["Auiowu/ManifestAutoUpdate", "SteamAutoCracks/ManifestHub"]

    def get_custom_repos(self) -> List[Dict]:
        return self.config.get("Custom_Repos", {}).get("github", [])

    def get_all_repos(self) -> List[str]:
        return self.get_builtin_repos() + [r["repo"] for r in self.get_custom_repos()]

    def list_installed_files(self) -> List[Dict]:
        result = []
        plugin_path = self.get_plugin_path()
        if plugin_path and plugin_path.exists():
            for f in plugin_path.glob("*.lua"):
                if f.name != "steamtools.lua":
                    result.append({"filename": f.name, "appid": self._extract_appid(f), "path": str(f), "type": "steamtools"})
        greenluma_path = self.get_greenluma_path()
        if greenluma_path and greenluma_path.exists():
            for f in greenluma_path.glob("*.txt"):
                result.append({"filename": f.name, "appid": f.stem, "path": str(f), "type": "greenluma"})
        return result

    def _extract_appid(self, path: Path) -> Optional[str]:
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
            match = re.search(r'addappid\s*\(\s*(\d+)', content)
            return match.group(1) if match else None
        except: return None

    def delete_file(self, filename: str, file_type: str) -> Dict:
        try:
            path = None
            if file_type == "steamtools": path = self.get_plugin_path() / filename
            elif file_type == "greenluma": path = self.get_greenluma_path() / filename
            if path and path.exists():
                path.unlink()
                return {"success": True, "message": f"已删除 {filename}"}
            return {"success": False, "message": "文件不存在"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    async def cleanup_temp(self):
        try:
            if self.temp_path.exists():
                shutil.rmtree(self.temp_path)
                self.temp_path.mkdir(parents=True, exist_ok=True)
            self._log("INFO", "临时目录已清理")
        except Exception as e:
            self._log("ERROR", f"清理临时目录失败: {e}")

backend = CoreBackend()

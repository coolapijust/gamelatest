import json, re, shutil, zipfile, vdf
from pathlib import Path
from typing import Dict, List, Optional
import httpx
from datetime import datetime
from functools import partial
from starlette.concurrency import run_in_threadpool

MODULE_ID = "InstallBackend"

def _log(level: str, msg: str, extra: Dict = None):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    extra_str = f" | {extra}" if extra else ""
    print(f"[{timestamp}] [{MODULE_ID}] [{level}] {msg}{extra_str}")

class InstallBackend:
    def __init__(self, core):
        self.core = core
        # self.client will be accessed via self.core.network.client
        self.cancel_requested = False

    async def close(self): pass # Network shared, closed by core

    def request_cancel(self):
        self.cancel_requested = True
        print("[Install] 收到取消请求")

    def check_cancel(self) -> bool:
        return self.cancel_requested

    def reset_cancel(self):
        self.cancel_requested = False

    def _update_progress(self, current: int, total: int, step: str, message: str = "", appid: str = None):
        self.core.install_progress = {
            "current": current,
            "total": total,
            "status": "running",
            "step": step,
            "message": message,
            "appid": appid
        }
        print(f"[Install] [{current}/{total}] {step}: {message}")

    async def search_repos_for_appid(self, appid: str) -> List[Dict]:
        print(f"[Install] 开始搜索仓库: AppID={appid}")
        self._update_progress(0, 0, "search", f"正在搜索仓库: {appid}", appid)
        results = []
        repos = self.core.get_all_repos()
        total = len(repos)
        for i, repo in enumerate(repos):
            print(f"[Install] 搜索仓库 [{i+1}/{total}]: {repo}")
            manifest = await self._get_github_manifest(appid, repo)
            if manifest:
                results.append({"repo": repo, **manifest})
                print(f"[Install] 找到仓库: {repo}")
        print(f"[Install] 仓库搜索完成: 找到 {len(results)} 个仓库")
        return results

    async def search_all_repos_for_appid(self, appid: str) -> List[Dict]:
        _log("INFO", f"开始自动搜索仓库", {"appid": appid})
        self._update_progress(0, 0, "search", f"正在自动搜索: {appid}", appid)
        results = []
        found_count = {"github": 0}
        
        # 1. Prepare GitHub tasks
        github_repos = self.core.get_all_repos()
        current_search_count = 0
        total_github = len(github_repos)
        
        async def search_github_single(repo_name):
             # Use nonlocal carefully or just pass state. Here we just return result.
             nonlocal current_search_count
             if self.check_cancel(): return None
             current_search_count += 1
             # UI progress update might be too frequent if concurrent, but we'll try for now or debounce in UI
             # self._update_progress(current_search_count, total_github, "search", ...) 
             # For simpler logic, we log here
             # _log("DEBUG", f"Searching {repo_name}...")
             manifest = await self._get_github_manifest(appid, repo_name)
             if manifest:
                 return {"repo": repo_name, "type": "github", **manifest}
             return None

        github_tasks = [partial(search_github_single, repo) for repo in github_repos]
        
        # 2. Execute GitHub search
        gh_results = await self.core.network.download_concurrently(github_tasks, concurrency=5)
        for res in gh_results:
            if res:
                results.append(res)
                found_count["github"] += 1

        _log("INFO", f"自动搜索完成", {"total_found": len(results), **found_count, "appid": appid})
        
        self.core.install_progress = {
            "current": 100,
            "total": 100,
            "status": "completed",
            "step": "search",
            "message": f"搜索完成，找到 {len(results)} 个仓库",
            "appid": appid
        }
        
        return results

    async def _get_github_manifest(self, appid: str, repo: str) -> Optional[Dict]:
        token = self.core.config.get("Github_Personal_Token", "").strip()
        headers = {'Authorization': f'Bearer {token}'} if token else {}
        try:
            url = f"https://api.github.com/repos/{repo}/branches/{appid}"
            resp = await self.core.network.get(url, headers=headers)
            
            if resp.status_code == 404:
                # Not found is normal
                return None
            
            if resp.status_code != 200:
                print(f"[Install] 搜索异常 {repo}: HTTP {resp.status_code}")
                # Check for rate limit
                if resp.status_code == 403:
                    print(f"[Install] 可能触发 GitHub API 速率限制")
                return None
                
            data = resp.json()
            if "commit" not in data: return None
            tree_url = data["commit"]["commit"]["tree"]["url"]
            tree_resp = await self.core.network.get(tree_url, headers=headers)
            
            if tree_resp.status_code != 200:
                print(f"[Install] 获取 Tree 失败 {repo}: HTTP {tree_resp.status_code}")
                return None
                
            tree_data = tree_resp.json()
            if "tree" not in tree_data: return None
            return {"sha": data["commit"]["sha"], "files": tree_data["tree"], "update_date": data["commit"]["commit"]["author"]["date"]}
        except Exception as e: 
            print(f"[Install] 搜索出错 {repo}: {e}")
            return None

    async def download_from_github(self, appid: str, repo: str, sha: str, files: List[Dict], add_all_dlc: bool = False, fix_workshop: bool = False) -> Dict:
        print(f"[Install] 开始下载: AppID={appid}, Repo={repo}, SHA={sha[:7]}...")
        self._update_progress(0, len(files), "download", f"正在下载 {len(files)} 个文件", appid)
        
        try:
            token = self.core.config.get("Github_Personal_Token", "").strip()
            headers = {'Authorization': f'Bearer {token}'} if token else {}
            downloaded = {}
            total = len(files)
            completed_count = 0
            
            async def download_single(file_info):
                nonlocal completed_count
                if self.check_cancel(): return None
                
                path = file_info['path']
                url = f"https://raw.githubusercontent.com/{repo}/{sha}/{path}"
                try:
                    resp = await self.core.network.get_with_retry(url, headers=headers, timeout=30)
                    if resp and resp.status_code == 200:
                        completed_count += 1
                        self._update_progress(completed_count, total, "download", f"下载文件 {completed_count}/{total}", appid)
                        return (path, resp.content)
                    else:
                        print(f"[Install] 下载失败: {path} (HTTP {resp.status_code if resp else 'Error'})")
                        return None
                except Exception as e:
                    print(f"[Install] 下载异常: {path} - {e}")
                    return None

            tasks = [partial(download_single, f) for f in files]
            # Limit concurrency to 5 to avoid rate limits
            results = await self.core.network.download_concurrently(tasks, concurrency=5)
            
            for res in results:
                if res:
                    downloaded[res[0]] = res[1]
            
            if self.check_cancel():
                return {"success": False, "message": "用户取消操作"}

            if not downloaded:
                print(f"[Install] 下载失败: 未找到可下载的文件")
                return {"success": False, "message": "未找到可下载的文件"}
            
            print(f"[Install] 下载完成: {len(downloaded)}/{total} 个文件")
            self._update_progress(0, 0, "process", f"正在处理 {len(downloaded)} 个文件", appid)
            result = await self._process_downloaded_files(appid, downloaded, add_all_dlc, fix_workshop)
            print(f"[Install] 处理完成: {result}")
            self.core.install_progress = {
                "current": total,
                "total": total,
                "status": "completed",
                "step": "download",
                "message": f"入库成功: {len(downloaded)} 个文件",
                "appid": appid
            }
            return {"success": True, "message": result}
        except Exception as e:
            print(f"[Install] 下载异常: {e}")
            return {"success": False, "message": str(e)}

    async def _process_downloaded_files(self, appid: str, files: Dict[str, bytes], add_all_dlc: bool, fix_workshop: bool) -> str:
        print(f"[Install] 开始处理文件: AppID={appid}, 文件数={len(files)}")
        self._update_progress(0, 0, "process", "正在处理文件", appid)
        
        messages, plugin_path = [], self.core.get_plugin_path()
        if plugin_path:
            plugin_path.mkdir(parents=True, exist_ok=True)
            lua_files = [k for k in files if k.endswith('.lua')]
            manifest_files = [k for k in files if k.endswith('.manifest')]
            
            if lua_files:
                self._update_progress(0, 0, "process", f"处理 {len(lua_files)} 个 Lua 文件", appid)
                lua_path = plugin_path / f"{appid}.lua"
                merged = await self._merge_lua_file(lua_path, files[lua_files[0]].decode('utf-8', errors='ignore'))
                messages.append(f"Lua: {merged}")
                print(f"[Install] Lua 处理完成: {merged}")
            
            if manifest_files:
                depotcache = self.core.get_depotcache_path()
                if depotcache:
                    depotcache.mkdir(parents=True, exist_ok=True)
                    for m in manifest_files: 
                        (depotcache / Path(m).name).write_bytes(files[m])
                    messages.append(f"Manifest: {len(manifest_files)}个")
                    print(f"[Install] Manifest 处理完成: {len(manifest_files)} 个")
        
        if add_all_dlc:
            self._update_progress(0, 0, "dlc", "正在添加 DLC", appid)
            dlc = await self._add_all_dlc(appid)
            if dlc["success"]: 
                messages.append(f"DLC: {dlc['count']}个")
                print(f"[Install] DLC 添加完成: {dlc['count']} 个")
        
        if fix_workshop:
            self._update_progress(0, 0, "workshop", "正在修复 Workshop", appid)
            ws = await self._fix_workshop_keys(appid)
            if ws["success"]: 
                messages.append(f"Workshop: {ws['count']}个")
                print(f"[Install] Workshop 修复完成: {ws['count']} 个")
        
        result = "; ".join(messages) if messages else "完成"
        print(f"[Install] 文件处理完成: {result}")
        return result

    async def _merge_lua_file(self, path: Path, new_content: str) -> str:
        if path.exists():
            existing = path.read_text(encoding='utf-8', errors='ignore')
            existing_appids = set(re.findall(r'addappid\s*\((\d+)', existing))
            new_appids = set(re.findall(r'addappid\s*\((\d+)', new_content))
            added = [a for a in new_appids - existing_appids if re.search(rf'addappid\({a},[^)]+\)', new_content)]
            if added:
                path.write_text(existing + "\n" + "\n".join(re.search(rf'addappid\({a},[^)]+\)', new_content).group(0) for a in added), encoding='utf-8')
                return f"合并{len(added)}个AppID"
            return "无新AppID"
        else:
            path.write_text(new_content, encoding='utf-8')
            return "新建"

    async def _add_all_dlc(self, appid: str) -> Dict:
        print(f"[Install] 开始添加 DLC: AppID={appid}")
        try:
            details = await self.core.get_game_details(appid)
            if not details: 
                print(f"[Install] 获取 DLC 失败: 无法获取游戏详情")
                return {"success": False}
            dlcs = details.get("dlc", [])
            if not dlcs: 
                print(f"[Install] DLC 跳过: 该游戏没有 DLC")
                return {"success": True, "count": 0}
            plugin_path = self.core.get_plugin_path()
            if not plugin_path: 
                print(f"[Install] DLC 失败: 无法获取插件路径")
                return {"success": False}
            plugin_path.mkdir(parents=True, exist_ok=True)
            dlc_content = "\n".join(f'addappid({dlc_id}, true)' for dlc_id in dlcs)
            dlc_path = plugin_path / f"{appid}_dlc.lua"
            existing = dlc_path.read_text(encoding='utf-8', errors='ignore') if dlc_path.exists() else ""
            dlc_path.write_text(existing + "\n" + dlc_content, encoding='utf-8')
            print(f"[Install] DLC 添加成功: {len(dlcs)} 个")
            return {"success": True, "count": len(dlcs)}
        except Exception as e:
            print(f"[Install] DLC 异常: {e}")
            return {"success": False}

    async def _fix_workshop_keys(self, appid: str) -> Dict:
        print(f"[Install] 开始修复 Workshop: AppID={appid}")
        try:
            resp = await self.client.get(f"https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=STEAM_API_KEY&appid={appid}")
            if resp.status_code != 200: 
                print(f"[Install] Workshop 失败: API 返回 {resp.status_code}")
                return {"success": False}
            stats = resp.json().get("game", {}).get("stats", [])
            workshop_keys = [s for s in stats if "Workshop" in str(s)]
            if not workshop_keys: 
                print(f"[Install] Workshop 跳过: 无 Workshop 统计")
                return {"success": True, "count": 0}
            plugin_path = self.core.get_plugin_path()
            if not plugin_path: 
                print(f"[Install] Workshop 失败: 无法获取插件路径")
                return {"success": False}
            ws_content = "\n".join(f'SetStat("{k["name"]}", 1)' for k in workshop_keys[:50])
            ws_path = plugin_path / f"{appid}_workshop.lua"
            existing = ws_path.read_text(encoding='utf-8', errors='ignore') if ws_path.exists() else ""
            ws_path.write_text(existing + "\n" + ws_content, encoding='utf-8')
            print(f"[Install] Workshop 修复成功: {len(workshop_keys[:50])} 个")
            return {"success": True, "count": len(workshop_keys[:50])}
        except Exception as e:
            print(f"[Install] Workshop 异常: {e}")
            return {"success": False}



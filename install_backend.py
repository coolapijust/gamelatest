import json, re, shutil, zipfile, vdf
from pathlib import Path
from typing import Dict, List, Optional
import httpx
from datetime import datetime

MODULE_ID = "InstallBackend"

def _log(level: str, msg: str, extra: Dict = None):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    extra_str = f" | {extra}" if extra else ""
    print(f"[{timestamp}] [{MODULE_ID}] [{level}] {msg}{extra_str}")

class InstallBackend:
    def __init__(self, core):
        self.core = core
        self.client = httpx.AsyncClient(verify=False, timeout=60)
        self.cancel_requested = False

    async def close(self): await self.client.aclose()

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
        """自动搜索所有仓库（GitHub + ZIP），作为默认选项
        
        搜索范围:
        - GitHub 仓库 (内置 + 自定义)
        - ZIP 格式仓库 (printedwaste, cysaw, furcate, assiw, steamdatabase)
        
        不包含:
        - 创意工坊（需要工坊 URL/ID，非 AppID）
        - ZIP 仓库（当 "禁用所有ZIP仓库" 选项开启时）
        """
        _log("INFO", f"开始自动搜索仓库", {"appid": appid})
        self._update_progress(0, 0, "search", f"正在自动搜索: {appid}", appid)
        results = []
        found_count = {"github": 0, "zip": 0}
        
        disable_zip = self.core.config.get("Disable_All_ZIP_Repos", True)
        _log("INFO", f"ZIP仓库禁用状态", {"disable_all_zip": disable_zip})
        
        zip_repos = {
            "printedwaste": "https://api.printedwaste.com/gfk/download/{appid}",
            "cysaw": "https://cysaw.top/uploads/{appid}.zip",
            "furcate": "https://furcate.eu/files/{appid}.zip",
            "assiw": "https://assiw.cngames.site/qindan/{appid}.zip",
            "steamdatabase": "https://steamdatabase.s3.eu-north-1.amazonaws.com/{appid}.zip",
        }
        
        github_repos = self.core.get_all_repos()
        
        total_github = len(github_repos)
        total_zip = 0 if disable_zip else len(zip_repos)
        total = total_github + total_zip
        
        _log("INFO", f"仓库列表加载完成", {"github_count": total_github, "zip_count": total_zip, "appid": appid})
        
        for i, repo in enumerate(github_repos):
            self._update_progress(i + 1, total, "search", f"搜索 GitHub [{i+1}/{total_github}]: {repo}", appid)
            _log("DEBUG", f"搜索 GitHub 仓库", {"current": i+1, "total": total_github, "repo": repo, "appid": appid})
            manifest = await self._get_github_manifest(appid, repo)
            if manifest:
                results.append({"repo": repo, "type": "github", **manifest})
                found_count["github"] += 1
                _log("INFO", f"找到 GitHub 仓库", {"repo": repo, "sha": manifest.get("sha", "")[:7], "appid": appid})
        
        if disable_zip:
            _log("INFO", f"ZIP仓库已禁用，跳过搜索")
        else:
            zip_start_idx = total_github
            for i, (name, url_template) in enumerate(zip_repos.items()):
                idx = zip_start_idx + i + 1
                url = url_template.format(appid=appid)
                self._update_progress(idx, total, "search", f"搜索 ZIP [{i+1}/{total_zip}]: {name}", appid)
                _log("DEBUG", f"检查 ZIP 仓库", {"current": i+1, "total": total_zip, "name": name, "url": url, "appid": appid})
            
            try:
                resp = await self.client.head(url, timeout=15)
                if resp.status_code == 200:
                    results.append({
                        "repo": f"zip:{name}",
                        "zip_url": url,
                        "source": name,
                        "type": "zip",
                        "update_date": None
                    })
                    found_count["zip"] += 1
                    _log("INFO", f"找到 ZIP 仓库", {"name": name, "appid": appid})
                else:
                    _log("DEBUG", f"ZIP 仓库不存在", {"name": name, "status": resp.status_code, "appid": appid})
            except Exception as e:
                _log("WARNING", f"ZIP 仓库检查失败", {"name": name, "error": str(e), "appid": appid})
        
        _log("INFO", f"自动搜索完成", {"total_found": len(results), **found_count, "appid": appid})
        
        self.core.install_progress = {
            "current": total,
            "total": total,
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
            resp = await self.client.get(url, headers=headers)
            if resp.status_code != 200: return None
            data = resp.json()
            if "commit" not in data: return None
            tree_url = data["commit"]["commit"]["tree"]["url"]
            tree_data = (await self.client.get(tree_url, headers=headers)).json()
            if "tree" not in tree_data: return None
            return {"sha": data["commit"]["sha"], "files": tree_data["tree"], "update_date": data["commit"]["commit"]["author"]["date"]}
        except: return None

    async def download_from_github(self, appid: str, repo: str, sha: str, files: List[Dict], add_all_dlc: bool = False, fix_workshop: bool = False) -> Dict:
        print(f"[Install] 开始下载: AppID={appid}, Repo={repo}, SHA={sha[:7]}...")
        self._update_progress(0, len(files), "download", f"正在下载 {len(files)} 个文件", appid)
        
        try:
            token = self.core.config.get("Github_Personal_Token", "").strip()
            headers = {'Authorization': f'Bearer {token}'} if token else {}
            downloaded = {}
            total = len(files)
            
            for i, f in enumerate(files):
                self._update_progress(i + 1, total, "download", f"下载文件 {i+1}/{total}: {f['path'][:50]}...", appid)
                url = f"https://raw.githubusercontent.com/{repo}/{sha}/{f['path']}"
                try:
                    resp = await self.client.get(url, headers=headers, timeout=30)
                    if resp.status_code == 200:
                        downloaded[f['path']] = resp.content
                        print(f"[Install] 下载成功: {f['path']}")
                    else:
                        print(f"[Install] 下载失败: {f['path']} (HTTP {resp.status_code})")
                except httpx.ConnectError as e:
                    print(f"[Install] 下载连接失败: {f['path']} - {e}")
                except httpx.TimeoutException as e:
                    print(f"[Install] 下载超时: {f['path']} - {e}")
                except Exception as e:
                    print(f"[Install] 下载异常: {f['path']} - {type(e).__name__}: {e}")
            
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

    async def download_zip_manifest(self, appid: str, url: str, add_all_dlc: bool = False, fix_workshop: bool = False) -> Dict:
        print(f"[Install] 开始下载 ZIP: AppID={appid}, URL={url[:50]}...")
        self._update_progress(0, 0, "download", "正在下载 ZIP 文件", appid)
        try:
            self._update_progress(0, 0, "download", "正在下载 ZIP 文件", appid)
            resp = await self.client.get(url, timeout=60)
            if resp.status_code != 200: 
                print(f"[Install] ZIP 下载失败: HTTP {resp.status_code}")
                return {"success": False, "message": f"下载失败: {resp.status_code}"}
            zip_path, extract_path = self.core.temp_path / f"{appid}.zip", self.core.temp_path / appid
            zip_path.write_bytes(resp.content)
            print(f"[Install] ZIP 下载完成: {len(resp.content)/1024:.1f} KB")
            
            self._update_progress(0, 0, "extract", "正在解压文件", appid)
            print(f"[Install] 开始解压...")
            with zipfile.ZipFile(zip_path, 'r') as z: z.extractall(extract_path)
            print(f"[Install] 解压完成")
            
            downloaded = {f.name: f.read_bytes() for f in extract_path.rglob('*') if f.is_file()}
            print(f"[Install] 找到 {len(downloaded)} 个文件")
            
            self._update_progress(0, 0, "process", f"正在处理 {len(downloaded)} 个文件", appid)
            result = await self._process_downloaded_files(appid, downloaded, add_all_dlc, fix_workshop)
            
            zip_path.unlink(missing_ok=True)
            if extract_path.exists(): shutil.rmtree(extract_path)
            print(f"[Install] ZIP 入库完成: {result}")
            return {"success": True, "message": result}
        except Exception as e:
            print(f"[Install] ZIP 异常: {e}")
            return {"success": False, "message": str(e)}
            result = await self._process_downloaded_files(appid, downloaded, add_all_dlc, fix_workshop)
            zip_path.unlink(missing_ok=True)
            if extract_path.exists(): shutil.rmtree(extract_path)
            return {"success": True, "message": result}
        except Exception as e: return {"success": False, "message": str(e)}

    def get_zip_repos(self) -> List[Dict]: return self.core.config.get("Custom_Repos", {}).get("zip", [])
    def add_zip_repo(self, name: str, url: str) -> bool:
        try:
            repos = self.core.config.setdefault("Custom_Repos", {"github": [], "zip": []})
            repos["zip"].append({"name": name, "url": url})
            self.core.save_config()
            return True
        except: return False
    def remove_zip_repo(self, name: str) -> bool:
        try:
            repos = self.core.config.get("Custom_Repos", {})
            repos["zip"] = [r for r in repos.get("zip", []) if r.get("name") != name]
            self.core.save_config()
            return True
        except: return False

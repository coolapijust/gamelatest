"""
Buqiuren Manifest Processor - 不求人清单仓库处理模块

功能:
- 从 steamui API 获取 Depot/Manifest 信息
- 通过 manifest.steam.run 下载清单文件

依赖:
- SteamUI API: https://steamui.com/js/api/{appid}.js
- manifest.steam.run API: 会话令牌获取、清单下载
"""

import asyncio, httpx, re, random, string, io, zipfile
from pathlib import Path
from typing import Dict, Optional

MODULE_ID = "BuqiurenManifest"

STEAMUI_API = "https://steamui.com/js/api/{appid}.js"
MANIFEST_SESSION_URL = "https://manifest.steam.run/api/session"
MANIFEST_CODE_URL = "https://manifest.steam.run/api/request-code"

class BuqiurenManifestProcessor:
    def __init__(self, backend):
        self.backend = backend
        self.client = backend.client
        self.steam_path = backend.steam_path
        self.unlocker_type = backend.unlocker_type
        self.temp_path = backend.temp_path

    def _log(self, level: str, msg: str, extra: Dict = None):
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        extra_str = f" | {extra}" if extra else ""
        print(f"[{timestamp}] [{MODULE_ID}] [{level}] {msg}{extra_str}")

    async def _get_session_token(self) -> str:
        """获取 manifest.steam.run 会话令牌"""
        backup = "".join(random.choices(string.ascii_letters + string.digits, k=32))
        
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://manifest.steam.run/",
                "Origin": "https://manifest.steam.run",
                "Accept": "application/json, text/plain, */*",
            }
            
            resp = await self.client.post(
                MANIFEST_SESSION_URL,
                headers=headers,
                timeout=30
            )
            
            if resp.status_code == 200:
                data = resp.json()
                if "token" in data:
                    token = data["token"]
                    self._log("INFO", f"获取令牌成功: ...{token[-6:]}")
                    return token
        
        except Exception as e:
            self._log("WARNING", f"获取令牌失败，使用备用: {e}")
        
        return backup

    async def _get_depots_from_steamui(self, app_id: str) -> Dict[str, str]:
        """从 steamui API 获取 Depot 和 Manifest 信息
        
        Args:
            app_id: Steam AppID
            
        Returns:
            {depot_id: manifest_id, ...}
        """
        self._log("INFO", f"从 steamui API 获取 depot 信息: app_id={app_id}")
        
        try:
            url = STEAMUI_API.format(appid=app_id)
            resp = await self.client.get(url, timeout=15)
            
            if resp.status_code != 200:
                self._log("ERROR", f"steamui API 返回 HTTP {resp.status_code}")
                return {}
            
            content = resp.text
            
            matches = re.findall(
                r'depots\+"\+(\w+)\+"\]="(\d+)"\+.*\+"\+(\w+)\+".*?"([^"]+)"',
                content
            )
            
            result = {}
            for m in matches:
                depot_id, manifest_id = m[1], m[3]
                if depot_id.isdigit() and manifest_id.isdigit():
                    result[depot_id] = manifest_id
            
            self._log("INFO", f"获取到 {len(result)} 个 depot")
            return result
        
        except Exception as e:
            self._log("ERROR", f"获取 depot 信息失败: {e}")
            return {}

    async def _download_manifest(self, depot_id: str, manifest_id: str, depot_name: str) -> bool:
        """下载单个清单文件
        
        Args:
            depot_id: Depot ID
            manifest_id: Manifest ID
            depot_name: 用于日志显示的名称
            
        Returns:
            是否成功
        """
        output_filename = f"{depot_id}_{manifest_id}.manifest"
        self._log("INFO", f"下载清单: {output_filename}")
        
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                session_token = await self._get_session_token()
                
                payload = {
                    "depot_id": str(depot_id),
                    "manifest_id": str(manifest_id),
                    "token": session_token
                }
                
                headers = {
                    "Content-Type": "application/json",
                    "Referer": "https://manifest.steam.run/",
                    "Origin": "https://manifest.steam.run",
                    "Accept": "application/json, text/plain, */*",
                }
                
                await asyncio.sleep(random.uniform(2, 5))
                
                code_resp = await self.client.post(
                    MANIFEST_CODE_URL,
                    json=payload,
                    headers=headers,
                    timeout=60
                )
                
                if code_resp.status_code == 429:
                    self._log("WARNING", "请求频率过高，等待后重试")
                    await asyncio.sleep(30)
                    continue
                
                if code_resp.status_code != 200:
                    await asyncio.sleep(10)
                    continue
                
                code_data = code_resp.json()
                download_url = code_data.get("download_url")
                
                if not download_url:
                    error_msg = code_data.get('error', code_data.get('message', '未知错误'))
                    self._log("WARNING", f"获取下载链接失败: {error_msg}")
                    await asyncio.sleep(15)
                    continue
                
                man_resp = await self.client.get(download_url, timeout=180)
                if man_resp.status_code != 200:
                    continue
                
                content = man_resp.content
                
                if content.startswith(b'PK\x03\x04'):
                    self._log("INFO", "检测到 ZIP 文件，自动解压...")
                    with io.BytesIO(content) as mem_zip:
                        with zipfile.ZipFile(mem_zip) as z:
                            files = z.namelist()
                            if len(files) == 1:
                                content = z.read(files[0])
                                self._log("INFO", f"从 ZIP 提取: {files[0]}")
                
                self._log("INFO", f"保存清单: {output_filename}")
                self._save_manifest(content, output_filename)
                
                return True
            
            except Exception as e:
                self._log("ERROR", f"下载失败 (尝试 {attempt+1}/3): {e}")
                await asyncio.sleep(15)
        
        self._log("ERROR", f"清单下载失败: {output_filename}")
        return False

    def _save_manifest(self, content: bytes, filename: str):
        """保存清单文件到正确的目录
        
        Args:
            content: 清单文件内容
            filename: 文件名
        """
        paths = []
        
        if self.unlocker_type == "steamtools":
            paths.append(self.steam_path / "config" / "depotcache" / filename)
            paths.append(self.steam_path / "depotcache" / filename)
        else:
            paths.append(self.steam_path / "depotcache" / filename)
        
        for p in paths:
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(content)
            self._log("INFO", f"清单已保存: {p}")

    async def process_buqiuren(self, app_id: str) -> bool:
        """处理不求人仓库的完整流程
        
        通过 steamui API 获取所有 depot 信息，然后逐一下载清单。
        
        Args:
            app_id: Steam AppID
            
        Returns:
            是否成功下载至少一个清单
        """
        self._log("INFO", f"处理不求人仓库: app_id={app_id}")
        
        depots = await self._get_depots_from_steamui(app_id)
        
        if not depots:
            self._log("ERROR", f"无法获取 {app_id} 的 depot 信息")
            return False
        
        total = len(depots)
        success = 0
        
        for i, (depot_id, manifest_id) in enumerate(depots.items(), 1):
            self._log("INFO", f"进度: {i}/{total}")
            
            if await self._download_manifest(depot_id, manifest_id, f"Depot {depot_id}"):
                success += 1
            
            if i < total:
                delay = random.uniform(10, 20)
                self._log("INFO", f"等待 {delay:.1f} 秒后继续...")
                await asyncio.sleep(delay)
        
        self._log("INFO", f"完成: 成功 {success}/{total}")
        return success > 0

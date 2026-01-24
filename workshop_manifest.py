"""
Workshop Manifest Processor - 创意工坊清单处理模块

功能:
- 从 Steam 创意工坊 URL 或 ID 提取物品信息
- 获取工坊物品的 Depot/Manifest 信息
- 下载并放置清单文件

依赖:
- Steam Workshop API: https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/
- manifest.steam.run: 用于清单下载
"""

import asyncio, httpx, re
from pathlib import Path
from typing import Dict, Optional, Tuple

MODULE_ID = "WorkshopManifest"

WORKSHOP_API_URL = "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/"

class WorkshopManifestProcessor:
    def __init__(self, backend):
        self.backend = backend
        self.client = backend.network.client
        self.steam_path = backend.steam_path
        self.unlocker_type = backend.unlocker_type

    def _log(self, level: str, msg: str, extra: Dict = None):
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        extra_str = f" | {extra}" if extra else ""
        print(f"[{timestamp}] [{MODULE_ID}] [{level}] {msg}{extra_str}")

    def extract_workshop_id(self, input_text: str) -> Optional[str]:
        """从 URL 或纯 ID 字符串中提取创意工坊物品 ID"""
        input_text = input_text.strip()
        if not input_text:
            return None
        
        url_match = re.search(r"steamcommunity\.com/sharedfiles/filedetails/\?id=(\d+)", input_text)
        if url_match:
            return url_match.group(1)
        
        if input_text.isdigit():
            return input_text
        
        return None

    async def get_workshop_details(self, workshop_id: str) -> Optional[Tuple[str, str, str]]:
        """获取创意工坊物品的详细信息
        
        返回: (consumer_app_id, hcontent_file, title) 或 None
        """
        self._log("INFO", f"查询创意工坊物品: {workshop_id}")
        
        data = {"itemcount": 1, "publishedfileids[0]": workshop_id}
        
        for attempt in range(3):
            try:
                resp = await self.client.post(WORKSHOP_API_URL, data=data, timeout=15)
                resp.raise_for_status()
                
                result = resp.json()
                details = result.get("response", {}).get("publishedfiledetails", [{}])[0]
                
                if details.get("result") != 1:
                    self._log("ERROR", f"未找到创意工坊物品: {workshop_id}")
                    return None
                
                app_id = details.get("consumer_app_id")
                manifest_id = details.get("hcontent_file")
                title = details.get("title", "未知标题")
                
                if not app_id or not manifest_id:
                    self._log("ERROR", f"物品缺少必要信息: {title}")
                    return None
                
                self._log("INFO", f"物品信息: {title}")
                self._log("INFO", f"  AppID: {app_id}, Manifest: {manifest_id}")
                
                return str(app_id), str(manifest_id), title
            
            except Exception as e:
                self._log("ERROR", f"查询失败 (尝试 {attempt+1}/3): {e}")
                if attempt < 2:
                    await asyncio.sleep(2)
        
        return None

    async def _download_manifest(self, depot_id: str, manifest_id: str) -> bool:
        """从 manifest.steam.run 下载清单文件"""
        output_filename = f"{depot_id}_{manifest_id}.manifest"
        self._log("INFO", f"下载清单: {output_filename}")
        
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                session_token = await self._get_session_token()
                if not session_token:
                    self._log("WARNING", "获取会话令牌失败，使用备用")
                    session_token = "".join([
                        "B" * 16, "".join([
                            "abcdefghijklmnop"[i % 16] for i in range(32)
                        ])
                    ])
                
                payload = {
                    "depot_id": str(depot_id),
                    "manifest_id": str(manifest_id),
                    "token": session_token
                }
                
                headers = {
                    "Content-Type": "application/json",
                    "Referer": "https://manifest.steam.run/",
                    "Origin": "https://manifest.steam.run",
                }
                
                code_resp = await self.client.post(
                    "https://manifest.steam.run/api/request-code",
                    json=payload,
                    headers=headers,
                    timeout=60
                )
                
                if code_resp.status_code == 429:
                    self._log("WARNING", "请求频率过高，等待重试")
                    await asyncio.sleep(30)
                    continue
                
                if code_resp.status_code != 200:
                    await asyncio.sleep(10)
                    continue
                
                code_data = code_resp.json()
                download_url = code_data.get("download_url")
                
                if not download_url:
                    await asyncio.sleep(15)
                    continue
                
                await asyncio.sleep(2)
                
                man_resp = await self.client.get(download_url, timeout=180)
                if man_resp.status_code != 200:
                    continue
                
                content = man_resp.content
                
                self._log("INFO", f"保存清单: {output_filename}")
                self._save_manifest(content, output_filename)
                
                return True
            
            except Exception as e:
                self._log("ERROR", f"下载失败 (尝试 {attempt+1}/3): {e}")
                await asyncio.sleep(15)
        
        self._log("ERROR", f"清单下载失败: {output_filename}")
        return False

    async def _get_session_token(self) -> Optional[str]:
        """获取 manifest.steam.run 会话令牌"""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Referer": "https://manifest.steam.run/",
                "Origin": "https://manifest.steam.run",
                "Accept": "application/json",
            }
            
            resp = await self.client.post(
                "https://manifest.steam.run/api/session",
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
            self._log("WARNING", f"获取令牌失败: {e}")
        
        return None

    def _save_manifest(self, content: bytes, filename: str):
        """保存清单文件到正确的目录"""
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

    async def process_workshop(self, workshop_input: str) -> bool:
        """处理单个创意工坊物品的完整流程
        
        Args:
            workshop_input: 创意工坊 URL 或 ID
            
        Returns:
            是否成功
        """
        self._log("INFO", f"处理创意工坊: {workshop_input}")
        
        workshop_id = self.extract_workshop_id(workshop_input)
        if not workshop_id:
            self._log("ERROR", f"无效的创意工坊输入: {workshop_input}")
            return False
        
        details = await self.get_workshop_details(workshop_id)
        if not details:
            return False
        
        app_id, manifest_id, title = details
        self._log("INFO", f"开始下载: {title} | AppID={app_id}, Manifest={manifest_id}")
        
        return await self._download_manifest(app_id, manifest_id)

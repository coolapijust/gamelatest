"""
NetworkService - 网络请求服务
封装 httpx 客户端，处理重试逻辑和会话管理
"""
import os
import asyncio
import logging
import random
import string
import httpx
from typing import Dict, Any, Optional, List, Callable, Coroutine
from pathlib import Path
import aiofiles

class NetworkService:
    """网络服务 - 处理所有 HTTP 请求"""
    
    def __init__(self, timeout: int = 30):
        self.client = httpx.AsyncClient(
            verify=False, 
            trust_env=True, 
            timeout=timeout
        )
        self.log = logging.getLogger('NetworkService')
    
    async def close(self) -> None:
        """关闭 HTTP 客户端"""
        await self.client.aclose()
    
    async def get(self, url: str, headers: Optional[Dict] = None, 
                  timeout: Optional[int] = None, **kwargs) -> httpx.Response:
        """发送 GET 请求"""
        return await self.client.get(url, headers=headers, timeout=timeout, **kwargs)
    
    async def post(self, url: str, data: Optional[Dict] = None, 
                   json: Optional[Dict] = None, headers: Optional[Dict] = None,
                   timeout: Optional[int] = None, **kwargs) -> httpx.Response:
        """发送 POST 请求"""
        return await self.client.post(url, data=data, json=json, 
                                       headers=headers, timeout=timeout, **kwargs)
    
    async def get_with_retry(self, url: str, max_retries: int = 3, 
                              retry_delay: float = 2.0, **kwargs) -> Optional[httpx.Response]:
        """带重试的 GET 请求"""
        for attempt in range(max_retries):
            try:
                response = await self.get(url, **kwargs)
                response.raise_for_status()
                return response
            except (httpx.ConnectTimeout, httpx.ReadTimeout) as e:
                if attempt < max_retries - 1:
                    self.log.warning(f"请求超时，正在重试 ({attempt + 1}/{max_retries})...")
                    await asyncio.sleep(retry_delay)
                else:
                    self.log.error(f"请求失败，已达最大重试次数: {e}")
                    raise
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:  # Rate limited
                    if attempt < max_retries - 1:
                        wait_time = retry_delay * (attempt + 1) * 2
                        self.log.warning(f"请求频率过高，等待 {wait_time}s 后重试...")
                        await asyncio.sleep(wait_time)
                    else:
                        raise
                else:
                    raise
            except Exception as e:
                if attempt < max_retries - 1:
                    self.log.warning(f"请求出错: {e}，正在重试...")
                    await asyncio.sleep(retry_delay)
                else:
                    raise
        return None
    
    async def download_file(self, url: str, timeout: int = 180) -> Optional[bytes]:
        """下载文件内容"""
        try:
            response = await self.client.get(url, timeout=timeout, follow_redirects=True)
            response.raise_for_status()
            return response.content
        except Exception as e:
            self.log.error(f"下载文件失败: {e}")
            return None
    
    async def download_with_mirrors(self, urls: List[str], timeout: int = 15) -> Optional[bytes]:
        """从多个镜像 URL 尝试下载"""
        for i, url in enumerate(urls, 1):
            try:
                self.log.info(f"尝试从源 {i}/{len(urls)} 下载: {url.split('/')[2]}")
                
                for retry in range(2):
                    try:
                        response = await self.client.get(url, timeout=timeout)
                        response.raise_for_status()
                        return response.content
                    except (httpx.ConnectTimeout, httpx.ReadTimeout):
                        if retry == 0:
                            self.log.warning(f"连接超时，正在重试...")
                            await asyncio.sleep(1)
                        else:
                            raise
            except Exception as e:
                self.log.warning(f"源 {url.split('/')[2]} 下载失败: {e}")
                if i < len(urls):
                    continue
        
        self.log.error("所有镜像源均不可用")
        return None
    
    async def check_github_rate_limit(self, token: str = "") -> Dict[str, Any]:
        """检查 GitHub API 速率限制"""
        try:
            headers = {'Authorization': f'Bearer {token}'} if token else {}
            headers['User-Agent'] = 'GameLatest-Client'
            
            response = await self.client.get(
                "https://api.github.com/rate_limit",
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            core = data.get('resources', {}).get('core', {})
            return {
                'limit': core.get('limit', 0),
                'remaining': core.get('remaining', 0),
                'reset': core.get('reset', 0)
            }
        except Exception as e:
            self.log.warning(f"检查 GitHub 速率限制失败: {e}")
            return {'limit': 0, 'remaining': 0, 'reset': 0}

    async def download_concurrently(self, tasks: List[Callable[[], Coroutine]], 
                                  concurrency: int = 5) -> List[Any]:
        """并发执行下载任务
        
        Args:
            tasks: 异步任务函数列表
            concurrency: 最大并发数
            
        Returns:
            任务结果列表
        """
        semaphore = asyncio.Semaphore(concurrency)
        
        async def worker(task_func):
            async with semaphore:
                return await task_func()
                
        return await asyncio.gather(*(worker(task) for task in tasks))

    async def download_file_stream(self, url: str, destination: Path, 
                                 progress_callback: Optional[Callable[[int, int], None]] = None) -> bool:
        """流式下载文件
        
        Args:
            url: 下载地址
            destination: 保存路径
            progress_callback: 进度回调(current, total)
        """
        try:
            async with self.client.stream("GET", url, follow_redirects=True) as response:
                response.raise_for_status()
                total = int(response.headers.get("content-length", 0))
                current = 0
                
                async with aiofiles.open(destination, "wb") as f:
                    async for chunk in response.aiter_bytes():
                        await f.write(chunk)
                        current += len(chunk)
                        if progress_callback:
                            progress_callback(current, total)
            return True
        except Exception as e:
            self.log.error(f"流式下载失败 {url}: {e}")
            return False
    
    async def check_network(self) -> Dict[str, bool]:
        """检查网络连通性"""
        results = {
            'github': False,
            'steam': False
        }
        
        try:
            response = await self.client.get("https://api.github.com", timeout=5)
            results['github'] = response.status_code == 200
        except:
            pass
        
        try:
            response = await self.client.get("https://store.steampowered.com", timeout=5)
            results['steam'] = response.status_code == 200
        except:
            pass
        
        return results
    
    @staticmethod
    def generate_session_token(length: int = 32) -> str:
        """生成随机会话令牌"""
        return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

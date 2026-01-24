"""
ConfigManager - 配置管理服务
负责 config.json 的读写和验证
"""
import os
import logging
import aiofiles
import ujson as json
from pathlib import Path
from typing import Dict, Any

# --- DEFAULT CONFIG ---
DEFAULT_CONFIG = {
    "Github_Personal_Token": "",
    "Custom_Steam_Path": "",
    "Force_Unlocker": "",
    "Custom_Repos": {
        "github": [],
        "zip": []
    },
    "QA1": "温馨提示: Github_Personal_Token(个人访问令牌)可在Github设置的最底下开发者选项中找到, 详情请看教程。",
    "QA2": "Force_Unlocker: 强制指定解锁工具, 填入 'steamtools' 或 'greenluma'。留空则自动检测。",
    "QA3": "Custom_Repos: 自定义清单库配置。github数组用于添加GitHub仓库，zip数组用于添加ZIP清单库。",
    "QA4": "GitHub仓库格式: {\"name\": \"显示名称\", \"repo\": \"用户名/仓库名\"}",
    "QA5": "ZIP清单库格式: {\"name\": \"显示名称\", \"url\": \"下载URL，用{app_id}作为占位符\"}"
}

class ConfigManager:
    """配置管理器 - 处理 config.json 的读写"""
    
    def __init__(self, config_path: str = "./config.json"):
        self.config_path = Path(config_path)
        self.config: Dict[str, Any] = {}
        self.log = logging.getLogger('ConfigManager')
    
    async def load(self) -> Dict[str, Any]:
        """异步加载配置文件"""
        if not self.config_path.exists():
            await self._generate_default()
            self.config = DEFAULT_CONFIG.copy()
            return self.config
        
        try:
            async with aiofiles.open(self.config_path, mode="r", encoding="utf-8") as f:
                user_config = json.loads(await f.read())
                self.config = DEFAULT_CONFIG.copy()
                self.config.update(user_config)
                self._ensure_custom_repos_structure()
                return self.config
        except Exception as e:
            self.log.error(f"加载配置文件失败: {e}。正在重置...")
            if self.config_path.exists():
                os.remove(self.config_path)
            await self._generate_default()
            self.config = DEFAULT_CONFIG.copy()
            return self.config
    
    def load_sync(self) -> Dict[str, Any]:
        """同步加载配置文件 (用于非异步上下文)"""
        if not self.config_path.exists():
            self._generate_default_sync()
            self.config = DEFAULT_CONFIG.copy()
            return self.config
        
        try:
            with open(self.config_path, mode="r", encoding="utf-8") as f:
                user_config = json.loads(f.read())
                self.config = DEFAULT_CONFIG.copy()
                self.config.update(user_config)
                self._ensure_custom_repos_structure()
                return self.config
        except Exception as e:
            self.log.error(f"加载配置文件失败: {e}。正在重置...")
            if self.config_path.exists():
                os.remove(self.config_path)
            self._generate_default_sync()
            self.config = DEFAULT_CONFIG.copy()
            return self.config
    
    async def save(self) -> bool:
        """异步保存配置文件"""
        try:
            async with aiofiles.open(self.config_path, mode="w", encoding="utf-8") as f:
                await f.write(json.dumps(self.config, indent=2, ensure_ascii=False))
            return True
        except Exception as e:
            self.log.error(f"保存配置文件失败: {e}")
            return False
    
    def save_sync(self) -> bool:
        """同步保存配置文件"""
        try:
            with open(self.config_path, mode="w", encoding="utf-8") as f:
                f.write(json.dumps(self.config, indent=2, ensure_ascii=False))
            return True
        except Exception as e:
            self.log.error(f"保存配置文件失败: {e}")
            return False
    
    def get(self, key: str, default: Any = None) -> Any:
        """获取配置项"""
        return self.config.get(key, default)
    
    def set(self, key: str, value: Any) -> None:
        """设置配置项"""
        self.config[key] = value
    
    async def _generate_default(self) -> None:
        """异步生成默认配置文件"""
        try:
            async with aiofiles.open(self.config_path, mode="w", encoding="utf-8") as f:
                await f.write(json.dumps(DEFAULT_CONFIG, indent=2, ensure_ascii=False))
            self.log.info('未识别到config.json，已自动生成默认配置')
        except Exception as e:
            self.log.error(f'生成配置文件失败: {e}')
    
    def _generate_default_sync(self) -> None:
        """同步生成默认配置文件"""
        try:
            with open(self.config_path, mode="w", encoding="utf-8") as f:
                f.write(json.dumps(DEFAULT_CONFIG, indent=2, ensure_ascii=False))
            self.log.info('未识别到config.json，已自动生成默认配置')
        except Exception as e:
            self.log.error(f'生成配置文件失败: {e}')
    
    def _ensure_custom_repos_structure(self) -> None:
        """确保 Custom_Repos 结构完整"""
        if 'Custom_Repos' not in self.config:
            self.config['Custom_Repos'] = {"github": [], "zip": []}
        elif not isinstance(self.config['Custom_Repos'], dict):
            self.config['Custom_Repos'] = {"github": [], "zip": []}
        else:
            if 'github' not in self.config['Custom_Repos']:
                self.config['Custom_Repos']['github'] = []
            if 'zip' not in self.config['Custom_Repos']:
                self.config['Custom_Repos']['zip'] = []

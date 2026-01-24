"""
SteamService - Steam 相关服务
处理 Steam 路径检测、解锁工具检测和 Depot 管理
"""
import logging
import winreg
from pathlib import Path
from typing import Optional, Literal

class SteamService:
    """Steam 服务 - 处理 Steam 相关操作"""
    
    def __init__(self, config_manager):
        self.config = config_manager
        self.log = logging.getLogger('SteamService')
        self.steam_path: Optional[Path] = None
        self.unlocker_type: Optional[str] = None
    
    def get_steam_path(self) -> Optional[Path]:
        """获取 Steam 安装路径"""
        try:
            # 优先使用自定义路径
            custom_path = self.config.get("Custom_Steam_Path", "").strip()
            if custom_path:
                self.log.info(f"使用自定义Steam路径: {custom_path}")
                self.steam_path = Path(custom_path)
                return self.steam_path
            
            # 从注册表读取
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Software\Valve\Steam')
            path = Path(winreg.QueryValueEx(key, 'SteamPath')[0])
            self.steam_path = path
            return path
        except Exception as e:
            self.log.error(f'获取Steam路径失败: {e}')
            return None
    
    def detect_unlocker_type(self) -> Literal["steamtools", "greenluma", "conflict", "none"]:
        """检测解锁工具类型"""
        if not self.steam_path:
            self.steam_path = self.get_steam_path()
        
        if not self.steam_path or not self.steam_path.exists():
            self.log.error('无法确定有效的Steam路径')
            return "none"
        
        # 检查是否强制指定
        forced = self.config.get("Force_Unlocker", "").strip().lower()
        if forced in ["steamtools", "greenluma"]:
            self.unlocker_type = forced
            self.log.warning(f"已根据配置强制使用: {forced}")
            return forced
        
        # 自动检测
        is_steamtools = (self.steam_path / 'config' / 'stplug-in').is_dir()
        is_greenluma = any(
            (self.steam_path / dll).exists() 
            for dll in ['GreenLuma_2025_x86.dll', 'GreenLuma_2025_x64.dll']
        )
        
        if is_steamtools and is_greenluma:
            self.log.error("环境冲突：同时检测到SteamTools和GreenLuma！")
            return "conflict"
        elif is_steamtools:
            self.log.info("检测到解锁工具: SteamTools")
            self.unlocker_type = "steamtools"
            return "steamtools"
        elif is_greenluma:
            self.log.info("检测到解锁工具: GreenLuma")
            self.unlocker_type = "greenluma"
            return "greenluma"
        else:
            self.log.warning("未能自动检测到解锁工具")
            return "none"
    
    def is_steamtools(self) -> bool:
        """检查是否使用 SteamTools"""
        return self.unlocker_type == "steamtools"
    
    def is_greenluma(self) -> bool:
        """检查是否使用 GreenLuma"""
        return self.unlocker_type == "greenluma"
    
    def get_depot_cache_path(self) -> Optional[Path]:
        """获取 Depot 缓存路径"""
        if not self.steam_path:
            return None
        
        if self.is_steamtools():
            return self.steam_path / 'config' / 'depotcache'
        else:
            return self.steam_path / 'depotcache'
    
    def get_stplugin_path(self) -> Optional[Path]:
        """获取 SteamTools 插件路径"""
        if not self.steam_path or not self.is_steamtools():
            return None
        return self.steam_path / 'config' / 'stplug-in'
    
    def ensure_depot_cache_exists(self) -> bool:
        """确保 Depot 缓存目录存在"""
        depot_path = self.get_depot_cache_path()
        if depot_path:
            depot_path.mkdir(parents=True, exist_ok=True)
            return True
        return False

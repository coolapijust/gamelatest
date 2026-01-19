# Game Latest - Steam游戏入库工具

Game Latest 是一款专为 Steam 用户设计的桌面应用程序，提供便捷的游戏入库管理功能。

## 主要功能

### 游戏入库
- 支持从 GitHub 仓库下载游戏清单
- 支持 ZIP 格式仓库快速入库
- 批量下载游戏资源文件
- 自动处理 DLC 内容
- 支持创意工坊修复
- **一键自动搜索并入库**
- **可禁用 ZIP 仓库（默认开启）**

### 游戏搜索
- 实时搜索 Steam 游戏名称
- 查看游戏详细信息
- 快速定位目标游戏

### 文件管理
- 查看已入库的文件列表
- 一键删除不需要的文件
- 区分不同类型的文件

### 系统集成
- 自动检测 Steam 安装路径
- 识别已安装的解锁工具类型
- 支持自定义仓库配置
- 支持 GitHub Personal Token 配置

## 技术特性

- **现代化界面** - 基于 HTML/CSS/JS 的响应式 UI
- **本地 API 服务** - FastAPI 后端提供稳定的数据接口
- **原生桌面体验** - 使用 webview 渲染界面
- **跨平台兼容** - 支持 Windows 操作系统
- **单文件分发** - PyInstaller 打包为独立可执行文件

## 界面模块

| 模块 | 功能描述 |
|------|----------|
| 首页 | 显示 Steam 状态、游戏搜索入口 |
| 入库 | 游戏搜索、仓库浏览、下载管理 |
| 文件 | 已安装文件查看与管理 |
| 设置 | Steam 路径、解锁工具、仓库配置 |
| 帮助 | 使用指南与常见问题解答 |

## 使用说明

### 快速入门

1. 启动程序后等待后端服务初始化
2. 在首页查看 Steam 路径和解锁工具状态
3. 进入入库页面，输入 AppID（如 223850）
4. 选择"自动搜索所有仓库"（默认选项）
5. 点击"🚀 开始入库"
6. 等待下载完成

### 手动选择仓库

如果需要指定仓库：
1. 输入 AppID
2. 取消勾选"自动搜索所有仓库"
3. 从仓库列表选择目标仓库
4. 点击"🚀 开始入库"

### 设置选项

- **GitHub Token**: 在搜索 GitHub 仓库时提高 API 限制
- **Steam 路径**: 自定义 Steam 安装目录
- **ZIP 仓库**: 可选择禁用所有 ZIP 仓库（默认禁用，加速搜索）

## 系统要求

- Windows 10/11
- Python 3.13+ (开发环境)
- 已安装 Steam 客户端
- WebView2 运行时（Windows 10/11 自带）

## 开发技术栈

- **后端**: FastAPI + Uvicorn + Python 3.13
- **前端**: 原生 HTML/CSS/JavaScript
- **桌面框架**: pywebview
- **打包工具**: PyInstaller

## 开发环境运行

```bash
# 安装依赖
pip install -r requirements.txt

# 运行程序
python main.py
```

## 打包发布

```bash
# 安装 PyInstaller
pip install pyinstaller

# Release 版本（隐藏控制台）
pyinstaller GameLatest.spec

# Debug 版本（显示控制台）
pyinstaller --noconfirm GameLatest_Debug.spec

# 输出目录: dist/GameLatest/
```

## 版本信息

- 当前版本: 1.0.0
- 许可证: MPL

## 致谢
- **pvzcsx** - https://github.com/pvzcxw/unlockgamesmanager

# Cai Install 前端重构计划


## 前端功能模块需求

### 1. 首页模块 (Home)
#### 功能需求
- 显示系统状态信息
  - Steam路径检测状态
  - 解锁工具类型
  - 已入库游戏数量
- 快速操作入口
  - 新游戏入库
  - 文件管理
  - 设置查看

#### API对接
```javascript
// 获取系统状态
GET /api/status
返回: {
  steam_path: string,
  unlocker_type: string,
  config: {
    files: Array
  }
}

// 获取配置信息
GET /api/config
返回: {
  Github_Personal_Token: string,
  Custom_Steam_Path: string
}

// 获取已入库文件列表
GET /api/files
返回: {
  files: Array<{
    filename: string,
    appid: string,
    type: string
  }>
}
```

### 2. 游戏入库模块 (Install)
#### 功能需求
- 游戏搜索功能
  - 支持AppID搜索
  - 支持游戏名称搜索
  - 显示搜索结果列表
- 仓库选择功能
  - 显示可用仓库列表
  - 支持仓库搜索
  - 支持仓库选择
- 入库操作
  - 支持DLC入库选项
  - 支持创意工坊修补选项
  - 显示入库进度
  - 入库结果反馈

#### API对接
```javascript
// 搜索游戏
GET /api/games/search/{name}
返回: {
  games: Array<{
    appid: string,
    name: string,
    schinese_name: string
  }>
}

// 获取游戏详情
GET /api/games/{appid}
返回: {
  appid: string,
  name: string,
  // 其他游戏信息
}

// 搜索仓库
GET /api/repos/search/{appid}
返回: {
  results: Array<{
    repo: string,
    update_date: string
  }>
}

// 获取清单
GET /api/manifest/{appid}?repo={repo}
返回: {
  // 清单内容
}

// 开始入库
POST /api/install
请求体: {
  appid: string,
  repo: string,
  zip_url: string,
  add_all_dlc: boolean,
  fix_workshop: boolean
}
返回: {
  message: string,
  // 其他入库结果信息
}
```

### 3. 文件管理模块 (Files)
#### 功能需求
- 文件列表展示
  - 显示已入库文件
  - 支持文件搜索过滤
  - 显示文件类型和AppID
- 文件操作
  - 删除文件
  - 刷新文件列表
  - 批量操作（可选）

#### API对接
```javascript
// 获取文件列表
GET /api/files
返回: {
  files: Array<{
    filename: string,
    appid: string,
    type: string
  }>
}

// 删除文件
DELETE /api/files/{filename}?file_type={type}
返回: {
  message: string
}
```

### 4. 设置模块 (Settings)
#### 功能需求
- 基本设置
  - GitHub Token配置
  - Steam路径配置
  - 设置保存和加载
- 仓库管理
  - 添加GitHub仓库
  - 添加ZIP仓库
  - 删除仓库
  - 显示仓库列表

#### API对接
```javascript
// 更新配置
POST /api/config
请求体: {
  key: string,
  value: string
}
返回: {
  message: string
}

// 获取仓库列表
GET /api/repos
返回: {
  builtin: Array<string>,
  custom: Array<{
    name: string,
    repo: string
  }>,
  zip: Array<{
    name: string,
    url: string
  }>
}

// 添加GitHub仓库
POST /api/repos/add
请求体: {
  name: string,
  repo: string
}
返回: {
  message: string
}

// 添加ZIP仓库
POST /api/repos/zip/add
请求体: {
  name: string,
  url: string
}
返回: {
  message: string
}

// 删除仓库
DELETE /api/repos/{name}
返回: {
  message: string
}

// 删除ZIP仓库
DELETE /api/repos/zip/{name}
返回: {
  message: string
}
```

### 5. 帮助模块 (Help)
#### 功能需求
- 使用说明
  - AppID获取方法
  - GitHub Token获取方法
  - 常见问题解答
- 关于信息
  - 版本信息
  - 作者信息
  - 联系方式

#### API对接
```javascript
// 获取帮助信息
GET /api/help/qa
返回: {
  qa: Array<{
    question: string,
    answer: string
  }>
}
```

## 前端技术架构

### 1. 模块划分
```
frontend/
├── js/
│   ├── api.js          # API调用层
│   ├── ui.js           # UI操作层
│   ├── state.js        # 状态管理层
│   ├── app.js          # 应用逻辑层
│   └── utils.js        # 工具函数
├── css/
│   ├── variables.css   # CSS变量
│   ├── components.css  # 组件样式
│   └── pages.css       # 页面样式
└── index.html          # 主页面
```

### 2. 代码规范
- 每个文件代码行数不超过200行
- 添加必要的错误处理和日志
- 使用现代JavaScript语法
- 保持代码可读性和可维护性

### 3. 错误处理
- 所有API调用添加try-catch
- 用户友好的错误提示
- 详细的错误日志记录
- 网络异常处理

### 4. 用户体验
- 加载状态提示
- 操作结果反馈
- 表单验证
- 响应式设计

## API对接规范

### 1. 请求格式
```javascript
// GET请求
fetch(`${API_BASE}/endpoint`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})

// POST请求
fetch(`${API_BASE}/endpoint`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})

// DELETE请求
fetch(`${API_BASE}/endpoint`, {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json'
  }
})
```

### 2. 响应处理
```javascript
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return await response.json();
} catch (error) {
  console.error('API Error:', error);
  throw error;
}
```

### 3. 错误处理
- 网络错误：显示"网络连接失败，请检查网络"
- API错误：显示后端返回的错误信息
- 超时错误：显示"请求超时，请重试"
- 未知错误：显示"操作失败，请稍后重试"

## 实施计划

### 阶段一：代码重构
1. 拆分压缩的JavaScript代码
2. 优化代码结构
3. 添加错误处理和日志
4. 改进代码可读性

### 阶段二：功能完善
1. 实现所有API对接
2. 完善错误处理
3. 添加加载状态
4. 改进用户反馈

### 阶段三：测试优化
1. 功能测试
2. 兼容性测试
3. 性能优化
4. 用户体验优化

## 注意事项

1. **代码行数限制**：每个文件不超过200行，超过则拆分模块
2. **错误处理**：所有API调用必须添加错误处理
3. **用户反馈**：所有操作都需要给用户明确的反馈
4. **日志记录**：关键操作添加日志记录，便于调试
5. **代码注释**：关键逻辑添加必要的注释说明
6. **测试验证**：每个功能完成后进行测试验证

## 重构设计提示词模板

### 格式说明
使用以下标准格式来描述每个模块的重构设计：

```
[技术栈]
- 前端框架：原生JavaScript + CSS3
- 构建工具：无（直接使用）
- 依赖管理：无外部依赖
- 样式方案：CSS变量 + Flexbox/Grid布局

[功能描述]
- 模块名称：xxx
- 主要功能：xxx
- 用户交互：xxx
- 数据流转：xxx

[输入输出]
- 输入：用户操作数据、API响应数据
- 输出：UI渲染、用户反馈、状态更新
- 数据格式：JSON

[约束条件]
- 代码行数：每个文件不超过200行
- 函数职责：单一职责原则
- 错误处理：必须添加try-catch
- 用户体验：所有操作需要反馈

[示例/参考]
- 参考实现：xxx
- 最佳实践：xxx
- 注意事项：xxx
```

### 模块1：API调用层 (api.js)
```
[技术栈]
- Fetch API：用于HTTP请求
- 异步编程：async/await
- 错误处理：try-catch + Promise

[功能描述]
- 模块名称：API调用层
- 主要功能：
  1. 封装HTTP请求方法
  2. 统一错误处理
  3. API接口定义
  4. 请求/响应拦截
- 用户交互：无直接交互
- 数据流转：接收调用参数 -> 发送请求 -> 返回响应数据

[输入输出]
- 输入：
  - HTTP方法（GET/POST/DELETE）
  - API端点路径
  - 请求数据（POST时）
- 输出：
  - API响应数据
  - 错误信息
- 数据格式：JSON

[约束条件]
- 代码行数：不超过200行
- 错误处理：所有请求必须添加错误处理
- 超时设置：默认10秒超时
- 日志记录：记录所有请求和错误

[示例/参考]
- 参考实现：现代前端API封装模式
- 最佳实践：
  1. 使用async/await处理异步
  2. 统一错误处理机制
  3. 添加请求日志
- 注意事项：
  1. 避免重复请求
  2. 处理网络异常
  3. 用户友好的错误提示
```

### 模块2：UI操作层 (ui.js)
```
[技术栈]
- DOM操作：原生JavaScript
- 事件处理：addEventListener
- 样式操作：classList操作

[功能描述]
- 模块名称：UI操作层
- 主要功能：
  1. DOM元素选择器
  2. UI渲染函数
  3. 事件绑定
  4. 状态更新
- 用户交互：响应用户操作
- 数据流转：接收数据 -> 渲染UI -> 更新DOM

[输入输出]
- 输入：
  - 数据对象（文件列表、配置等）
  - 用户操作事件
- 输出：
  - 渲染后的DOM元素
  - 更新的UI状态
- 数据格式：JavaScript对象

[约束条件]
- 代码行数：不超过200行
- 性能优化：避免频繁DOM操作
- 可访问性：添加必要的ARIA属性
- 响应式：支持不同屏幕尺寸

[示例/参考]
- 参考实现：现代前端UI组件模式
- 最佳实践：
  1. 使用文档片段批量更新DOM
  2. 事件委托减少监听器数量
  3. CSS类名语义化
- 注意事项：
  1. 避免内存泄漏
  2. 处理空数据情况
  3. 添加加载状态
```

### 模块3：状态管理层 (state.js)
```
[技术栈]
- 状态管理：原生JavaScript对象
- 数据持久化：localStorage
- 主题管理：CSS变量

[功能描述]
- 模块名称：状态管理层
- 主要功能：
  1. 应用状态存储
  2. 状态更新方法
  3. 数据持久化
  4. 主题切换
- 用户交互：间接交互（通过UI层）
- 数据流转：接收状态更新 -> 更新存储 -> 通知UI

[输入输出]
- 输入：
  - 新的状态数据
  - 用户偏好设置
- 输出：
  - 当前状态值
  - 更新后的UI
- 数据格式：JavaScript对象

[约束条件]
- 代码行数：不超过200行
- 数据一致性：状态更新原子性
- 持久化：关键数据必须保存
- 主题支持：支持亮色/暗色模式

[示例/参考]
- 参考实现：Flux状态管理模式
- 最佳实践：
  1. 不可变状态更新
  2. 单一数据源
  3. 状态变化可追踪
- 注意事项：
  1. 避免状态嵌套过深
  2. 清理过期数据
  3. 处理存储异常
```

### 模块4：应用逻辑层 (app.js)
```
[技术栈]
- 业务逻辑：原生JavaScript
- 事件处理：addEventListener
- 异步操作：async/await

[功能描述]
- 模块名称：应用逻辑层
- 主要功能：
  1. 业务逻辑处理
  2. 事件处理函数
  3. API调用协调
  4. 用户操作响应
- 用户交互：直接响应用户操作
- 数据流转：接收用户操作 -> 处理业务逻辑 -> 调用API -> 更新UI

[输入输出]
- 输入：
  - 用户操作事件
  - API响应数据
- 输出：
  - API请求参数
  - UI更新指令
  - 用户反馈信息
- 数据格式：JavaScript对象

[约束条件]
- 代码行数：不超过200行
- 错误处理：所有操作必须添加错误处理
- 用户反馈：所有操作需要反馈
- 日志记录：记录关键操作

[示例/参考]
- 参考实现：MVC架构中的Controller层
- 最佳实践：
  1. 业务逻辑与UI分离
  2. 统一错误处理
  3. 操作日志记录
- 注意事项：
  1. 避免重复操作
  2. 处理并发请求
  3. 优化用户体验
```

### 模块5：工具函数层 (utils.js)
```
[技术栈]
- 工具函数：原生JavaScript
- 数据处理：数组/对象操作
- 格式化：字符串/日期处理

[功能描述]
- 模块名称：工具函数层
- 主要功能：
  1. 通用工具函数
  2. 数据格式化
  3. 输入验证
  4. 辅助功能
- 用户交互：无直接交互
- 数据流转：接收输入 -> 处理数据 -> 返回结果

[输入输出]
- 输入：
  - 原始数据
  - 格式化参数
- 输出：
  - 处理后的数据
  - 验证结果
- 数据格式：各种JavaScript类型

[约束条件]
- 代码行数：不超过200行
- 函数纯度：尽量使用纯函数
- 输入验证：验证所有输入
- 错误处理：处理异常情况

[示例/参考]
- 参考实现：Lodash工具库
- 最佳实践：
  1. 函数单一职责
  2. 参数默认值
  3. 类型检查
- 注意事项：
  1. 避免副作用
  2. 处理边界情况
  3. 性能优化
```

## 设计风格分析


##### 💡 建议的设计方向
1. **简洁实用**：采用WinUI设计原则，简洁高效
2. **专业感**：使用专业的配色和布局
3. **响应迅速**：避免复杂动画，保证操作流畅
4. **清晰可读**：确保文字和界面元素清晰可见
5. **易于维护**：代码结构清晰，便于后续维护

### 推荐设计风格

#### WinUI/Fluent Design 风格
```
### 🎨 色彩美学
- **主色调**: 蓝色系 `#0078D4` (Windows标准蓝)
- **背景色**: 浅色 `#FFFFFF` / 深色 `#202020`
- **强调色**: 绿色成功 `#107C10` / 红色错误 `#E81123`
- **中性色**: 灰色系 `#605E5C` 到 `#3B3A39`

### 🖼️ 视觉效果
- **亚克力效果**: 半透明背景 `rgba(255, 255, 255, 0.7)`
- **圆角设计**: 4px-8px圆角
- **阴影效果**: 轻微阴影 `box-shadow: 0 2px 4px rgba(0,0,0,0.1)`
- **边框**: 细边框 `1px solid rgba(0,0,0,0.1)`

### ⚡ 交互设计
- **悬停效果**: 背景色变化 `rgba(0,0,0,0.05)`
- **点击反馈**: 轻微缩放 `transform: scale(0.98)`
- **过渡动画**: 200ms平滑过渡
- **焦点状态**: 蓝色边框高亮

### 📐 布局原则
- **网格系统**: 4px基础网格
- **间距规范**: 8px/16px/24px标准间距
- **字体大小**: 12px/14px/16px标准字号
- **对齐方式**: 左对齐为主，居中为辅

### 🎯 适用场景
适用于Windows桌面应用、企业级工具、生产力软件、系统工具等需要体现专业性和易用性的应用。
```

#### 契合度评分：9/10

##### ✅ 优势
1. **专业性强**：符合Windows系统设计规范
2. **易于使用**：用户熟悉Windows界面风格
3. **性能优秀**：简洁设计，无复杂动画
4. **维护简单**：代码结构清晰，易于维护
5. **可读性好**：清晰的视觉层次和文字可读性
6. **扩展性强**：易于添加新功能和模块

##### 💡 实施建议
1. **参考资源**：Microsoft Fluent Design System官方文档
2. **组件库**：可参考Fluent UI组件库
3. **测试验证**：在Windows系统上进行充分测试
4. **用户反馈**：收集用户使用反馈，持续优化


### 重构重点
1. **代码质量**：拆分压缩代码，提高可维护性
2. **功能完善**：实现所有API对接和错误处理
3. **用户体验**：采用WinUI设计，提升易用性
4. **性能优化**：避免复杂动画，保证流畅性
5. **测试验证**：充分测试确保功能正常

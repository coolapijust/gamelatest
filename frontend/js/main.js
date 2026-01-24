/**
 * Main Entry Point for Vite Build
 * 
 * 此文件作为 Vite 构建的入口点
 * 将所有模块导入并挂载到全局作用域以保持向后兼容性
 */

// Import CSS
import '../css/variables.css';
import '../css/components.css';
import '../css/navigation.css';
import '../css/forms.css';
import '../css/animations.css';
import '../css/pages.css';

// Import core modules
import './utils.js';
import './api.js';
import './router.js';
import './navigation.js';
import './state.js';
import './ui.js';

// Import page modules
import './pages/home.js';
import './pages/install/repo.js';
import './pages/install/installer.js';
import './pages/install/progress.js';
import './pages/install/ui.js';
import './pages/install/index.js';
import './pages/install.js';
import './pages/files.js';
import './pages/settings.js';
import './pages/help.js';

// Import main app initializer
import './app.js';

console.log('[Vite] 所有模块已加载');

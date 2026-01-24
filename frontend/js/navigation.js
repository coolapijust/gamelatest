window.Navigation = {
  menuItems: [
    { id: 'home', label: '首页', icon: '🏠', route: 'home' },
    { id: 'install', label: '游戏入库', icon: '🎮', route: 'install' },
    { id: 'files', label: '文件管理', icon: '📁', route: 'files' },
    { id: 'settings', label: '设置', icon: '⚙️', route: 'settings' },
    { id: 'help', label: '帮助', icon: '❓', route: 'help' }
  ],

  activeItem: null,

  render() {
    Logger.debug('Navigation', '渲染导航栏');
    const navbar = document.getElementById('navbar');
    if (!navbar) {
      Logger.warn('Navigation', '导航栏容器不存在');
      return;
    }

    const navHTML = this.buildNavigationHTML();
    navbar.innerHTML = navHTML;
    this.attachEventListeners();
    Logger.info('Navigation', '导航栏渲染完成');
  },

  buildNavigationHTML() {
    let html = `
      <div class="nav-left pywebview-drag-region">
        <a href="#home" class="nav-brand" onclick="event.preventDefault();Router.navigate('home')">
          <div class="nav-logo">🎮</div>
          <div class="nav-brand-text">
            <span class="nav-brand-title">Game Latest</span>
            <span class="nav-brand-subtitle">Steam游戏入库工具</span>
          </div>
        </a>
        <div class="nav-divider"></div>
      </div>

      <div class="nav-center pywebview-drag-region">
    `;

    this.menuItems.forEach(item => {
      html += this.buildMenuItemHTML(item);
    });

    html += `
      </div>

      <div class="nav-right">
        <div id="api-status" class="api-status">
          API已连接
        </div>
        <button id="theme-toggle" class="theme-toggle" onclick="Navigation.handleThemeToggle()" aria-label="切换主题" title="切换主题">
          ${State.theme === 'dark' ? '🌙' : '☀️'}
        </button>
        <div class="window-controls">
           <button class="win-btn minimize" onclick="Navigation.minimize()" title="最小化">─</button>
           <button class="win-btn maximize" onclick="Navigation.toggleMaximize()" title="最大化">◻</button>
           <button class="win-btn close" onclick="Navigation.close()" title="关闭">✕</button>
        </div>
      </div>
    `;
    return html;
  },

  buildMenuItemHTML(item) {
    const isActive = this.activeItem === item.id;

    return `
      <div class="nav-item ${isActive ? 'active' : ''}" 
           data-route="${item.route}" 
           data-id="${item.id}"
           aria-current="${isActive ? 'page' : 'false'}">
        <div class="nav-item-content">
          <span class="nav-icon">${item.icon}</span>
          <span class="nav-label">${item.label}</span>
        </div>
      </div>
    `;
  },

  attachEventListeners() {
    Logger.debug('Navigation', '绑定事件监听器');

    $$('.nav-item').forEach(item => {
      item.onclick = (event) => {
        event.stopPropagation();
        this.handleItemClick(item);
      };
    });
  },

  handleItemClick(item) {
    const route = item.dataset.route;
    const id = item.dataset.id;

    Logger.info('Navigation', '菜单项点击', { id, route });

    if (route) {
      this.setActiveItem(id);
      Router.navigate(route);
    }
  },

  setActiveItem(itemId) {
    Logger.debug('Navigation', '设置激活项', { itemId });

    this.activeItem = itemId;

    $$('.nav-item').forEach(item => {
      const isActive = item.dataset.id === itemId;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  },

  updateApiStatus(connected) {
    const statusEl = document.getElementById('api-status');
    if (statusEl) {
      if (connected) {
        statusEl.innerHTML = 'API已连接';
        statusEl.classList.remove('error');
      } else {
        statusEl.innerHTML = 'API未连接';
        statusEl.classList.add('error');
      }
    }
  },

  init() {
    Logger.info('Navigation', '初始化导航系统');
    this.render();
    this.setActiveItem('home');
  },

  minimize() {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.minimize().catch(err => console.error(err));
    }
  },

  toggleMaximize() {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.toggle_maximize().catch(err => console.error(err));
    }
  },

  close() {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.close().catch(err => console.error(err));
    }
  },

  handleThemeToggle() {
    const newTheme = State.toggleTheme();
    this.updateThemeIcon(newTheme);
  },

  updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.innerHTML = theme === 'dark' ? '🌙' : '☀️';
    }
  }
};

const HomePage = {
  container: null,
  statusData: null,

  init() {
    Logger.info('HomePage', '初始化首页组件');
    this.container = document.getElementById('home');
    if (!this.container) {
      Logger.warn('HomePage', '首页容器不存在');
      return;
    }
    this.render();
    this.loadStatus();
  },

  async loadStatus() {
    Logger.info('HomePage', '加载状态数据');
    try {
      const status = await API.Status.get();
      this.statusData = status;
      this.updateStatusDisplay(status);
      Logger.info('HomePage', '状态数据加载成功', status);
    } catch (error) {
      Logger.error('HomePage', '加载状态失败', error);
      UI.showToast('加载状态失败: ' + error.message, 'error');
    }
  },

  updateStatusDisplay(status) {
    Logger.debug('HomePage', '更新状态显示', status);
    
    const steamPath = this.container.querySelector('#steam-path');
    const unlockerType = this.container.querySelector('#unlocker-type');
    const installedCount = this.container.querySelector('#installed-count');

    if (steamPath) {
      steamPath.textContent = status.steam_path || '未检测到';
    }
    
    if (unlockerType) {
      const unlockerNames = {
        'steamtools': 'SteamTools',
        'greenluma': 'GreenLuma'
      };
      unlockerType.textContent = unlockerNames[status.unlocker_type] || status.unlocker_type || '未检测';
    }
    
    if (installedCount) {
      installedCount.textContent = status.config?.files?.length || 0;
    }
  },

  render() {
    Logger.debug('HomePage', '渲染首页');
    this.container.innerHTML = `
      <div class="welcome-section">
        <h1>欢迎使用 Game Latest</h1>
        <p>Steam游戏入库工具</p>
      </div>

      <div class="status-grid">
        ${this.renderStatusCard('📁', 'Steam路径', 'steam-path', '检测中...')}
        ${this.renderStatusCard('🔓', '解锁工具', 'unlocker-type', '检测中...')}
        ${this.renderStatusCard('📦', '已入库游戏', 'installed-count', '0')}
      </div>

      <div class="quick-actions">
        ${this.renderActionButton('➕', '新的游戏入库', 'install')}
        ${this.renderActionButton('📂', '管理已入库文件', 'files')}
        ${this.renderActionButton('⚙️', '查看设置', 'settings')}
      </div>
    `;

    this.attachEventListeners();
  },

  renderStatusCard(icon, label, valueId, defaultValue) {
    return `
      <div class="status-card">
        <div class="status-icon">${icon}</div>
        <div>
          <span class="status-label">${label}</span>
          <span class="status-value" id="${valueId}">${defaultValue}</span>
        </div>
      </div>
    `;
  },

  renderActionButton(icon, label, route) {
    return `
      <button class="action-btn" data-route="${route}">
        <span>${icon}</span>
        <span>${label}</span>
      </button>
    `;
  },

  attachEventListeners() {
    Logger.debug('HomePage', '绑定事件监听器');
    
    this.container.querySelectorAll('.action-btn').forEach(btn => {
      btn.onclick = () => {
        const route = btn.dataset.route;
        Logger.info('HomePage', '快速操作点击', { route });
        Router.navigate(route);
      };
    });
  },

  refresh() {
    Logger.info('HomePage', '刷新首页');
    this.loadStatus();
  }
};

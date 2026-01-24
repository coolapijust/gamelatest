window.InstallUI = {
  container: null,

  render(container) {
    this.container = container;
    Logger.debug('InstallUI', '渲染入库页面');

    container.innerHTML = `
      <div class="search-section">
        <h2>输入 AppID</h2>
        <div class="search-box">
          <input type="text" id="game-input" class="input" placeholder="输入 AppID，例如: 730, 570, 440">
        </div>
      </div>

      <div class="results-section">
        <h2>选择清单库</h2>
        <div id="repo-list" class="repo-grid"></div>
      </div>

      <div id="progress-card-container" class="progress-card-container" style="display: none;">
        <div class="install-progress-card" id="install-progress-card">
          <div class="progress-header">
            <span class="status-icon">🔄</span>
            <span class="progress-step">正在入库...</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar">
              <div class="progress-fill" style="width: 0%"></div>
            </div>
            <span class="progress-percent"></span>
          </div>
          <div class="progress-info">
            <span class="progress-message"></span>
            <span class="progress-stats">
              <span class="progress-current">0</span> / <span class="progress-total">100</span>
            </span>
          </div>
          <div class="progress-actions">
            <button class="button cancel-btn" onclick="InstallProgress.requestCancel()">取消</button>
          </div>
        </div>
      </div>

      <div class="install-form">
        <h2>入库操作</h2>
        <div class="form-group">
          <div class="checkbox-group">
            <label class="checkbox-item">
              <input type="checkbox" id="option-dlc" checked>
              <span>入库全部 DLC</span>
            </label>
            <label class="checkbox-item">
              <input type="checkbox" id="option-workshop" checked>
              <span>修补创意工坊密钥</span>
            </label>
          </div>
        </div>
        <div class="form-actions">
          <button class="button primary" onclick="InstallPage.installGame()">🚀 开始入库</button>
        </div>
      </div>
    `;

    this.attachEvents();
  },

  showProgressCard() {
    const cardContainer = this.container?.querySelector('#progress-card-container');
    if (cardContainer) {
      cardContainer.style.display = 'block';
      InstallProgress.showCard();
    }
  },

  hideProgressCard() {
    const cardContainer = this.container?.querySelector('#progress-card-container');
    if (cardContainer) {
      cardContainer.style.display = 'none';
      InstallProgress.hideCard();
    }
  },

  isProgressCardVisible() {
    const cardContainer = this.container?.querySelector('#progress-card-container');
    return cardContainer && cardContainer.style.display !== 'none';
  },

  attachEvents() {
    Logger.debug('InstallUI', '绑定事件监听器');

    const gameInput = this.container.querySelector('#game-input');
    if (gameInput) {
      gameInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
          const repoType = this.getSelectedRepoType();
          if (repoType === 'auto_search') {
            InstallPage.installGame();
          }
        }
      };
    }
  },

  getInputValue() {
    const input = this.container?.querySelector('#game-input');
    return input ? input.value.trim() : '';
  },

  getSelectedRepo() {
    const selected = this.container?.querySelector('.repo-item.selected');
    if (!selected) {
      return InstallRepo.getDefaultRepo();
    }

    const type = selected.dataset.type;
    const repoData = selected.dataset.repo_data;

    if (repoData) {
      try {
        return { type, ...JSON.parse(repoData) };
      } catch (e) {
        return { type, repo_data: repoData };
      }
    }

    return {
      type,
      repo: selected.dataset.repo || '',
      name: selected.dataset.name || ''
    };
  },

  getSelectedRepoType() {
    const selected = this.container?.querySelector('.repo-item.selected');
    return selected?.dataset.type || 'auto_search';
  },

  getInstallOptions() {
    return {
      addAllDlc: this.container?.querySelector('#option-dlc')?.checked ?? true,
      fixWorkshop: this.container?.querySelector('#option-workshop')?.checked ?? true
    };
  },

  getRepoContainer() {
    return this.container?.querySelector('#repo-list');
  },

  clearSearchResults() {
    const results = this.container?.querySelector('.game-results');
    if (results) {
      results.innerHTML = '';
    }
  },

  showToast(message, type = 'info') {
    UI.showToast(message, type);
  },

  showLoading() {
    State.setLoading(true);
  },

  hideLoading() {
    State.setLoading(false);
  },

  navigateToFiles() {
    setTimeout(() => {
      InstallProgress.stop();
      InstallUI.hideProgressCard();
      Router.navigate('files');
    }, 2000);
  }
};

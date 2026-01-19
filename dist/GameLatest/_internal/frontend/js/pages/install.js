const InstallPage = {
  container: null,
  selectedGame: null,
  selectedRepo: null,
  progressPolling: null,

  init() {
    Logger.info('InstallPage', '初始化游戏入库页面');
    this.container = document.getElementById('install');
    if (!this.container) {
      Logger.warn('InstallPage', '入库页面容器不存在');
      return;
    }
    this.render();
    this.loadRepos();
  },

  async loadRepos() {
    Logger.info('InstallPage', '加载仓库列表');
    try {
      const repos = await API.Status.getRepos();
      this.renderRepoList(repos);
      Logger.info('InstallPage', '仓库列表加载成功', repos);
    } catch (error) {
      Logger.error('InstallPage', '加载仓库失败', error);
      UI.showToast('加载仓库失败: ' + error.message, 'error');
    }
  },

  async searchGame() {
    const query = UI.getGameInputValue();
    Logger.info('InstallPage', '搜索游戏', { query });

    if (!query) {
      UI.showToast('请输入游戏名称或AppID', 'warning');
      return;
    }

    State.setLoading(true);
    UI.clearSearchResults();

    try {
      const result = await API.Games.search(query);
      Logger.info('InstallPage', '游戏搜索结果', { count: result.games?.length || 0 });
      this.renderSearchResults(result.games || []);
    } catch (error) {
      Logger.error('InstallPage', '游戏搜索失败', error);
      UI.showToast('搜索失败: ' + error.message, 'error');
    } finally {
      State.setLoading(false);
    }
  },

  async searchRepos() {
    const appid = UI.getGameInputValue();
    Logger.info('InstallPage', '搜索仓库', { appid });

    if (!appid) {
      UI.showToast('请先输入AppID', 'warning');
      return;
    }

    State.setLoading(true);
    UI.clearSearchResults();

    try {
      const result = await API.Games.searchRepos(appid);
      
      if (!result.results || !result.results.length) {
        Logger.warn('InstallPage', '未找到仓库', { appid });
        UI.showToast('未找到仓库', 'warning');
        return;
      }

      Logger.info('InstallPage', '仓库搜索结果', { count: result.results.length });
      this.renderRepoSearchResults(result.results);
      UI.showToast(`找到 ${result.results.length}个仓库`, 'success');
    } catch (error) {
      Logger.error('InstallPage', '仓库搜索失败', error);
      UI.showToast('搜索失败: ' + error.message, 'error');
    } finally {
      State.setLoading(false);
    }
  },

  async installGame() {
    const appid = UI.getGameInputValue();
    Logger.info('InstallPage', '开始入库', { appid });

    if (!appid) {
      UI.showToast('请先搜索并选择游戏', 'warning');
      return;
    }

    const selectedRepo = UI.getSelectedRepo();
    if (!selectedRepo.repo && !selectedRepo.zip) {
      UI.showToast('请选择清单库', 'warning');
      return;
    }

    const options = UI.getInstallOptions();
    Logger.info('InstallPage', '入库参数', { 
      appid, 
      repo: selectedRepo.repo,
      zip: selectedRepo.zip,
      options 
    });

    State.setLoading(true);
    this.showProgressModal();
    this.startProgressPolling();

    try {
      const result = await API.Install.game({
        appid: String(appid),
        repo: selectedRepo.repo ? String(selectedRepo.repo) : '',
        zip_url: selectedRepo.zip ? String(selectedRepo.zip) : '',
        add_all_dlc: Boolean(options.addAllDlc),
        fix_workshop: Boolean(options.fixWorkshop)
      });

      Logger.info('InstallPage', '入库成功', result);
      this.updateProgress({
        status: 'completed',
        step: '完成',
        message: result.message || '入库成功',
        current: 100,
        total: 100
      });
      UI.showToast(result.message || '入库成功', 'success');

      const files = await API.Status.getFiles();
      State.setFiles(files.files || []);
      
      setTimeout(() => {
        this.hideProgressModal();
        this.stopProgressPolling();
        Router.navigate('files');
      }, 2000);

    } catch (error) {
      Logger.error('InstallPage', '入库失败', error);
      this.updateProgress({
        status: 'error',
        step: '失败',
        message: error.detail || error.message
      });
      UI.showToast('入库失败: ' + (error.detail || error.message), 'error');
      setTimeout(() => {
        this.hideProgressModal();
        this.stopProgressPolling();
      }, 3000);
    }
  },

  startProgressPolling() {
    if (this.progressPolling) {
      clearInterval(this.progressPolling);
    }

    const checkProgress = async () => {
      try {
        const progress = await API.Install.getProgress();
        Logger.debug('InstallPage', '入库进度', progress);
        this.updateProgress(progress);
        
        if (progress.status === 'completed' || progress.status === 'error' || progress.status === 'idle') {
          this.stopProgressPolling();
        }
      } catch (error) {
        Logger.warn('InstallPage', '获取进度失败', error.message);
      }
    };

    checkProgress();
    this.progressPolling = setInterval(checkProgress, 500);
  },

  stopProgressPolling() {
    if (this.progressPolling) {
      clearInterval(this.progressPolling);
      this.progressPolling = null;
    }
  },

  showProgressModal() {
    let modal = document.getElementById('install-progress-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'install-progress-modal';
      modal.className = 'install-progress-modal';
      document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
      <div class="install-progress-content">
        <h3>正在入库...</h3>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <div class="progress-info">
          <span class="progress-step">准备中...</span>
          <span class="progress-message"></span>
        </div>
        <div class="progress-stats">
          <span class="progress-current">0</span> / <span class="progress-total">100</span>
        </div>
      </div>
    `;
    
    modal.style.display = 'flex';
  },

  updateProgress(progress) {
    const modal = document.getElementById('install-progress-modal');
    if (!modal) return;

    const fill = modal.querySelector('.progress-fill');
    const step = modal.querySelector('.progress-step');
    const message = modal.querySelector('.progress-message');
    const current = modal.querySelector('.progress-current');
    const total = modal.querySelector('.progress-total');
    
    if (progress.total > 0) {
      const percent = Math.round((progress.current / progress.total) * 100);
      fill.style.width = percent + '%';
      current.textContent = progress.current;
      total.textContent = progress.total;
    } else {
      fill.style.width = '0%';
    }
    
    const stepNames = {
      'search': '搜索仓库',
      'download': '下载文件',
      'extract': '解压文件',
      'process': '处理文件',
      'dlc': '添加 DLC',
      'workshop': '修复 Workshop'
    };
    
    step.textContent = stepNames[progress.step] || progress.step || '处理中';
    message.textContent = progress.message || '';
    
    if (progress.status === 'completed') {
      fill.style.background = 'var(--success-color, #10b981)';
      modal.querySelector('h3').textContent = '入库完成';
    } else if (progress.status === 'error') {
      fill.style.background = 'var(--error-color, #ef4444)';
      modal.querySelector('h3').textContent = '入库失败';
    }
  },

  hideProgressModal() {
    const modal = document.getElementById('install-progress-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  },

  render() {
    Logger.debug('InstallPage', '渲染入库页面');
    this.container.innerHTML = `
      <div class="search-section">
        <h2>搜索游戏</h2>
        <div class="search-box">
          <input type="text" id="game-input" class="input" placeholder="输入AppID或游戏名称，例如: 730, cs2">
          <button class="button primary" onclick="InstallPage.searchGame()">搜索</button>
        </div>
      </div>

      <div id="search-results" class="results-section">
        <h2>搜索结果</h2>
        <div class="game-results"></div>
      </div>

      <div class="results-section">
        <h2>选择清单库</h2>
        <div id="repo-list" class="repo-grid"></div>
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

    this.attachEventListeners();
  },

  renderSearchResults(games) {
    const container = this.container.querySelector('.game-results');
    if (!container) return;

    if (!games || !games.length) {
      container.innerHTML = '<div class="repo-item">未找到相关游戏</div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    games.forEach(game => {
      const div = document.createElement('div');
      div.className = 'repo-item game-card';
      div.dataset.appid = game.appid;
      div.dataset.name = game.schinese_name || game.name;
      div.innerHTML = `
        <div class="game-info">
          <div class="game-name">${Formatter.escapeHtml(game.schinese_name || game.name)}</div>
          <div class="game-meta">AppID: ${game.appid}</div>
        </div>
      `;
      div.onclick = () => {
        Logger.info('InstallPage', '选择游戏', { appid: game.appid });
        UI.setGameInputValue(game.appid);
        $$('.repo-item').forEach(item => item.classList.remove('selected'));
        div.classList.add('selected');
      };
      fragment.appendChild(div);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
  },

  renderRepoList(repos) {
    const container = this.container.querySelector('#repo-list');
    if (!container) return;

    const allRepos = [
      ...(repos.builtin || []).map(r => ({
        name: r.split('/')[1] || r,
        url: r,
        type: 'builtin'
      })),
      ...(repos.custom || []).map(r => ({
        name: `${r.name} (GitHub)`,
        url: r.repo,
        type: 'github'
      })),
      ...(repos.zip || []).map(r => ({
        name: `${r.name} (ZIP)`,
        url: r.url,
        zip: r.url,
        type: 'zip'
      }))
    ];

    const fragment = document.createDocumentFragment();
    allRepos.forEach((repo, index) => {
      const div = document.createElement('div');
      div.className = `repo-item${index === 0 ? ' selected' : ''}`;
      div.dataset.repo = repo.url || '';
      div.dataset.zip = repo.zip || '';
      div.dataset.type = repo.type;
      div.innerHTML = `
        <div class="repo-name">${Formatter.escapeHtml(repo.name)}</div>
        <div class="repo-url">${Formatter.escapeHtml(repo.url)}</div>
      `;
      div.onclick = () => {
        Logger.info('InstallPage', '选择仓库', { repo });
        $$('.repo-item').forEach(item => item.classList.remove('selected'));
        div.classList.add('selected');
      };
      fragment.appendChild(div);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
  },

  renderRepoSearchResults(results) {
    const container = this.container.querySelector('.game-results');
    if (!container) return;

    const fragment = document.createDocumentFragment();
    results.forEach(repo => {
      const div = document.createElement('div');
      div.className = 'repo-item game-card';
      div.dataset.repo = repo.repo;
      div.innerHTML = `
        <div class="game-info">
          <div class="game-name">${repo.repo.split('/')[1]}</div>
          <div class="game-meta">更新时间: ${repo.update_date?.substring(0,10) || '未知'}</div>
        </div>
      `;
      div.onclick = () => {
        Logger.info('InstallPage', '选择搜索仓库', { repo });
        $$('.repo-item').forEach(item => item.classList.remove('selected'));
        div.classList.add('selected');
      };
      fragment.appendChild(div);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
  },

  attachEventListeners() {
    Logger.debug('InstallPage', '绑定事件监听器');
    
    const gameInput = this.container.querySelector('#game-input');
    if (gameInput) {
      gameInput.onkeypress = (e) => {
        if (e.key === 'Enter') this.searchGame();
      };
    }
  },

  refresh() {
    Logger.info('InstallPage', '刷新入库页面');
    this.loadRepos();
  }
};

window.$ = (selector) => document.querySelector(selector);
window.$$ = (selector) => document.querySelectorAll(selector);

window.UI = {
  showToast(message, type = 'info') {
    Logger.info('UI', '显示提示', { message, type });
    const toast = $('#toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  },

  showLoading(show = true) {
    Logger.debug('UI', '设置加载状态', { show });
    const loading = $('#loading');
    if (loading) {
      loading.classList.toggle('show', show);
    }
  },

  switchTab(id) {
    Logger.debug('UI', '切换标签页', { id });
    $$('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === id);
    });
    $$('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === id);
    });
  },

  renderFileList(files) {
    Logger.debug('UI', '渲染文件列表', { count: files.length });
    const tbody = $('#file-list');
    if (!tbody) return;

    if (!files || !files.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center;color:var(--text-tertiary);padding:40px;">
            暂无已入库文件
          </td>
        </tr>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();
    files.forEach(file => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${Formatter.escapeHtml(file.filename)}</td>
        <td>${file.appid || '-'}</td>
        <td>${this.formatFileType(file.type)}</td>
        <td>
          <button class="delete-btn" data-filename="${file.filename}" data-type="${file.type}">
            删除
          </button>
        </td>
      `;
      fragment.appendChild(tr);
    });
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
  },

  renderRepoList(repos) {
    Logger.debug('UI', '渲染仓库列表', { count: repos?.builtin?.length || 0 });
    const container = $('#repo-list');
    if (!container) return;

    container.innerHTML = '';
    const fragment = document.createDocumentFragment();

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
      fragment.appendChild(div);
    });

    container.appendChild(fragment);
  },

  renderCustomRepos(repos) {
    Logger.debug('UI', '渲染自定义仓库', { count: repos?.length || 0 });
    const container = $('#custom-repos');
    if (!container) return;

    if (!repos || !repos.length) {
      container.innerHTML = '<p style="color:var(--text-tertiary);font-size:12px;">暂无自定义仓库</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    repos.forEach(repo => {
      const div = document.createElement('div');
      div.className = 'repo-list-item';
      div.innerHTML = `
        <div class="info">
          <span class="name">${Formatter.escapeHtml(repo.name)}</span>
          <span class="url">${Formatter.escapeHtml(repo.repo)}</span>
        </div>
        <button class="delete-btn" data-repo-name="${repo.name}">删除</button>
      `;
      fragment.appendChild(div);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
  },

  renderZipRepos(repos) {
    Logger.debug('UI', '渲染ZIP仓库', { count: repos?.length || 0 });
    const container = $('#zip-repos');
    if (!container) return;

    if (!repos || !repos.length) {
      container.innerHTML = '<p style="color:var(--text-tertiary);font-size:12px;">暂无ZIP仓库</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    repos.forEach(repo => {
      const div = document.createElement('div');
      div.className = 'repo-list-item';
      div.innerHTML = `
        <div class="info">
          <span class="name">${Formatter.escapeHtml(repo.name)}</span>
          <span class="url">${Formatter.escapeHtml(repo.url)}</span>
        </div>
        <button class="delete-btn" data-zip-name="${repo.name}">删除</button>
      `;
      fragment.appendChild(div);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
  },

  renderSearchResults(games) {
    Logger.debug('UI', '渲染搜索结果', { count: games?.length || 0 });
    const container = $('#search-results');
    if (!container) return;

    if (!games || !games.length) {
      container.innerHTML = '<div class="repo-item">未找到相关游戏</div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    games.forEach(game => {
      const div = document.createElement('div');
      div.className = 'repo-item';
      div.dataset.appid = game.appid;
      div.dataset.name = game.schinese_name || game.name;
      div.innerHTML = `
        <div class="repo-name">${Formatter.escapeHtml(game.schinese_name || game.name)}</div>
        <div class="repo-url">AppID: ${game.appid}</div>
      `;
      fragment.appendChild(div);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
  },

  updateStatus(status) {
    Logger.debug('UI', '更新状态信息', status);
    const steamPath = $('#steam-path');
    const unlockerType = $('#unlocker-type');
    const steamStatus = $('#steam-status');

    if (steamPath) steamPath.textContent = status.steam_path || '未检测到';
    if (unlockerType) unlockerType.textContent = status.unlocker_type || '未检测';
    if (steamStatus) {
      steamStatus.textContent = status.steam_path ? 'Steam已检测' : 'Steam未检测';
      steamStatus.className = `status-badge ${status.steam_path ? 'success' : 'error'}`;
    }
  },

  updateInstalledCount(count) {
    Logger.debug('UI', '更新已入库数量', { count });
    const element = $('#installed-count');
    if (element) element.textContent = count || 0;
  },

  fillSettings(config) {
    Logger.debug('UI', '填充设置', { keys: Object.keys(config) });
    const tokenInput = $('#github-token');
    const pathInput = $('#steam-path-input');

    if (tokenInput) tokenInput.value = config.Github_Personal_Token || '';
    if (pathInput) pathInput.value = config.Custom_Steam_Path || '';
  },

  formatFileType(type) {
    const types = {
      steamtools: 'SteamTools',
      greenluma: 'GreenLuma'
    };
    return types[type] || type;
  },

  getSelectedRepo() {
    const selected = $$('.repo-item.selected')[0];
    if (!selected) return null;
    return {
      repo: selected.dataset.repo || '',
      zip: selected.dataset.zip || '',
      type: selected.dataset.type || '',
      repo_data: selected.dataset.repo_data || ''
    };
  },

  getInstallOptions() {
    const dlcCheckbox = $('#option-dlc');
    const workshopCheckbox = $('#option-workshop');
    return {
      addAllDlc: dlcCheckbox?.checked ?? true,
      fixWorkshop: workshopCheckbox?.checked ?? true
    };
  },

  getGameInputValue() {
    const input = $('#game-input');
    return input ? input.value.trim() : '';
  },

  setGameInputValue(value) {
    const input = $('#game-input');
    if (input) input.value = value;
  },

  clearSearchResults() {
    Logger.debug('UI', '清除搜索结果');
    const container = $('#search-results');
    if (container) container.innerHTML = '';
  }
};

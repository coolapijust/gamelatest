const SettingsPage = {
  container: null,

  init() {
    Logger.info('SettingsPage', '初始化设置页面');
    this.container = document.getElementById('settings');
    if (!this.container) {
      Logger.warn('SettingsPage', '设置页面容器不存在');
      return;
    }
    this.render();
    this.loadSettings();
    this.loadRepos();
  },

  async loadSettings() {
    Logger.info('SettingsPage', '加载配置');
    try {
      const config = await API.Status.getConfig();
      this.fillSettings(config);
      Logger.info('SettingsPage', '配置加载成功', config);
    } catch (error) {
      Logger.error('SettingsPage', '加载配置失败', error);
      UI.showToast('加载配置失败: ' + error.message, 'error');
    }
  },

  async loadRepos() {
    Logger.info('SettingsPage', '加载仓库');
    try {
      const repos = await API.Status.getRepos();
      this.renderCustomRepos(repos.custom || []);
      this.renderZipRepos(repos.zip || []);
      Logger.info('SettingsPage', '仓库加载成功', repos);
    } catch (error) {
      Logger.error('SettingsPage', '加载仓库失败', error);
      UI.showToast('加载仓库失败: ' + error.message, 'error');
    }
  },

  async saveSettings() {
    Logger.info('SettingsPage', '保存设置');
    try {
      const token = this.container.querySelector('#github-token').value;
      const path = this.container.querySelector('#steam-path-input').value;

      await Promise.all([
        API.Config.saveGitHubToken(token),
        API.Config.saveSteamPath(path)
      ]);

      Logger.info('SettingsPage', '设置保存成功');
      UI.showToast('设置已保存', 'success');

      const status = await API.Status.get();
      UI.updateStatus(status);
    } catch (error) {
      Logger.error('SettingsPage', '保存设置失败', error);
      UI.showToast('保存失败: ' + error.message, 'error');
    }
  },

  async addRepo() {
    Logger.info('SettingsPage', '添加GitHub仓库');
    try {
      const name = this.container.querySelector('#repo-name').value.trim();
      const repo = this.container.querySelector('#repo-url').value.trim();

      if (!name || !repo) {
        UI.showToast('请填写仓库名称和URL', 'warning');
        return;
      }

      await API.Repos.addGitHub(name, repo);
      
      this.container.querySelector('#repo-name').value = '';
      this.container.querySelector('#repo-url').value = '';
      
      Logger.info('SettingsPage', '仓库添加成功');
      UI.showToast('仓库添加成功', 'success');

      await this.loadRepos();
    } catch (error) {
      Logger.error('SettingsPage', '添加仓库失败', error);
      UI.showToast('添加失败: ' + error.message, 'error');
    }
  },

  async removeRepo(name) {
    Logger.info('SettingsPage', '删除GitHub仓库', { name });

    if (!confirm(`确定要删除仓库"${name}"吗？`)) {
      Logger.info('SettingsPage', '用户取消删除仓库');
      return;
    }

    try {
      await API.Repos.remove(name);
      Logger.info('SettingsPage', '仓库删除成功');
      UI.showToast('仓库已删除', 'success');
      await this.loadRepos();
    } catch (error) {
      Logger.error('SettingsPage', '删除仓库失败', error);
      UI.showToast('删除失败: ' + error.message, 'error');
    }
  },

  async addZipRepo() {
    Logger.info('SettingsPage', '添加ZIP仓库');
    try {
      const name = this.container.querySelector('#zip-repo-name').value.trim();
      const url = this.container.querySelector('#zip-repo-url').value.trim();

      if (!name || !url) {
        UI.showToast('请填写名称和URL', 'warning');
        return;
      }

      await API.Repos.addZip(name, url);
      
      this.container.querySelector('#zip-repo-name').value = '';
      this.container.querySelector('#zip-repo-url').value = '';
      
      Logger.info('SettingsPage', 'ZIP仓库添加成功');
      UI.showToast('ZIP仓库添加成功', 'success');

      await this.loadRepos();
    } catch (error) {
      Logger.error('SettingsPage', '添加ZIP仓库失败', error);
      UI.showToast('添加失败: ' + error.message, 'error');
    }
  },

  async removeZipRepo(name) {
    Logger.info('SettingsPage', '删除ZIP仓库', { name });

    if (!confirm(`确定要删除ZIP仓库"${name}"吗？`)) {
      Logger.info('SettingsPage', '用户取消删除ZIP仓库');
      return;
    }

    try {
      await API.Repos.removeZip(name);
      Logger.info('SettingsPage', 'ZIP仓库删除成功');
      UI.showToast('ZIP仓库已删除', 'success');
      await this.loadRepos();
    } catch (error) {
      Logger.error('SettingsPage', '删除ZIP仓库失败', error);
      UI.showToast('删除失败: ' + error.message, 'error');
    }
  },

  render() {
    Logger.debug('SettingsPage', '渲染设置页面');
    this.container.innerHTML = `
      <div class="settings-section">
        <h2>基本设置</h2>
        <div class="form-group">
          <label>GitHub Personal Token</label>
          <input type="password" id="github-token" class="input" placeholder="输入您的GitHub Token">
          <p class="input-hint">无Token限60次/小时，有Token限5000次/小时</p>
        </div>
        <div class="form-group">
          <label>自定义Steam路径</label>
          <input type="text" id="steam-path-input" class="input" placeholder="留空则自动检测">
        </div>
        <div class="form-actions">
          <button class="button primary" onclick="SettingsPage.saveSettings()">保存设置</button>
        </div>
      </div>

      <div class="settings-section">
        <h2>GitHub清单库</h2>
        <div class="form-group">
          <div class="input-group" style="flex-wrap:wrap;">
            <input type="text" id="repo-name" class="input" placeholder="显示名称" style="flex:1;min-width:120px;">
            <input type="text" id="repo-url" class="input" placeholder="用户名/仓库名" style="flex:1;min-width:120px;">
            <button class="button" onclick="SettingsPage.addRepo()">添加</button>
          </div>
        </div>
        <div id="custom-repos"></div>
      </div>

      <div class="settings-section">
        <h2>ZIP清单库</h2>
        <div class="form-group">
          <div class="input-group" style="flex-wrap:wrap;">
            <input type="text" id="zip-repo-name" class="input" placeholder="显示名称" style="flex:1;min-width:120px;">
            <input type="text" id="zip-repo-url" class="input" placeholder="ZIP文件URL" style="flex:1;min-width:120px;">
            <button class="button" onclick="SettingsPage.addZipRepo()">添加</button>
          </div>
        </div>
        <div id="zip-repos"></div>
      </div>
    `;

    this.attachEventListeners();
  },

  fillSettings(config) {
    Logger.debug('SettingsPage', '填充设置', { keys: Object.keys(config) });
    const tokenInput = this.container.querySelector('#github-token');
    const pathInput = this.container.querySelector('#steam-path-input');

    if (tokenInput) tokenInput.value = config.Github_Personal_Token || '';
    if (pathInput) pathInput.value = config.Custom_Steam_Path || '';
  },

  renderCustomRepos(repos) {
    Logger.debug('SettingsPage', '渲染自定义仓库', { count: repos.length });
    const container = this.container.querySelector('#custom-repos');
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
        <button class="delete-btn" onclick="SettingsPage.removeRepo('${repo.name}')">删除</button>
      `;
      fragment.appendChild(div);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
  },

  renderZipRepos(repos) {
    Logger.debug('SettingsPage', '渲染ZIP仓库', { count: repos.length });
    const container = this.container.querySelector('#zip-repos');
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
        <button class="delete-btn" onclick="SettingsPage.removeZipRepo('${repo.name}')">删除</button>
      `;
      fragment.appendChild(div);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
  },

  attachEventListeners() {
    Logger.debug('SettingsPage', '绑定事件监听器');
  },

  refresh() {
    Logger.info('SettingsPage', '刷新设置页面');
    this.loadSettings();
    this.loadRepos();
  }
};

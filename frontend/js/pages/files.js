const FilesPage = {
  container: null,
  files: [],
  gameNames: {},
  progressPolling: null,

  init() {
    Logger.info('FilesPage', '初始化文件管理页面');
    this.container = document.getElementById('files');
    if (!this.container) {
      Logger.warn('FilesPage', '文件管理页面容器不存在');
      return;
    }
    this.render();
    this.loadFiles();
  },

  async loadFiles() {
    Logger.info('FilesPage', '加载文件列表');
    try {
      const [filesResult, gameNamesResult] = await Promise.all([
        API.Status.getFiles(),
        API.GameNames.getAll().catch(() => ({ game_names: {} }))
      ]);
      
      this.files = filesResult.files || [];
      const backendGameNames = gameNamesResult.game_names || {};
      
      Logger.info('FilesPage', '文件列表加载成功', { count: this.files.length });
      Logger.info('FilesPage', '后端游戏名缓存', { count: Object.keys(backendGameNames).length });
      
      for (const [appid, name] of Object.entries(backendGameNames)) {
        State.setGameName(appid, name);
        this.gameNames[appid] = name;
      }
      
      this.renderFileList(this.files);
      this.startProgressPolling();
    } catch (error) {
      Logger.error('FilesPage', '加载文件失败', error);
      UI.showToast('加载文件失败: ' + error.message, 'error');
    }
  },

  startProgressPolling() {
    if (this.progressPolling) {
      clearInterval(this.progressPolling);
    }
    
    const checkProgress = async () => {
      try {
        const progress = await API.GameNames.getProgress();
        Logger.debug('FilesPage', '进度', progress);
        
        if (progress.status === 'loading' && progress.total > 0) {
          this.showProgressBar(progress);
          this.updateGameNamesFromProgress(progress);
        } else if (progress.status === 'completed') {
          this.hideProgressBar();
          
          if (progress.total > 0) {
            const result = await API.GameNames.getAll();
            const gameNames = result.game_names || {};
            for (const [appid, name] of Object.entries(gameNames)) {
              if (!this.gameNames[appid]) {
                State.setGameName(appid, name);
                this.gameNames[appid] = name;
                this.updateGameNameDisplay(appid, name);
              }
            }
          }
          
          clearInterval(this.progressPolling);
          this.progressPolling = null;
          Logger.info('FilesPage', '进度轮询结束');
        }
      } catch (error) {
        Logger.warn('FilesPage', '获取进度失败', error.message);
      }
    };
    
    checkProgress();
    this.progressPolling = setInterval(checkProgress, 500);
  },

  updateGameNamesFromProgress(progress) {
    if (!progress.last_appid) return;
    
    const appid = progress.last_appid;
    if (this.gameNames[appid]) return;
    
    this.loadSingleGameName(appid);
  },

  async loadSingleGameName(appid) {
    try {
      const details = await API.Games.getDetails(appid);
      if (details && details.name) {
        this.gameNames[appid] = details.name;
        State.setGameName(appid, details.name);
        Logger.debug('FilesPage', '获取游戏名成功', { appid, name: details.name });
        this.updateGameNameDisplay(appid, details.name);
      }
    } catch (error) {
      Logger.warn('FilesPage', '获取游戏名失败', { appid, error: error.message });
    }
  },

  showProgressBar(progress) {
    const toolbar = this.container.querySelector('.toolbar');
    if (!toolbar) return;

    let progressEl = toolbar.querySelector('.loading-progress');
    if (!progressEl) {
      progressEl = document.createElement('div');
      progressEl.className = 'loading-progress';
      toolbar.appendChild(progressEl);
    }
    
    const percent = Math.round((progress.current / progress.total) * 100);
    
    progressEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;width:100%;">
        <span style="font-size:12px;color:var(--text-tertiary);white-space:nowrap;">
          加载游戏名 ${progress.current}/${progress.total}
        </span>
        <div style="flex:1;height:6px;background:var(--bg-secondary);border-radius:3px;overflow:hidden;">
          <div style="width:${percent}%;height:100%;background:var(--primary-color);transition:width 0.3s ease;"></div>
        </div>
        <span style="font-size:12px;color:var(--text-tertiary);white-space:nowrap;">${percent}%</span>
      </div>
    `;
  },

  hideProgressBar() {
    const progressEl = this.container.querySelector('.loading-progress');
    if (progressEl) {
      progressEl.remove();
    }
  },

  updateGameNameDisplay(appid, gameName) {
    const tbody = this.container.querySelector('#file-list');
    if (!tbody) return;

    const nameDiv = tbody.querySelector(`div[data-appid="${appid}"]`);
    if (nameDiv) {
      nameDiv.textContent = gameName;
      Logger.debug('FilesPage', '已更新游戏名称', { appid, gameName });
    }
  },

  async deleteFile(filename, type) {
    Logger.info('FilesPage', '删除文件', { filename, type });

    if (!confirm(`确定要删除"${filename}"吗？`)) {
      Logger.info('FilesPage', '用户取消删除文件');
      return;
    }

    try {
      await API.Files.delete(filename, type);
      Logger.info('FilesPage', '文件删除成功');
      UI.showToast('文件已删除', 'success');
      await this.loadFiles();
    } catch (error) {
      Logger.error('FilesPage', '删除文件失败', error);
      UI.showToast('删除失败: ' + error.message, 'error');
    }
  },

  async refreshFiles() {
    Logger.info('FilesPage', '刷新文件列表');
    State.setLoading(true);
    try {
      await this.loadFiles();
      UI.showToast('已刷新', 'success');
    } catch (error) {
      Logger.error('FilesPage', '刷新失败', error);
      UI.showToast('刷新失败: ' + error.message, 'error');
    } finally {
      State.setLoading(false);
    }
  },

  filterFiles(query) {
    Logger.debug('FilesPage', '过滤文件列表', { query });
    
    if (!query) {
      this.renderFileList(this.files);
      return;
    }

    const filtered = this.files.filter(file => {
      const cachedName = State.getGameName(file.appid);
      const gameName = this.gameNames[file.appid] || cachedName || '';
      return gameName.toLowerCase().includes(query.toLowerCase()) || 
             file.appid?.toLowerCase().includes(query.toLowerCase());
    });
    
    Logger.debug('FilesPage', '过滤结果', { 
      total: this.files.length, 
      filtered: filtered.length 
    });
    this.renderFileList(filtered);
  },

  render() {
    Logger.debug('FilesPage', '渲染文件管理页面');
    this.container.innerHTML = `
      <div class="toolbar">
        <input type="text" id="file-search" class="input" placeholder="搜索游戏...">
        <button class="button" onclick="FilesPage.refreshFiles()">🔄 刷新</button>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>游戏名称</th>
              <th>AppID</th>
              <th>类型</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="file-list"></tbody>
        </table>
      </div>
    `;

    this.attachEventListeners();
  },

  renderFileList(files) {
    const tbody = this.container.querySelector('#file-list');
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
      const cachedName = State.getGameName(file.appid);
      const gameName = this.gameNames[file.appid] || cachedName || `AppID: ${file.appid}`;
      tr.innerHTML = `
        <td>
          <div style="font-weight:600;color:var(--text-primary);" data-appid="${file.appid}">${Formatter.escapeHtml(gameName)}</div>
          <div style="font-size:12px;color:var(--text-tertiary);margin-top:4px;">${Formatter.escapeHtml(file.filename)}</div>
        </td>
        <td>${file.appid || '-'}</td>
        <td>${this.formatFileType(file.type)}</td>
        <td>
          <button class="delete-btn" 
                  data-filename="${file.filename}" 
                  data-type="${file.type}"
                  onclick="FilesPage.deleteFile('${file.filename}', '${file.type}')">
            删除
          </button>
        </td>
      `;
      fragment.appendChild(tr);
    });
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
  },

  formatFileType(type) {
    const types = {
      steamtools: 'SteamTools',
      greenluma: 'GreenLuma'
    };
    return types[type] || type;
  },

  attachEventListeners() {
    Logger.debug('FilesPage', '绑定事件监听器');
    
    const fileSearch = this.container.querySelector('#file-search');
    if (fileSearch) {
      fileSearch.oninput = Utils.debounce((e) => {
        this.filterFiles(e.target.value);
      }, 300);
    }
  },

  refresh() {
    Logger.info('FilesPage', '刷新文件管理页面');
    this.loadFiles();
  }
};

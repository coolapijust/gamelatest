const State = {
  currentTab: 'home',
  files: [],
  repos: {
    builtin: [],
    custom: [],
    zip: []
  },
  config: {
    Github_Personal_Token: '',
    Custom_Steam_Path: ''
  },
  selectedGame: null,
  selectedRepo: null,
  isLoading: false,
  theme: 'light',
  gameNamesCache: {},

  setTab(tab) {
    Logger.info('State', '切换标签页', { from: this.currentTab, to: tab });
    this.currentTab = tab;
    UI.switchTab(tab);
    this.saveState();
  },

  setFiles(files) {
    Logger.info('State', '更新文件列表', { count: files.length });
    this.files = files || [];
    UI.renderFileList(this.files);
    UI.updateInstalledCount(this.files.length);
    this.saveState();
  },

  setRepos(repos) {
    Logger.info('State', '更新仓库列表', { 
      builtin: repos.builtin?.length || 0,
      custom: repos.custom?.length || 0,
      zip: repos.zip?.length || 0
    });
    this.repos = repos || { builtin: [], custom: [], zip: [] };
    UI.renderRepoList(this.repos);
    UI.renderCustomRepos(this.repos.custom);
    UI.renderZipRepos(this.repos.zip);
    this.saveState();
  },

  setConfig(config) {
    Logger.info('State', '更新配置', { keys: Object.keys(config) });
    this.config = config || {};
    UI.fillSettings(this.config);
    this.saveState();
  },

  setSelectedGame(appid, name) {
    Logger.info('State', '选择游戏', { appid, name });
    this.selectedGame = { appid, name };
    this.saveState();
  },

  clearSelectedGame() {
    Logger.info('State', '清除游戏选择');
    this.selectedGame = null;
    this.saveState();
  },

  setSelectedRepo(repo, zip) {
    Logger.info('State', '选择仓库', { repo, zip });
    this.selectedRepo = { repo, zip };
    this.saveState();
  },

  clearSelectedRepo() {
    Logger.info('State', '清除仓库选择');
    this.selectedRepo = null;
    this.saveState();
  },

  setLoading(loading) {
    Logger.info('State', '设置加载状态', { loading });
    this.isLoading = loading;
    UI.showLoading(loading);
  },

  getTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  setTheme(theme) {
    Logger.info('State', '切换主题', { from: this.theme, to: theme });
    this.theme = theme;
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    this.saveState();
  },

  toggleTheme() {
    const newTheme = this.theme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
    return newTheme;
  },

  getGameName(appid) {
    return this.gameNamesCache[appid] || null;
  },

  setGameName(appid, name) {
    if (!appid || !name) {
      Logger.warn('State', '无效的游戏名称缓存', { appid, name });
      return;
    }
    Logger.debug('State', '缓存游戏名称', { appid, name });
    this.gameNamesCache[appid] = name;
    this.saveGameNamesCache();
  },

  saveGameNamesCache() {
    try {
      localStorage.setItem('gameNamesCache', JSON.stringify(this.gameNamesCache));
      Logger.debug('State', '游戏名称缓存已保存', { count: Object.keys(this.gameNamesCache).length });
    } catch (error) {
      Logger.error('State', '保存游戏名称缓存失败', error);
    }
  },

  loadGameNamesCache() {
    try {
      const saved = localStorage.getItem('gameNamesCache');
      if (saved) {
        this.gameNamesCache = JSON.parse(saved);
        Logger.info('State', '游戏名称缓存已加载', { count: Object.keys(this.gameNamesCache).length });
      }
    } catch (error) {
      Logger.error('State', '加载游戏名称缓存失败', error);
      this.gameNamesCache = {};
    }
  },

  clearGameNamesCache() {
    Logger.info('State', '清除游戏名称缓存');
    this.gameNamesCache = {};
    localStorage.removeItem('gameNamesCache');
  },

  saveState() {
    try {
      const stateToSave = {
        currentTab: this.currentTab,
        theme: this.theme,
        selectedGame: this.selectedGame,
        selectedRepo: this.selectedRepo
      };
      localStorage.setItem('appState', JSON.stringify(stateToSave));
      Logger.debug('State', '状态已保存', stateToSave);
    } catch (error) {
      Logger.error('State', '保存状态失败', error);
    }
  },

  loadState() {
    try {
      const saved = localStorage.getItem('appState');
      if (saved) {
        const state = JSON.parse(saved);
        Logger.info('State', '加载保存的状态', state);
        
        if (state.currentTab) this.currentTab = state.currentTab;
        if (state.theme) this.theme = state.theme;
        if (state.selectedGame) this.selectedGame = state.selectedGame;
        if (state.selectedRepo) this.selectedRepo = state.selectedRepo;
        
        this.loadGameNamesCache();
        return true;
      }
      return false;
    } catch (error) {
      Logger.error('State', '加载状态失败', error);
      return false;
    }
  },

  clearState() {
    Logger.info('State', '清除保存的状态');
    localStorage.removeItem('appState');
  },

  initTheme() {
    const theme = this.getTheme();
    this.setTheme(theme);
  },

  init() {
    Logger.info('State', '初始化状态管理');
    this.initTheme();
    this.loadState();
  }
};

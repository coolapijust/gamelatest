const InstallPage = {
  container: null,

  init() {
    Logger.info('InstallPage', '初始化游戏入库页面');
    this.container = document.getElementById('install');
    if (!this.container) {
      Logger.warn('InstallPage', '入库页面容器不存在');
      return;
    }
    InstallUI.render(this.container);
    this.loadRepos();
  },

  async loadRepos() {
    Logger.info('InstallPage', '加载仓库列表');
    try {
      const repos = await InstallRepo.load();
      const container = InstallUI.getRepoContainer();
      InstallRepo.renderList(container, repos);
      Logger.info('InstallPage', '仓库列表加载成功');
    } catch (error) {
      Logger.error('InstallPage', '加载仓库失败', error);
      UI.showToast('加载仓库失败: ' + error.message, 'error');
    }
  },

  async installGame() {
    await InstallIndex.installGame();
  },

  refresh() {
    Logger.info('InstallPage', '刷新入库页面');
    this.loadRepos();
  }
};

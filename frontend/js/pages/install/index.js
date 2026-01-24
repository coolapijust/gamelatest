window.InstallIndex = {
  async init() {
    Logger.info('InstallIndex', '初始化');
    await InstallPage.init();
  },

  async loadRepos() {
    return await InstallRepo.load();
  },

  async installGame() {
    const appid = UI.getGameInputValue();
    Logger.info('InstallIndex', '开始入库', { appid });

    if (!appid) {
      UI.showToast('请先输入AppID', 'warning');
      return;
    }

    const repoType = InstallUI.getSelectedRepoType();
    const repoInfo = InstallUI.getSelectedRepo();
    const options = InstallUI.getInstallOptions();

    Logger.info('InstallIndex', '入库参数', { appid, repoType, options });

    if (!repoType) {
      UI.showToast('请选择清单库', 'warning');
      return;
    }

    if (repoType === 'auto_search') {
      await this.autoSearchAndInstall(appid, options);
      return;
    }

    InstallUI.showLoading();
    InstallUI.showProgressCard();
    InstallProgress.start();

    try {
      await InstallInstaller.install(appid, repoType, repoInfo, options);
      UI.showToast('入库成功', 'success');
      // Stay on page
    } catch (error) {
      Logger.error('InstallIndex', '入库失败', error);
      UI.showToast('入库失败: ' + error.message, 'error');
    } finally {
      InstallUI.hideLoading();
    }
  },

  async autoSearchAndInstall(appid, options) {
    Logger.info('InstallIndex', '自动搜索并入库', { appid });

    InstallUI.showLoading();
    InstallUI.showProgressCard();
    InstallProgress.start();

    try {
      console.log('[InstallIndex] 开始自动搜索...');
      const results = await InstallInstaller.autoSearch(appid);
      console.log('[InstallIndex] 搜索结果:', results);

      if (!results || results.length === 0) {
        console.log('[InstallIndex] 无搜索结果');
        throw new Error('未找到任何仓库');
      }

      if (results.length === 1) {
        const only = results[0];
        console.log('[InstallIndex] 只有一个仓库，自动选择:', only);

        let repoData = {};
        if (only.type === 'zip') {
          repoData = { source: only.source, url: only.zip_url };
        } else {
          repoData = { repo: only.repo };
        }

        await this.executeInstall(appid, only.type, repoData, options);
      } else {
        InstallProgress.stop();
        InstallUI.hideProgressCard();
        InstallUI.hideLoading();

        InstallProgress.showRepoSelectModal(appid, results, async (selectedIndex) => {
          await this.executeWithSelection(appid, results, selectedIndex, options);
        });
      }
    } catch (error) {
      Logger.error('InstallIndex', '自动搜索失败', error);
      UI.showToast('搜索失败: ' + error.message, 'error');
      InstallProgress.stop();
      InstallUI.hideProgressCard();
      InstallUI.hideLoading();
    }
  },

  async executeWithSelection(appid, results, selectedIndex, options) {
    InstallUI.showLoading();
    InstallUI.showProgressCard();
    InstallProgress.start();

    try {
      await InstallInstaller.searchAndExecute(appid, results, selectedIndex, options);
      UI.showToast('入库成功', 'success');
      // Stay on page
    } catch (error) {
      Logger.error('InstallIndex', '执行入库失败', error);
      UI.showToast('入库失败: ' + error.message, 'error');
    } finally {
      InstallUI.hideLoading();
    }
  },

  async executeInstall(appid, repoType, repoData, options) {
    InstallUI.showLoading();
    InstallUI.showProgressCard();

    InstallProgress.start((progress) => {
      if (progress.status === 'completed') {
        UI.showToast('入库成功', 'success');
        // Stay on page and let progress card show details
      } else if (progress.status === 'error') {
        UI.showToast('下载失败: ' + progress.message, 'error');
        InstallProgress.stop();
        InstallUI.hideProgressCard();
      }
    });

    try {
      await InstallInstaller.install(appid, repoType, repoData, options);
    } catch (error) {
      Logger.error('InstallIndex', '执行入库失败', error);
      UI.showToast('入库失败: ' + error.message, 'error');
      InstallProgress.stop();
      InstallUI.hideProgressCard();
    } finally {
      InstallUI.hideLoading();
    }
  },

  refresh() {
    Logger.info('InstallIndex', '刷新');
    InstallProgress.reset();
    InstallPage.loadRepos();
  }
};

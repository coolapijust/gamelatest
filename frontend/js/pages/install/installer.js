window.InstallInstaller = {
  async install(appid, repoType, repoData, options) {
    Logger.info('InstallInstaller', '开始入库', { appid, repoType, repoData, options });

    if (!appid) {
      throw new Error('请先输入AppID');
    }

    if (!repoType || repoType === 'auto_search' || repoType === '') {
      Logger.warn('InstallInstaller', '无效的仓库类型', { repoType, repoData });
      throw new Error('请选择清单库');
    }

    Logger.info('InstallInstaller', '执行入库', { repoType, repoData });

    const params = {
      appid: String(appid),
      add_all_dlc: Boolean(options.addAllDlc),
      fix_workshop: Boolean(options.fixWorkshop)
    };

    switch (repoType) {
      case 'workshop':
        return await API.Install.workshop(String(appid));
      case 'zip':
        params.repo = `zip:${repoData.source || ''}`;
        params.zip_url = repoData.url || '';
        return await API.Install.game(params);
      case 'zip_printedwaste':
        return await API.Install.printedwaste(String(appid));
      case 'zip_cysaw':
        return await API.Install.cysaw(String(appid));
      case 'zip_furcate':
        return await API.Install.furcate(String(appid));
      case 'zip_assiw':
        return await API.Install.assiw(String(appid));
      case 'zip_steamdatabase':
        return await API.Install.steamdatabase(String(appid));
      case 'github':
      case undefined:
      case null:
        params.repo = repoData.repo || '';
        params.zip_url = '';
        return await API.Install.game(params);
      default:
        params.repo = repoData.repo || '';
        params.zip_url = repoData.zip || '';
        return await API.Install.game(params);
    }
  },

  async autoSearch(appid) {
    Logger.info('InstallInstaller', '自动搜索所有仓库', { appid });
    const result = await API.Games.searchAllRepos(appid);
    console.log('[InstallInstaller] 搜索API返回:', result);

    if (!result || !result.results) {
      console.log('[InstallInstaller] 无搜索结果或结果格式错误');
      throw new Error('未找到任何仓库');
    }

    if (!result.results.length) {
      console.log('[InstallInstaller] 搜索结果为空数组');
      throw new Error('未找到任何仓库');
    }

    Logger.info('InstallInstaller', '搜索完成', { count: result.results.length });
    return result.results;
  },

  async executeWithProgress(appid, repoType, repoData, options, onComplete) {
    const result = await this.install(appid, repoType, repoData, options);

    Logger.info('InstallInstaller', '入库成功', result);

    const files = await API.Status.getFiles();
    State.setFiles(files.files || []);

    if (onComplete) {
      onComplete(null, result);
    }

    return result;
  },

  async searchAndExecute(appid, results, selectedIndex, options, onComplete) {
    const selected = results[selectedIndex];
    Logger.info('InstallInstaller', '执行选中仓库入库', { selected, options });

    let repoData = {};
    if (selected.type === 'zip') {
      repoData = { source: selected.source, url: selected.zip_url };
    } else {
      repoData = { repo: selected.repo };
    }

    return await this.executeWithProgress(appid, selected.type, repoData, options, onComplete);
  }
};

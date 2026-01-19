async function init() {
  Logger.info('App', '初始化应用');
  
  try {
    State.init();
    Navigation.init();
    Router.init();
    
    HomePage.init();
    InstallPage.init();
    FilesPage.init();
    SettingsPage.init();
    HelpPage.init();
    
    Logger.info('App', '应用初始化完成');
    
    API.Games.preload().catch(() => {});
  } catch (error) {
    Logger.error('App', '应用初始化失败', error);
    UI.showToast('应用初始化失败: ' + error.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', init);

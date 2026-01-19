const Router = {
  routes: {
    home: { path: 'home', title: '首页', icon: '🏠' },
    install: { path: 'install', title: '游戏入库', icon: '🎮' },
    files: { path: 'files', title: '文件管理', icon: '📁' },
    settings: { path: 'settings', title: '设置', icon: '⚙️' },
    help: { path: 'help', title: '帮助', icon: '❓' }
  },

  currentRoute: 'home',

  navigate(routeKey) {
    Logger.info('Router', '导航到页面', { from: this.currentRoute, to: routeKey });
    
    if (!this.routes[routeKey]) {
      Logger.warn('Router', '无效的路由', { routeKey });
      return;
    }

    const fromRoute = this.currentRoute;
    this.currentRoute = routeKey;

    this.updateURL(routeKey);
    this.updateNavigation(routeKey);
    this.transitionPage(fromRoute, routeKey);
    
    State.setTab(routeKey);
  },

  updateURL(routeKey) {
    const route = this.routes[routeKey];
    const url = new URL(window.location.href);
    url.hash = route.path;
    window.history.pushState({ route: routeKey }, '', url);
    Logger.debug('Router', '更新URL', { hash: route.path });
  },

  updateNavigation(routeKey) {
    $$('.nav-item').forEach(item => {
      const isActive = item.dataset.route === routeKey;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
    Logger.debug('Router', '更新导航状态', { active: routeKey });
  },

  transitionPage(fromRoute, toRoute) {
    const fromPage = document.getElementById(fromRoute);
    const toPage = document.getElementById(toRoute);

    if (!toPage) {
      Logger.warn('Router', '目标页面不存在', { toRoute });
      return;
    }

    Logger.debug('Router', '页面过渡', { from: fromRoute, to: toRoute });

    if (fromPage && fromRoute !== toRoute) {
      fromPage.classList.add('page-exit');
      
      setTimeout(() => {
        fromPage.classList.remove('active', 'page-exit');
        toPage.classList.add('active', 'page-enter');
        
        setTimeout(() => {
          toPage.classList.remove('page-enter');
        }, 300);
      }, 200);
    } else {
      toPage.classList.add('active', 'page-enter');
      setTimeout(() => {
        toPage.classList.remove('page-enter');
      }, 300);
    }
  },

  handleBrowserNavigation(event) {
    const hash = window.location.hash.replace('#', '');
    const routeKey = Object.keys(this.routes).find(key => 
      this.routes[key].path === hash
    );

    if (routeKey && routeKey !== this.currentRoute) {
      Logger.info('Router', '浏览器导航', { hash, routeKey });
      this.navigate(routeKey);
    }
  },

  init() {
    Logger.info('Router', '初始化路由系统');
    
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.route) {
        this.navigate(event.state.route);
      }
    });

    window.addEventListener('hashchange', () => {
      this.handleBrowserNavigation();
    });

    const initialHash = window.location.hash.replace('#', '');
    if (initialHash) {
      this.handleBrowserNavigation();
    } else {
      this.navigate('home');
    }

    Logger.info('Router', '路由系统初始化完成', { 
      currentRoute: this.currentRoute,
      hash: initialHash 
    });
  }
};

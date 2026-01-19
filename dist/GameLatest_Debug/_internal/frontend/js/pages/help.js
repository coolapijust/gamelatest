const HelpPage = {
  container: null,
  qaData: null,

  init() {
    Logger.info('HelpPage', '初始化帮助页面');
    this.container = document.getElementById('help');
    if (!this.container) {
      Logger.warn('HelpPage', '帮助页面容器不存在');
      return;
    }
    this.render();
    this.loadQA();
  },

  async loadQA() {
    Logger.info('HelpPage', '加载帮助内容');
    try {
      const result = await API.Help.getQA();
      this.qaData = result;
      this.renderQA(result);
      Logger.info('HelpPage', '帮助内容加载成功', { count: Object.keys(result).length });
    } catch (error) {
      Logger.error('HelpPage', '加载帮助内容失败', error);
      UI.showToast('加载帮助失败: ' + error.message, 'error');
    }
  },

  render() {
    Logger.debug('HelpPage', '渲染帮助页面');
    this.container.innerHTML = `
      <div class="help-section">
        <h2>关于</h2>
        <div class="about-info">
          <p><strong>Game Latest v1.0.0</strong></p>
          <p>Steam游戏入库工具 - Windows桌面应用</p>
          <p>作者: <a href="https://github.com/coolapijust" target="_blank" style="color:var(--primary-color);text-decoration:none;">coolapijust</a> 🔗</p>
        </div>
      </div>

      <div class="help-section">
        <h2>功能说明</h2>
        <div class="help-item">
          <h4>🎮 游戏入库</h4>
          <p>支持通过AppID或游戏名称搜索游戏，选择清单库后一键入库游戏文件。</p>
        </div>
        <div class="help-item">
          <h4>📁 文件管理</h4>
          <p>查看和管理已入库的游戏文件，支持搜索和删除操作。</p>
        </div>
        <div class="help-item">
          <h4>⚙️ 设置</h4>
          <p>配置GitHub Token、Steam路径和自定义清单库。</p>
        </div>
        <div class="help-item">
          <h4>🔍 仓库搜索</h4>
          <p>支持搜索GitHub上的游戏清单库，自动匹配游戏AppID。</p>
        </div>
      </div>

      <div class="help-section">
        <h2>常见问题</h2>
        <div id="qa-content"></div>
      </div>
    `;
  },

  renderQA(qaData) {
    Logger.debug('HelpPage', '渲染常见问题', { count: Object.keys(qaData).length });
    const container = this.container.querySelector('#qa-content');
    if (!container) return;

    const qaMap = {
      'QA1': {
        question: '如何获取GitHub Personal Token？',
        answer: '在GitHub设置的最底部开发者选项中找到"Personal access tokens"，点击"Generate new token"创建新令牌。'
      },
      'QA2': {
        question: 'Force_Unlocker 是什么？',
        answer: '强制指定解锁工具类型，可填入 "steamtools" 或 "greenluma" 来覆盖自动检测结果。'
      },
      'QA3': {
        question: '如何添加自定义清单库？',
        answer: '在设置页面中可以添加GitHub仓库或ZIP文件URL作为自定义清单库。'
      }
    };

    const fragment = document.createDocumentFragment();
    Object.keys(qaData).forEach(key => {
      const qa = qaMap[key] || {
        question: key,
        answer: qaData[key]
      };
      
      const div = document.createElement('div');
      div.className = 'help-item';
      div.innerHTML = `
        <h4>${Formatter.escapeHtml(qa.question)}</h4>
        <p>${Formatter.escapeHtml(qa.answer)}</p>
      `;
      fragment.appendChild(div);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
  },

  refresh() {
    Logger.info('HelpPage', '刷新帮助页面');
    this.loadQA();
  }
};

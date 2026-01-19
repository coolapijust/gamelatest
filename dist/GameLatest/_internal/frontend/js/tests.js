const TestRunner = {
  tests: [],
  passed: 0,
  failed: 0,
  results: [],

  register(name, testFn) {
    this.tests.push({ name, testFn });
  },

  async run() {
    Logger.info('Test', '开始运行测试套件', { total: this.tests.length });
    console.log('='.repeat(60));
    console.log('🧪 开始运行测试');
    console.log('='.repeat(60));

    for (const test of this.tests) {
      try {
        Logger.info('Test', `运行测试: ${test.name}`);
        await test.testFn();
        this.passed++;
        this.results.push({ name: test.name, status: 'PASS' });
        console.log(`✅ ${test.name}`);
        Logger.info('Test', `测试通过: ${test.name}`);
      } catch (error) {
        this.failed++;
        this.results.push({ name: test.name, status: 'FAIL', error: error.message });
        console.log(`❌ ${test.name}`);
        console.log(`   错误: ${error.message}`);
        Logger.error('Test', `测试失败: ${test.name}`, error);
      }
    }

    console.log('='.repeat(60));
    console.log(`📊 测试结果: ${this.passed} 通过, ${this.failed} 失败`);
    console.log('='.repeat(60));
    
    Logger.info('Test', '测试套件完成', { 
      total: this.tests.length, 
      passed: this.passed, 
      failed: this.failed 
    });

    return { passed: this.passed, failed: this.failed, results: this.results };
  },

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || '断言失败');
    }
    Logger.debug('Test', '断言通过', { message });
  },

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `期望 ${expected}，实际得到 ${actual}`);
    }
    Logger.debug('Test', '断言相等', { actual, expected });
  },

  assertNotNull(value, message) {
    if (value === null || value === undefined) {
      throw new Error(message || '值不应为 null 或 undefined');
    }
    Logger.debug('Test', '断言非空', { value });
  },

  assertType(value, type, message) {
    if (typeof value !== type) {
      throw new Error(message || `期望类型 ${type}，实际得到 ${typeof value}`);
    }
    Logger.debug('Test', '断言类型', { value, type });
  }
};

const TestUtils = {
  async mockFetch(url, options) {
    Logger.debug('Test', 'Mock fetch 调用', { url, options });
    
    if (url.includes('/games/search/')) {
      return {
        ok: true,
        json: () => Promise.resolve({
          games: [
            { appid: 730, name: 'Counter-Strike 2', schinese_name: '反恐精英2' }
          ]
        })
      };
    }
    
    if (url.includes('/files')) {
      return {
        ok: true,
        json: () => Promise.resolve({
          files: [
            { filename: 'test.acf', appid: '730', type: 'steamtools' }
          ]
        })
      };
    }
    
    if (url.includes('/repos')) {
      return {
        ok: true,
        json: () => Promise.resolve({
          builtin: ['user/repo1', 'user/repo2'],
          custom: [],
          zip: []
        })
      };
    }
    
    return {
      ok: true,
      json: () => Promise.resolve({})
    };
  },

  async testAPIConnection() {
    Logger.info('Test', '测试API连接');
    try {
      const response = await API.Status.get();
      TestRunner.assertNotNull(response, 'API响应不应为空');
      TestRunner.assert(response !== null, 'API应返回响应');
      Logger.info('Test', 'API连接测试通过');
    } catch (error) {
      Logger.error('Test', 'API连接测试失败', error);
      throw error;
    }
  },

  async testGameSearch() {
    Logger.info('Test', '测试游戏搜索功能');
    try {
      const result = await API.Games.search('cs2');
      TestRunner.assertNotNull(result, '搜索结果不应为空');
      TestRunner.assert(Array.isArray(result.games), 'games应为数组');
      TestRunner.assert(result.games.length > 0, '应返回至少一个游戏');
      Logger.info('Test', '游戏搜索测试通过', { count: result.games.length });
    } catch (error) {
      Logger.error('Test', '游戏搜索测试失败', error);
      throw error;
    }
  },

  async testFileManagement() {
    Logger.info('Test', '测试文件管理功能');
    try {
      const files = await API.Status.getFiles();
      TestRunner.assertNotNull(files, '文件列表不应为空');
      TestRunner.assert(Array.isArray(files.files), 'files应为数组');
      Logger.info('Test', '文件管理测试通过', { count: files.files.length });
    } catch (error) {
      Logger.error('Test', '文件管理测试失败', error);
      throw error;
    }
  },

  async testRepoManagement() {
    Logger.info('Test', '测试仓库管理功能');
    try {
      const repos = await API.Status.getRepos();
      TestRunner.assertNotNull(repos, '仓库列表不应为空');
      TestRunner.assert(Array.isArray(repos.builtin), 'builtin应为数组');
      TestRunner.assert(Array.isArray(repos.custom), 'custom应为数组');
      TestRunner.assert(Array.isArray(repos.zip), 'zip应为数组');
      Logger.info('Test', '仓库管理测试通过', {
        builtin: repos.builtin.length,
        custom: repos.custom.length,
        zip: repos.zip.length
      });
    } catch (error) {
      Logger.error('Test', '仓库管理测试失败', error);
      throw error;
    }
  },

  async testStateManagement() {
    Logger.info('Test', '测试状态管理功能');
    try {
      State.setTab('files');
      TestRunner.assertEqual(State.currentTab, 'files', '标签页应设置为files');
      
      State.setTheme('dark');
      TestRunner.assertEqual(State.theme, 'dark', '主题应设置为dark');
      
      State.setSelectedGame(730, 'CS2');
      TestRunner.assertEqual(State.selectedGame.appid, 730, '游戏应被选中');
      
      Logger.info('Test', '状态管理测试通过');
    } catch (error) {
      Logger.error('Test', '状态管理测试失败', error);
      throw error;
    }
  },

  async testUIRendering() {
    Logger.info('Test', '测试UI渲染功能');
    try {
      const testFiles = [
        { filename: 'test1.acf', appid: '730', type: 'steamtools' },
        { filename: 'test2.acf', appid: '570', type: 'greenluma' }
      ];
      
      UI.renderFileList(testFiles);
      const tbody = document.getElementById('file-list');
      TestRunner.assertNotNull(tbody, '文件列表容器应存在');
      
      const rows = tbody.querySelectorAll('tr');
      TestRunner.assert(rows.length > 0, '应渲染至少一行');
      
      Logger.info('Test', 'UI渲染测试通过', { rows: rows.length });
    } catch (error) {
      Logger.error('Test', 'UI渲染测试失败', error);
      throw error;
    }
  },

  async testLogger() {
    Logger.info('Test', '测试日志功能');
    try {
      Logger.debug('Test', '调试日志测试', { data: 'test' });
      Logger.info('Test', '信息日志测试', { data: 'test' });
      Logger.warn('Test', '警告日志测试', { data: 'test' });
      Logger.error('Test', '错误日志测试', { data: 'test' });
      
      TestRunner.assert(true, '日志功能应正常工作');
      Logger.info('Test', '日志功能测试通过');
    } catch (error) {
      Logger.error('Test', '日志功能测试失败', error);
      throw error;
    }
  },

  async testValidator() {
    Logger.info('Test', '测试验证器功能');
    try {
      const result1 = Validator.validateAppId('730');
      TestRunner.assert(result1.valid, '有效的AppID应通过验证');
      
      const result2 = Validator.validateAppId('');
      TestRunner.assert(!result2.valid, '空的AppID应验证失败');
      
      const result3 = Validator.validateUrl('https://github.com/user/repo');
      TestRunner.assert(result3.valid, '有效的URL应通过验证');
      
      Logger.info('Test', '验证器测试通过');
    } catch (error) {
      Logger.error('Test', '验证器测试失败', error);
      throw error;
    }
  },

  async testFormatter() {
    Logger.info('Test', '测试格式化功能');
    try {
      const dateStr = Formatter.formatDate(new Date());
      TestRunner.assertNotNull(dateStr, '日期字符串不应为空');
      
      const sizeStr = Formatter.formatFileSize(1024);
      TestRunner.assertEqual(sizeStr, '1 KB', '文件大小应正确格式化');
      
      const truncated = Formatter.truncateText('This is a very long text', 10);
      TestRunner.assert(truncated.length <= 13, '文本应被截断');
      
      Logger.info('Test', '格式化功能测试通过');
    } catch (error) {
      Logger.error('Test', '格式化功能测试失败', error);
      throw error;
    }
  }
};

async function runTests() {
  Logger.setLevel(Logger.levels.DEBUG);
  
  TestRunner.register('API连接测试', TestUtils.testAPIConnection);
  TestRunner.register('游戏搜索测试', TestUtils.testGameSearch);
  TestRunner.register('文件管理测试', TestUtils.testFileManagement);
  TestRunner.register('仓库管理测试', TestUtils.testRepoManagement);
  TestRunner.register('状态管理测试', TestUtils.testStateManagement);
  TestRunner.register('UI渲染测试', TestUtils.testUIRendering);
  TestRunner.register('日志功能测试', TestUtils.testLogger);
  TestRunner.register('验证器测试', TestUtils.testValidator);
  TestRunner.register('格式化功能测试', TestUtils.testFormatter);
  
  return await TestRunner.run();
}

window.runTests = runTests;

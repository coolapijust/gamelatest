const API_BASE = 'http://127.0.0.1:8765/api';
const DEFAULT_TIMEOUT = 10000;

async function request(method, endpoint, data = null, timeout = DEFAULT_TIMEOUT) {
  const url = `${API_BASE}${endpoint}`;
  const startTime = Date.now();

  console.log(`[API] ${method} ${url}`, data);

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
    console.log(`[API] Request body:`, options.body);
  }

  const controller = new AbortController();
  let timeoutId = null;

  if (timeout && timeout > 0) {
    timeoutId = setTimeout(() => {
      console.log(`[API] 请求超时: ${timeout}ms`);
      controller.abort();
    }, timeout);
  }

  options.signal = controller.signal;

  try {
    const response = await fetch(url, options);
    if (timeoutId) clearTimeout(timeoutId);

    const duration = Date.now() - startTime;
    Logger.info('API', `请求完成: ${endpoint}`, {
      status: response.status,
      duration: `${duration}ms`
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const errorMsg = error.detail || `HTTP ${response.status}`;
      Logger.error('API', `请求失败: ${endpoint}`, {
        status: response.status,
        error: errorMsg
      });
      throw new Error(errorMsg);
    }

    const result = await response.json();
    Logger.info('API', `响应数据: ${endpoint}`, result);
    return result;

  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Logger.error('API', `请求超时: ${endpoint}`, { timeout });
      throw new Error(`请求超时（${timeout / 1000}秒），请重试`);
    }

    Logger.error('API', `网络错误: ${endpoint}`, {
      message: error.message,
      stack: error.stack
    });
    throw new Error('网络连接失败，请检查网络');
  }
}

window.API = {
  get: (endpoint) => request('GET', endpoint),
  post: (endpoint, data, timeout) => request('POST', endpoint, data, timeout),
  delete: (endpoint) => request('DELETE', endpoint)
};

API.Status = {
  get: () => API.get('/status'),
  getConfig: () => API.get('/config'),
  getFiles: () => API.get('/files'),
  getRepos: () => API.get('/repos'),
  getSteamPath: () => API.get('/steam/path'),
  getRateLimit: () => API.get('/github/rate-limit'),
  getNetworkStatus: () => API.get('/network/check')
};

API.Config = {
  update: (key, value) => API.post('/config', { key, value }),
  saveGitHubToken: (token) => API.Config.update('Github_Personal_Token', token),
  saveSteamPath: (path) => API.Config.update('Custom_Steam_Path', path)
};

API.Games = {
  search: (name) => API.get(`/games/search/${encodeURIComponent(name)}`),
  getDetails: (appid) => API.get(`/games/${appid}`),
  searchAllRepos: (appid) => API.get(`/repos/search-all/${appid}`),
  preload: () => API.post('/games/preload'),
  getManifest: (appid, repo) => API.get(`/manifest/${appid}?repo=${encodeURIComponent(repo)}`)
};

API.Install = {
  game: (data) => API.post('/install', data, 0),
  getProgress: () => API.get('/install/progress'),
  resetProgress: () => API.post('/install/reset-progress'),
  cancel: () => API.post('/install/cancel'),
  cancel: () => API.post('/install/cancel'),
  workshop: (workshopInput) => API.post('/install/workshop', { workshop_input: workshopInput }, 0)
};

API.Repos = {
  addGitHub: (name, repo) => API.post('/repos/add', { name, repo }),
  remove: (name) => API.delete(`/repos/${encodeURIComponent(name)}`)
};

API.Files = {
  delete: (filename, fileType) => {
    const params = new URLSearchParams({ filename, file_type: fileType });
    return API.delete(`/files/${encodeURIComponent(filename)}?${params.toString()}`);
  }
};

API.Help = {
  getQA: () => API.get('/help/qa')
};

API.GameNames = {
  getAll: () => API.get('/game-names'),
  getProgress: () => API.get('/game-names/progress')
};

window.InstallRepo = {
  allRepos: [
    { name: '🔍 自动搜索所有仓库', type: 'auto_search', description: '搜索所有 GitHub 仓库（推荐）' },
    { name: '🎮 创意工坊', type: 'workshop', description: '从 Steam 创意工坊下载' }
  ],

  async load() {
    Logger.info('InstallRepo', '加载仓库列表');
    try {
      const repos = await API.Status.getRepos();
      Logger.info('InstallRepo', '仓库列表加载成功', repos);
      return repos;
    } catch (error) {
      Logger.error('InstallRepo', '加载仓库失败', error);
      throw error;
    }
  },

  renderList(container, repos) {
    if (!container) return;

    const fragment = document.createDocumentFragment();
    this.allRepos.forEach((repo, index) => {
      const div = document.createElement('div');
      div.className = `repo-item${index === 0 ? ' selected' : ''}`;
      div.dataset.type = repo.type;
      div.dataset.name = repo.name;
      div.innerHTML = `
        <div class="repo-name">${Formatter.escapeHtml(repo.name)}</div>
        <div class="repo-desc">${Formatter.escapeHtml(repo.description)}</div>
      `;
      div.onclick = () => {
        Logger.info('InstallRepo', '选择仓库', { repo });
        $$('.repo-item').forEach(item => item.classList.remove('selected'));
        div.classList.add('selected');
      };
      fragment.appendChild(div);
    });

    const divider = document.createElement('div');
    divider.className = 'repo-divider';
    divider.innerHTML = '<span>GitHub 仓库</span>';
    fragment.appendChild(divider);

    (repos.builtin || []).forEach((r) => {
      const div = document.createElement('div');
      div.className = 'repo-item';
      div.dataset.repo = r;
      div.dataset.type = 'github';
      div.dataset.name = r.split('/')[1] || r;
      div.innerHTML = `
        <div class="repo-name">${Formatter.escapeHtml(r.split('/')[1] || r)}</div>
        <div class="repo-url">${Formatter.escapeHtml(r)}</div>
      `;
      div.onclick = () => {
        Logger.info('InstallRepo', '选择仓库', { repo: r });
        $$('.repo-item').forEach(item => item.classList.remove('selected'));
        div.classList.add('selected');
      };
      fragment.appendChild(div);
    });

    (repos.custom || []).forEach((r) => {
      const div = document.createElement('div');
      div.className = 'repo-item';
      div.dataset.repo = r.repo;
      div.dataset.type = 'github';
      div.dataset.name = r.name;
      div.innerHTML = `
        <div class="repo-name">${Formatter.escapeHtml(r.name)} (GitHub)</div>
        <div class="repo-url">${Formatter.escapeHtml(r.repo)}</div>
      `;
      div.onclick = () => {
        Logger.info('InstallRepo', '选择仓库', { repo: r });
        $$('.repo-item').forEach(item => item.classList.remove('selected'));
        div.classList.add('selected');
      };
      fragment.appendChild(div);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
  },

  renderSearchResults(container, results) {
    if (!container) return;

    if (!results || !results.length) {
      container.innerHTML = '<div class="repo-item">未找到任何仓库</div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    results.forEach(repo => {
      const div = document.createElement('div');
      div.className = 'repo-item game-card';

      let repoName, repoMeta, repoType, repoData;

      if (repo.type === 'zip') {
        // Zip repos removed
        return;
      } else {
        repoName = repo.repo.split('/')[1] || repo.repo;
        repoMeta = `更新时间: ${repo.update_date?.substring(0, 10) || '未知'}`;
        repoType = 'github';
        repoData = JSON.stringify({ repo: repo.repo });
      }

      div.dataset.type = repoType;
      div.dataset.repo_data = repoData;
      div.innerHTML = `
        <div class="game-info">
          <div class="game-name">${Formatter.escapeHtml(repoName)}</div>
          <div class="game-meta">${Formatter.escapeHtml(repoMeta)}</div>
        </div>
      `;
      div.onclick = () => {
        Logger.info('InstallRepo', '选择搜索仓库', { repo });
        $$('.repo-item').forEach(item => item.classList.remove('selected'));
        div.classList.add('selected');
      };
      fragment.appendChild(div);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
  },

  getDefaultRepo() {
    return this.allRepos[0];
  }
};

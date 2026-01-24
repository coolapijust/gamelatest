window.InstallProgress = {
  polling: null,
  container: null,
  cancelRequested: false,

  start(onUpdate) {
    this.stop();
    this.cancelRequested = false;

    const check = async () => {
      if (this.cancelRequested) {
        this.stop();
        return;
      }

      try {
        const progress = await API.Install.getProgress();
        console.log('[Progress] 获取进度:', progress.status, progress.step, progress.message);

        if (onUpdate) {
          onUpdate(progress);
        }

        this.updateCard(progress);

        console.log('[Progress] 检查状态:', progress.status, 'onUpdate:', !!onUpdate);

        if (progress.status === 'completed' || progress.status === 'error' || progress.status === 'idle') {
          console.log('[Progress] 状态为终态，停止轮询');
          this.stop();
          if (progress.status === 'completed') {
            console.log('[Progress] 显示成功消息:', progress.message);
            this.showSuccess(progress.message);
          } else if (progress.status === 'error') {
            this.showError(progress.message);
          }
        } else {
          console.log('[Progress] 继续轮询, 状态:', progress.status);
        }
      } catch (e) {
        Logger.warn('InstallProgress', '获取进度失败', e.message);
      }
    };

    check();
    this.polling = setInterval(check, 500);
  },

  stop() {
    if (this.polling) {
      clearInterval(this.polling);
      this.polling = null;
    }
  },

  requestCancel() {
    this.cancelRequested = true;
    Logger.info('InstallProgress', '用户请求取消');
    API.Install.cancel().catch(e => {
      Logger.warn('InstallProgress', '取消请求失败', e);
    });
    this.updateCard({ step: '取消中...', message: '正在取消操作...', status: 'running' });
  },

  showCard() {
    let card = document.getElementById('install-progress-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'install-progress-card';
      card.className = 'install-progress-card';
      document.body.appendChild(card);
    }
    card.style.display = 'block';
    this.container = card;
  },

  hideCard() {
    let card = document.getElementById('install-progress-card');
    if (card) {
      card.style.display = 'none';
    }
    this.container = null;
  },

  updateCard(progress) {
    let card = document.getElementById('install-progress-card');
    if (!card) {
      console.warn('[Progress] 卡片元素不存在');
      return;
    }

    const fill = card.querySelector('.progress-fill');
    const step = card.querySelector('.progress-step');
    const message = card.querySelector('.progress-message');
    const current = card.querySelector('.progress-current');
    const total = card.querySelector('.progress-total');
    const statusIcon = card.querySelector('.status-icon');

    console.log('[Progress] 更新卡片', progress);

    const stepNames = {
      'search': '🔍 搜索仓库',
      'download': '📥 下载文件',
      'extract': '📂 解压文件',
      'process': '⚙️ 处理文件',
      'dlc': '🎮 添加 DLC',
      'workshop': '🔧 修复 Workshop',
      'completed': '✅ 完成',
      'error': '❌ 失败',
      'running': '🔄 进行中',
      'cancel': '🚫 取消中'
    };

    if (progress.total > 0) {
      const percent = Math.round((progress.current / progress.total) * 100);
      fill.style.width = percent + '%';
      fill.className = 'progress-fill ' + (progress.status === 'error' ? 'error' : '');
      current.textContent = progress.current;
      total.textContent = progress.total;
      card.querySelector('.progress-percent').textContent = percent + '%';
    } else {
      fill.style.width = '0%';
      card.querySelector('.progress-percent').textContent = '';
    }

    step.innerHTML = stepNames[progress.step] || progress.step || '🔄 处理中';
    message.textContent = progress.message || '';

    const cancelBtn = card.querySelector('.cancel-btn');
    if (progress.status === 'completed' || progress.status === 'error') {
      cancelBtn.textContent = '关闭';
      cancelBtn.onclick = () => this.hideCard();

      if (progress.status === 'completed') {
        let viewBtn = card.querySelector('.view-files-btn');
        if (!viewBtn) {
          viewBtn = document.createElement('button');
          viewBtn.className = 'button view-files-btn';
          viewBtn.textContent = '查看已入库文件';
          viewBtn.style.marginLeft = '10px';
          viewBtn.onclick = () => {
            this.hideCard();
            Router.navigate('files');
          };
          cancelBtn.parentNode.insertBefore(viewBtn, cancelBtn);
        }
      }
    } else {
      cancelBtn.textContent = '取消';
      cancelBtn.onclick = () => this.requestCancel();
    }
  },

  showSuccess(message) {
    const card = document.getElementById('install-progress-card');
    if (!card) return;

    const statusIcon = card.querySelector('.status-icon');
    statusIcon.innerHTML = '✅';
    card.querySelector('.progress-step').textContent = '✅ 入库成功';
    card.querySelector('.progress-fill').classList.add('success');
  },

  showError(message) {
    const card = document.getElementById('install-progress-card');
    if (!card) return;

    const statusIcon = card.querySelector('.status-icon');
    statusIcon.innerHTML = '❌';
    card.querySelector('.progress-step').textContent = '❌ 入库失败';
    card.querySelector('.progress-fill').classList.add('error');
  },

  showRepoSelectModal(appid, results, onSelect) {
    let modal = document.getElementById('repo-select-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'repo-select-modal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }

    const html = `
      <div class="modal-content">
        <h3>选择仓库</h3>
        <p>找到 ${results.length} 个仓库，请选择:</p>
        <div class="repo-select-list">
          ${results.map((r, i) => `
            <div class="repo-select-item" data-index="${i}">
              <div class="repo-name">${r.type === 'zip' ? '📦 ' + r.source : r.repo?.split('/')[1] || r.repo}</div>
              <div class="repo-meta">${r.update_date ? r.update_date.substring(0, 10) : 'ZIP'}</div>
            </div>
          `).join('')}
        </div>
        <div class="modal-actions">
          <button class="button" onclick="document.getElementById('repo-select-modal').style.display='none'">取消</button>
        </div>
      </div>
    `;

    modal.innerHTML = html;
    modal.style.display = 'flex';

    const items = modal.querySelectorAll('.repo-select-item');
    items.forEach(item => {
      item.onclick = () => {
        const idx = parseInt(item.dataset.index);
        modal.style.display = 'none';
        onSelect(idx);
      };
    });
  },

  reset() {
    this.stop();
    this.cancelRequested = false;
    this.hideCard();
  }
};

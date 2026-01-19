const Logger = {
  levels: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  },

  currentLevel: 1,

  setLevel(level) {
    this.currentLevel = level;
  },

  formatTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
  },

  log(level, module, message, data = null) {
    if (level < this.currentLevel) return;

    const timestamp = this.formatTimestamp();
    const levelName = Object.keys(this.levels).find(key => this.levels[key] === level);
    const prefix = `[${timestamp}] [${levelName}] [${module}]`;

    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  },

  debug(module, message, data = null) {
    this.log(this.levels.DEBUG, module, message, data);
  },

  info(module, message, data = null) {
    this.log(this.levels.INFO, module, message, data);
  },

  warn(module, message, data = null) {
    this.log(this.levels.WARN, module, message, data);
  },

  error(module, message, error = null) {
    this.log(this.levels.ERROR, module, message, error);
  }
};

const Validator = {
  isNotEmpty(value) {
    return value !== null && value !== undefined && value !== '';
  },

  isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
  },

  isString(value) {
    return typeof value === 'string';
  },

  isArray(value) {
    return Array.isArray(value);
  },

  isObject(value) {
    return typeof value === 'object' && value !== null && !this.isArray(value);
  },

  validateAppId(appId) {
    if (!this.isNotEmpty(appId)) {
      return { valid: false, message: 'AppID不能为空' };
    }
    if (!this.isNumber(Number(appId))) {
      return { valid: false, message: 'AppID必须是数字' };
    }
    return { valid: true };
  },

  validateUrl(url) {
    if (!this.isNotEmpty(url)) {
      return { valid: false, message: 'URL不能为空' };
    }
    try {
      new URL(url);
      return { valid: true };
    } catch {
      return { valid: false, message: 'URL格式不正确' };
    }
  }
};

const Formatter = {
  formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('zh-CN');
  },

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  truncateText(text, maxLength = 50) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

const Utils = {
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  merge(target, source) {
    return { ...target, ...source };
  },

  generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
  }
};

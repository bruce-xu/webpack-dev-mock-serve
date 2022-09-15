const fs = require('fs');
const path = require('path');

const CONFIG_FILE = '.mockrc';
let config;
let rawRouters = {};
let wildcardRouters = {};

let mockPath;
let enableSwitch = false;

const debounce = (fn, timeout = 1000) => {
  let timer;

  return (...args) => {
    if (timer) {
      clearTimeout(timer);
    }
    
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, timeout);
  };
};

// Load module
const loadModule = modulePath => {
  const module = require.resolve(modulePath);

  // If the module has been loaded, delete it firstly
  if (module && require.cache[module]) {
    delete require.cache[module];
  }

  return require(modulePath);
};

// Get mock data
const getData = (req, res, file, extention) => {
  if (['js', 'ts'].indexOf(extention) > -1) {
    // Load js/ts file and execute the module
    return loadModule(file)(req, res);
  } else {
    // Load other file, must be json format
    return loadModule(file);
  }
};

// Get the parts of url. e.g., `/a//b/` returns ['a', 'b']
const getUrlParts = (url) => {
  return (url || '').split('/').filter(item => item !== '');
}

// Find out all mock files
const findMockFiles = (basePath) => {
  let mockFiles = [];
  let files = fs.readdirSync(basePath);

  files.forEach(file => {
    if (file === CONFIG_FILE) {
      return;
    }
    
    let filePath = path.join(basePath, file);
    let stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      mockFiles.push(...findMockFiles(filePath));
    } else if (stats.isFile()) {
      mockFiles.push(filePath);
    }
  });

  return mockFiles;
};

// Parse wildcard url
const parseWildcard = (urlParts) => {
  const names = {};
  const regexpArr = [];
  let index = 1;

  urlParts.forEach((part) => {
    // If this url parts contain the prefix `$`, then parse it as RegExp
    if (part[0] === '$') {
      const param = part.slice(1);

      if (param) {
        names[index] = param;
      } else {
        names[index] = `$${index}`;
      }

      index++;
      regexpArr.push(`([^\/]*)`);
    } else {
      regexpArr.push(part);
    }
  });

  return {
    regexp: new RegExp(`^\/${regexpArr.join('\/')}\/?$`),
    names
  };
};

// Parse all mock file by url parten
const parseMocks = (apiFiles) => {
  const urlStart = mockPath.length;

  apiFiles.forEach((file) => {
    const urlFile = file.slice(urlStart);
    const lastPointIndex = urlFile.lastIndexOf('.');
    const url = urlFile.slice(0, lastPointIndex);
    const extention = urlFile.slice(lastPointIndex + 1);
    const urlParts = getUrlParts(url);
    const len = urlParts.length;
    const hasWildcard = /\/\$/.test(url);

    if (hasWildcard) {
      const { regexp, names } = parseWildcard(urlParts);
      wildcardRouters[url] = {
        file,
        extention,
        url,
        len,
        regexp,
        names
      };
    } else {
      rawRouters[url] = {
        file,
        extention
      };
    }
  });
};

// Save the config file
const saveConfig = () => {
  const configFile = path.join(mockPath, CONFIG_FILE);
  const rules = {};
  let prevConfig;

  try {
    const content = fs.readFileSync(configFile, 'utf-8');
    prevConfig = JSON.parse(content);
  } catch (e) {
    prevConfig = { enable: true, rules: {} };
  }

  Object.keys(rawRouters).forEach(url => {
    rules[url] = true;
  });
  Object.keys(wildcardRouters).forEach(url => {
    rules[url] = true;
  });
  Object.assign(rules, prevConfig.rules);

  config = {
    enable: !!prevConfig.enable,
    rules
  };
  const content = JSON.stringify(config, null, 2);
  const prevContent = JSON.stringify(prevConfig, null, 2);

  if (content !== prevContent) {
    fs.writeFileSync(configFile, content, 'utf-8');
  }
};

// Check if use mock data
const checkEnable = (url) => {
  const { enable, rules } = config || {};

  return !enableSwitch || enable && rules[url];
};

// Handle router
const handleRouter = (app) => {
  app.use((req, res, next) => {
    let { path } = req;

    // Check raw url pattern
    if (rawRouters[path] && checkEnable(path)) {
      const { file, extention } = rawRouters[path];
      const data = getData(req, res, file, extention);
      return res.send(data);
    }

    // Check RegExt url pattern
    const urlLen = getUrlParts(path).length;
    for (let key in wildcardRouters) {
      const { len, regexp, names, file, extention, url: urlPattern } = wildcardRouters[key];

      if (urlLen !== len) {
        continue;
      }

      const match = regexp.exec(path);
      if (match && checkEnable(urlPattern)) {
        // Parse params
        const params = {};
        Object.keys(names).forEach((index) => {
          params[names[index]] = match[index];
        })
        Object.assign(req.params, params);
        const data = getData(req, res, file, extention);
        return res.send(data);
      }
    }

    // Not match any mock, through mock and apply proxy
    next();
  });
}

const reloadApp = () => {
  const mockFiles = findMockFiles(mockPath);

  rawRouters = {};
  wildcardRouters = {};

  parseMocks(mockFiles);

  if (enableSwitch) {
    saveConfig();
  }
};

/**
 * @param {Object} options
 * @param {Object} options.devServer Webpack devServer
 * @param {string} options.mockDir Mock files root dir
 * @param {boolean} options.watch Whether to listen the mock directory
 * @param {boolean} options.switch Whether can switch on/off mock API
 */
const mockServer = (options = {}) => {
  const {
    devServer,
    mockDir = 'mock',
    watch = true
  } = options;

  if (!devServer) {
    throw new Error('The `devServer` is needed');
  }

  const { app, staticWatchers } = devServer;
  const watcher = staticWatchers && staticWatchers[0];

  mockPath = path.isAbsolute(mockDir) ? mockDir : path.resolve(process.cwd(), mockDir);
  enableSwitch = !!options.switch;

  const _reloadApp = debounce(reloadApp);

  reloadApp();
  handleRouter(app);

  if (watch && watcher) {
    // Add watch listener for mock path
    watcher.add(mockPath);
    // Listen add file event
    watcher.on('add', _reloadApp);
    // Listen change file event
    watcher.on('change', _reloadApp);
    // Listen delete file event
    watcher.on('unlink', _reloadApp);
  }

  console.log('Mock: service started successfully ✔');
};

module.exports = mockServer;

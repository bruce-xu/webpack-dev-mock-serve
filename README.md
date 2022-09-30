# webpack-dev-mock-serve


English | [中文](./README-cn.md)

##  Features

- Automatically read the files under mock (the directory name can be configured), and generate the mapping relationship between mock API paths and files
- Support json (recommended for static data), js (recommended for dynamic data) file formats
- Supports dynamic addition, deletion, and modification of mock files at runtime after startup, without restarting the server
- The configuration file of the mock API will be automatically generated at startup. You can modify the `enable` field to enable/disable the mock globally, or enable/disable the mock API individually
- Supports the inclusion of variables in the path. It is agreed that the part of the path starting with `$` is a variable, and the variable name after `$` can be obtained through `req.params` in js file

## Install

```js
// npm
npm install webpack-dev-mock-serve -D
// yarn
yarn add webpack-dev-mock-serve -D
```

## Usage

```js
const mockServer = require('webpack-dev-mock-serve');

// webpack 5 configation
module.exports = {
  devServer: {
    setupMiddlewares(middlewares, devServer) {
      mockServer({
        devServer
      });
      
      return middlewares;
    }
  }
}
```

## Options

| Param                 | Type                       | Default             | Description                                                                                                                                                                                                                      |
| --------------------- | -------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| devServer                 | Object     |  | webpack-dev-server instance |
| mockDir                  | String                     | mock                | Mock files root path |
| watch               | Boolean                    | true               | Whether to listen the mock directory |
| switch          | Boolean                    | true               | Whether can switch on/off mock API |

## Demo

Directory structure

```
┌── webpack.config.js  
├── /mock/
│  ├── /book/
│  │  ├── list.json
│  │  ├── /detail/
│  │  │  └── $id.js
│  │  └── /$category/
│  │    └── $name.js

```

`webpack.config.js` configation
```js
const mockServer = require('webpack-dev-mock-serve');

// webpack 5 configation
module.exports = {
  devServer: {
    setupMiddlewares(middlewares, devServer) {
      mockServer({
        devServer
      });

      return middlewares;
    }
  }
}
```

`mock/book/list.json`
```json
[
  {
    "id": 1,
    "category": "story",
    "name": "红楼梦"
  },
  {
    "id": 2,
    "category": "story",
    "name": "西游记"
  }
]
```

`mock/book/$category/$name.js`
```js
module.exports = (req, res) => {
  const { params: { category, name } = {} } = req;

  if (category === 'story' && name === '红楼梦') {
    return {
      "id": 1,
      "category": "story",
      "name": "红楼梦"
    }
  } else {
    // ...
  }
}
```

If the options `switch` is `true`，then a configation file `.mockrc` will be generated under `mock`，you can edit the file to control switch on/off all or single mock API. The configuration file format is as follows:
```json
// mock/.mockrc
{
  "enable": true,
  "rules": {
    "/book/list": true,
    "/book/detail/$id": true,
    "/book/$category/$name": true
  }
}
```
# webpack-mock-server


[English](./README.md) | 中文

##  特性

- 自动读取 mock（目录名可配置）下的文件，生成 mock API 路径与文件的映射关系
- 支持 json（建议静态数据使用）、js（建议动态数据使用）文件格式
- 支持项目启动后的运行时动态增、删、改 mock 文件，无需重启服务器
- 启动时会自动生成 mock 接口的配置文件，可修改里面的`enable`字段全局开启/关闭 mock，也可单独开启/关闭某个接口的 mock
- 支持路径中包含变量，约定以`$`开头的路径部分为变量，`$`后为变量名，变量名可在 js 中通过 `req.params` 获取到

## 安装

```js
// npm
npm install webpack-dev-mock-serve -D
// yarn
yarn add webpack-dev-mock-serve -D
```

## 使用

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

## 配置

| Param                 | Type                       | Default             | Description                                                                                                                                                                                                                      |
| --------------------- | -------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| devServer                 | Object     |  | webpack-dev-server 实例 |
| mockDir                  | String                     | mock                | Mock 文件路径 |
| watch               | Boolean                    | true               | 是否监听 mock 文件变化，若为 true 则增、删、改 mock 文件后可实时生效，无需重启服务 |
| switch          | Boolean                    | true               | 是否可控制启用/禁用 mock 接口，若为 true 则在 mock 目录下生成配置文件 .mockrc，修改此文件可全局或单个控制 mock 接口的启用/禁用 |

## 示例

目录结构如下：

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

`webpack.config.js` 配置
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

若配置`switch`为`true`，则启动时自动在`mock`目录下生成配置文件`.mockrc`，可编辑此文件全局或单个控制 mock API 的启用/禁用。配置文件格式如下：
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
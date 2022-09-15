const mockServer = require('webpack-mock-server');

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
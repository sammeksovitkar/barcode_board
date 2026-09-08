const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/swecourtis',
    createProxyMiddleware({
      target: 'http://172.16.171.196',
      changeOrigin: true,
      secure: false,
    })
  );
};
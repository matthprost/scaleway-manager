const PROXY_CONFIG = {
  "/api/*": {
    "target": "https://api.scaleway.com",
    "changeOrigin": true,
    "secure": false,
    "pathRewrite": {
      "^/api": ""
    },
    "logLevel": "debug"
  },
  "/account/*": {
    "target": "https://account.scaleway.com",
    "changeOrigin": true,
    "secure": false,
    "pathRewrite": {
      "^/account": ""
    },
    "logLevel": "debug"
  },
  "/billing/*": {
    "target": "https://billing.scaleway.com",
    "changeOrigin": true,
    "secure": false,
    "pathRewrite": {
      "^/billing": ""
    },
    "logLevel": "debug"
  },
  "/s3par/*": {
    target: true,
    router: function (req) {
      var subhost = req.headers.subhost;
      var prefix = req.headers.path;
      var target = 'https://' + (subhost ? subhost + '.' : '') + 's3.fr-par.scw.cloud' + (prefix ? '/?prefix=' + prefix : '');
      console.log(target);
      return target;
    },
    changeOrigin: true,
    secure: false,
    "pathRewrite": {
      "^/s3par": ""
    },
    "logLevel": "debug"
  },
  "/s3ams/*": {
    target: true,
    router: function (req) {
      var subhost = req.headers.subhost;
      var prefix = req.headers.path;
      var target = 'https://' + (subhost ? subhost + '.' : '') + 's3.nl-ams.scw.cloud' + (prefix ? '/?prefix=' + prefix : '');
      console.log(target);
      return target;
    },
    changeOrigin: true,
    secure: false,
    "pathRewrite": {
      "^/s3ams": ""
    },
    "logLevel": "debug"
  }
};

module.exports = PROXY_CONFIG;

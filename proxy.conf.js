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
  "/s3/*": {
    target: true,
    router: function (req) {
      var subhost = req.headers.subhost;
      var path = req.headers.path;
      var zone = req.headers.zone;
      var target = `https://${subhost ? subhost + '.' : ''}s3.${zone}.scw.cloud${path ? path : ''}`;
      console.log(target);
      return target;
    },
    changeOrigin: true,
    secure: false,
    "pathRewrite": {
      "^/s3": ""
    },
    "logLevel": "debug"
  },
};

module.exports = PROXY_CONFIG;

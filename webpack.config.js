const webpack = require('webpack');

module.exports = {
  resolve: {
    fallback: {
      "url": require.resolve("url"),
      "querystring": require.resolve("querystring-es3"),
      "crypto": require.resolve("crypto-browserify"),
      "timers": require.resolve("timers-browserify"),
      "stream": require.resolve("stream-browserify"),
      "vm-browserify": require.resolve("vm-browserify"),
      "vm": require.resolve("vm-browserify"),
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    })
  ]
};

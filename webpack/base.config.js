const CopyPlugin = require("copy-webpack-plugin");
const nodeExternals = require('webpack-node-externals');
const path = require('path');

module.exports = {
  target: 'node',
  externals: [nodeExternals()],
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, '../dist'),
  },
  mode: 'development',
  optimization: {
    usedExports: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "img/", to: "./" },
        { from: "properties/", to: "./" }
      ]
    })
  ]
};

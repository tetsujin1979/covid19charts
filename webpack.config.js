const ZipPlugin = require("zip-webpack-plugin")
const path = require("path")

const config = {
  //what are the entry points to our functions
  entry: {
    handler: "./handler.js"
  },
  //how we want the output
  output: {
    filename: "[name]/index.js",
    path: path.resolve(__dirname, "dist/"),
    libraryTarget: "umd",
  },
  externals: {
    canvas: "commonjs canvas"
  },
  target: "node",
  mode: "production",
  optimization: { minimize: true}/*,
  module: {
    rules: [
      {
        test: /\.node$/,
        loader: "node-loader",
      }
    ]
  }*/
}
//finally zip the output directory, ready to deploy
const pluginConfig = {
  plugins: Object.keys(config.entry).map(entryName => {
    return new ZipPlugin({
      path: path.resolve(__dirname, "dist/"),
      filename: entryName,
      extension: "zip",
      include: [entryName],
    })
  }),
}

const webpackConfig = Object.assign(config, pluginConfig)
module.exports = webpackConfig
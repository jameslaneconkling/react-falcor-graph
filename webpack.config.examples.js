/* eslint-disable import/no-extraneous-dependencies */
/* global process __dirname */
const webpack             = require('webpack');
const path                = require('path');
const HtmlWebpackPlugin   = require('html-webpack-plugin');


const HOST = 'localhost';
const PORT = process.env.PORT || 3000;
const EXAMPLE_FILE = process.env.FILE;


module.exports = {
  entry: [
    `webpack-dev-server/client?http://${HOST}:${PORT}`,
    'webpack/hot/only-dev-server',
    `./example/${EXAMPLE_FILE}/index.jsx`
  ],

  output: {
    path: path.join(__dirname, `example/dist/${EXAMPLE_FILE}`),
    publicPath: '/',
    filename: 'index.js'
  },

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        include: path.join(__dirname, `example/${EXAMPLE_FILE}`),
        use: [
          'react-hot-loader',
          'babel-loader'
        ]
      }
    ]
  },

  plugins: [
    new HtmlWebpackPlugin({ template: `example/${EXAMPLE_FILE}/index.html`, inject: 'body' }),
    new webpack.HotModuleReplacementPlugin()
  ],

  devtool: 'eval-source-map',

  devServer: {
    historyApiFallback: true,
    hot: true,
    inline: true,
    stats: 'errors-only',
    host: HOST,
    port: PORT
  },

  resolve: {
    extensions: ['.js', '.jsx'],
    alias: {
      '@graphistry/falcor': path.resolve('./node_modules/@graphistry/falcor/dist/falcor.all.js')
    }
  }
};

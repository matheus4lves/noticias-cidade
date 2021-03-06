const currentTask = process.env.npm_lifecycle_event;
// shortcut for
// const CleanWebpackPlugin = require("clean-webpack-plugin").CleanWebpackPlugin;
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerWebpackPlugin = require("css-minimizer-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const fse = require("fs-extra");
const { loader } = require("mini-css-extract-plugin");
const postCssPlugins = [require("postcss-import"), require("postcss-mixins"), require("postcss-simple-vars"), require("postcss-nested"), require("autoprefixer")];

class RunAfterCompile {
  apply(compiler) {
    compiler.hooks.done.tap("Copy images", function () {
      fse.copySync("./app/assets/images", "./docs/assets/images");
    });
  }
}

let cssConfig = {
  test: /\.css$/i,
  use: [
    {
      loader: "css-loader",
      options: { url: false },
    },
    {
      loader: "postcss-loader",
      options: { postcssOptions: { plugins: postCssPlugins } },
    },
  ],
};

let pages = fse
  .readdirSync("./app")
  .filter(function (file) {
    return file.endsWith(".html");
  })
  .map(function (page) {
    return new HtmlWebpackPlugin({
      filename: page,
      template: `./app/${page}`,
    });
  });

// configuration that can be shared between dev and build
let config = {
  entry: "./app/assets/scripts/index.js",
  module: {
    rules: [cssConfig],
  },
  plugins: pages,
};

// dev configuration
if (currentTask == "dev") {
  cssConfig.use.unshift("style-loader");
  config.output = {
    filename: "bundle.js",
    path: path.resolve(__dirname, "app"),
  };
  config.devServer = {
    watchFiles: ["./app/**/*.html"],
    static: {
      directory: path.join(__dirname, "app"),
    },
    hot: true,
    port: 3000,
    host: "local-ip",
    open: {
      app: {
        name: "/opt/firefox-84.0b4/firefox/firefox",
        arguments: ["--private-window"],
      },
    },
  };
  config.mode = "development";
}

// build configuration
if (currentTask == "build") {
  cssConfig.use.unshift(MiniCssExtractPlugin.loader);
  config.module.rules.push({
    test: /\.js$/,
    exclude: /(node_modules)/,
    use: {
      loader: "babel-loader",
      options: {
        presets: ["@babel/preset-react", "@babel/preset-env"],
      },
    },
  });
  config.output = {
    filename: "[name].[chunkhash].js",
    chunkFilename: "[name].[chunkhash].js",
    path: path.resolve(__dirname, "docs"),
  };
  config.mode = "production";
  config.optimization = {
    splitChunks: { chunks: "all" },
    minimize: true,
    minimizer: [`...`, new CssMinimizerWebpackPlugin()],
  };
  config.plugins.push(new CleanWebpackPlugin(), new MiniCssExtractPlugin({ filename: "styles.[chunkhash].css" }), new RunAfterCompile());
}

module.exports = config;

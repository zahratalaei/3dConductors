// The path to the CesiumJS source code
const cesiumSource = "node_modules/cesium/Source";
const cesiumWorkers = "../Build/Cesium/Workers";

import path from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import HtmlWebpackHarddiskPlugin from "html-webpack-harddisk-plugin";
import CopywebpackPlugin from "copy-webpack-plugin";
import url from "url"; // Import the 'url' module
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";

// import { config as dotEnvConfig } from 'dotenv';
// dotEnvConfig();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  context: __dirname,
  mode: "development", // Use the environment variable we defined
  entry: {
    app: ["./src/index.mjs"],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),

    // Needed to compile multiline strings in Cesium
    sourcePrefix: "",
  },
  // Configure caching for incremental builds
  cache: {
    type: "filesystem", // Use filesystem cache
    buildDependencies: {
      config: [import.meta.url], // Rebuild when webpack.config.js changes
    },
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|gif|jpg|jpeg|svg|xml|json)$/,
        use: ["url-loader"],
      },
      {
        test: /\.(png|gif|jpg|jpeg|svg|xml|json)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192, // Images smaller than 8kb are inlined as data URLs.
              fallback: 'file-loader', // Images larger than 8kb are handled by file-loader.
              name: 'images/[name].[ext]', // Output path for images handled by file-loader.
            }
          }
        ]
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/index.html",
      alwaysWriteToDisk: false, // Add this line
      scripts: ["cesium/Cesium.js"],
    }),
    new HtmlWebpackHarddiskPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    // Copy Cesium Assets, Widgets, and Workers to a static directory
    new CopywebpackPlugin({
      patterns: [
        { from: path.join(cesiumSource, cesiumWorkers), to: "Workers" },
        { from: path.join(cesiumSource, "Assets"), to: "Assets" },
        { from: path.join(cesiumSource, "Widgets"), to: "Widgets" },
        { from: path.join(cesiumSource, "ThirdParty"), to: "ThirdParty" },
        {
          from: path.resolve(__dirname, "./public/assets/icons"), // Adjust if the path is different
          to: "assets/icons",
        },
      
        // {
        //   from: "../mercator-transforms-master",
        //   to: "mercator-transforms-master",
        // },
      ],
    }),
    new webpack.DefinePlugin({
      // Define relative base path in cesium for loading assets
      CESIUM_BASE_URL: JSON.stringify("/"),
    }),
    new NodePolyfillPlugin(),
  ],

  // development server options
  devServer: {
    static: path.join(__dirname, "dist"),
    // hot: true,  // Enable hot module replacement
  },
  resolve: {
    extensions: [".js", ".mjs", ".json",".png",".svg"],
    modules: ["node_modules"],
    alias: {
      // CesiumJS module name
      cesium: path.resolve(__dirname, cesiumSource),
    },
    fallback: {
      fs: false,
      url: url.pathToFileURL("./node_modules/url/url.js").href,
      zlib: false,
    },
  },
  amd: {
    // Enable webpack-friendly use of require in Cesium
    toUrlUndefined: true,
  },
  watchOptions: {
    ignored: /node_modules/, // Ignore everything in the node_modules directory
  },
};
export default config;

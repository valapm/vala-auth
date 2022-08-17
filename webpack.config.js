const webpack = require("webpack")
const path = require("path")

const VARIANT_BROWSER_PLUGIN = new webpack.DefinePlugin({ VARIANT: JSON.stringify("browser") })

// WebPack has native support for WebAssembly modules, however it's not ideal
// and in our case it's introducing more issues than it solves.
//
// When building your own config, please make sure important bits
// of this configuration are included there, otherwise you're likely to
// see the same errors.
//
// If don't include these hacks and it still compiles successfully,
// it means that you're using a more modern version of WebPack.
// I'd be happy if you let me know that it's no longer needed!
const browserMin = {
  mode: "production",
  entry: "./src/index.ts",
  target: "web",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "valaauth.min.js",
    library: "valaauth"
  },
  module: {
    // Makes WebPack think that we don't need to parse this module,
    // otherwise it tries to recompile it, but fails
    //
    // Error: Module not found: Error: Can't resolve 'env'
    // noParse: /\.wasm$/,
    rules: [
      {
        test: /\argon2.wasm$/,
        // Tells WebPack that this module should be included as
        // base64-encoded binary file and not as code
        loader: "base64-loader",
        type: "javascript/auto"
      },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js", ".wasm"],
    // We're using different node.js modules in our code,
    // this prevents WebPack from failing on them or embedding
    // polyfills for them into the bundle.
    //
    // Error: Module not found: Error: Can't resolve 'fs'
    fallback: {
      path: false,
      fs: false,
      Buffer: false,
      process: false
    }
  },
  experiments: {
    asyncWebAssembly: true
  },
  plugins: [VARIANT_BROWSER_PLUGIN] // Necessary for nimble
}

const browser = {
  mode: "production",
  entry: "./src/index.ts",
  devtool: "inline-source-map",
  target: "web",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "valaauth.js",
    library: "valaauth"
  },
  module: {
    rules: [
      {
        test: /\argon2.wasm$/,
        loader: "base64-loader",
        type: "javascript/auto"
      },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js", ".wasm"],
    fallback: {
      path: false,
      fs: false,
      Buffer: false,
      process: false
    }
  },
  experiments: {
    asyncWebAssembly: true
  },
  plugins: [VARIANT_BROWSER_PLUGIN] // Necessary for nimble
}

module.exports = [browser, browserMin]

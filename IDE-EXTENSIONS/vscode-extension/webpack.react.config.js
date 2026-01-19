const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/react/index.tsx',
  output: {
    filename: 'sidebar-react.js',
    path: path.resolve(__dirname, 'media'),
    libraryTarget: 'var',
    library: 'LanonasisReactUI'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@lib': path.resolve(__dirname, 'src/utils'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@bridges': path.resolve(__dirname, 'src/bridges')
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true
          }
        },
        // Exclude tests from the production React bundle to avoid type noise during packaging
        exclude: /(node_modules|__tests__)/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      },
      {
        test: /\.svg$/,
        use: ['@svgr/webpack']
      }
    ]
  },
  externals: {
    'vscode': 'commonjs vscode'
  },
  optimization: {
    minimize: true,
    usedExports: true,
    sideEffects: true,
    moduleIds: 'deterministic',
    // Avoid scope-hoisting issues that can trigger TDZ errors in webview bundles.
    concatenateModules: false
  }
};

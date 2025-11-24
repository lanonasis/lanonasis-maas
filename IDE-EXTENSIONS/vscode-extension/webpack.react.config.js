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
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@bridges': path.resolve(__dirname, 'src/bridges')
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
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
    minimize: true
  }
};

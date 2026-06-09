const path = require('path');

module.exports = {
  style: {
    postcss: {
      loaderOptions: {
        postcssOptions: {
          plugins: [
            require('tailwindcss')(path.resolve(__dirname, 'tailwind.config.js')),
            require('autoprefixer'),
          ],
        },
      },
    },
  },
  webpack: {
    configure: (webpackConfig, { env }) => {
      if (env === 'production') {
        webpackConfig.devtool = false;
      }
      return webpackConfig;
    },
  },
};
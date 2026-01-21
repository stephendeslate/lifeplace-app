module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@hooks': './src/hooks',
            '@apis': './src/apis',
            '@types': './src/types',
            '@utils': './src/utils',
            '@theme': './src/theme',
            '@contexts': './src/contexts',
            '@stores': './src/stores',
          },
        },
      ],
      'react-native-reanimated/plugin', // Must be last
    ],
  };
};

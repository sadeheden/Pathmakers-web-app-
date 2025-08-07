module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
  ["module:react-native-dotenv", {
    moduleName: "@env",
    path: "./App/travel/server/.env.local", // ✅ Match the file exactly
    allowUndefined: false
  }]
]
  };
};

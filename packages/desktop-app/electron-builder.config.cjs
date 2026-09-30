const appPackage = require("./package.json");
const signedWindowsRelease = process.env.AGENTRULEKIT_SIGNED_WINDOWS_RELEASE === "1";

module.exports = {
  ...appPackage.build,
  ...(signedWindowsRelease ? { forceCodeSigning: true } : {}),
  publish: [{
    provider: "generic",
    url: `https://github.com/yadan177/AgentRuleKit/releases/download/desktop-v${appPackage.version}/`,
  }],
};

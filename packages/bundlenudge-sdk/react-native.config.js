module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: "./android",
        packageImportPath: "import com.bundlenudge.BundleNudgePackage;",
        packageInstance: "new BundleNudgePackage()",
      },
      ios: {
        podspecPath: "./BundleNudge.podspec",
      },
    },
  },
};

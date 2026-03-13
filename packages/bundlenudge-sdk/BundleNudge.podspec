require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = "BundleNudge"
  s.version      = package['version']
  s.summary      = "BundleNudge OTA updates for React Native"
  s.description  = <<-DESC
                   BundleNudge enables over-the-air updates for React Native apps.
                   Push JavaScript updates directly to users without App Store review.
                   DESC
  s.homepage     = "https://bundlenudge.dev"
  s.license      = { :type => "BSL-1.1", :file => "../../LICENSE" }
  s.authors      = { "BundleNudge" => "hello@bundlenudge.dev" }
  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/bundlenudge/bundlenudge.git", :tag => "v#{s.version}" }
  s.source_files = "ios/*.{h,m,mm}"
  s.public_header_files = "ios/BundleNudge.h"
  s.requires_arc = true

  # Support for both old and new architecture
  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    "CLANG_ENABLE_MODULES" => "YES"
  }

  # React Native dependency - works with RN 0.72+
  # install_modules_dependencies handles both old arch (React-Core) and
  # new arch (React-Codegen, RCTTypeSafety, ReactCommon/turbomodule/core)
  install_modules_dependencies(s)
end

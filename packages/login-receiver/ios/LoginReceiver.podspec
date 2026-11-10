require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'LoginReceiver'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = 'LGPL-3.0-only'
  s.author         = 'Matthias Prost'
  s.homepage       = 'https://github.com/matthprost/scaleway-manager'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/matthprost/scaleway-manager.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.source_files = '**/*.swift'
end

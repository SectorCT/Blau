const fs = require('fs')
const path = require('path')
const rcedit = require('rcedit')

/**
 * electron-builder skips embedding win.icon when signAndEditExecutable is false.
 * Apply the same resource edit so blau.exe shows the app icon.
 *
 * Also removes the Linux-compiled native module from @serialport/bindings-cpp.
 * node-gyp-build checks build/Release/ before prebuilds/, so the Linux ELF binary
 * would be loaded on Windows and crash the app. Deleting it forces the correct
 * win32-x64 prebuild to be used instead.
 */
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return

  const { appOutDir, packager } = context

  // Remove Linux native binding so node-gyp-build falls through to win32-x64 prebuild.
  const linuxBinding = path.join(
    appOutDir,
    'resources/app.asar.unpacked/node_modules/@serialport/bindings-cpp/build/Release/bindings.node'
  )
  if (fs.existsSync(linuxBinding)) {
    fs.rmSync(linuxBinding)
  }

  const exeName = `${packager.appInfo.productFilename}.exe`
  const exePath = path.join(appOutDir, exeName)
  const iconPath = path.join(__dirname, '..', 'build', 'icon.ico')

  await rcedit(exePath, { icon: iconPath })
}

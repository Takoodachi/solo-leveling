// Builds the Android app (the owner's phone): a debug APK, installed by hand.
// Run: npm run android            (add -- --install to put it on a USB-connected phone)
//
// The app loads the live site (capacitor.config.ts), so web changes reach it on deploy and
// this only needs re-running after native changes: plugins, permissions, icons, capacitor.config.
// CAP_SERVER_URL=http://10.0.2.2:5174 npm run android  builds one that loads a dev server instead.
import { execFileSync, spawnSync } from 'child_process'
import { copyFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const win = process.platform === 'win32'
const env = { ...process.env }

// Capacitor 8 needs JDK 21; fall back to the one bundled with Android Studio
function javaMajor(javaHome) {
  const java = join(javaHome, 'bin', win ? 'java.exe' : 'java')
  if (!existsSync(java)) return 0
  // java -version prints to stderr
  const r = spawnSync(java, ['-version'], { encoding: 'utf8' })
  return Number(/version "(\d+)/.exec(`${r.stderr}${r.stdout}`)?.[1] ?? 0)
}
const studioJbr = win
  ? 'C:/Program Files/Android/Android Studio/jbr'
  : process.platform === 'darwin' ? '/Applications/Android Studio.app/Contents/jbr/Contents/Home' : join(homedir(), 'android-studio', 'jbr')
if ((env.JAVA_HOME ? javaMajor(env.JAVA_HOME) : 0) < 21 && existsSync(studioJbr)) env.JAVA_HOME = studioJbr

env.ANDROID_HOME ??= win
  ? join(env.LOCALAPPDATA ?? '', 'Android', 'Sdk')
  : join(homedir(), process.platform === 'darwin' ? 'Library/Android/sdk' : 'Android/Sdk')

const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, env, stdio: 'inherit', shell: win })

run('npm', ['run', 'build']) // Capacitor copies dist/ into the APK (a fallback; the live site is what loads)
run('npx', ['cap', 'sync', 'android'])
const androidDir = join(root, 'android')
run(join(androidDir, win ? 'gradlew.bat' : 'gradlew'), ['assembleDebug', '--console=plain'], androidDir)

const apk = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
const out = join(root, 'solo-leveling.apk')
copyFileSync(apk, out)
console.log(`\nBuilt ${out}${env.CAP_SERVER_URL ? ` (loads ${env.CAP_SERVER_URL})` : ''}`)

if (process.argv.includes('--install')) {
  run(join(env.ANDROID_HOME, 'platform-tools', win ? 'adb.exe' : 'adb'), ['install', '-r', out])
}

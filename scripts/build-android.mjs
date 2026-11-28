// Builds the Android app (the owner's phone): a debug APK.
// Run: npm run android            (add -- --install to put it on a USB-connected phone,
//                                   -- --watch=<ip:port> to put the watch app on a paired watch)
//      npm run android:release    builds it and publishes it as the GitHub release apk-<build>,
//                                 which every app from build 11 on installs by itself (AppUpdate.kt)
//
// The app loads the live site (capacitor.config.ts), so web changes reach it on deploy and
// this only needs re-running after native changes: plugins, permissions, icons, capacitor.config.
// CAP_SERVER_URL=http://10.0.2.2:5174 npm run android  builds one that loads a dev server instead.
import { execFileSync, spawnSync } from 'child_process'
import { copyFileSync, existsSync, readFileSync } from 'fs'
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

// --release: checked before the build, since a release can't be taken back once phones have it
const REPO = 'Takoodachi/solo-leveling'
const release = process.argv.includes('--release')
const apkSource = readFileSync(join(root, 'src', 'lib', 'apkBuild.ts'), 'utf8')
const build = Number(/build: (\d+)/.exec(apkSource)?.[1])
const news = /news: '((?:[^'\\]|\\.)*)'/.exec(apkSource)?.[1].replace(/\\(.)/g, '$1') ?? ''
// Without a shell, so the notes' spaces stay one argument
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const gh = (...args) => spawnSync('gh', [...args, '--repo', REPO], { cwd: root, encoding: 'utf8' })
const sha = release ? git('rev-parse', 'HEAD') : ''
if (release) {
  const stop = message => {
    console.error(`\n${message}`)
    process.exit(1)
  }
  if (env.CAP_SERVER_URL) stop('A release must load the live site: unset CAP_SERVER_URL.')
  if (git('status', '--porcelain')) stop('Commit everything first: the release is tagged at this commit.')
  if (gh('release', 'view', `apk-${build}`).status === 0) stop(`apk-${build} is out already: bump LATEST_APK.build in src/lib/apkBuild.ts.`)
  if (spawnSync('gh', ['api', `repos/${REPO}/commits/${sha}`, '--silent']).status !== 0) stop('Push this commit first (a branch will do): the release is tagged at it.')
}

run('npm', ['run', 'build']) // Capacitor copies dist/ into the APK (a fallback; the live site is what loads)
run('npx', ['cap', 'sync', 'android'])
const androidDir = join(root, 'android')
run(join(androidDir, win ? 'gradlew.bat' : 'gradlew'), ['assembleDebug', '--console=plain'], androidDir)

const apk = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
const out = join(root, 'solo-leveling.apk')
copyFileSync(apk, out)
console.log(`\nBuilt ${out}${env.CAP_SERVER_URL ? ` (loads ${env.CAP_SERVER_URL})` : ''}`)
// The watch app (android/wear), from the same build: it only talks to a phone app signed like it
const watchOut = join(root, 'solo-leveling-watch.apk')
copyFileSync(join(root, 'android', 'wear', 'build', 'outputs', 'apk', 'debug', 'wear-debug.apk'), watchOut)
console.log(`Built ${watchOut} (the Galaxy Watch app: README → Watch app)`)

// The watch app stays out: it's installed over Wireless debugging (README → Watch app)
if (release) {
  const made = gh('release', 'create', `apk-${build}`, out, '--target', sha, '--title', `Android app, build ${build}`, '--notes', news)
  if (made.status !== 0) {
    console.error(made.stderr)
    process.exit(1)
  }
  console.log(`Published ${made.stdout.trim()}: apps from build 11 on install it by themselves once the site's LATEST_APK says ${build}`)
}

const adb = join(env.ANDROID_HOME, 'platform-tools', win ? 'adb.exe' : 'adb')
if (process.argv.includes('--install')) run(adb, ['install', '-r', out])
// --watch=<ip:port>: the watch's Wireless debugging address, once it's paired with this computer
const watch = process.argv.find(a => a.startsWith('--watch='))?.slice('--watch='.length)
if (watch) {
  run(adb, ['connect', watch])
  // -g grants its notifications at install, so a workout shows up without opening the app first
  run(adb, ['-s', watch, 'install', '-r', '-g', watchOut])
}

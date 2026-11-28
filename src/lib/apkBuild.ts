/**
 * The newest Android app (the APK). Bump `build`, and set `date` and `news`, with every APK that
 * changes native code (a plugin method, a permission, MainActivity, icons). android/app/build.gradle
 * reads `build` from this line as the APK's versionCode, so the APK built after the bump reports it
 * (`SoloPlugin.appBuild`), and the site has anyone on an older one update (lib/appUpdate.ts,
 * UpdateAppDialog). An APK from before builds were reported counts as 0. Publish it with
 * `npm run android:release` before this reaches main, which deploys the site.
 */
export const LATEST_APK = { build: 11, date: '2026-11-28', news: 'the app installs its own updates from now on' } as const

/** Each APK's GitHub release (`npm run android:release`), where the app fetches it from (AppUpdate.kt has the same address). */
export const apkUrl = (build: number) => `https://github.com/Takoodachi/solo-leveling/releases/download/apk-${build}/solo-leveling.apk`

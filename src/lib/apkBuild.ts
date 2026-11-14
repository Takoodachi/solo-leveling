/**
 * The newest Android app (the APK). Bump `build`, and set `date` and `news`, with every APK that
 * changes native code (a plugin method, a permission, MainActivity, icons). android/app/build.gradle
 * reads `build` from this line as the APK's versionCode, so the APK built after the bump reports it
 * (`SoloPlugin.appBuild`), and the site asks anyone on an older one to install it (UpdateAppDialog).
 * An APK from before builds were reported counts as 0.
 */
export const LATEST_APK = { build: 7, date: '2026-11-13', news: 'home-screen widgets' } as const

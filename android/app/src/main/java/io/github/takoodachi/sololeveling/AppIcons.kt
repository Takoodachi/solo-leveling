package io.github.takoodachi.sololeveling

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build

/**
 * The app's icon in the theme's colours (src/features/settings/appIcon.ts). Each theme has a
 * launcher entry of its own, an activity-alias of MainActivity (scripts/generate-theme-icons.mjs),
 * and one is switched on at a time. The site asks for one; the switch waits until the app leaves
 * the screen, so the running app isn't disturbed. Launchers treat it as one entry gone and another
 * added, so many (Samsung's) drop the icon from the home screen and it's added again from the app
 * drawer: the owner's call (November 2026).
 */
object AppIcons {
    private const val PREFS = "app_icon"
    private const val PENDING = "pending"

    /** Remember the entry to switch to (its alias name, e.g. "IconAbyss") for the next [applyPending]. */
    fun request(context: Context, alias: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(PENDING, alias).apply()
    }

    /** Switch to the requested entry, if there is one and it isn't on already. */
    fun applyPending(context: Context) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val wanted = prefs.getString(PENDING, null) ?: return
        prefs.edit().remove(PENDING).apply()
        val pm = context.packageManager
        val pkg = context.packageName
        val target = "$pkg.$wanted"
        val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER).setPackage(pkg)
        val entries = pm.queryIntentActivities(launcher, PackageManager.MATCH_DISABLED_COMPONENTS).map { it.activityInfo.name }
        if (target !in entries || current(context) == target) return
        // The new one on before the others off, so there's never no way into the app
        pm.setComponentEnabledSetting(ComponentName(pkg, target), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
        for (name in entries) {
            if (name != target) pm.setComponentEnabledSetting(ComponentName(pkg, name), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
        }
        // Dynamic shortcuts belong to a launcher entry: put them on the new one
        runCatching { Shortcuts.republish(context) }
    }

    /**
     * The launch screen in the theme of the icon that's on (or about to be): its mark on its
     * background (styles in theme_icons.xml). Android 13+ keeps the choice for the next launches;
     * before 13, and on the very first launch, the manifest's (the default theme's) shows.
     */
    @SuppressLint("DiscouragedApi")
    fun syncSplash(activity: Activity) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val alias = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(PENDING, null)
            ?: current(activity)?.substringAfterLast('.') ?: return
        val style = activity.resources.getIdentifier(alias.replaceFirst("Icon", "Splash"), "style", activity.packageName)
        if (style != 0) activity.splashScreen.setSplashScreenTheme(style)
    }

    /** The launcher entry that's on now (its full class name), if any. */
    private fun current(context: Context): String? {
        val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER).setPackage(context.packageName)
        return context.packageManager.queryIntentActivities(launcher, 0).firstOrNull()?.activityInfo?.name
    }
}

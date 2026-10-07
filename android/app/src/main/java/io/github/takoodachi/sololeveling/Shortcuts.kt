package io.github.takoodachi.sololeveling

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat

/**
 * The long-press shortcuts on the app's icon. They're dynamic ones, so Settings → App icon can
 * change them: the site sends the chosen ones through [SoloPlugin.setShortcuts]
 * (src/features/settings/appShortcuts.ts). Each opens the app at a path, as a solo://open/<path>
 * intent that [SoloPlugin] hands on to the site.
 */
object Shortcuts {
    data class Item(val id: String, val label: String, val path: String, val icon: String)

    private const val PREFS = "shortcuts"
    private const val PUBLISHED = "published"
    /** Launchers show about four. */
    private const val MAX = 4

    /** What the icon offers until the site has had its say (a fresh install). */
    private val DEFAULTS = listOf(
        Item("workout", "Start workout", "/workouts?start=1", "workout"),
        Item("food", "Log food", "/nutrition?add=1", "food"),
        Item("weight", "Log weight", "/analytics/weight", "weight"),
    )

    /** The site names an icon; each one is a drawable (scripts/generate-shortcut-icons.mjs draws the newer ones). */
    private val ICONS = mapOf(
        "workout" to R.drawable.ic_shortcut_workout,
        "food" to R.drawable.ic_shortcut_food,
        "weight" to R.drawable.ic_shortcut_weight,
        "water" to R.drawable.ic_shortcut_water,
        "steps" to R.drawable.ic_shortcut_steps,
        "recap" to R.drawable.ic_shortcut_recap,
        "ranks" to R.drawable.ic_shortcut_ranks,
        "leaderboard" to R.drawable.ic_shortcut_leaderboard,
        "analytics" to R.drawable.ic_shortcut_analytics,
    )

    /** Replace the icon's shortcuts with [items], in that order. */
    fun publish(context: Context, items: List<Item>) {
        val shortcuts = items.filter { it.path.startsWith("/") }.take(MAX).mapIndexed { rank, item ->
            ShortcutInfoCompat.Builder(context, item.id)
                .setShortLabel(item.label)
                .setLongLabel(item.label)
                .setIcon(IconCompat.createWithResource(context, ICONS[item.icon] ?: R.mipmap.ic_launcher))
                .setIntent(Intent(Intent.ACTION_VIEW, Uri.parse("solo://open${item.path}"), context, MainActivity::class.java))
                .setRank(rank)
                .build()
        }
        ShortcutManagerCompat.setDynamicShortcuts(context, shortcuts)
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(PUBLISHED, true).apply()
    }

    /** The original three, once, so the icon isn't bare before the site first loads. */
    fun ensureDefaults(context: Context) {
        if (!context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(PUBLISHED, false)) publish(context, DEFAULTS)
    }
}

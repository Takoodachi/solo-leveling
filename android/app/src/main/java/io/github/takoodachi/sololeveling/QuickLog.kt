package io.github.takoodachi.sololeveling

import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject

/**
 * Creatine and water reminders with a button that logs without opening the app ("Tick it off",
 * "Add a glass"). The site plans them (src/features/reminders/deliver.ts) and hands them over
 * through [SoloPlugin.scheduleQuickLog]; they're kept here so a reboot doesn't lose them, set
 * as exact alarms, and posted by [QuickLogReceiver] when one goes off. The other reminders stay
 * with the local-notifications plugin, whose buttons can only open the app.
 *
 * The button can't write the log itself: the data lives in the site's IndexedDB. So it queues
 * [QuickLogWorker], which loads the site off-screen to do it, like the background step sync.
 */
object QuickLog {
    const val ACTION_SHOW = "io.github.takoodachi.sololeveling.QUICK_LOG_SHOW"
    const val ACTION_LOG = "io.github.takoodachi.sololeveling.QUICK_LOG"
    const val EXTRA_ID = "id"
    const val EXTRA_KIND = "kind"
    const val EXTRA_DATE = "date"

    private const val PREFS = "quick-log"
    private const val ITEMS = "items"
    /** Created by the site's notification plugin too (src/lib/localNotifications.ts): same id, same settings. */
    private const val CHANNEL = "reminders"
    private val ACCENT = 0xFFFF5F1A.toInt()
    private val IMMUTABLE = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

    data class Reminder(
        val id: Int,
        val kind: String,
        /** The day it's for, YYYY-MM-DD: the button logs to that day, whenever it's pressed. */
        val date: String,
        val at: Long,
        val title: String,
        val body: String,
        val url: String,
        val action: String,
    ) {
        fun toJson(): JSONObject = JSONObject()
            .put("id", id).put("kind", kind).put("date", date).put("at", at)
            .put("title", title).put("body", body).put("url", url).put("action", action)

        companion object {
            fun fromJson(o: JSONObject) = Reminder(
                o.getInt("id"), o.getString("kind"), o.getString("date"), o.getLong("at"),
                o.getString("title"), o.getString("body"), o.getString("url"), o.getString("action"),
            )
        }
    }

    /** Replace every quick-log reminder with [items]. */
    fun schedule(context: Context, items: List<Reminder>) {
        val alarms = context.getSystemService(AlarmManager::class.java)
        for (old in stored(context)) alarms.cancel(alarm(context, old.id))
        val json = JSONArray()
        items.forEach { json.put(it.toJson()) }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(ITEMS, json.toString()).apply()
        arm(context, items)
    }

    /** Alarms don't survive a reboot or an app update; set them again. */
    fun rearm(context: Context) = arm(context, stored(context))

    fun find(context: Context, id: Int): Reminder? = stored(context).firstOrNull { it.id == id }

    private fun stored(context: Context): List<Reminder> {
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(ITEMS, null) ?: return emptyList()
        return try {
            val array = JSONArray(raw)
            (0 until array.length()).map { Reminder.fromJson(array.getJSONObject(it)) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun arm(context: Context, items: List<Reminder>) {
        val alarms = context.getSystemService(AlarmManager::class.java)
        val now = System.currentTimeMillis()
        for (r in items) {
            if (r.at <= now) continue
            // USE_EXACT_ALARM (manifest) allows exact ones; fall back to inexact if the phone says no
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarms.canScheduleExactAlarms()) {
                alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, r.at, alarm(context, r.id))
            } else {
                alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, r.at, alarm(context, r.id))
            }
        }
    }

    private fun alarm(context: Context, id: Int): PendingIntent =
        PendingIntent.getBroadcast(
            context, id,
            Intent(context, QuickLogReceiver::class.java).setAction(ACTION_SHOW).putExtra(EXTRA_ID, id),
            IMMUTABLE,
        )

    /** Tapping the notification itself opens the app at [path] (the same link as an app shortcut). */
    private fun open(context: Context, id: Int, path: String): PendingIntent =
        PendingIntent.getActivity(
            context, id,
            Intent(context, MainActivity::class.java)
                .setAction(Intent.ACTION_VIEW)
                .setData(Uri.parse("solo://open$path"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            IMMUTABLE,
        )

    private fun ensureChannel(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL) == null) {
            manager.createNotificationChannel(NotificationChannel(CHANNEL, "Reminders", NotificationManager.IMPORTANCE_DEFAULT))
        }
    }

    private fun base(context: Context, id: Int, path: String): NotificationCompat.Builder {
        ensureChannel(context)
        return NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_ascent)
            .setColor(ACCENT)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setContentIntent(open(context, id, path))
            .setAutoCancel(true)
    }

    @SuppressLint("MissingPermission") // checked: areNotificationsEnabled covers POST_NOTIFICATIONS
    private fun show(context: Context, id: Int, builder: NotificationCompat.Builder) {
        val manager = NotificationManagerCompat.from(context)
        if (manager.areNotificationsEnabled()) manager.notify(id, builder.build())
    }

    /** The reminder itself, with its log button. */
    fun post(context: Context, r: Reminder) {
        val log = PendingIntent.getBroadcast(
            context, r.id,
            Intent(context, QuickLogReceiver::class.java)
                .setAction(ACTION_LOG)
                .putExtra(EXTRA_ID, r.id)
                .putExtra(EXTRA_KIND, r.kind)
                .putExtra(EXTRA_DATE, r.date),
            IMMUTABLE,
        )
        show(context, r.id, base(context, r.id, r.url).setContentTitle(r.title).setContentText(r.body).addAction(0, r.action, log))
    }

    /** The button was pressed: say so in place, without the button, while the site logs it. */
    fun working(context: Context, id: Int, text: String) {
        show(
            context, id,
            base(context, id, "/home").setContentTitle(text).setOngoing(true).setSilent(true).setProgress(0, 0, true),
        )
    }

    /** What happened, then gone after a few seconds when it worked. */
    fun finished(context: Context, id: Int, ok: Boolean, title: String, detail: String) {
        val builder = base(context, id, "/home").setContentTitle(title).setContentText(detail).setSilent(true)
        if (ok) builder.setTimeoutAfter(6_000)
        show(context, id, builder)
    }
}

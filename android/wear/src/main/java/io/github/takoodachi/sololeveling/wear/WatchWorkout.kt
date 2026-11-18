package io.github.takoodachi.sololeveling.wear

import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.os.Build
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.wear.ongoing.OngoingActivity
import androidx.wear.ongoing.Status
import com.google.android.gms.wearable.DataMap

/**
 * What the watch does with the phone's workout: while one runs, a card with what's next and the
 * workout's icon on the watch face (an ongoing activity, which opens [WatchActivity]); during a
 * rest, an alarm for its end that buzzes the wrist. The phone's own rest alert doesn't do it: with
 * the workout screen open the phone stays awake and buzzes itself, so nothing reaches the watch.
 */
object WatchWorkout {
    /** Where the phone keeps the workout (WatchLink.kt in the phone app). */
    const val PATH = "/workout"
    private const val CARD_ID = 1
    private const val REST_ID = 2
    /** New ids for both: a channel's buzz can't be changed once made, and the first ones never buzzed. */
    private const val CHANNEL_WORKOUT = "workout-buzz"
    private const val OLD_CHANNEL_WORKOUT = "workout"
    private const val CHANNEL_REST = "rest-buzz"
    private const val OLD_CHANNEL_REST = "rest"
    private const val PREFS = "watch"
    /** The end of the rest the alarm is set for. */
    private const val REST_END = "restEnd"
    /** This close to its end, the phone saying a rest is gone means it ran out, not that it was called off. */
    private const val NEAR_END_MS = 3_000L
    /** Two firm pulses: noticeable mid-stretch, unlike a notification's tap. */
    private val BUZZ = longArrayOf(0, 380, 160, 380)

    fun stateOf(map: DataMap): WatchState? {
        if (!map.getBoolean("active")) return null
        return WatchState(
            name = map.getString("name") ?: "",
            title = map.getString("title") ?: "",
            text = map.getString("text") ?: "",
            startedAt = map.getLong("startedAt"),
            restEndsAt = map.getLong("restEndsAt").takeIf { it > 0 },
            restStartedAt = map.getLong("restStartedAt").takeIf { it > 0 },
        )
    }

    /** Shows the workout (or takes it down, null) and sets the buzz for the end of its rest. */
    @SuppressLint("MissingPermission") // checked: areNotificationsEnabled covers POST_NOTIFICATIONS
    fun apply(context: Context, state: WatchState?) {
        val now = System.currentTimeMillis()
        val live = state?.takeUnless { it.stale(now) }
        restAlarm(context, live?.takeIf { it.resting(now) })
        val manager = NotificationManagerCompat.from(context)
        if (live == null) {
            manager.cancel(CARD_ID)
            manager.cancel(REST_ID)
            return
        }
        if (!manager.areNotificationsEnabled()) return
        channels(context)
        val open = openApp(context)
        val card = NotificationCompat.Builder(context, CHANNEL_WORKOUT)
            .setSmallIcon(R.drawable.ic_stat_ascent)
            .setColor(context.getColor(R.color.accent))
            .setContentTitle(live.title)
            .setContentText(live.text)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setOngoing(true)
            // One buzz when the workout starts; each set after it updates the card quietly
            .setOnlyAlertOnce(true)
            .setContentIntent(open)
        OngoingActivity.Builder(context, CARD_ID, card)
            .setStaticIcon(R.drawable.ic_stat_ascent)
            .setTouchIntent(open)
            .setStatus(Status.Builder().addTemplate(live.name.ifBlank { "Workout" }).build())
            .build()
            .apply(context)
        manager.notify(CARD_ID, card.build())
    }

    /**
     * The end of a rest: with the app on screen it buzzes the wrist itself; otherwise a card with
     * what's next does, through its channel, the way a watch lets an app buzz from the background.
     */
    @SuppressLint("MissingPermission") // checked: areNotificationsEnabled covers POST_NOTIFICATIONS
    fun restOver(context: Context, title: String?, text: String?) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(REST_END).apply()
        val manager = NotificationManagerCompat.from(context)
        if (WatchActivity.visible || !manager.areNotificationsEnabled()) {
            buzz(context)
            return
        }
        channels(context)
        manager.notify(
            REST_ID,
            NotificationCompat.Builder(context, CHANNEL_REST)
                .setSmallIcon(R.drawable.ic_stat_ascent)
                .setColor(context.getColor(R.color.accent))
                .setContentTitle("Rest over")
                .setContentText(listOfNotNull(title, text).filter { it.isNotBlank() }.joinToString(" · "))
                // An alarm's category, so Do not disturb lets it through as it does alarms
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                // The watch's notification service reads the card's own pattern, not only its channel's
                .setVibrate(BUZZ)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setTimeoutAfter(30_000)
                .setContentIntent(openApp(context))
                .build(),
        )
    }

    /**
     * An alarm at the end of this rest (exact, through the watch's sleep); for null, the rest is gone.
     * Two things kept it from ringing on the owner's watch: an alarm set again is pushed at least 5 s
     * out, and each change from the phone (or the app opening) set it again for the same end; and with
     * the workout open, the phone says "no rest" the moment it runs out, which arrived 90 ms after the
     * end and called that late alarm off. So the same end is left alone, and near its end "no rest"
     * leaves the alarm to ring; only a rest called off well before its end loses it.
     */
    private fun restAlarm(context: Context, resting: WatchState?) {
        val alarms = context.getSystemService(AlarmManager::class.java)
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val set = prefs.getLong(REST_END, 0L)
        val end = resting?.restEndsAt
        if (end == null) {
            if (set - System.currentTimeMillis() > NEAR_END_MS) restPending(context, PendingIntent.FLAG_NO_CREATE)?.let(alarms::cancel)
            prefs.edit().remove(REST_END).apply()
            return
        }
        // Still set for this end (a restart of the watch would have dropped the alarm and its intent)
        val stillSet = end == set && restPending(context, PendingIntent.FLAG_NO_CREATE) != null
        // Brings what's next up to date on the alarm already set (its time stays), or makes the one to set
        val pending = restPending(context, PendingIntent.FLAG_UPDATE_CURRENT, resting) ?: return
        if (stillSet) return
        if (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()) {
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, end, pending)
        } else {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, end, pending)
        }
        prefs.edit().putLong(REST_END, end).apply()
    }

    /** The alarm's intent, with what's next for the card; FLAG_NO_CREATE only looks for the one already set. */
    private fun restPending(context: Context, flag: Int, resting: WatchState? = null): PendingIntent? =
        PendingIntent.getBroadcast(
            context, REST_ID,
            Intent(context, RestOverReceiver::class.java)
                .putExtra(RestOverReceiver.TITLE, resting?.title)
                .putExtra(RestOverReceiver.TEXT, resting?.text),
            flag or PendingIntent.FLAG_IMMUTABLE,
        )

    /** The app on screen buzzing the wrist (as an alarm, so it isn't dropped as a touch would be). */
    private fun buzz(context: Context) {
        val vibrator = if (Build.VERSION.SDK_INT >= 31) {
            context.getSystemService(VibratorManager::class.java).defaultVibrator
        } else {
            @Suppress("DEPRECATION") context.getSystemService(Vibrator::class.java)
        }
        val effect = VibrationEffect.createWaveform(BUZZ, -1)
        if (Build.VERSION.SDK_INT >= 33) {
            vibrator.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_ALARM))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(effect, AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build())
        }
    }

    private fun openApp(context: Context): PendingIntent =
        PendingIntent.getActivity(
            context, CARD_ID,
            Intent(context, WatchActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

    private fun channels(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL_WORKOUT) == null) {
            manager.deleteNotificationChannel(OLD_CHANNEL_WORKOUT)
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_WORKOUT, "Workout in progress", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "The workout running on your phone: what's next, and the app a tap away"
                    enableVibration(true)
                    setShowBadge(false)
                },
            )
        }
        if (manager.getNotificationChannel(CHANNEL_REST) == null) {
            manager.deleteNotificationChannel(OLD_CHANNEL_REST)
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_REST, "Rest over", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "A buzz and what's next, when a rest runs out"
                    setSound(null, null)
                    enableVibration(true)
                    vibrationPattern = BUZZ
                    setShowBadge(false)
                },
            )
        }
    }
}

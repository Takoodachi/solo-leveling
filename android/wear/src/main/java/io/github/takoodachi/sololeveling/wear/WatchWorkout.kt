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
    private const val CHANNEL_WORKOUT = "workout"
    private const val CHANNEL_REST = "rest"
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

    /** The end of a rest: a buzz, and unless the app is on screen to say so, a card with what's next. */
    @SuppressLint("MissingPermission") // checked: areNotificationsEnabled covers POST_NOTIFICATIONS
    fun restOver(context: Context, title: String?, text: String?) {
        buzz(context)
        val manager = NotificationManagerCompat.from(context)
        if (WatchActivity.visible || !manager.areNotificationsEnabled()) return
        channels(context)
        manager.notify(
            REST_ID,
            NotificationCompat.Builder(context, CHANNEL_REST)
                .setSmallIcon(R.drawable.ic_stat_ascent)
                .setColor(context.getColor(R.color.accent))
                .setContentTitle("Rest over")
                .setContentText(listOfNotNull(title, text).filter { it.isNotBlank() }.joinToString(" · "))
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setTimeoutAfter(30_000)
                .setContentIntent(openApp(context))
                .build(),
        )
    }

    /** An alarm at the end of this rest (exact, through the watch's sleep), replacing any before it; none for null. */
    private fun restAlarm(context: Context, resting: WatchState?) {
        val alarms = context.getSystemService(AlarmManager::class.java)
        val intent = Intent(context, RestOverReceiver::class.java)
            .putExtra(RestOverReceiver.TITLE, resting?.title)
            .putExtra(RestOverReceiver.TEXT, resting?.text)
        val pending = PendingIntent.getBroadcast(context, REST_ID, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        alarms.cancel(pending)
        val end = resting?.restEndsAt ?: return
        if (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()) {
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, end, pending)
        } else {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, end, pending)
        }
    }

    /** As an alarm, which a watch lets an app do from the background (a plain buzz there is dropped). */
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
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_WORKOUT, "Workout in progress", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "The workout running on your phone: what's next, and the app a tap away"
                    setShowBadge(false)
                },
            )
        }
        if (manager.getNotificationChannel(CHANNEL_REST) == null) {
            manager.createNotificationChannel(
                // It shows itself; the buzz is the alarm's own, so the card doesn't add a second one
                NotificationChannel(CHANNEL_REST, "Rest over", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "What's next, when a rest runs out"
                    setSound(null, null)
                    enableVibration(false)
                    setShowBadge(false)
                },
            )
        }
    }
}

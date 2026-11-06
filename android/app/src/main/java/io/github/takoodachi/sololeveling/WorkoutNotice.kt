package io.github.takoodachi.sololeveling

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * The workout in progress as a notification, in the shade and on the lock screen: what's next on
 * the left, and on the right the rest counting down ("Rest" under it) or the workout's time
 * counting up (its name under it). The site keeps it current (src/features/workouts/
 * workoutNotice.ts → [SoloPlugin.workoutNotice]). The clock runs by itself, and when a rest runs
 * out with the app in the background (its timers frozen there) the switch back to the workout's
 * time is made here.
 *
 * It's a layout of its own (res/layout/notification_workout.xml) because the standard one put
 * the clock wherever the phone liked: Samsung's lock screen glued it to the end of the title
 * ("Lat Pulldown00:50") and gave the workout's name a line of its own.
 */
object WorkoutNotice {
    private const val ID = 9100
    private const val CHANNEL = "workout"
    private val ACCENT = 0xFFFF5F1A.toInt()
    /** A workout left open overnight shouldn't stay up for ever. */
    private const val TIMEOUT_MS = 6 * 60 * 60 * 1000L
    private val handler = Handler(Looper.getMainLooper())
    private var restOver: Runnable? = null

    data class State(val name: String, val title: String, val text: String, val startedAt: Long, val restEndsAt: Long?)

    fun show(context: Context, state: State) {
        val app = context.applicationContext
        handler.post {
            restOver?.let(handler::removeCallbacks)
            restOver = null
            val left = (state.restEndsAt ?: 0L) - System.currentTimeMillis()
            post(app, state, resting = left > 0)
            if (left > 0) restOver = Runnable { post(app, state, resting = false) }.also { handler.postDelayed(it, left) }
        }
    }

    fun clear(context: Context) {
        val app = context.applicationContext
        handler.post {
            restOver?.let(handler::removeCallbacks)
            restOver = null
            NotificationManagerCompat.from(app).cancel(ID)
        }
    }

    @SuppressLint("MissingPermission") // checked: areNotificationsEnabled covers POST_NOTIFICATIONS
    private fun post(context: Context, s: State, resting: Boolean) {
        val manager = NotificationManagerCompat.from(context)
        if (!manager.areNotificationsEnabled()) return
        ensureChannel(context)
        val now = System.currentTimeMillis()
        val views = RemoteViews(context.packageName, R.layout.notification_workout).apply {
            setTextViewText(R.id.notice_title, s.title)
            setTextViewText(R.id.notice_text, s.text)
            setTextViewText(R.id.notice_label, if (resting) "Rest" else s.name.ifBlank { "Workout" })
            // A chronometer counts on the time since boot, not the wall clock
            val at = if (resting) s.restEndsAt ?: now else s.startedAt
            setChronometer(R.id.notice_clock, SystemClock.elapsedRealtime() + (at - now), null, true)
            setChronometerCountDown(R.id.notice_clock, resting)
        }
        val builder = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_ascent)
            .setColor(ACCENT)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(views)
            // What a watch, a screen reader or a hidden lock screen gets instead of the layout
            .setContentTitle(if (resting) "Rest, then ${s.title}" else s.title)
            .setContentText(s.text)
            .setShowWhen(false)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setTimeoutAfter(TIMEOUT_MS)
            .setContentIntent(open(context))
        manager.notify(ID, builder.build())
    }

    /** A tap opens the logger (the same solo://open link as an app shortcut). */
    private fun open(context: Context): PendingIntent =
        PendingIntent.getActivity(
            context, ID,
            Intent(context, MainActivity::class.java)
                .setAction(Intent.ACTION_VIEW)
                .setData(Uri.parse("solo://open/workouts/active"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

    private fun ensureChannel(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL) != null) return
        // Default importance keeps it on the lock screen with the others; it makes no sound or buzz of its own
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL, "Workout in progress", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "What's next and the rest timer, while a workout is open"
                setSound(null, null)
                enableVibration(false)
                setShowBadge(false)
            },
        )
    }
}

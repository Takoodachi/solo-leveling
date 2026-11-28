package io.github.takoodachi.sololeveling

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.IntentCompat
import androidx.core.content.pm.PackageInfoCompat
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/**
 * The app installs its own new versions (November 2026, at the owner's request), so no APK has to
 * be sent by hand. Each one is a GitHub release, apk-<build> (`npm run android:release`). The site
 * knows the newest build (src/lib/apkBuild.ts) and, while this one is older, has it fetched here at
 * launch and installed once the app is out of sight with no workout open, or at once from "Update
 * now" (src/lib/appUpdate.ts, UpdateAppDialog). The install ends the app's process; [installed]
 * then posts "Updated to build N", which opens it again.
 *
 * Android 12+ lets an app update itself with no tap (USER_ACTION_NOT_REQUIRED, with
 * UPDATE_PACKAGES_WITHOUT_USER_ACTION in the manifest) once "Install unknown apps" is allowed for
 * it. Otherwise Android asks, and its question waits until the app is on screen ([showQuestion]).
 * Android refuses an APK signed with another key, and [fetch] keeps only this app at that build.
 */
object AppUpdate {
    /** Where updates come from, and nowhere else: the site only says which build. Same as apkUrl in src/lib/apkBuild.ts. */
    private const val RELEASES = "https://github.com/Takoodachi/solo-leveling/releases/download"
    private const val PREFS = "app-update"
    /** The build being installed, for the notification once it's in. */
    private const val INSTALLING = "installing"
    private const val CHANNEL = "updates"
    private const val NOTICE = 9200
    private val ACCENT = 0xFFFF5F1A.toInt()

    /** The install session the site is waiting on: answers about older ones are ignored. */
    @Volatile private var session = -1
    @Volatile private var outcome: ((String?) -> Unit)? = null
    /** Android's "Update this app?", kept until the app is on screen. */
    @Volatile private var question: Intent? = null

    /** Build [build]'s APK, downloaded once into the cache (any other one there is dropped). */
    @Synchronized
    fun fetch(context: Context, build: Int): File {
        val apk = File(context.cacheDir, "update-$build.apk")
        if (apk.exists()) return apk
        clearDownloads(context)
        val part = File(context.cacheDir, "update-$build.part")
        val connection = URL("$RELEASES/apk-$build/solo-leveling.apk").openConnection() as HttpURLConnection
        connection.connectTimeout = 15_000
        connection.readTimeout = 30_000
        try {
            if (connection.responseCode != HttpURLConnection.HTTP_OK) throw IOException("Build $build isn’t out yet (HTTP ${connection.responseCode})")
            connection.inputStream.use { input -> part.outputStream().use { input.copyTo(it) } }
        } finally {
            connection.disconnect()
        }
        // A cut-off download doesn't parse, and another app or another build isn't kept
        @Suppress("DEPRECATION")
        val info = context.packageManager.getPackageArchiveInfo(part.path, 0)
        if (info?.packageName != context.packageName || PackageInfoCompat.getLongVersionCode(info) != build.toLong()) {
            part.delete()
            throw IOException("The download isn’t build $build of this app")
        }
        if (!part.renameTo(apk)) throw IOException("Couldn’t keep the download")
        return apk
    }

    /** Installs build [build] over this one. [settle] hears how it went: null once it's in, else why not. */
    fun install(context: Context, build: Int, settle: (String?) -> Unit) {
        val apk = fetch(context, build)
        val installer = context.packageManager.packageInstaller
        // One at a time: a session still waiting on Android's question goes
        for (old in installer.mySessions) runCatching { installer.abandonSession(old.sessionId) }
        question = null
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
            setAppPackageName(context.packageName)
            setSize(apk.length())
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
        }
        val id = installer.createSession(params)
        installer.openSession(id).use { s ->
            s.openWrite("solo-leveling.apk", 0, apk.length()).use { out ->
                apk.inputStream().use { it.copyTo(out) }
                s.fsync(out)
            }
            // Written at once: the install ends this process
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putInt(INSTALLING, build).commit()
            session = id
            outcome = settle
            val mutable = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
            val answer = PendingIntent.getBroadcast(context, id, Intent(context, UpdateReceiver::class.java), PendingIntent.FLAG_UPDATE_CURRENT or mutable)
            s.commit(answer.intentSender)
        }
    }

    /** How a session went ([UpdateReceiver]): in, refused, or waiting on Android's question. */
    fun answered(context: Context, intent: Intent) {
        if (intent.getIntExtra(PackageInstaller.EXTRA_SESSION_ID, -1) != session) return
        when (val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                question = IntentCompat.getParcelableExtra(intent, Intent.EXTRA_INTENT, Intent::class.java)?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                if (MainActivity.inForeground) showQuestion(context)
            }
            PackageInstaller.STATUS_SUCCESS -> settle(context, null)
            PackageInstaller.STATUS_FAILURE_ABORTED -> settle(context, "Cancelled")
            else -> settle(context, intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: "Android didn’t install it")
        }
    }

    private fun settle(context: Context, error: String?) {
        if (error != null) context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(INSTALLING).apply()
        val tell = outcome
        outcome = null
        runCatching { tell?.invoke(error) }
    }

    /** The app is on screen ([SoloPlugin.handleOnResume]): Android's question, if one is waiting. */
    fun showQuestion(context: Context) {
        val intent = question ?: return
        question = null
        runCatching { context.startActivity(intent) }
    }

    /** The app's first moment as its new build: says so, when it was the app that installed it. */
    @SuppressLint("MissingPermission") // checked: areNotificationsEnabled covers POST_NOTIFICATIONS
    fun installed(context: Context) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        // An install by hand or over adb says so itself
        if (!prefs.contains(INSTALLING)) return
        prefs.edit().remove(INSTALLING).apply()
        clearDownloads(context)
        val build = PackageInfoCompat.getLongVersionCode(context.packageManager.getPackageInfo(context.packageName, 0))
        val manager = context.getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL) == null) {
            manager.createNotificationChannel(NotificationChannel(CHANNEL, "App updates", NotificationManager.IMPORTANCE_LOW))
        }
        val open = PendingIntent.getActivity(
            context, NOTICE,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notice = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_ascent)
            .setColor(ACCENT)
            .setContentTitle("Updated to build $build")
            .setContentText("Tap to open Solo Leveling")
            .setContentIntent(open)
            .setAutoCancel(true)
        val compat = NotificationManagerCompat.from(context)
        if (compat.areNotificationsEnabled()) compat.notify(NOTICE, notice.build())
    }

    /** The app is open again: the "Updated" notification has done its job. */
    fun opened(context: Context) = NotificationManagerCompat.from(context).cancel(NOTICE)

    private fun clearDownloads(context: Context) {
        context.cacheDir.listFiles { f -> f.name.startsWith("update-") }?.forEach { it.delete() }
    }
}

/** An install session's answer ([AppUpdate.install]), and the app's first moment as its new build. */
class UpdateReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) AppUpdate.installed(context) else AppUpdate.answered(context, intent)
    }
}

package io.github.takoodachi.sololeveling

import android.content.ClipData
import android.content.Intent
import android.util.Base64
import androidx.activity.result.ActivityResultLauncher
import androidx.core.content.FileProvider
import androidx.health.connect.client.PermissionController
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.File

/**
 * The app's own bridge to the site (src/lib/native.ts → `soloPlugin()`):
 * - long-press app shortcuts arrive as a `shortcut` event with the path to open, and the site
 *   chooses which ones the icon offers ([Shortcuts]);
 * - step sync while the app is closed is switched on and off here ([StepsSync]);
 * - images go to Android's share sheet (the WebView has no Web Share API);
 * - creatine and water reminders with a log button are handed over here ([QuickLog]).
 */
@CapacitorPlugin(name = "Solo")
class SoloPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private lateinit var backgroundAccess: ActivityResultLauncher<Set<String>>
    private var waitingForAccess: PluginCall? = null

    override fun load() {
        backgroundAccess = activity.registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { granted ->
            val call = waitingForAccess ?: return@registerForActivityResult
            waitingForAccess = null
            if (StepsSync.BACKGROUND_PERMISSION in granted) StepsSync.schedule(context)
            resolveStatus(call)
        }
        // Some launchers have no shortcuts to set: nothing to do about that
        runCatching { Shortcuts.ensureDefaults(context) }
        announceShortcut(activity.intent)
    }

    override fun handleOnNewIntent(intent: Intent) {
        announceShortcut(intent)
    }

    override fun handleOnDestroy() {
        scope.cancel()
    }

    /** solo://open/workouts?start=1 → "/workouts?start=1", kept until the site is listening. */
    private fun announceShortcut(intent: Intent?) {
        val uri = intent?.data ?: return
        if (uri.scheme != "solo" || uri.host != "open") return
        // The activity keeps its intent: without this a rotation would open the shortcut again
        intent.data = null
        val path = (uri.path ?: "/") + (uri.query?.let { "?$it" } ?: "")
        notifyListeners("shortcut", JSObject().put("path", path), true)
    }

    @PluginMethod
    fun backgroundStepsStatus(call: PluginCall) = resolveStatus(call)

    /** Asks Health Connect for background access when it's missing, then schedules the hourly sync. */
    @PluginMethod
    fun enableBackgroundSteps(call: PluginCall) {
        scope.launch {
            try {
                val access = StepsSync.access(context)
                if (access.supported && !access.granted) {
                    waitingForAccess = call
                    backgroundAccess.launch(setOf(StepsSync.BACKGROUND_PERMISSION))
                    return@launch
                }
                if (access.granted) StepsSync.schedule(context)
                resolveStatus(call)
            } catch (e: Exception) {
                call.reject(e.message ?: "Couldn't switch on background sync")
            }
        }
    }

    /** The recap share card: a PNG (base64) into the cache, out through the share sheet. */
    @PluginMethod
    fun shareImage(call: PluginCall) {
        val data = call.getString("base64") ?: return call.reject("No image to share")
        try {
            val dir = File(context.cacheDir, "shared").apply { mkdirs() }
            val name = (call.getString("fileName") ?: "image.png").replace(Regex("[^A-Za-z0-9._-]"), "_")
            val file = File(dir, name).apply { writeBytes(Base64.decode(data, Base64.DEFAULT)) }
            // res/xml/file_paths.xml shares the cache directory
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
            val send = Intent(Intent.ACTION_SEND).apply {
                type = "image/png"
                putExtra(Intent.EXTRA_STREAM, uri)
                call.getString("text")?.let { putExtra(Intent.EXTRA_TEXT, it) }
                clipData = ClipData.newRawUri(null, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            activity.startActivity(Intent.createChooser(send, null))
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message ?: "Couldn't share the image")
        }
    }

    /** Replaces every quick-log reminder with `items` (src/features/reminders/deliver.ts). */
    @PluginMethod
    fun scheduleQuickLog(call: PluginCall) {
        try {
            val items = call.getArray("items")?.toList<JSONObject>()?.map { QuickLog.Reminder.fromJson(it) } ?: emptyList()
            QuickLog.schedule(context, items)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message ?: "Couldn't schedule the reminders")
        }
    }

    /** Replaces the long-press shortcuts on the app's icon (src/features/settings/hooks/useAppShortcuts.ts). */
    @PluginMethod
    fun setShortcuts(call: PluginCall) {
        try {
            val items = call.getArray("items")?.toList<JSONObject>()?.map {
                Shortcuts.Item(it.getString("id"), it.getString("label"), it.getString("path"), it.optString("icon"))
            } ?: emptyList()
            Shortcuts.publish(context, items)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message ?: "Couldn't set the shortcuts")
        }
    }

    @PluginMethod
    fun disableBackgroundSteps(call: PluginCall) {
        StepsSync.cancel(context)
        resolveStatus(call)
    }

    private fun resolveStatus(call: PluginCall) {
        scope.launch {
            try {
                val access = StepsSync.access(context)
                val scheduled = StepsSync.isScheduled(context)
                val (lastRunAt, lastResult) = StepsSync.lastRun(context)
                call.resolve(
                    JSObject()
                        .put("supported", access.supported)
                        .put("granted", access.granted)
                        // Scheduled but no longer allowed (access revoked in Health Connect) isn't "on"
                        .put("enabled", scheduled && access.granted)
                        .put("lastRunAt", if (lastRunAt > 0) lastRunAt else JSObject.NULL)
                        .put("lastResult", lastResult ?: JSObject.NULL)
                )
            } catch (e: Exception) {
                call.reject(e.message ?: "Couldn't read the background sync status")
            }
        }
    }
}

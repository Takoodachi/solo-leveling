package io.github.takoodachi.sololeveling

import android.content.Intent
import androidx.activity.result.ActivityResultLauncher
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

/**
 * The app's own bridge to the site (src/lib/native.ts → `soloPlugin()`):
 * - long-press app shortcuts (res/xml/shortcuts.xml) arrive as a `shortcut` event with the
 *   path to open;
 * - step sync while the app is closed is switched on and off here ([StepsSync]).
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

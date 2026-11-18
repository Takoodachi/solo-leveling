package io.github.takoodachi.sololeveling

import android.os.Handler
import android.os.Looper
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import java.lang.ref.WeakReference

/**
 * The watch app's buttons (android/wear): "tick" the next set, "skip" the rest, "add15" seconds to
 * it. Each goes to the site as a `watchAction` event ([SoloPlugin.fromWatch]), which does what the
 * same tap on the phone does (features/workouts/watchActions.ts). Only while the app's page is
 * loaded: with the app closed there's no workout open to act on, and a press is better lost than
 * played later. Play services only hands this messages from a watch app with this app's id and key.
 */
class WatchActions : WearableListenerService() {
    override fun onMessageReceived(event: MessageEvent) {
        if (event.path != PATH) return
        val action = String(event.data, Charsets.UTF_8)
        if (action !in ACTIONS) return
        Handler(Looper.getMainLooper()).post { plugin?.get()?.fromWatch(action) }
    }

    companion object {
        const val PATH = "/action"
        private val ACTIONS = setOf("tick", "skip", "add15")
        /** The plugin of the page that's loaded ([SoloPlugin.load]). */
        var plugin: WeakReference<SoloPlugin>? = null
    }
}

package io.github.takoodachi.sololeveling.wear

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** The alarm at the end of a rest ([WatchWorkout.restOver]). */
class RestOverReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        WatchWorkout.restOver(context, intent.getStringExtra(TITLE), intent.getStringExtra(TEXT))
    }

    companion object {
        const val TITLE = "title"
        const val TEXT = "text"
    }
}

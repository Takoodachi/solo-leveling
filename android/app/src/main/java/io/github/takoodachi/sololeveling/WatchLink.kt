package io.github.takoodachi.sololeveling

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.DataMap
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable

/**
 * The workout in progress, handed to the watch app (android/wear, on a Galaxy Watch): the same
 * state as the workout notification ([WorkoutNotice]), kept as one data item at [PATH] that the
 * watch reads whenever it likes. Google's Data Layer only links this app to a watch app with the
 * same id and signing key, which two debug builds from the same machine have. With no watch, or
 * no Play services, it goes nowhere and says so in the log.
 */
object WatchLink {
    const val PATH = "/workout"
    private const val TAG = "WatchLink"
    private var restEnd: Long? = null
    private var restStart: Long? = null

    fun show(context: Context, s: WorkoutNotice.State) {
        // A new rest starts now: the watch draws its ring from here to the end
        if (s.restEndsAt != restEnd) {
            restEnd = s.restEndsAt
            restStart = s.restEndsAt?.let { System.currentTimeMillis() }
        }
        put(context) {
            putBoolean("active", true)
            putString("name", s.name)
            putString("title", s.title)
            putString("text", s.text)
            putLong("startedAt", s.startedAt)
            putLong("restEndsAt", s.restEndsAt ?: 0L)
            putLong("restStartedAt", restStart ?: 0L)
            putBoolean("canTick", s.canTick)
        }
    }

    fun clear(context: Context) {
        restEnd = null
        restStart = null
        put(context) { putBoolean("active", false) }
    }

    private fun put(context: Context, fill: DataMap.() -> Unit) {
        try {
            // Urgent: otherwise the Data Layer may hold it back for a while to save battery
            val request = PutDataMapRequest.create(PATH).apply { dataMap.fill() }.asPutDataRequest().setUrgent()
            Wearable.getDataClient(context.applicationContext).putDataItem(request)
                .addOnFailureListener { Log.i(TAG, "watch not reached: ${it.message}") }
        } catch (e: Exception) {
            Log.i(TAG, "no watch link: ${e.message}")
        }
    }
}

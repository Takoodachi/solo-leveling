package io.github.takoodachi.sololeveling.wear

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.TextView
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.PutDataRequest
import com.google.android.gms.wearable.Wearable

/**
 * The one screen: the rest counting down in the accent with a ring around the edge, or the
 * workout's time counting up, and under it the exercise and the set that are next. It reads what
 * the phone last sent when it opens and follows each change while it's on screen.
 */
class WatchActivity : Activity() {
    private val handler = Handler(Looper.getMainLooper())
    private var state: WatchState? = null
    private lateinit var label: TextView
    private lateinit var clock: TextView
    private lateinit var title: TextView
    private lateinit var text: TextView
    private lateinit var ring: RestRing
    private val tick = Runnable { render() }

    private val changes = DataClient.OnDataChangedListener { events ->
        var next = state
        var seen = false
        for (event in events) {
            if (event.dataItem.uri.path != WatchWorkout.PATH) continue
            seen = true
            next = if (event.type == DataEvent.TYPE_DELETED) null else WatchWorkout.stateOf(DataMapItem.fromDataItem(event.dataItem).dataMap)
        }
        if (seen) handler.post {
            state = next
            render()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_watch)
        label = findViewById(R.id.label)
        clock = findViewById(R.id.clock)
        title = findViewById(R.id.title)
        text = findViewById(R.id.text)
        ring = findViewById(R.id.ring)
        // The workout's card and the "Rest over" card need it (an install with adb -g has it already)
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        }
    }

    override fun onResume() {
        super.onResume()
        visible = true
        val data = Wearable.getDataClient(this)
        data.addListener(changes)
        // What the phone last sent, which may have come while this screen was closed; the card and
        // the rest's alarm are set to match it too (a restart of the watch drops alarms)
        data.getDataItems(Uri.Builder().scheme(PutDataRequest.WEAR_URI_SCHEME).path(WatchWorkout.PATH).build())
            .addOnSuccessListener { items ->
                val latest = items.firstOrNull()?.let { WatchWorkout.stateOf(DataMapItem.fromDataItem(it).dataMap) }
                items.release()
                state = latest
                WatchWorkout.apply(this, latest)
                render()
            }
        render()
    }

    override fun onPause() {
        visible = false
        Wearable.getDataClient(this).removeListener(changes)
        handler.removeCallbacks(tick)
        super.onPause()
    }

    private fun render() {
        handler.removeCallbacks(tick)
        val screen = screenFor(state, System.currentTimeMillis())
        label.text = screen.label
        clock.text = screen.clock
        clock.visibility = if (screen.clock.isEmpty()) View.GONE else View.VISIBLE
        clock.setTextColor(getColor(if (screen.resting) R.color.accent else R.color.text))
        title.text = screen.title
        text.text = screen.text
        ring.progress = screen.ring
        // Ticks only while on screen, and only when what it shows changes
        if (visible) screen.nextChangeMs?.let { handler.postDelayed(tick, it) }
    }

    companion object {
        /** On screen now: the end of a rest then needs no card to say so. */
        @Volatile
        var visible = false
    }
}

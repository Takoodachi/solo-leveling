package io.github.takoodachi.sololeveling.wear

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.HapticFeedbackConstants
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.PutDataRequest
import com.google.android.gms.wearable.Wearable
import kotlin.math.roundToInt

/**
 * The one screen: the rest counting down in the accent with a ring around the edge, or the
 * workout's time counting up, and under it the exercise and the set that are next, then Done
 * (between rests) or Skip and +15 s (during one), which act on the phone's workout. Above it all,
 * the heart rate from the watch's own sensor, read only while this screen is up. It reads what the
 * phone last sent when it opens and follows each change while it's on screen.
 */
class WatchActivity : Activity() {
    private val handler = Handler(Looper.getMainLooper())
    private var state: WatchState? = null
    private lateinit var heart: TextView
    private lateinit var label: TextView
    private lateinit var clock: TextView
    private lateinit var title: TextView
    private lateinit var text: TextView
    private lateinit var ring: RestRing
    private lateinit var actions: View
    private lateinit var done: Button
    private lateinit var skip: Button
    private lateinit var more: Button
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
            // The phone answered a press, if one was waiting
            pressed?.let(handler::removeCallbacks)
            pressed = null
            render()
        }
    }

    /** A button pressed and not yet answered by the phone: they stay off meanwhile, so a double tap can't tick twice. */
    private var pressed: Runnable? = null

    private val heartRate = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent) {
            val bpm = event.values.firstOrNull()?.roundToInt() ?: 0
            // No contact (off the wrist) or not settled yet: nothing rather than a wrong number
            val reading = bpm > 0 && event.accuracy >= SensorManager.SENSOR_STATUS_ACCURACY_LOW
            heart.text = if (reading) "♥ $bpm" else ""
            heart.visibility = if (reading) View.VISIBLE else View.GONE
        }

        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_watch)
        heart = findViewById(R.id.heart)
        label = findViewById(R.id.label)
        clock = findViewById(R.id.clock)
        title = findViewById(R.id.title)
        text = findViewById(R.id.text)
        ring = findViewById(R.id.ring)
        actions = findViewById(R.id.actions)
        done = findViewById(R.id.done)
        skip = findViewById(R.id.skip)
        more = findViewById(R.id.more)
        done.setOnClickListener { press(it, "tick") }
        skip.setOnClickListener { press(it, "skip") }
        more.setOnClickListener { press(it, "add15") }
        // The cards need notifications, the heart rate its sensor (an install with adb -g has both)
        val missing = listOfNotNull(
            Manifest.permission.POST_NOTIFICATIONS.takeIf { Build.VERSION.SDK_INT >= 33 },
            HEART_PERMISSION,
        ).filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isNotEmpty()) requestPermissions(missing.toTypedArray(), 1)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (visible) listenToHeart()
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
        listenToHeart()
        render()
    }

    override fun onPause() {
        visible = false
        Wearable.getDataClient(this).removeListener(changes)
        getSystemService(SensorManager::class.java).unregisterListener(heartRate)
        handler.removeCallbacks(tick)
        pressed?.let(handler::removeCallbacks)
        pressed = null
        super.onPause()
    }

    private fun listenToHeart() {
        if (checkSelfPermission(HEART_PERMISSION) != PackageManager.PERMISSION_GRANTED) return
        val sensors = getSystemService(SensorManager::class.java)
        val sensor = sensors.getDefaultSensor(Sensor.TYPE_HEART_RATE) ?: return
        sensors.unregisterListener(heartRate)
        sensors.registerListener(heartRate, sensor, SensorManager.SENSOR_DELAY_NORMAL)
    }

    /** Sends a press to the phone; its answer is the workout changing, and without one in 4 s it says so. */
    private fun press(button: View, action: String) {
        if (pressed != null) return
        button.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
        val waiting = Runnable {
            pressed = null
            render()
            Toast.makeText(this, "Open the workout on your phone", Toast.LENGTH_SHORT).show()
        }
        pressed = waiting
        render()
        WatchWorkout.tellPhone(this, action) { sent ->
            if (pressed !== waiting) return@tellPhone // answered already
            if (sent) {
                handler.postDelayed(waiting, ANSWER_MS)
                return@tellPhone
            }
            pressed = null
            render()
            Toast.makeText(this, "Your phone isn't connected", Toast.LENGTH_SHORT).show()
        }
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
        actions.visibility = if (screen.buttons == Buttons.NONE) View.GONE else View.VISIBLE
        done.visibility = if (screen.buttons == Buttons.DONE) View.VISIBLE else View.GONE
        skip.visibility = if (screen.buttons == Buttons.REST) View.VISIBLE else View.GONE
        more.visibility = skip.visibility
        listOf(done, skip, more).forEach { it.isEnabled = pressed == null; it.alpha = if (pressed == null) 1f else 0.5f }
        // Ticks only while on screen, and only when what it shows changes
        if (visible) screen.nextChangeMs?.let { handler.postDelayed(tick, it) }
    }

    companion object {
        /** On screen now: the end of a rest then needs no card to say so. */
        @Volatile
        var visible = false

        /** How long a press waits for the phone's answer (the workout changing) before saying it didn't come. */
        private const val ANSWER_MS = 4_000L

        /** Since Android 16 (Wear OS 6) the heart-rate sensor has a permission of its own. */
        private val HEART_PERMISSION =
            if (Build.VERSION.SDK_INT >= 36) "android.permission.health.READ_HEART_RATE" else Manifest.permission.BODY_SENSORS
    }
}

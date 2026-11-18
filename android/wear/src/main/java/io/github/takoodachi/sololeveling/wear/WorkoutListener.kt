package io.github.takoodachi.sololeveling.wear

import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.WearableListenerService

/** Woken by Play services whenever the phone changes the workout, with the app closed or open. */
class WorkoutListener : WearableListenerService() {
    override fun onDataChanged(events: DataEventBuffer) {
        for (event in events) {
            if (event.dataItem.uri.path != WatchWorkout.PATH) continue
            val state = if (event.type == DataEvent.TYPE_DELETED) null else WatchWorkout.stateOf(DataMapItem.fromDataItem(event.dataItem).dataMap)
            WatchWorkout.apply(this, state)
        }
    }
}

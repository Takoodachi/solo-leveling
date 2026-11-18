package io.github.takoodachi.sololeveling.wear

import android.net.Uri
import androidx.concurrent.futures.ResolvableFuture
import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DimensionBuilders.dp
import androidx.wear.protolayout.DimensionBuilders.expand
import androidx.wear.protolayout.DimensionBuilders.sp
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.ModifiersBuilders
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.TimelineBuilders
import androidx.wear.protolayout.TypeBuilders
import androidx.wear.protolayout.expression.DynamicBuilders.DynamicInstant
import androidx.wear.protolayout.expression.DynamicBuilders.DynamicInt32
import androidx.wear.protolayout.expression.DynamicBuilders.DynamicString
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.TileService
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.PutDataRequest
import com.google.android.gms.wearable.Wearable
import com.google.common.util.concurrent.ListenableFuture
import java.time.Instant

/**
 * The workout a swipe away from the watch face: the rest counting down (in the accent) or the
 * workout's time, and the exercise and set that are next; a tap opens the app. The clock counts by
 * itself on the watch (a dynamic value), and the switch from the rest back to the workout's time is
 * a second timeline entry from the rest's end, so the tile is only asked for again when the phone
 * changes the workout ([WatchWorkout.apply]).
 */
class WorkoutTile : TileService() {
    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> {
        val future = ResolvableFuture.create<TileBuilders.Tile>()
        Wearable.getDataClient(this)
            .getDataItems(Uri.Builder().scheme(PutDataRequest.WEAR_URI_SCHEME).path(WatchWorkout.PATH).build())
            .addOnCompleteListener { task ->
                val state = if (!task.isSuccessful) null else task.result.let { items ->
                    items.firstOrNull()?.let { WatchWorkout.stateOf(DataMapItem.fromDataItem(it).dataMap) }.also { items.release() }
                }
                future.set(tile(state, System.currentTimeMillis()))
            }
        return future
    }

    override fun onTileResourcesRequest(requestParams: RequestBuilders.ResourcesRequest): ListenableFuture<ResourceBuilders.Resources> =
        ResolvableFuture.create<ResourceBuilders.Resources>().apply { set(ResourceBuilders.Resources.Builder().setVersion(RESOURCES).build()) }

    private fun tile(s: WatchState?, now: Long): TileBuilders.Tile {
        val timeline = TimelineBuilders.Timeline.Builder()
        val live = s?.takeUnless { it.stale(now) }
        val restEnd = live?.restEndsAt?.takeIf { it > now }
        if (live == null) {
            timeline.addTimelineEntry(entry(idle(), null, null))
        } else if (restEnd != null) {
            timeline.addTimelineEntry(entry(workout(live, "Rest", restLeft(restEnd), screenFor(live, now).clock, ACCENT), null, restEnd))
            timeline.addTimelineEntry(entry(workout(live, live.name.ifBlank { "Workout" }, sinceStart(live.startedAt), screenFor(live, restEnd).clock, TEXT), restEnd, null))
        } else {
            timeline.addTimelineEntry(entry(workout(live, live.name.ifBlank { "Workout" }, sinceStart(live.startedAt), screenFor(live, now).clock, TEXT), null, null))
        }
        return TileBuilders.Tile.Builder().setResourcesVersion(RESOURCES).setTileTimeline(timeline.build()).build()
    }

    private fun entry(root: LayoutElementBuilders.LayoutElement, from: Long?, until: Long?): TimelineBuilders.TimelineEntry {
        val entry = TimelineBuilders.TimelineEntry.Builder().setLayout(LayoutElementBuilders.Layout.Builder().setRoot(root).build())
        if (from != null || until != null) {
            val interval = TimelineBuilders.TimeInterval.Builder()
            from?.let { interval.setStartMillis(it) }
            until?.let { interval.setEndMillis(it) }
            entry.setValidity(interval.build())
        }
        return entry.build()
    }

    private fun idle() = screen(
        text("Solo Leveling".uppercase(), 12f, MUTED),
        text("No workout", 16f, TEXT, bold = true),
        text("Start one on your phone", 13f, MUTED, lines = 2),
    )

    private fun workout(s: WatchState, label: String, clock: DynamicString, fallback: String, color: Int) = screen(
        text(label.uppercase(), 12f, MUTED),
        LayoutElementBuilders.Text.Builder()
            .setText(TypeBuilders.StringProp.Builder(fallback).setDynamicValue(clock).build())
            .setLayoutConstraintsForDynamicText(TypeBuilders.StringLayoutConstraint.Builder("00:00").build())
            .setFontStyle(LayoutElementBuilders.FontStyle.Builder().setSize(sp(36f)).setWeight(LayoutElementBuilders.FONT_WEIGHT_BOLD).setColor(argb(color)).build())
            .build(),
        text(s.title, 15f, TEXT, bold = true, lines = 2),
        text(s.text, 13f, MUTED, lines = 2),
    )

    /** The texts in a column in the middle; a tap anywhere opens the app. */
    private fun screen(vararg parts: LayoutElementBuilders.LayoutElement): LayoutElementBuilders.LayoutElement {
        val column = LayoutElementBuilders.Column.Builder()
            .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
            .setModifiers(ModifiersBuilders.Modifiers.Builder().setPadding(ModifiersBuilders.Padding.Builder().setStart(dp(22f)).setEnd(dp(22f)).build()).build())
        parts.forEach { column.addContent(it) }
        val open = ModifiersBuilders.Clickable.Builder()
            .setId("open")
            .setOnClick(
                ActionBuilders.LaunchAction.Builder()
                    .setAndroidActivity(ActionBuilders.AndroidActivity.Builder().setPackageName(packageName).setClassName(WatchActivity::class.java.name).build())
                    .build(),
            )
            .build()
        return LayoutElementBuilders.Box.Builder()
            .setWidth(expand())
            .setHeight(expand())
            .setModifiers(ModifiersBuilders.Modifiers.Builder().setClickable(open).build())
            .addContent(column.build())
            .build()
    }

    private fun text(value: String, size: Float, color: Int, bold: Boolean = false, lines: Int = 1): LayoutElementBuilders.LayoutElement {
        val style = LayoutElementBuilders.FontStyle.Builder().setSize(sp(size)).setColor(argb(color))
        if (bold) style.setWeight(LayoutElementBuilders.FONT_WEIGHT_BOLD)
        return LayoutElementBuilders.Text.Builder()
            .setText(value)
            .setMaxLines(lines)
            .setOverflow(LayoutElementBuilders.TEXT_OVERFLOW_ELLIPSIZE)
            .setFontStyle(style.build())
            .build()
    }

    /** 5:07 as the watch counts it, from a number of seconds. */
    private fun minutesAndSeconds(seconds: DynamicInt32): DynamicString =
        seconds.div(60).format()
            .concat(DynamicString.constant(":"))
            .concat(seconds.rem(60).format(DynamicInt32.IntFormatter.Builder().setMinIntegerDigits(2).build()))

    private fun restLeft(end: Long): DynamicString =
        minutesAndSeconds(DynamicInstant.platformTimeWithSecondsPrecision().durationUntil(DynamicInstant.withSecondsPrecision(Instant.ofEpochMilli(end))).toIntSeconds())

    private fun sinceStart(start: Long): DynamicString =
        minutesAndSeconds(DynamicInstant.withSecondsPrecision(Instant.ofEpochMilli(start)).durationUntil(DynamicInstant.platformTimeWithSecondsPrecision()).toIntSeconds())

    private companion object {
        const val RESOURCES = "1"
        const val ACCENT = 0xFFFF5F1A.toInt()
        const val TEXT = 0xFFFAFAFA.toInt()
        const val MUTED = 0xB3FAFAFA.toInt()
    }
}

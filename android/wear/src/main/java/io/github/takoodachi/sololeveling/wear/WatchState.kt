package io.github.takoodachi.sololeveling.wear

import java.util.Locale

/**
 * The workout the phone app is running, as its WatchLink sends it: the workout notification's
 * state, plus when the rest began (for the ring). Times are wall-clock ms; the phone and the watch
 * keep the same time, so a rest ends here when it ends there.
 */
data class WatchState(
    val name: String,
    /** The exercise with a set still to do ("All sets done" once there's none). */
    val title: String,
    /** That set: "Set 3 of 4 · 100 kg × 8". */
    val text: String,
    val startedAt: Long,
    val restEndsAt: Long?,
    val restStartedAt: Long?,
    /** There's a set to tick (Done); false from a phone app that predates the buttons. */
    val canTick: Boolean = false,
) {
    fun resting(now: Long) = restEndsAt != null && restEndsAt > now

    /** Left open for hours (the phone's notification gives up after 6): not a workout any more. */
    fun stale(now: Long) = now - startedAt > MAX_AGE_MS

    companion object {
        const val MAX_AGE_MS = 6 * 60 * 60 * 1000L
    }
}

/** The buttons under it: Done between rests, Skip and +15 s during one. */
enum class Buttons { NONE, DONE, REST }

/** What the screen shows at a moment, and in how many ms that changes (null: it doesn't by itself). */
data class Screen(
    val label: String,
    val clock: String,
    val title: String,
    val text: String,
    /** Rest left, 1 → 0, for the ring; null draws none. */
    val ring: Float?,
    val resting: Boolean,
    val nextChangeMs: Long?,
    val buttons: Buttons = Buttons.NONE,
)

fun screenFor(s: WatchState?, now: Long): Screen {
    if (s == null || s.stale(now)) return Screen("Solo Leveling", "", "No workout", "Start one on your phone", null, false, null)
    val restEnd = s.restEndsAt
    if (restEnd != null && restEnd > now) {
        val left = restEnd - now
        val total = s.restStartedAt?.let { restEnd - it }?.takeIf { it > 0 }
        // The clock shows whole seconds rounded up, so a rest of 90 s reads 1:30 until it's 89 s
        return Screen("Rest", clock((left + 999) / 1000), s.title, s.text, total?.let { (left.toFloat() / it).coerceIn(0f, 1f) }, true, (left - 1) % 1000 + 1, Buttons.REST)
    }
    val elapsed = (now - s.startedAt).coerceAtLeast(0)
    return Screen(s.name.ifBlank { "Workout" }, clock(elapsed / 1000), s.title, s.text, null, false, 1000 - elapsed % 1000, if (s.canTick) Buttons.DONE else Buttons.NONE)
}

/** 5:07, or 1:02:10 past an hour. */
fun clock(seconds: Long): String {
    val h = seconds / 3600
    val m = seconds / 60 % 60
    val s = seconds % 60
    return if (h > 0) String.format(Locale.ROOT, "%d:%02d:%02d", h, m, s) else String.format(Locale.ROOT, "%d:%02d", m, s)
}

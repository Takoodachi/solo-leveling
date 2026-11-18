package io.github.takoodachi.sololeveling.wear

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WatchStateTest {
    private val start = 1_700_000_000_000L
    private val squat = WatchState("Leg Day", "Barbell Back Squat", "Set 3 of 4 · 100 kg × 8", start, null, null)

    @Test
    fun workoutTimeCountsUpWithTheNextSetUnderIt() {
        val s = screenFor(squat, start + 754_250)
        assertEquals("Leg Day", s.label)
        assertEquals("12:34", s.clock)
        assertEquals("Barbell Back Squat", s.title)
        assertEquals("Set 3 of 4 · 100 kg × 8", s.text)
        assertNull(s.ring)
        assertFalse(s.resting)
        assertEquals(750L, s.nextChangeMs) // 12:35 is 750 ms away
        assertEquals("1:02:10", screenFor(squat, start + 3_730_000).clock)
    }

    @Test
    fun restCountsDownRoundingUpAndTheRingEmpties() {
        val resting = squat.copy(restEndsAt = start + 100_000, restStartedAt = start + 10_000) // a 90 s rest
        val atStart = screenFor(resting, start + 10_000)
        assertEquals("Rest", atStart.label)
        assertEquals("1:30", atStart.clock)
        assertEquals(1f, atStart.ring!!, 0.0001f)
        assertTrue(atStart.resting)
        val later = screenFor(resting, start + 40_400) // 59.6 s left
        assertEquals("1:00", later.clock)
        assertEquals(59.6f / 90f, later.ring!!, 0.0001f)
        assertEquals(600L, later.nextChangeMs) // it reads 0:59 at 59 s left
        assertEquals("0:01", screenFor(resting, start + 99_999).clock)
    }

    @Test
    fun aRestThatRanOutGoesBackToTheWorkoutsTime() {
        val over = screenFor(squat.copy(restEndsAt = start + 100_000, restStartedAt = start + 10_000), start + 100_000)
        assertFalse(over.resting)
        assertEquals("1:40", over.clock)
        assertNull(over.ring)
    }

    @Test
    fun noWorkoutOrOneLeftOpenForHoursShowsTheIdleScreen() {
        assertEquals("No workout", screenFor(null, start).title)
        val idle = screenFor(squat, start + WatchState.MAX_AGE_MS + 1)
        assertEquals("No workout", idle.title)
        assertNull(idle.nextChangeMs)
    }

    @Test
    fun theButtonsAreDoneBetweenRestsAndSkipOrMoreDuringOne() {
        assertEquals(Buttons.DONE, screenFor(squat.copy(canTick = true), start + 1_000).buttons)
        // Every set done ("All sets done"), or a phone app from before the buttons
        assertEquals(Buttons.NONE, screenFor(squat, start + 1_000).buttons)
        assertEquals(Buttons.REST, screenFor(squat.copy(canTick = true, restEndsAt = start + 60_000), start + 1_000).buttons)
        assertEquals(Buttons.NONE, screenFor(null, start).buttons)
    }

    @Test
    fun aRestWithoutItsStartHasNoRing() {
        assertNull(screenFor(squat.copy(restEndsAt = start + 60_000), start).ring)
    }
}

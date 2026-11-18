package io.github.takoodachi.sololeveling.wear

import android.Manifest
import android.app.Notification
import android.app.NotificationManager
import android.service.notification.StatusBarNotification
import android.widget.TextView
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * What the watch does with a workout, on any device or emulator (a phone emulator has no Data
 * Layer, so the state is handed over directly): the card, the alarm at the end of the rest and
 * the "Rest over" card it brings, taking it all down, and the screen drawing.
 */
@RunWith(AndroidJUnit4::class)
class WatchWorkoutTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = instrumentation.targetContext
    private val notifications = context.getSystemService(NotificationManager::class.java)

    @Before
    fun allowNotifications() {
        instrumentation.uiAutomation.grantRuntimePermission(context.packageName, Manifest.permission.POST_NOTIFICATIONS)
    }

    @After
    fun takeDown() = WatchWorkout.apply(context, null)

    private fun shown(id: Int): StatusBarNotification? = notifications.activeNotifications.firstOrNull { it.id == id }

    private fun <T> waitFor(what: String, ms: Long = 5_000, check: () -> T?): T {
        val until = System.currentTimeMillis() + ms
        while (System.currentTimeMillis() < until) {
            check()?.let { return it }
            Thread.sleep(100)
        }
        fail("never: $what")
        throw AssertionError()
    }

    @Test
    fun aWorkoutShowsItsCardAndTheEndOfItsRestBringsRestOver() {
        val now = System.currentTimeMillis()
        WatchWorkout.apply(context, WatchState("Leg Day", "Barbell Back Squat", "Set 3 of 4 · 100 kg × 8", now - 60_000, now + 2_000, now - 1_000))
        val card = waitFor("the workout's card") { shown(1) }
        assertTrue(card.isOngoing)
        assertEquals("Barbell Back Squat", card.notification.extras.getString(Notification.EXTRA_TITLE))
        assertEquals("Set 3 of 4 · 100 kg × 8", card.notification.extras.getString(Notification.EXTRA_TEXT))
        // The alarm at the rest's end, with the app not on screen: the buzz and the card saying so
        val over = waitFor("the Rest over card", 10_000) { shown(2) }
        assertEquals("Rest over", over.notification.extras.getString(Notification.EXTRA_TITLE))
        assertEquals("Barbell Back Squat · Set 3 of 4 · 100 kg × 8", over.notification.extras.getString(Notification.EXTRA_TEXT))
        // Left up as it would be: on a watch the card alerts (buzzes) a moment after it's posted
        Thread.sleep(4_000)
        WatchWorkout.apply(context, null)
        waitFor("both taken down") { if (shown(1) == null && shown(2) == null) true else null }
    }

    @Test
    fun aRestCalledOffWellBeforeItsEndLosesItsAlarm() {
        val now = System.currentTimeMillis()
        val squat = WatchState("Leg Day", "Barbell Back Squat", "Set 3 of 4 · 100 kg × 8", now - 60_000, now + 8_000, now - 1_000)
        WatchWorkout.apply(context, squat)
        // The next set started before the rest ran out
        WatchWorkout.apply(context, squat.copy(text = "Set 4 of 4 · 100 kg × 8", restEndsAt = null, restStartedAt = null))
        Thread.sleep(10_000)
        assertEquals(null, shown(2))
        assertEquals("Set 4 of 4 · 100 kg × 8", shown(1)?.notification?.extras?.getString(Notification.EXTRA_TEXT))
    }

    // What happened on the owner's watch: the same rest sent again shortly before its end set the
    // alarm again (pushed 5 s out), and the phone's "no rest" right at the end then called it off
    @Test
    fun theRestStillRingsOnTimeWhenThePhoneSaysItsGoneAtItsEnd() {
        val start = System.currentTimeMillis()
        val end = start + 7_000
        val squat = WatchState("Leg Day", "Barbell Back Squat", "Set 3 of 4 · 100 kg × 8", start - 60_000, end, start - 1_000)
        WatchWorkout.apply(context, squat)
        Thread.sleep(4_000)
        WatchWorkout.apply(context, squat.copy(text = "Set 3 of 4 · 105 kg × 8")) // the weight changed mid-rest
        Thread.sleep(end - 500 - System.currentTimeMillis())
        WatchWorkout.apply(context, squat.copy(restEndsAt = null, restStartedAt = null)) // the phone's "rest over", a little early
        val over = waitFor("the Rest over card", 6_000) { shown(2) }
        val late = System.currentTimeMillis() - end
        assertTrue("rang $late ms after the rest's end", late < 2_000)
        assertEquals("Barbell Back Squat · Set 3 of 4 · 105 kg × 8", over.notification.extras.getString(Notification.EXTRA_TEXT))
    }

    @Test
    fun theScreenOpensOnTheIdleStateWithNothingFromThePhone() {
        ActivityScenario.launch(WatchActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                assertEquals("No workout", activity.findViewById<TextView>(R.id.title).text.toString())
                assertEquals("Start one on your phone", activity.findViewById<TextView>(R.id.text).text.toString())
            }
        }
    }
}

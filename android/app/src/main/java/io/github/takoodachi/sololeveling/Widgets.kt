package io.github.takoodachi.sololeveling

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.net.Uri
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.text.style.RelativeSizeSpan
import android.util.Base64
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.io.File
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.max
import kotlin.math.roundToLong

/**
 * Home-screen widgets: Today (calories, protein, steps, water and creatine), Quick log (four
 * buttons into the app), Today's workout and Strength rank, one provider each at the bottom. The
 * site sends today's numbers and the theme's colours (src/features/widgets/sendWidgets.ts →
 * [SoloPlugin.setWidgets]) as they change and as the app leaves the screen; they're kept here and
 * drawn from. A new day with the app closed starts from nothing logged, with the routine planned
 * for that weekday and whatever steps the background sync read ([raiseSteps]); the widgets redraw
 * every 30 minutes for that (`updatePeriodMillis`). A tap opens the app at a link, like an app
 * shortcut, so the logging itself stays the site's.
 */
object Widgets {
    private const val PREFS = "widgets"
    private const val DATA = "data"
    private const val STEPS_DATE = "stepsDate"
    private const val STEPS = "steps"
    private const val EMBLEM = "widget_emblem.png"

    enum class Kind { TODAY, QUICK, WORKOUT, RANK }

    private val PROVIDERS = mapOf(
        Kind.TODAY to TodayWidget::class.java,
        Kind.QUICK to QuickLogWidget::class.java,
        Kind.WORKOUT to WorkoutWidget::class.java,
        Kind.RANK to RankWidget::class.java,
    )

    private val DAY: DateTimeFormatter = DateTimeFormatter.ofPattern("EEE, MMM d", Locale.getDefault())

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** What the site sent: kept, then every widget on the home screen drawn from it. */
    fun save(context: Context, json: String, emblem: String?) {
        JSONObject(json) // only JSON is kept
        prefs(context).edit().putString(DATA, json).apply()
        if (!emblem.isNullOrEmpty()) File(context.filesDir, EMBLEM).writeBytes(Base64.decode(emblem, Base64.DEFAULT))
        refresh(context)
    }

    /** Steps the background sync read for [date]: raised, never lowered, like the app's own import. */
    fun raiseSteps(context: Context, date: String, steps: Long) {
        val p = prefs(context)
        val known = if (p.getString(STEPS_DATE, null) == date) p.getLong(STEPS, 0) else 0
        if (steps <= known) return
        p.edit().putString(STEPS_DATE, date).putLong(STEPS, steps).apply()
        refresh(context)
    }

    /** A reminder's log button did its job with the app closed (QuickLogWorker): shown straight away. */
    fun quickLogged(context: Context, kind: String, date: String, waterMl: Int?) {
        val data = prefs(context).getString(DATA, null)?.let { runCatching { JSONObject(it) }.getOrNull() } ?: return
        if (data.optString("date") != date) return
        when (kind) {
            "creatine" -> data.put("creatine", true)
            "water" -> {
                val water = data.optJSONObject("water")
                if (water == null || waterMl == null) return
                water.put("ml", waterMl)
            }
            else -> return
        }
        prefs(context).edit().putString(DATA, data.toString()).apply()
        refresh(context)
    }

    /** Redraws every widget of ours on the home screen. */
    fun refresh(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        for ((kind, provider) in PROVIDERS) {
            val ids = manager.getAppWidgetIds(ComponentName(context, provider))
            if (ids.isNotEmpty()) draw(context, manager, ids, kind)
        }
    }

    fun draw(context: Context, manager: AppWidgetManager, ids: IntArray, kind: Kind) {
        val day = read(context)
        val views = when (kind) {
            Kind.TODAY -> today(context, day)
            Kind.QUICK -> quick(context, day)
            Kind.WORKOUT -> workout(context, day)
            Kind.RANK -> rank(context, day)
        }
        manager.updateAppWidget(ids, views)
    }

    // ── What's drawn ──────────────────────────────────────────────────────────

    private class Colors(json: JSONObject?) {
        val card = color(json, "card", 0xFF1C1C1F.toInt())
        val text = color(json, "text", 0xFFF4F1EC.toInt())
        val muted = color(json, "muted", 0xFF8E8E95.toInt())
        val accent = color(json, "accent", 0xFFFF5F1A.toInt())
        val onAccent = color(json, "onAccent", Color.WHITE)
        val secondary = color(json, "secondary", 0xFF2A2A2E.toInt())
        /** A bar's empty part: the text colour, faint. */
        val track = (text and 0x00FFFFFF) or 0x26000000

        private fun color(json: JSONObject?, key: String, fallback: Int): Int =
            json?.optString(key)?.takeIf { it.matches(HEX) }?.let { Color.parseColor(it) } ?: fallback
    }

    private class Routine(json: JSONObject) {
        val name: String = json.optString("name")
        val exercises = json.optInt("exercises")
        val minutes = json.optInt("minutes")
    }

    private class Rank(json: JSONObject) {
        val label: String = json.optString("label")
        val rating = json.optInt("rating")
        val color: Int? = json.optString("color").takeIf { it.matches(HEX) }?.let { Color.parseColor(it) }
        val progress = json.optDouble("progress", 0.0)
        val next: String? = json.text("next")
        val toNext = json.optInt("toNext")
    }

    /** Today as the widgets show it: what the site sent, or a new day's start when that was for an earlier one. */
    private class Day(private val json: JSONObject?, nativeSteps: Long) {
        val sent = json != null
        private val fresh = json?.optString("date") == LocalDate.now().toString()
        val colors = Colors(json?.optJSONObject("colors"))

        private fun now(key: String, field: String) = if (fresh) json?.optJSONObject(key)?.optDouble(field, 0.0) ?: 0.0 else 0.0
        private fun goal(key: String, field: String) = json?.optJSONObject(key)?.optDouble(field, 0.0) ?: 0.0

        val kcal = now("kcal", "value")
        val kcalTarget = goal("kcal", "target")
        val protein = now("protein", "value")
        val proteinTarget = goal("protein", "target")
        val steps = max(now("steps", "value"), nativeSteps.toDouble())
        val stepGoal = goal("steps", "goal")
        val water = now("water", "ml")
        val waterGoal = goal("water", "goal")
        val creatine = fresh && json?.optBoolean("creatine") == true

        private val workout = json?.optJSONObject("workout")
        /** Today's routine; on a new day, the one planned for its weekday. */
        val routine: Routine? = (if (fresh) workout?.optJSONObject("routine") else json?.optJSONArray("week")?.optJSONObject(LocalDate.now().dayOfWeek.value % 7))?.let { Routine(it) }
        val done = fresh && workout?.optBoolean("done") == true
        val skipped = fresh && workout?.optBoolean("skipped") == true
        /** The workout in progress (its name): one left open carries over a new day. */
        val active: String? = workout?.text("active")
        val rank: Rank? = json?.optJSONObject("rank")?.let { Rank(it) }
    }

    private fun read(context: Context): Day {
        val p = prefs(context)
        val json = p.getString(DATA, null)?.let { runCatching { JSONObject(it) }.getOrNull() }
        val steps = if (p.getString(STEPS_DATE, null) == LocalDate.now().toString()) p.getLong(STEPS, 0) else 0
        return Day(json, steps)
    }

    // ── Drawing ───────────────────────────────────────────────────────────────

    private fun today(context: Context, d: Day): RemoteViews {
        val c = d.colors
        val v = RemoteViews(context.packageName, R.layout.widget_today)
        v.setInt(R.id.widget_bg, "setColorFilter", c.card)
        v.setTextViewText(R.id.today_title, if (d.sent) "Today · ${LocalDate.now().format(DAY)}" else "Open Solo Leveling to fill this in")
        v.setTextColor(R.id.today_title, c.text)
        v.setTextViewText(R.id.today_creatine, if (d.creatine) "Creatine ✓" else "+ Creatine")
        v.setTextColor(R.id.today_creatine, if (d.creatine) c.accent else c.muted)
        stat(v, R.id.kcal_label, R.id.kcal_value, R.id.kcal_bar, c, whole(d.kcal), d.kcalTarget, whole(d.kcalTarget), d.kcal)
        stat(v, R.id.protein_label, R.id.protein_value, R.id.protein_bar, c, whole(d.protein), d.proteinTarget, "${whole(d.proteinTarget)} g", d.protein)
        stat(v, R.id.steps_label, R.id.steps_value, R.id.steps_bar, c, whole(d.steps), d.stepGoal, whole(d.stepGoal), d.steps)
        stat(v, R.id.water_label, R.id.water_value, R.id.water_bar, c, litres(d.water), d.waterGoal, "${litres(d.waterGoal)} L", d.water)
        v.setOnClickPendingIntent(R.id.widget_root, open(context, 7101, "/home"))
        // The tick itself happens as the app opens (src/features/checkins/useCreatineLink.ts)
        v.setOnClickPendingIntent(R.id.today_creatine, open(context, 7102, "/home?log=creatine"))
        return v
    }

    /** One of Today's figures: its label, "value / target" (the target smaller and muted) and a bar. */
    private fun stat(v: RemoteViews, label: Int, value: Int, barId: Int, c: Colors, now: String, target: Double, of: String, amount: Double) {
        v.setTextColor(label, c.muted)
        v.setTextViewText(value, if (target > 0) pair(now, of, c.muted) else now)
        v.setTextColor(value, c.text)
        v.setImageViewBitmap(barId, bar(if (target > 0) amount / target else 0.0, c.accent, c.track))
    }

    private fun quick(context: Context, d: Day): RemoteViews {
        val c = d.colors
        val v = RemoteViews(context.packageName, R.layout.widget_quick)
        v.setInt(R.id.widget_bg, "setColorFilter", c.card)
        val active = d.active != null
        button(v, R.id.quick_workout, R.id.quick_workout_bg, R.id.quick_workout_icon, R.id.quick_workout_label, c,
            if (active) "Resume" else "Workout", active, open(context, 7111, if (active) "/workouts/active" else "/workouts?start=1"))
        button(v, R.id.quick_food, R.id.quick_food_bg, R.id.quick_food_icon, R.id.quick_food_label, c,
            "Food", false, open(context, 7112, "/nutrition?add=1"))
        button(v, R.id.quick_water, R.id.quick_water_bg, R.id.quick_water_icon, R.id.quick_water_label, c,
            "Water", false, open(context, 7113, "/home?log=water"))
        button(v, R.id.quick_creatine, R.id.quick_creatine_bg, R.id.quick_creatine_icon, R.id.quick_creatine_label, c,
            if (d.creatine) "Taken" else "Creatine", d.creatine, open(context, 7114, "/home?log=creatine"))
        return v
    }

    /** A Quick log button; `lit` (a workout running, creatine taken) fills it with the accent. */
    private fun button(v: RemoteViews, frame: Int, bg: Int, icon: Int, label: Int, c: Colors, text: String, lit: Boolean, tap: PendingIntent) {
        v.setInt(bg, "setColorFilter", if (lit) c.accent else c.secondary)
        v.setInt(icon, "setColorFilter", if (lit) c.onAccent else c.text)
        v.setTextViewText(label, text)
        v.setTextColor(label, if (lit) c.onAccent else c.text)
        v.setOnClickPendingIntent(frame, tap)
    }

    private fun workout(context: Context, d: Day): RemoteViews {
        val c = d.colors
        val v = RemoteViews(context.packageName, R.layout.widget_workout)
        v.setInt(R.id.widget_bg, "setColorFilter", c.card)
        v.setInt(R.id.workout_icon_bg, "setColorFilter", c.accent)
        v.setInt(R.id.workout_icon, "setColorFilter", c.onAccent)
        val r = d.routine
        val title: String
        val subtitle: String
        var button: String? = "Start"
        var path = "/workouts?start=1"
        when {
            !d.sent -> { title = "Today's workout"; subtitle = "Open Solo Leveling to fill this in"; button = null }
            d.active != null -> { title = d.active; subtitle = "In progress"; button = "Resume"; path = "/workouts/active" }
            d.done -> { title = r?.name ?: "Workout"; subtitle = "Done today ✓"; button = null }
            d.skipped -> { title = r?.name ?: "Rest day"; subtitle = "Skipped today" }
            r != null -> { title = r.name; subtitle = "${r.exercises} exercise${if (r.exercises == 1) "" else "s"} · about ${r.minutes} min" }
            else -> { title = "Rest day"; subtitle = "Nothing planned today" }
        }
        v.setTextViewText(R.id.workout_title, title)
        v.setTextColor(R.id.workout_title, c.text)
        v.setTextViewText(R.id.workout_subtitle, subtitle)
        v.setTextColor(R.id.workout_subtitle, if (d.done) c.accent else c.muted)
        // The app's own main button: the text colour as its fill
        v.setViewVisibility(R.id.workout_button, if (button == null) View.GONE else View.VISIBLE)
        v.setTextViewText(R.id.workout_button_label, button ?: "")
        v.setInt(R.id.workout_button_bg, "setColorFilter", c.text)
        v.setTextColor(R.id.workout_button_label, c.card)
        val tap = open(context, 7121, path)
        v.setOnClickPendingIntent(R.id.widget_root, tap)
        v.setOnClickPendingIntent(R.id.workout_button, tap)
        return v
    }

    private fun rank(context: Context, d: Day): RemoteViews {
        val c = d.colors
        val v = RemoteViews(context.packageName, R.layout.widget_rank)
        v.setInt(R.id.widget_bg, "setColorFilter", c.card)
        val r = d.rank
        val emblem = File(context.filesDir, EMBLEM).takeIf { r != null && it.exists() }?.let { BitmapFactory.decodeFile(it.path) }
        if (emblem != null) v.setImageViewBitmap(R.id.rank_emblem, emblem)
        v.setViewVisibility(R.id.rank_emblem, if (emblem != null) View.VISIBLE else View.GONE)
        v.setTextViewText(R.id.rank_label, r?.label ?: "No rank yet")
        v.setTextColor(R.id.rank_label, r?.color ?: c.text)
        v.setTextViewText(R.id.rank_detail, when {
            r == null -> if (d.sent) "Log a ranked lift" else "Open the app first"
            r.next == null -> "${r.rating} · the top"
            else -> "${r.rating} · ${r.toNext} to ${r.next}"
        })
        v.setTextColor(R.id.rank_detail, c.muted)
        v.setViewVisibility(R.id.rank_bar, if (r == null) View.GONE else View.VISIBLE)
        if (r != null) v.setImageViewBitmap(R.id.rank_bar, bar(r.progress, r.color ?: c.accent, c.track))
        v.setOnClickPendingIntent(R.id.widget_root, open(context, 7131, "/ranks"))
        return v
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private val HEX = Regex("#[0-9a-fA-F]{6}")

    /** A text field, or null: Android's optString answers a JSON null with the word "null". */
    private fun JSONObject.text(key: String): String? = if (isNull(key)) null else optString(key).ifEmpty { null }

    private fun whole(n: Double) = String.format(Locale.getDefault(), "%,d", n.roundToLong())
    private fun litres(ml: Double) = String.format(Locale.getDefault(), "%.1f", ml / 1000)

    /** "1,240 / 2,400": the target smaller and muted. */
    private fun pair(value: String, of: String, muted: Int): CharSequence = SpannableStringBuilder(value).apply {
        val start = length
        append(" / ").append(of)
        setSpan(RelativeSizeSpan(0.75f), start, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        setSpan(ForegroundColorSpan(muted), start, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    }

    /**
     * A progress bar as a picture: a widget can't tint a ProgressBar before Android 12, nor size a
     * view by script, so the bar is drawn here and stretched across its slot.
     */
    private fun bar(fraction: Double, fill: Int, track: Int): Bitmap {
        val w = 400f
        val h = 16f
        val bitmap = Bitmap.createBitmap(w.toInt(), h.toInt(), Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        paint.color = track
        canvas.drawRoundRect(0f, 0f, w, h, h / 2, h / 2, paint)
        val filled = (fraction.coerceIn(0.0, 1.0) * w).toFloat()
        if (filled > 0) {
            paint.color = fill
            canvas.drawRoundRect(0f, 0f, max(filled, h), h, h / 2, h / 2, paint)
        }
        return bitmap
    }

    /** Opens the app at [path], the same link a notification or an app shortcut uses. */
    private fun open(context: Context, code: Int, path: String): PendingIntent = PendingIntent.getActivity(
        context, code,
        Intent(context, MainActivity::class.java)
            .setAction(Intent.ACTION_VIEW)
            .setData(Uri.parse("solo://open$path"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
}

class TodayWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = Widgets.draw(context, manager, ids, Widgets.Kind.TODAY)
}

class QuickLogWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = Widgets.draw(context, manager, ids, Widgets.Kind.QUICK)
}

class WorkoutWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = Widgets.draw(context, manager, ids, Widgets.Kind.WORKOUT)
}

class RankWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = Widgets.draw(context, manager, ids, Widgets.Kind.RANK)
}

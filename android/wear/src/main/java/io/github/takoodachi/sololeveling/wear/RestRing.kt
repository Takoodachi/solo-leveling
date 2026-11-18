package io.github.takoodachi.sololeveling.wear

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View

/** The rest left as a ring around the edge of the watch, emptying from the top; nothing outside a rest. */
class RestRing(context: Context, attrs: AttributeSet?) : View(context, attrs) {
    /** Rest left, 1 → 0; null draws nothing. */
    var progress: Float? = null
        set(value) {
            if (field != value) {
                field = value
                invalidate()
            }
        }

    private val density = resources.displayMetrics.density
    private val stroke = 6 * density
    private val track = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = stroke
        color = 0x2EFFFFFF
    }
    private val arc = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = stroke
        strokeCap = Paint.Cap.ROUND
        color = context.getColor(R.color.accent)
    }
    private val box = RectF()

    override fun onDraw(canvas: Canvas) {
        val left = progress ?: return
        val inset = stroke / 2 + 4 * density
        box.set(inset, inset, width - inset, height - inset)
        canvas.drawOval(box, track)
        if (left > 0f) canvas.drawArc(box, -90f, 360f * left, false, arc)
    }
}

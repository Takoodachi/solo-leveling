package io.github.takoodachi.sololeveling

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * The broadcasts behind quick-log reminders ([QuickLog]): an alarm going off (post the
 * reminder), its button pressed (log through [QuickLogWorker]), and the phone restarting or
 * the app updating (set the alarms again).
 */
class QuickLogReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            QuickLog.ACTION_SHOW -> QuickLog.find(context, intent.getIntExtra(QuickLog.EXTRA_ID, 0))?.let { QuickLog.post(context, it) }
            QuickLog.ACTION_LOG -> {
                val id = intent.getIntExtra(QuickLog.EXTRA_ID, 0)
                val kind = intent.getStringExtra(QuickLog.EXTRA_KIND) ?: return
                val date = intent.getStringExtra(QuickLog.EXTRA_DATE) ?: return
                QuickLog.working(context, id, if (kind == "creatine") "Ticking off creatine…" else "Adding a glass of water…")
                QuickLogWorker.enqueue(context, id, kind, date)
            }
            Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED, "android.intent.action.QUICKBOOT_POWERON" -> QuickLog.rearm(context)
        }
    }
}

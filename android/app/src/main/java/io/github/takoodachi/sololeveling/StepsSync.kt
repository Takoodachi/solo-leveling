package io.github.takoodachi.sololeveling

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import kotlinx.coroutines.flow.first
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.Period
import java.util.concurrent.TimeUnit

/**
 * Step sync while the app is closed (Settings → Steps → "Sync in the background").
 *
 * The app itself imports steps whenever it's opened (src/features/health). This keeps the
 * account current in between: about once an hour [StepsSyncWorker] reads the day totals from
 * Health Connect and hands them to the site, loaded in an off-screen WebView, which saves and
 * syncs them with the same code the open app uses.
 */
object StepsSync {
    private const val WORK = "steps-sync"
    private const val PREFS = "steps-sync"
    private const val LAST_RUN = "lastRunAt"
    private const val LAST_RESULT = "lastResult"

    /** The same window the app imports when it's opened. */
    private const val DAYS = 14L

    const val BACKGROUND_PERMISSION = HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND
    private val STEPS_PERMISSION = HealthPermission.getReadPermission(StepsRecord::class)

    data class Access(val supported: Boolean, val granted: Boolean)

    private fun client(context: Context): HealthConnectClient? =
        if (HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE) HealthConnectClient.getOrCreate(context) else null

    /** Whether this phone's Health Connect can be read in the background, and whether we may. */
    suspend fun access(context: Context): Access {
        val client = client(context) ?: return Access(supported = false, granted = false)
        val supported = client.features.getFeatureStatus(HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND) ==
            HealthConnectFeatures.FEATURE_STATUS_AVAILABLE
        val granted = supported && client.permissionController.getGrantedPermissions().containsAll(setOf(STEPS_PERMISSION, BACKGROUND_PERMISSION))
        return Access(supported, granted)
    }

    /**
     * Each local day's step total for the last [DAYS] days, as the JSON the site expects:
     * `[{"date":"2026-10-04","steps":8123}, …]`. Health Connect merges the sources (phone,
     * watch) without double counting. Null without access.
     */
    suspend fun readDays(context: Context): String? {
        if (!access(context).granted) return null
        val client = client(context) ?: return null
        val today = LocalDate.now()
        val buckets = client.aggregateGroupByPeriod(
            AggregateGroupByPeriodRequest(
                metrics = setOf(StepsRecord.COUNT_TOTAL),
                timeRangeFilter = TimeRangeFilter.between(today.minusDays(DAYS - 1).atStartOfDay(), today.plusDays(1).atStartOfDay()),
                timeRangeSlicer = Period.ofDays(1),
            )
        )
        val days = JSONArray()
        for (bucket in buckets) {
            days.put(JSONObject().put("date", bucket.startTime.toLocalDate().toString()).put("steps", bucket.result[StepsRecord.COUNT_TOTAL] ?: 0L))
        }
        return days.toString()
    }

    fun schedule(context: Context) {
        val request = PeriodicWorkRequestBuilder<StepsSyncWorker>(1, TimeUnit.HOURS)
            // The site and the sync both need the network
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.UPDATE, request)
    }

    fun cancel(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(WORK)
    }

    suspend fun isScheduled(context: Context): Boolean =
        WorkManager.getInstance(context).getWorkInfosForUniqueWorkFlow(WORK).first()
            .any { it.state == WorkInfo.State.ENQUEUED || it.state == WorkInfo.State.RUNNING }

    fun record(context: Context, result: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putLong(LAST_RUN, System.currentTimeMillis())
            .putString(LAST_RESULT, result)
            .apply()
    }

    fun lastRun(context: Context): Pair<Long, String?> {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return prefs.getLong(LAST_RUN, 0L) to prefs.getString(LAST_RESULT, null)
    }
}

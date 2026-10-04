package io.github.takoodachi.sololeveling

import android.annotation.SuppressLint
import android.content.Context
import android.webkit.JavascriptInterface
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.getcapacitor.CapConfig
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.selects.select
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import org.json.JSONObject

/**
 * One press of a reminder's log button ([QuickLog]). Like [StepsSyncWorker], the site does the
 * writing, loaded in a WebView nobody sees: it finds the job on `window.SoloBackground.task()`,
 * ticks creatine or adds a glass to that day, syncs, and answers through `done`
 * (src/features/reminders/quickLogTask.ts). The answer replaces the notification.
 */
class QuickLogWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val id = inputData.getInt(KEY_ID, 0)
        val task = JSONObject()
            .put("kind", inputData.getString(KEY_KIND))
            .put("date", inputData.getString(KEY_DATE))
            .toString()
        val answer = try {
            val url = CapConfig.loadDefault(applicationContext).serverUrl
            if (url == null) null else withTimeoutOrNull(PAGE_TIMEOUT_MS) { runInSite(url, task) }
        } catch (e: Exception) {
            null
        }
        val result = answer?.let { runCatching { JSONObject(it) }.getOrNull() }
        if (result != null) {
            QuickLog.finished(applicationContext, id, result.optBoolean("ok"), result.optString("title"), result.optString("detail"))
        } else {
            QuickLog.finished(applicationContext, id, false, "Couldn’t log it", "The app didn’t answer. Open it to log it.")
        }
        return Result.success()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private suspend fun runInSite(url: String, task: String): String = withContext(Dispatchers.Main) {
        val answer = CompletableDeferred<String>()
        val loadError = CompletableDeferred<String>()
        val page = WebView(applicationContext)
        try {
            page.settings.javaScriptEnabled = true
            page.settings.domStorageEnabled = true
            page.addJavascriptInterface(PageBridge(task, answer), "SoloBackground")
            page.webViewClient = object : WebViewClient() {
                override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                    if (request.isForMainFrame) loadError.complete(error.description.toString())
                }
            }
            page.loadUrl(url)
            select {
                answer.onAwait { it }
                // Not the end yet. Offline, when the site's service worker has gone to sleep, the load
                // first fails on the network and then arrives from the worker's cache a moment later
                loadError.onAwait { reason ->
                    withTimeoutOrNull(LOAD_RETRY_MS) { answer.await() }
                        ?: JSONObject().put("ok", false).put("title", "Couldn’t log it").put("detail", "The app didn’t load ($reason). Open it to log it.").toString()
                }
            }
        } finally {
            page.destroy()
        }
    }

    /** What the off-screen page sees as `window.SoloBackground`. */
    private class PageBridge(private val task: String, private val answer: CompletableDeferred<String>) {
        @JavascriptInterface
        fun task(): String = task

        @JavascriptInterface
        fun done(result: String) {
            answer.complete(result)
        }
    }

    companion object {
        private const val KEY_ID = "id"
        private const val KEY_KIND = "kind"
        private const val KEY_DATE = "date"
        private const val PAGE_TIMEOUT_MS = 60_000L
        /** How long the page still has to answer after its load reported an error. */
        private const val LOAD_RETRY_MS = 10_000L

        /**
         * One job per notification, so a second tap before the first is done can't add a second glass.
         * It runs straight away, connection or not: offline the site comes from its service worker's
         * cache and the log is saved on the phone, to sync when the app is next opened. Waiting for
         * a connection instead would leave the "working" notification spinning until there is one.
         */
        fun enqueue(context: Context, id: Int, kind: String, date: String) {
            val request = OneTimeWorkRequestBuilder<QuickLogWorker>()
                .setInputData(workDataOf(KEY_ID to id, KEY_KIND to kind, KEY_DATE to date))
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork("quick-log-$id", ExistingWorkPolicy.KEEP, request)
        }
    }
}

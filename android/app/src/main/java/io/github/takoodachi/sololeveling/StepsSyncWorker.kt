package io.github.takoodachi.sololeveling

import android.annotation.SuppressLint
import android.content.Context
import android.webkit.JavascriptInterface
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.getcapacitor.CapConfig
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

/**
 * One background step sync. The steps come from Health Connect here; saving them belongs to
 * the site, because the app's data lives in the WebView's own storage (IndexedDB) and its
 * sign-in session does too. So the site is loaded in a WebView nobody sees, with the steps on
 * `window.SoloBackground`: it writes them (a day is only ever raised), syncs, and reports back
 * through `done` (src/features/health/backgroundSteps.ts).
 */
class StepsSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        // With the app on screen it imports steps itself: nothing to do, and nothing worth
        // reporting over the last real run (the first run comes right after switching this on)
        if (MainActivity.inForeground) return Result.success()
        val outcome = try {
            sync()
        } catch (e: Exception) {
            "Stopped: ${e.message ?: e.javaClass.simpleName}"
        }
        StepsSync.record(applicationContext, outcome)
        // Never retried early: the next hourly run covers the same days
        return Result.success()
    }

    private suspend fun sync(): String {
        val days = StepsSync.readDays(applicationContext) ?: return "Stopped: background step access isn’t allowed in Health Connect"
        val url = CapConfig.loadDefault(applicationContext).serverUrl ?: return "Stopped: the app has no site to load"
        return withTimeoutOrNull(PAGE_TIMEOUT_MS) { saveThroughSite(url, days) } ?: "Stopped: the app didn’t answer in time"
    }

    @SuppressLint("SetJavaScriptEnabled")
    private suspend fun saveThroughSite(url: String, days: String): String = withContext(Dispatchers.Main) {
        val outcome = CompletableDeferred<String>()
        val page = WebView(applicationContext)
        try {
            page.settings.javaScriptEnabled = true
            page.settings.domStorageEnabled = true
            page.addJavascriptInterface(PageBridge(days, outcome), "SoloBackground")
            page.webViewClient = object : WebViewClient() {
                override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                    if (request.isForMainFrame) outcome.complete("Stopped: couldn’t load the app (${error.description})")
                }
            }
            page.loadUrl(url)
            outcome.await()
        } finally {
            page.destroy()
        }
    }

    /** What the off-screen page sees as `window.SoloBackground`. */
    private class PageBridge(private val days: String, private val outcome: CompletableDeferred<String>) {
        @JavascriptInterface
        fun steps(): String = days

        @JavascriptInterface
        fun done(result: String) {
            outcome.complete(result)
        }
    }

    private companion object {
        const val PAGE_TIMEOUT_MS = 90_000L
    }
}

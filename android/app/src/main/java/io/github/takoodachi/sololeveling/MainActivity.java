package io.github.takoodachi.sololeveling;

import android.os.Bundle;
import android.view.View;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /** True while the app is on screen: the background step sync leaves the work to the app itself. */
    public static volatile boolean inForeground = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Shortcuts and background step sync (must be registered before the bridge starts)
        registerPlugin(SoloPlugin.class);
        super.onCreate(savedInstanceState);
        // No bar down the side while scrolling: the WebView draws its own, whatever the page's CSS says
        getBridge().getWebView().setVerticalScrollBarEnabled(false);
        getBridge().getWebView().setHorizontalScrollBarEnabled(false);
        // No stretch at the ends of a scroll: the WebView applies Android's, whatever the page's CSS
        // says, and a fast fling to the top could black the screen out for a moment
        getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
    }

    @Override
    public void onResume() {
        super.onResume();
        inForeground = true;
    }

    @Override
    public void onPause() {
        super.onPause();
        inForeground = false;
    }
}

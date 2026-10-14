package com.keyfoundry.hifos;

import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String NATIVE_ENTER_EVENT = "native-enter";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HifosSystemSettingPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getKeyCode() == KeyEvent.KEYCODE_ENTER) {
            if (event.getAction() == KeyEvent.ACTION_UP) {
                dispatchNativeEnterEvent();
            }

            return true;
        }

        return super.dispatchKeyEvent(event);
    }

    private void dispatchNativeEnterEvent() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        WebView webView = getBridge().getWebView();
        webView.post(() -> webView.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('" + NATIVE_ENTER_EVENT + "'));",
            null
        ));
    }
}

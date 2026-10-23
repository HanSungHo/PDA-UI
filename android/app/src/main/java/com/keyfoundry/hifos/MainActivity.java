package com.keyfoundry.hifos;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String NATIVE_ENTER_EVENT = "native-enter";
    private static final int EQP_SPC_NOTIFICATION_PERMISSION_REQUEST = 1925;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HifosSystemSettingPlugin.class);
        registerPlugin(HifosUdpAlarmPlugin.class);
        super.onCreate(savedInstanceState);
        requestNotificationPermission();
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(
                new String[] {Manifest.permission.POST_NOTIFICATIONS},
                EQP_SPC_NOTIFICATION_PERMISSION_REQUEST
            );
        }
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

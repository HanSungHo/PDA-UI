package com.keyfoundry.hifos;

import android.content.Intent;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.math.BigInteger;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.ByteOrder;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "HifosSystemSetting")
public class HifosSystemSettingPlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean downloading = new AtomicBoolean(false);
    private final Set<String> downloadedFiles = ConcurrentHashMap.newKeySet();
    private OnBackPressedCallback backCallback;

    @Override
    public void load() {
        backCallback = new OnBackPressedCallback(false) {
            @Override
            public void handleOnBackPressed() {
                if (bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('system-setting-back'));", null);
                }
            }
        };
        getActivity().getOnBackPressedDispatcher().addCallback(getActivity(), backCallback);
    }

    @PluginMethod
    public void setBackBlocked(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            backCallback.setEnabled(Boolean.TRUE.equals(call.getBoolean("blocked", false)));
            call.resolve();
        });
    }

    @PluginMethod
    public void getWifiIpAddress(PluginCall call) {
        try {
            WifiManager wifiManager = (WifiManager) getContext().getApplicationContext()
                .getSystemService(android.content.Context.WIFI_SERVICE);
            if (wifiManager == null) {
                call.resolve(new com.getcapacitor.JSObject().put("ipAddress", null));
                return;
            }
            int address = wifiManager.getConnectionInfo().getIpAddress();
            if (ByteOrder.nativeOrder().equals(ByteOrder.LITTLE_ENDIAN)) {
                address = Integer.reverseBytes(address);
            }
            byte[] bytes = BigInteger.valueOf(address & 0xffffffffL).toByteArray();
            if (bytes.length > 4) bytes = java.util.Arrays.copyOfRange(bytes, bytes.length - 4, bytes.length);
            String ip = InetAddress.getByAddress(bytes).getHostAddress();
            call.resolve(new com.getcapacitor.JSObject().put("ipAddress", ip));
        } catch (UnknownHostException exception) {
            call.resolve(new com.getcapacitor.JSObject().put("ipAddress", null));
        } catch (Exception exception) {
            call.reject("Unable to get Wi-Fi IP address", exception);
        }
    }

    static URL validateDownloadTarget(String address, String fileName) throws IOException {
        if (!"EmBatteryMonitor.apk".equals(fileName) && !"PMDMAgent.apk".equals(fileName)) {
            throw new IOException("Invalid APK file name");
        }
        URL url = new URL(address == null ? "" : address);
        if ((!"http".equals(url.getProtocol()) && !"https".equals(url.getProtocol()))
            || url.getHost().isEmpty() || url.getUserInfo() != null
            || url.getQuery() != null || url.getRef() != null
            || !("/upload/" + fileName).equals(url.getPath())) {
            throw new IOException("Invalid APK URL");
        }
        return url;
    }

    @PluginMethod
    public void downloadApk(PluginCall call) {
        final URL url;
        final String fileName = call.getString("fileName");
        try {
            url = validateDownloadTarget(call.getString("url"), fileName);
        } catch (IOException exception) {
            call.reject(exception.getMessage(), exception);
            return;
        }
        if (!downloading.compareAndSet(false, true)) {
            call.reject("APK download already in progress");
            return;
        }

        executor.execute(() -> {
            HttpURLConnection connection = null;
            File partial = null;
            try {
                File apkFile = getApkFile(fileName);
                if (downloadedFiles.contains(fileName) && apkFile.isFile()) {
                    getActivity().runOnUiThread(() -> installApk(call, apkFile));
                    return;
                }
                partial = new File(apkFile.getParentFile(), fileName + ".part");
                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);
                connection.setInstanceFollowRedirects(false);
                if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                    throw new IOException("APK download failed: " + connection.getResponseCode());
                }
                long total = 0;
                try (InputStream input = connection.getInputStream();
                     FileOutputStream output = new FileOutputStream(partial)) {
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = input.read(buffer)) != -1) {
                        output.write(buffer, 0, bytesRead);
                        total += bytesRead;
                    }
                }
                long expected = connection.getContentLengthLong();
                if (total == 0 || (expected >= 0 && total != expected)) {
                    throw new IOException("Incomplete APK download");
                }
                if (!partial.renameTo(apkFile)) throw new IOException("Unable to save APK");
                downloadedFiles.add(fileName);
                getActivity().runOnUiThread(() -> installApk(call, apkFile));
            } catch (Exception exception) {
                downloading.set(false);
                call.reject(exception.getMessage(), exception);
            } finally {
                if (connection != null) connection.disconnect();
                if (partial != null && partial.exists()) partial.delete();
            }
        });
    }

    private File getApkFile(String fileName) throws IOException {
        File root = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (root == null) throw new IOException("Download storage unavailable");
        File directory = new File(root, "DOWNLOADS");
        if (!directory.isDirectory() && !directory.mkdirs()) {
            throw new IOException("Unable to create download directory");
        }
        return new File(directory, fileName);
    }

    private boolean canInstall() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O
            || getContext().getPackageManager().canRequestPackageInstalls();
    }

    private void installApk(PluginCall call, File apkFile) {
        try {
            if (!canInstall()) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName()));
                startActivityForResult(call, intent, "onActivityResult");
                return;
            }
            triggerInstall(apkFile);
            downloading.set(false);
            call.resolve();
        } catch (Exception exception) {
            downloading.set(false);
            call.reject(exception.getMessage(), exception);
        }
    }

    private void triggerInstall(File apkFile) {
        Uri uri = FileProvider.getUriForFile(getContext(),
            getContext().getPackageName() + ".fileprovider", apkFile);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }

    @ActivityCallback
    private void onActivityResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            downloading.set(false);
            return;
        }
        try {
            if (!canInstall()) {
                downloading.set(false);
                call.reject("설치 권한이 필요합니다.");
                return;
            }
            triggerInstall(getApkFile(call.getString("fileName")));
            downloading.set(false);
            call.resolve();
        } catch (Exception exception) {
            downloading.set(false);
            call.reject(exception.getMessage(), exception);
        }
    }

    @Override
    protected void handleOnDestroy() {
        executor.shutdownNow();
        if (backCallback != null) backCallback.remove();
    }
}

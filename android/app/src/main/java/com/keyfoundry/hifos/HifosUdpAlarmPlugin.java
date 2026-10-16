package com.keyfoundry.hifos;

import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** Receives the legacy UDP high-level alarm stream for AlarmCommonActivity parity. */
@CapacitorPlugin(name = "HifosUdpAlarm")
public class HifosUdpAlarmPlugin extends Plugin {
    private static final String TAG = "HifosUdpAlarm";
    private static final int UDP_PORT = 9999;
    private static final String LEVEL_HIGH = "HIGH";
    private static final String[] SPECIAL_EVENT_TYPES = {
        "MDSSPC", "EQPSPC", "RECIPE", "STEPPERIDLE", "PR_EMPTY"
    };

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean listening = new AtomicBoolean(false);
    private DatagramSocket socket;

    @PluginMethod
    public void startListening(PluginCall call) {
        if (listening.compareAndSet(false, true)) {
            executor.execute(this::listen);
        }
        call.resolve();
    }

    private void listen() {
        byte[] buffer = new byte[10000];
        try (DatagramSocket udpSocket = new DatagramSocket(UDP_PORT)) {
            socket = udpSocket;
            udpSocket.setReuseAddress(true);
            while (listening.get()) {
                DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                udpSocket.receive(packet);
                handlePacket(new String(packet.getData(), 0, packet.getLength(), StandardCharsets.UTF_8));
            }
        } catch (Exception exception) {
            if (listening.get()) Log.e(TAG, "UDP receive failed", exception);
        } finally {
            socket = null;
            listening.set(false);
        }
    }

    private void handlePacket(String packetContent) {
        try {
            JSONObject message = new JSONObject(packetContent);
            String level = message.optString("LEVEL");
            String content = message.optString("MESSAGE");
            String roomName = message.optString("ROOMNAME");

            if (!LEVEL_HIGH.equals(level) || roomName.isEmpty() || isSpecialEvent(content)) return;

            JSObject payload = new JSObject();
            payload.put("level", level);
            payload.put("message", content);
            payload.put("roomName", roomName);
            notifyListeners("alarmCommon", payload);
            vibrate();
        } catch (Exception exception) {
            Log.e(TAG, "Unable to parse UDP alarm", exception);
        }
    }

    private boolean isSpecialEvent(String content) {
        for (String eventType : SPECIAL_EVENT_TYPES) {
            if (content.contains("<EVENT_TYPE>" + eventType + "</EVENT_TYPE>")) return true;
        }
        return content.contains("<EVENT_TYPE>FDC</EVENT_TYPE>");
    }

    private void vibrate() {
        Vibrator vibrator = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator == null || !vibrator.hasVibrator()) return;

        long[] pattern = {200, 400, 200, 400};
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, VibrationEffect.DEFAULT_AMPLITUDE));
        } else {
            vibrator.vibrate(pattern, -1);
        }
    }

    @Override
    protected void handleOnDestroy() {
        listening.set(false);
        if (socket != null) socket.close();
        executor.shutdownNow();
    }
}

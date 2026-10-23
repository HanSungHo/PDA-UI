package com.keyfoundry.hifos;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/** Receives the legacy UDP high-level alarm stream. */
@CapacitorPlugin(name = "HifosUdpAlarm")
public class HifosUdpAlarmPlugin extends Plugin {
    private static final String TAG = "HifosUdpAlarm";
    private static final int UDP_PORT = 9999;
    private static final String LEVEL_HIGH = "HIGH";
    private static final String EQP_SPC_CHANNEL_ID = "eqp_spc_interlock";
    private static final String EQP_SPC_ACTION = "com.keyfoundry.hifos.EQP_SPC_INTERLOCK";
    private static final String EXTRA_EQP_SPC_MESSAGE = "eqpSpcMessage";
    private static final String EXTRA_EQP_SPC_EVENT_ID = "eqpSpcEventId";
    private static final int MAX_DELIVERED_EQP_SPC_IDS = 512;
    private static final String STEPPER_IDLE_EVENT = "<EVENT_TYPE>STEPPERIDLE</EVENT_TYPE>";
    private static final String[] SPECIAL_EVENT_TYPES = {
        "MDSSPC", "EQPSPC", "RECIPE", "STEPPERIDLE", "PR_EMPTY"
    };

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean listening = new AtomicBoolean(false);
    private final AtomicBoolean appInForeground = new AtomicBoolean(false);
    private final AtomicInteger nextNotificationId = new AtomicInteger((int) System.currentTimeMillis());
    private final ConcurrentLinkedQueue<PendingEQPspcEvent> pendingEQPspcEvents = new ConcurrentLinkedQueue<>();
    private final Set<Integer> enqueuedEQPspcIds = ConcurrentHashMap.newKeySet();
    private final Set<Integer> deliveredEQPspcIds = ConcurrentHashMap.newKeySet();
    private final ConcurrentLinkedQueue<Integer> deliveredEQPspcOrder = new ConcurrentLinkedQueue<>();
    private DatagramSocket socket;

    private static class PendingEQPspcEvent {
        final int id;
        final String message;

        PendingEQPspcEvent(int id, String message) {
            this.id = id;
            this.message = message;
        }
    }

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

            if (!LEVEL_HIGH.equals(level)) return;
            if (content.contains("<EVENT_TYPE>EQPSPC</EVENT_TYPE>")) {
                if (appInForeground.get()) {
                    if (hasListeners("eqpSpc")) {
                        notifyEQPspc(content);
                    } else {
                        enqueueEQPspc(nextNotificationId.incrementAndGet(), content);
                        dispatchPendingEQPspc();
                    }
                    vibrate();
                } else {
                    int eventId = nextNotificationId.incrementAndGet();
                    enqueueEQPspc(eventId, content);
                    showEQPspcNotification(eventId, content);
                    if (appInForeground.get()) dispatchPendingEQPspc();
                }
                return;
            }

            if (roomName.isEmpty() || isSpecialEvent(content)) return;

            JSObject payload = new JSObject();
            payload.put("level", level);
            payload.put("message", content);

            if (content.contains(STEPPER_IDLE_EVENT)) {
                notifyListeners("udpMessage", payload);
                vibrate();
                return;
            }

            if (roomName.isEmpty() || isSpecialEvent(content)) return;

            payload.put("roomName", roomName);
            notifyListeners("alarmCommon", payload);
            vibrate();
        } catch (Exception exception) {
            Log.e(TAG, "Unable to parse UDP alarm", exception);
        }
    }

    @PluginMethod
    public void consumePendingEQPspc(PluginCall call) {
        JSArray messages = new JSArray();
        PendingEQPspcEvent event;
        while ((event = pendingEQPspcEvents.poll()) != null) {
            enqueuedEQPspcIds.remove(event.id);
            if (markEQPspcDelivered(event.id)) {
                messages.put(event.message);
                cancelEQPspcNotification(event.id);
            }
        }

        Intent launchIntent = getActivity().getIntent();
        if (launchIntent != null) {
            String message = launchIntent.getStringExtra(EXTRA_EQP_SPC_MESSAGE);
            if (message != null) {
                int eventId = launchIntent.getIntExtra(EXTRA_EQP_SPC_EVENT_ID, 0);
                if (!launchIntent.hasExtra(EXTRA_EQP_SPC_EVENT_ID)) {
                    eventId = nextNotificationId.incrementAndGet();
                }
                if (markEQPspcDelivered(eventId)) messages.put(message);
                cancelEQPspcNotification(eventId);
                launchIntent.removeExtra(EXTRA_EQP_SPC_MESSAGE);
                launchIntent.removeExtra(EXTRA_EQP_SPC_EVENT_ID);
            }
        }

        JSObject result = new JSObject();
        result.put("messages", messages);
        call.resolve(result);
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        String message = intent.getStringExtra(EXTRA_EQP_SPC_MESSAGE);
        if (message == null) return;

        int eventId = intent.getIntExtra(EXTRA_EQP_SPC_EVENT_ID, 0);
        if (!intent.hasExtra(EXTRA_EQP_SPC_EVENT_ID)) eventId = nextNotificationId.incrementAndGet();
        intent.removeExtra(EXTRA_EQP_SPC_MESSAGE);
        intent.removeExtra(EXTRA_EQP_SPC_EVENT_ID);
        enqueueEQPspc(eventId, message);
        if (appInForeground.get()) dispatchPendingEQPspc();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        appInForeground.set(true);
        dispatchPendingEQPspc();
    }

    @Override
    protected void handleOnPause() {
        appInForeground.set(false);
        super.handleOnPause();
    }

    private void dispatchPendingEQPspc() {
        if (!hasListeners("eqpSpc")) return;
        PendingEQPspcEvent event;
        while ((event = pendingEQPspcEvents.poll()) != null) {
            enqueuedEQPspcIds.remove(event.id);
            if (markEQPspcDelivered(event.id)) {
                notifyEQPspc(event.message);
                cancelEQPspcNotification(event.id);
            }
        }
    }

    private void enqueueEQPspc(int eventId, String message) {
        if (!deliveredEQPspcIds.contains(eventId) && enqueuedEQPspcIds.add(eventId)) {
            pendingEQPspcEvents.add(new PendingEQPspcEvent(eventId, message));
        }
    }

    private boolean markEQPspcDelivered(int eventId) {
        if (!deliveredEQPspcIds.add(eventId)) return false;
        deliveredEQPspcOrder.add(eventId);
        while (deliveredEQPspcOrder.size() > MAX_DELIVERED_EQP_SPC_IDS) {
            Integer oldestId = deliveredEQPspcOrder.poll();
            if (oldestId != null) deliveredEQPspcIds.remove(oldestId);
        }
        return true;
    }

    private void cancelEQPspcNotification(int eventId) {
        NotificationManager notificationManager =
            (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) notificationManager.cancel(eventId);
    }

    private void notifyEQPspc(String message) {
        JSObject payload = new JSObject();
        payload.put("message", message);
        notifyListeners("eqpSpc", payload);
    }

    private void showEQPspcNotification(int eventId, String message) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Cannot show EQP SPC notification: notification permission is not granted");
            return;
        }

        NotificationManager notificationManager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                EQP_SPC_CHANNEL_ID,
                "EQP SPC Interlock",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Equipment SPC interlock alerts");
            channel.enableVibration(true);
            notificationManager.createNotificationChannel(channel);
        }

        NotificationChannel activeChannel = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? notificationManager.getNotificationChannel(EQP_SPC_CHANNEL_ID) : null;
        if (!notificationManager.areNotificationsEnabled()
            || (activeChannel != null && activeChannel.getImportance() == NotificationManager.IMPORTANCE_NONE)) {
            return;
        }

        Intent openIntent = new Intent(context, MainActivity.class)
            .setAction(EQP_SPC_ACTION + "." + eventId)
            .putExtra(EXTRA_EQP_SPC_MESSAGE, message)
            .putExtra(EXTRA_EQP_SPC_EVENT_ID, eventId)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP
                | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            context,
            eventId,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder notification = new NotificationCompat.Builder(context, EQP_SPC_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("#EQPSPC INTERLOCK#")
            .setContentText("Tap to view equipment interlock details.")
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .setVibrate(new long[] {200, 400, 200, 400});
        try {
            notificationManager.notify(eventId, notification.build());
            if (deliveredEQPspcIds.contains(eventId)) notificationManager.cancel(eventId);
        } catch (SecurityException exception) {
            Log.w(TAG, "Cannot show EQP SPC notification", exception);
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

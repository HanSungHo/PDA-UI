package com.keyfoundry.hifos;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.Person;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** Owns the legacy UDP receiver outside the WebView lifecycle. */
public class HifosUdpAlarmService extends Service {
    private static final String TAG = "HifosUdpAlarm";
    private static final String CHANNEL_ID = "hifos_udp_alarm";
    private static final String ALARM_CHANNEL_ID = "hifos_udp_alarm_alert";
    // Android UDPService.kt createNotificationChannels()/showChatNotification().
    private static final String CHAT_CHANNEL_ID = "udp_chat_channel";
    static final String EXTRA_ROOM_ID = "roomId";
    static final String EXTRA_ROOM_NAME = "roomName";
    static final String EXTRA_CLEAR_MESSAGES = "clearMessages";
    private static final String CHAT_GROUP = "udp_chat_group";
    private static final String LEVEL_NORMAL = "NORMAL";
    private static final int NOTIFICATION_ID = 9999;
    private static final int ALARM_NOTIFICATION_ID_BASE = 10_000;
    private static final int UDP_PORT = 9999;
    private static final String LEVEL_HIGH = "HIGH";
    private static final String EMAX_EVENT = "emax";
    private static final String ALARM_COMMON_EVENT = "alarmCommon";
    private static final String EQP_SPC_EVENT = "eqpSpc";
    private static final String MDS_SPC_EVENT = "mdsSpc";
    private static final String NOTIFICATION_EVENT = "notification";
    private static final String UDP_MESSAGE_EVENT = "udpMessage";
    private static final String EVENT_TYPE_FDC = "<EVENT_TYPE>FDC</EVENT_TYPE>";
    private static final String EMAX_PROCESS_TYPE = "<FDC_PROCESS_TYPE>ETCH_EMAX_LL_FDC</FDC_PROCESS_TYPE>";
    private static final String LOT_END_PARAMETER = "<PARAMETER>LOT_END</PARAMETER>";
    private static final String STEPPER_IDLE_EVENT = "<EVENT_TYPE>STEPPERIDLE</EVENT_TYPE>";
    private static final String[] SPECIAL_EVENT_TYPES = { "MDSSPC", "EQPSPC", "RECIPE", "STEPPERIDLE", "PR_EMPTY" };

    private final AtomicBoolean running = new AtomicBoolean(false);
    private ExecutorService executor;
    private volatile DatagramSocket socket;

    public static void start(Context context) {
        Intent intent = new Intent(context, HifosUdpAlarmService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent);
        else context.startService(intent);
    }

    @Override public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        createAlarmNotificationChannel();
        createChatNotificationChannel();
        executor = Executors.newSingleThreadExecutor();
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIFICATION_ID, createNotification());
        if (running.compareAndSet(false, true)) executor.execute(this::listen);
        return START_STICKY;
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    private void listen() {
        while (running.get()) {
            DatagramSocket udpSocket = null;
            try {
                udpSocket = new DatagramSocket(null);
                udpSocket.setReuseAddress(true);
                udpSocket.bind(new InetSocketAddress(UDP_PORT));
                socket = udpSocket;
                byte[] buffer = new byte[10000];
                while (running.get()) {
                    DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                    udpSocket.receive(packet);
                    handlePacket(new String(packet.getData(), packet.getOffset(), packet.getLength(), StandardCharsets.UTF_8));
                }
            } catch (Exception exception) {
                if (running.get()) {
                    Log.e(TAG, "UDP receive failed; retrying in one second", exception);
                    sleepBeforeRetry();
                }
            } finally {
                if (socket == udpSocket) socket = null;
                if (udpSocket != null) udpSocket.close();
            }
        }
    }

    private void handlePacket(String packetContent) {
        try {
            JSONObject packet = new JSONObject(packetContent);
            String level = packet.optString("LEVEL");
            String receiverMessage = packet.optString("MESSAGE");
            String roomName = packet.optString("ROOMNAME");
            String roomId = packet.optString("ROOMID");
            // UDPService.kt:65 stores every packet; :86 shows a chat notification only for NORMAL.
            ChatMessageStore.addMessage(this, roomName, packet);
            if (isChatNotificationLevel(level)) {
                HifosUdpAlarmPlugin.emit("chatMessage", createChatMessagePayload(roomId, roomName, packet));
                showChatNotification(roomId, roomName, level, receiverMessage);
            }
            // UDPReceiver.kt:37 routes only HIGH packets to the alarm popups (every check below needs HIGH).
            if (isEMaxMessage(level, receiverMessage)) {
                dispatch(EMAX_EVENT, createEMaxPayload(receiverMessage));
                vibrate();
            } else if (isEQPspcMessage(level, receiverMessage)) {
                dispatch(EQP_SPC_EVENT, createSpcPayload(receiverMessage));
                vibrate();
            } else if (isMDSSpcMessage(level, receiverMessage)) {
                dispatch(MDS_SPC_EVENT, createSpcPayload(receiverMessage));
                vibrate();
            } else if (isStepperIdleMessage(level, receiverMessage)
                    || isRecipeMessage(level, receiverMessage)
                    || isPrEmptyMessage(level, receiverMessage)) {
                HifosUdpAlarmPlugin.emit(UDP_MESSAGE_EVENT, createUdpMessagePayload(level, receiverMessage));
                vibrate();
            } else if (isAlarmCommonMessage(level, receiverMessage, roomName)) {
                dispatch(ALARM_COMMON_EVENT, createAlarmCommonPayload(level, receiverMessage, roomName));
                vibrate();
            } else if (isNotificationMessage(level, receiverMessage, roomName)) {
                // UDPReceiver.kt:93-101: HIGH + non-special + empty ROOMNAME -> NotificationActivity.
                dispatch(NOTIFICATION_EVENT, createSpcPayload(receiverMessage));
                vibrate();
            }
        } catch (Exception exception) {
            Log.e(TAG, "Unable to parse UDP alarm", exception);
        }
    }

    private void dispatch(String eventName, JSONObject payload) {
        String id = UUID.randomUUID().toString();
        try { payload.put("id", id); } catch (Exception ignored) { return; }
        PendingAlarmStore.enqueue(this, id, eventName, payload);
        HifosUdpAlarmPlugin.emit(eventName, payload);
        showAlarmNotification(id, eventName);
    }

    private static JSONObject createEMaxPayload(String receiverMessage) {
        JSONObject payload = new JSONObject();
        try { payload.put("receiverMessage", receiverMessage); } catch (Exception ignored) { }
        return payload;
    }

    private static JSONObject createAlarmCommonPayload(String level, String message, String roomName) {
        JSONObject payload = new JSONObject();
        try {
            payload.put("level", level);
            payload.put("message", message);
            payload.put("roomName", roomName);
        } catch (Exception ignored) { }
        return payload;
    }

    private static JSONObject createSpcPayload(String receiverMessage) {
        JSONObject payload = new JSONObject();
        try { payload.put("message", receiverMessage); } catch (Exception ignored) { }
        return payload;
    }

    private static JSONObject createChatMessagePayload(String roomId, String roomName, JSONObject packet) {
        JSONObject payload = new JSONObject();
        try { payload.put("roomId", roomId); payload.put("roomName", roomName); payload.put("senderId", packet.optString("SENDERID")); payload.put("senderIp", packet.optString("SENDERIP")); payload.put("text", packet.optString("MESSAGE")); payload.put("time", packet.optString("TIME")); payload.put("level", packet.optString("LEVEL")); } catch (Exception ignored) { }
        return payload;
    }

    private static JSONObject createUdpMessagePayload(String level, String message) {
        JSONObject payload = new JSONObject();
        try {
            payload.put("level", level);
            payload.put("message", message);
        } catch (Exception ignored) { }
        return payload;
    }

    /** UDPService.kt:86: only NORMAL packets produce a chat notification (any ROOMNAME, even empty). */
    static boolean isChatNotificationLevel(String level) {
        return LEVEL_NORMAL.equals(level);
    }

    static boolean isEMaxMessage(String level, String receiverMessage) {
        return LEVEL_HIGH.equals(level) && receiverMessage != null && receiverMessage.contains(EVENT_TYPE_FDC)
            && receiverMessage.contains(EMAX_PROCESS_TYPE) && receiverMessage.contains(LOT_END_PARAMETER);
    }

    static boolean isAlarmCommonMessage(String level, String receiverMessage, String roomName) {
        return LEVEL_HIGH.equals(level) && roomName != null && !roomName.isEmpty() && !isSpecialEvent(receiverMessage);
    }

    /** UDPReceiver.kt:91-101 final else: HIGH, non-null message, not a special event, ROOMNAME null/empty. */
    static boolean isNotificationMessage(String level, String receiverMessage, String roomName) {
        return LEVEL_HIGH.equals(level) && receiverMessage != null
            && (roomName == null || roomName.isEmpty()) && !isSpecialEvent(receiverMessage);
    }

    static boolean isStepperIdleMessage(String level, String receiverMessage) {
        return LEVEL_HIGH.equals(level) && receiverMessage != null && receiverMessage.contains(STEPPER_IDLE_EVENT);
    }

    static boolean isRecipeMessage(String level, String receiverMessage) {
        return LEVEL_HIGH.equals(level) && receiverMessage != null
            && receiverMessage.contains("<EVENT_TYPE>RECIPE</EVENT_TYPE>");
    }

    static boolean isPrEmptyMessage(String level, String receiverMessage) {
        return LEVEL_HIGH.equals(level) && receiverMessage != null
            && (receiverMessage.contains("<EVENT_TYPE>PR_EMPTY</EVENT_TYPE>")
                || receiverMessage.contains("<EVENT_TYPE>PREMPTY</EVENT_TYPE>"));
    }

    static boolean isEQPspcMessage(String level, String receiverMessage) {
        return LEVEL_HIGH.equals(level) && receiverMessage != null
            && receiverMessage.contains("<EVENT_TYPE>EQPSPC</EVENT_TYPE>");
    }

    static boolean isMDSSpcMessage(String level, String receiverMessage) {
        return LEVEL_HIGH.equals(level) && receiverMessage != null
            && receiverMessage.contains("<EVENT_TYPE>MDSSPC</EVENT_TYPE>");
    }

    private static boolean isSpecialEvent(String receiverMessage) {
        if (receiverMessage == null) return false;
        if (receiverMessage.contains(EVENT_TYPE_FDC)) return true;
        for (String eventType : SPECIAL_EVENT_TYPES) {
            if (receiverMessage.contains("<EVENT_TYPE>" + eventType + "</EVENT_TYPE>")) return true;
        }
        return false;
    }

    private void sleepBeforeRetry() {
        try { Thread.sleep(1000); }
        catch (InterruptedException exception) { Thread.currentThread().interrupt(); }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "UDP alarm receiver", NotificationManager.IMPORTANCE_MIN);
            channel.setDescription("Keeps the legacy UDP alarm receiver active");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private void createAlarmNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                ALARM_CHANNEL_ID,
                "Equipment alarms",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifies the operator about pending UDP equipment alarms");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private Notification createNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID).setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("").setContentText("").setPriority(NotificationCompat.PRIORITY_MIN).setOngoing(true).build();
    }

    private void showAlarmNotification(String id, String eventName) {
        Intent intent = new Intent(this, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .setAction("com.keyfoundry.hifos.UDP_ALARM." + id);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        String title = EMAX_EVENT.equals(eventName) ? "EMax alarm" : "Equipment alarm";
        Notification notification = new NotificationCompat.Builder(this, ALARM_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText("Tap to view the pending alarm")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build();
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(alarmNotificationId(id), notification);
    }

    static int alarmNotificationId(String id) {
        return ALARM_NOTIFICATION_ID_BASE + Math.abs(id.hashCode());
    }

    private void createChatNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHAT_CHANNEL_ID, "UDP Chat Messages", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("UDP Chat Messages");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    /** Port of UDPService.kt showChatNotification (the store is filled in handlePacket). */
    private void showChatNotification(String roomId, String roomName, String level, String message) {
        Person person = new Person.Builder().setName(level).build();
        NotificationCompat.MessagingStyle style = new NotificationCompat.MessagingStyle(person)
            .setConversationTitle(level);
        JSONArray stored = ChatMessageStore.read(this, roomName);
        for (int index = 0; index < stored.length(); index++) {
            JSONObject item = stored.optJSONObject(index);
            if (item == null) continue;
            style.addMessage(new NotificationCompat.MessagingStyle.Message(
                item.optString("MESSAGE"), item.optLong("receivedAt", System.currentTimeMillis()), roomName));
        }
        Notification notification = new NotificationCompat.Builder(this, CHAT_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.sym_action_chat)
            .setStyle(style)
            .setContentIntent(createChatPendingIntent(roomId, roomName))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true)
            .setGroup(CHAT_GROUP)
            .build();
        try { NotificationManagerCompat.from(this).notify(roomName.hashCode(), notification); }
        catch (SecurityException exception) { Log.w(TAG, "Notification permission missing", exception); }
    }

    /** ChatRoomActivity intent of UDPService.kt:73-84, targeted at MainActivity (the WebView host). */
    private PendingIntent createChatPendingIntent(String roomId, String roomName) {
        Intent intent = new Intent(this, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra(EXTRA_ROOM_ID, roomId)
            .putExtra(EXTRA_ROOM_NAME, roomName)
            .putExtra(EXTRA_CLEAR_MESSAGES, true);
        return PendingIntent.getActivity(this, roomName.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void vibrate() {
        Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator == null || !vibrator.hasVibrator()) return;
        long[] pattern = {200, 400, 200, 400};
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) vibrator.vibrate(VibrationEffect.createWaveform(pattern, VibrationEffect.DEFAULT_AMPLITUDE));
        else vibrator.vibrate(pattern, -1);
    }

    @Override public void onDestroy() {
        running.set(false);
        DatagramSocket currentSocket = socket;
        if (currentSocket != null) currentSocket.close();
        executor.shutdownNow();
        super.onDestroy();
    }

    static final class PendingAlarmStore {
        private static final String PREFERENCES = "hifos_udp_alarm";
        private static final String EVENTS = "events";
        private PendingAlarmStore() { }

        static synchronized void enqueue(Context context, String id, String eventName, JSONObject payload) {
            try {
                JSONArray events = read(context);
                JSONObject event = new JSONObject();
                event.put("id", id); event.put("eventName", eventName); event.put("payload", payload);
                events.put(event);
                context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit().putString(EVENTS, events.toString()).apply();
            } catch (Exception exception) { Log.e(TAG, "Unable to persist pending UDP alarm", exception); }
        }

        static synchronized JSONArray forEvent(Context context, String eventName) {
            JSONArray matching = new JSONArray();
            JSONArray events = read(context);
            for (int index = 0; index < events.length(); index++) {
                JSONObject event = events.optJSONObject(index);
                if (event != null && eventName.equals(event.optString("eventName"))) matching.put(event);
            }
            return matching;
        }

        static synchronized void acknowledge(Context context, String id) {
            JSONArray remaining = new JSONArray();
            JSONArray events = read(context);
            for (int index = 0; index < events.length(); index++) {
                JSONObject event = events.optJSONObject(index);
                if (event != null && !id.equals(event.optString("id"))) remaining.put(event);
            }
            context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit().putString(EVENTS, remaining.toString()).apply();
        }

        private static JSONArray read(Context context) {
            String stored = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getString(EVENTS, "[]");
            try { return new JSONArray(stored); }
            catch (Exception exception) { Log.e(TAG, "Unable to read pending UDP alarms", exception); return new JSONArray(); }
        }
    }

    static final class ChatMessageStore {
        private static final String PREFERENCES = "hifos_udp_chat";
        static synchronized void addMessage(Context context, String roomName, JSONObject message) {
            try { JSONArray messages = read(context, roomName); message.put("receivedAt", System.currentTimeMillis()); messages.put(message); while (messages.length() > 10) { JSONArray next = new JSONArray(); for (int index = 1; index < messages.length(); index++) next.put(messages.get(index)); messages = next; } context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit().putString(roomName, messages.toString()).apply(); } catch (Exception ignored) { }
        }
        static void clearMessages(Context context, String roomName) { context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit().remove(roomName).apply(); }
        static JSONArray read(Context context, String roomName) { try { return new JSONArray(context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getString(roomName, "[]")); } catch (Exception ignored) { return new JSONArray(); } }
    }
}

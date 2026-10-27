package com.keyfoundry.hifos;

import android.Manifest;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(
    name = "HifosUdpAlarm",
    permissions = {
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class HifosUdpAlarmPlugin extends Plugin {
    private static volatile HifosUdpAlarmPlugin activePlugin;

    @Override
    public void load() {
        activePlugin = this;
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "onNotificationPermissionResult");
            return;
        }
        HifosUdpAlarmService.start(getContext());
        call.resolve();
    }

    @PermissionCallback
    private void onNotificationPermissionResult(PluginCall call) {
        HifosUdpAlarmService.start(getContext());
        call.resolve();
    }

    @PluginMethod
    public void getPendingAlarms(PluginCall call) {
        String eventName = call.getString("eventName");
        if (eventName == null || eventName.isEmpty()) {
            call.reject("eventName is required");
            return;
        }
        JSONArray events = HifosUdpAlarmService.PendingAlarmStore.forEvent(getContext(), eventName);
        JSArray pending = new JSArray();
        for (int index = 0; index < events.length(); index++) {
            JSONObject event = events.optJSONObject(index);
            if (event != null) pending.put(event.optJSONObject("payload"));
        }
        JSObject result = new JSObject();
        result.put("events", pending);
        call.resolve(result);
    }

    @PluginMethod
    public void acknowledgeAlarm(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.isEmpty()) {
            call.reject("id is required");
            return;
        }
        HifosUdpAlarmService.PendingAlarmStore.acknowledge(getContext(), id);
        call.resolve();
    }

    @PluginMethod
    public void consumePendingEQPspc(PluginCall call) {
        JSONArray events = HifosUdpAlarmService.PendingAlarmStore.forEvent(getContext(), "eqpSpc");
        JSArray messages = new JSArray();
        for (int index = 0; index < events.length(); index++) {
            JSONObject event = events.optJSONObject(index);
            JSONObject payload = event == null ? null : event.optJSONObject("payload");
            String id = event == null ? null : event.optString("id", null);
            String message = payload == null ? null : payload.optString("message", null);
            if (message != null && !message.isEmpty()) messages.put(message);
            if (id != null && !id.isEmpty()) HifosUdpAlarmService.PendingAlarmStore.acknowledge(getContext(), id);
        }
        JSObject result = new JSObject();
        result.put("messages", messages);
        call.resolve(result);
    }

    static void emit(String eventName, JSONObject payload) {
        HifosUdpAlarmPlugin plugin = activePlugin;
        if (plugin == null) return;
        JSObject event = new JSObject();
        for (String key : payload.keySet()) {
            try { event.put(key, payload.get(key)); }
            catch (Exception ignored) { }
        }
        plugin.notifyListeners(eventName, event);
    }

    static boolean isEMaxMessage(String level, String receiverMessage) {
        return HifosUdpAlarmService.isEMaxMessage(level, receiverMessage);
    }

    static boolean isAlarmCommonMessage(String level, String receiverMessage, String roomName) {
        return HifosUdpAlarmService.isAlarmCommonMessage(level, receiverMessage, roomName);
    }

    static boolean isRecipeMessage(String level, String receiverMessage) {
        return HifosUdpAlarmService.isRecipeMessage(level, receiverMessage);
    }

    static boolean isPrEmptyMessage(String level, String receiverMessage) {
        return HifosUdpAlarmService.isPrEmptyMessage(level, receiverMessage);
    }

    @Override
    protected void handleOnDestroy() {
        if (activePlugin == this) activePlugin = null;
    }
}

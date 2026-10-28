package com.keyfoundry.hifos;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;


/** Bridge for the legacy ChatRoomActivity clearMessages intent path. */
@CapacitorPlugin(name = "HifosChatRoom")
public class HifosChatRoomPlugin extends Plugin {
    @PluginMethod
    public void clearRoomMessages(PluginCall call) {
        String roomName = call.getString("roomName");
        if (roomName == null || roomName.isEmpty()) {
            call.reject("roomName is required");
            return;
        }

        HifosUdpAlarmService.ChatMessageStore.clearMessages(getContext(), roomName);
        NotificationManagerCompat.from(getContext()).cancel(roomName.hashCode());

        JSObject result = new JSObject();
        result.put("cleared", true);
        call.resolve(result);
    }
}

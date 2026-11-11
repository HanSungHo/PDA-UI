package com.keyfoundry.hifos;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class HifosUdpAlarmPluginTest {
    private static final String EMAX_MESSAGE =
        "<EVENT_TYPE>FDC</EVENT_TYPE>"
        + "<FDC_PROCESS_TYPE>ETCH_EMAX_LL_FDC</FDC_PROCESS_TYPE>"
        + "<PARAMETER>LOT_END</PARAMETER>";

    @Test
    public void acceptsOnlyTheLegacyHighLevelEMaxLotEndEvent() {
        assertTrue(HifosUdpAlarmPlugin.isEMaxMessage("HIGH", EMAX_MESSAGE));
        assertFalse(HifosUdpAlarmPlugin.isEMaxMessage("NORMAL", EMAX_MESSAGE));
        assertFalse(HifosUdpAlarmPlugin.isEMaxMessage(
            "HIGH",
            EMAX_MESSAGE.replace("<EVENT_TYPE>FDC</EVENT_TYPE>", "")
        ));
        assertFalse(HifosUdpAlarmPlugin.isEMaxMessage(
            "HIGH",
            EMAX_MESSAGE.replace("ETCH_EMAX_LL_FDC", "OTHER_FDC")
        ));
        assertFalse(HifosUdpAlarmPlugin.isEMaxMessage(
            "HIGH",
            EMAX_MESSAGE.replace("LOT_END", "LOT_START")
        ));
        assertFalse(HifosUdpAlarmPlugin.isEMaxMessage("HIGH", null));
    }

    @Test
    public void dispatchesAlarmCommonWithoutDroppingItForEMax() {
        assertTrue(HifosUdpAlarmPlugin.isAlarmCommonMessage("HIGH", "LotID=ABC", "ETCH"));
        assertFalse(HifosUdpAlarmPlugin.isAlarmCommonMessage("LOW", "LotID=ABC", "ETCH"));
        assertFalse(HifosUdpAlarmPlugin.isAlarmCommonMessage(
            "HIGH", "<EVENT_TYPE>FDC</EVENT_TYPE>", "ETCH"
        ));
        assertFalse(HifosUdpAlarmPlugin.isAlarmCommonMessage(
            "HIGH", "LotID=ABC", ""
        ));
    }

    @Test
    public void acceptsOnlyHighLevelMDSSpcInterlockEvents() {
        String message = "<EVENT_TYPE>MDSSPC</EVENT_TYPE>";
        assertTrue(HifosUdpAlarmPlugin.isMDSSpcMessage("HIGH", message));
        assertFalse(HifosUdpAlarmPlugin.isMDSSpcMessage("NORMAL", message));
        assertFalse(HifosUdpAlarmPlugin.isMDSSpcMessage("HIGH", "<EVENT_TYPE>EQPSPC</EVENT_TYPE>"));
        assertFalse(HifosUdpAlarmPlugin.isMDSSpcMessage("HIGH", null));
    }

    @Test
    public void usesTheSameStableNotificationIdForAlarmDeliveryAndAcknowledgement() {
        String alarmId = "mds-spc-alarm-1";

        assertEquals(10_000 + Math.abs(alarmId.hashCode()), HifosUdpAlarmService.alarmNotificationId(alarmId));
    }

    @Test
    public void acceptsRecipeAndPrEmptyMessages() {
        assertTrue(HifosUdpAlarmPlugin.isRecipeMessage("HIGH", "<EVENT_TYPE>RECIPE</EVENT_TYPE>"));
        assertFalse(HifosUdpAlarmPlugin.isRecipeMessage("LOW", "<EVENT_TYPE>RECIPE</EVENT_TYPE>"));
        assertFalse(HifosUdpAlarmPlugin.isRecipeMessage("HIGH", "<EVENT_TYPE>OTHER</EVENT_TYPE>"));

        assertTrue(HifosUdpAlarmPlugin.isPrEmptyMessage("HIGH", "<EVENT_TYPE>PR_EMPTY</EVENT_TYPE>"));
        assertTrue(HifosUdpAlarmPlugin.isPrEmptyMessage("HIGH", "<EVENT_TYPE>PREMPTY</EVENT_TYPE>"));
        assertFalse(HifosUdpAlarmPlugin.isPrEmptyMessage("LOW", "<EVENT_TYPE>PR_EMPTY</EVENT_TYPE>"));
        assertFalse(HifosUdpAlarmPlugin.isPrEmptyMessage("HIGH", "<EVENT_TYPE>OTHER</EVENT_TYPE>"));
    }

    @Test
    public void showsChatNotificationOnlyForNormalLevelRegardlessOfRoomName() {
        // UDPService.kt:86 - level == "NORMAL" only; empty ROOMNAME is still a chat packet.
        assertTrue(HifosUdpAlarmService.isChatNotificationLevel("NORMAL"));
        assertFalse(HifosUdpAlarmService.isChatNotificationLevel("HIGH"));
        assertFalse(HifosUdpAlarmService.isChatNotificationLevel("LOW"));
        assertFalse(HifosUdpAlarmService.isChatNotificationLevel(""));
        assertFalse(HifosUdpAlarmService.isChatNotificationLevel(null));
    }

    @Test
    public void highLevelPacketWithoutRoomIsNotificationActivity() {
        // UDPReceiver.kt:91-101 - final else: HIGH + non-special + ROOMNAME null/empty -> NotificationActivity.
        assertTrue(HifosUdpAlarmPlugin.isNotificationMessage("HIGH", "plain text", ""));
        assertTrue(HifosUdpAlarmPlugin.isNotificationMessage("HIGH", "plain text", null));
        assertTrue(HifosUdpAlarmPlugin.isNotificationMessage("HIGH", "<INTERLOCKMANAGER/>", ""));
        // A non-empty ROOMNAME is AlarmCommon, never the Notification screen.
        assertFalse(HifosUdpAlarmPlugin.isNotificationMessage("HIGH", "plain text", "ROOM"));
        // Only HIGH reaches the popups; null message does nothing.
        assertFalse(HifosUdpAlarmPlugin.isNotificationMessage("NORMAL", "plain text", ""));
        assertFalse(HifosUdpAlarmPlugin.isNotificationMessage("LOW", "plain text", ""));
        assertFalse(HifosUdpAlarmPlugin.isNotificationMessage("HIGH", null, ""));
        // Special events keep their own screens (including any FDC, which never falls through).
        assertFalse(HifosUdpAlarmPlugin.isNotificationMessage("HIGH", "<EVENT_TYPE>MDSSPC</EVENT_TYPE>", ""));
        assertFalse(HifosUdpAlarmPlugin.isNotificationMessage("HIGH", "<EVENT_TYPE>EQPSPC</EVENT_TYPE>", ""));
        assertFalse(HifosUdpAlarmPlugin.isNotificationMessage("HIGH", "<EVENT_TYPE>RECIPE</EVENT_TYPE>", ""));
        assertFalse(HifosUdpAlarmPlugin.isNotificationMessage("HIGH", "<EVENT_TYPE>STEPPERIDLE</EVENT_TYPE>", ""));
        assertFalse(HifosUdpAlarmPlugin.isNotificationMessage("HIGH", "<EVENT_TYPE>PR_EMPTY</EVENT_TYPE>", ""));
        assertFalse(HifosUdpAlarmPlugin.isNotificationMessage("HIGH", "<EVENT_TYPE>FDC</EVENT_TYPE>", ""));
        assertFalse(HifosUdpAlarmPlugin.isNotificationMessage("HIGH", EMAX_MESSAGE, ""));
        // Disjoint from AlarmCommon for the same packet.
        assertFalse(HifosUdpAlarmPlugin.isAlarmCommonMessage("HIGH", "plain text", ""));
    }

    @Test
    public void highLevelPacketWithRoomIsAlarmCommonNotChat() {
        // UDPReceiver.kt:93-110 - HIGH + non-special + ROOMNAME -> AlarmCommonActivity.
        assertTrue(HifosUdpAlarmService.isAlarmCommonMessage("HIGH", "plain text", "ROOM"));
        assertFalse(HifosUdpAlarmService.isChatNotificationLevel("HIGH"));
        // NORMAL never reaches the alarm popups.
        assertFalse(HifosUdpAlarmService.isAlarmCommonMessage("NORMAL", "plain text", "ROOM"));
    }
}

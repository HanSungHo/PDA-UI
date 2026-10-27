package com.keyfoundry.hifos;

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
    public void acceptsRecipeAndPrEmptyMessages() {
        assertTrue(HifosUdpAlarmPlugin.isRecipeMessage("HIGH", "<EVENT_TYPE>RECIPE</EVENT_TYPE>"));
        assertFalse(HifosUdpAlarmPlugin.isRecipeMessage("LOW", "<EVENT_TYPE>RECIPE</EVENT_TYPE>"));
        assertFalse(HifosUdpAlarmPlugin.isRecipeMessage("HIGH", "<EVENT_TYPE>OTHER</EVENT_TYPE>"));

        assertTrue(HifosUdpAlarmPlugin.isPrEmptyMessage("HIGH", "<EVENT_TYPE>PR_EMPTY</EVENT_TYPE>"));
        assertTrue(HifosUdpAlarmPlugin.isPrEmptyMessage("HIGH", "<EVENT_TYPE>PREMPTY</EVENT_TYPE>"));
        assertFalse(HifosUdpAlarmPlugin.isPrEmptyMessage("LOW", "<EVENT_TYPE>PR_EMPTY</EVENT_TYPE>"));
        assertFalse(HifosUdpAlarmPlugin.isPrEmptyMessage("HIGH", "<EVENT_TYPE>OTHER</EVENT_TYPE>"));
    }
}

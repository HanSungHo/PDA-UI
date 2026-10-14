package com.keyfoundry.hifos;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;

import java.io.IOException;
import org.junit.Test;

public class HifosSystemSettingPluginTest {
    @Test
    public void acceptsLegacyBatteryMonitorUrl() throws IOException {
        assertEquals("http://172.16.0.10:8081/upload/EmBatteryMonitor.apk",
            HifosSystemSettingPlugin.validateDownloadTarget(
                "http://172.16.0.10:8081/upload/EmBatteryMonitor.apk", "EmBatteryMonitor.apk").toString());
    }

    @Test
    public void acceptsHiddenLegacyPmdmUrl() throws IOException {
        assertEquals("/upload/PMDMAgent.apk", HifosSystemSettingPlugin.validateDownloadTarget(
            "http://127.0.0.1:8081/upload/PMDMAgent.apk", "PMDMAgent.apk").getPath());
    }

    @Test
    public void rejectsArbitraryFilenameAndTraversal() {
        assertThrows(IOException.class, () -> HifosSystemSettingPlugin.validateDownloadTarget(
            "http://127.0.0.1:8081/upload/other.apk", "other.apk"));
        assertThrows(IOException.class, () -> HifosSystemSettingPlugin.validateDownloadTarget(
            "http://127.0.0.1:8081/upload/../EmBatteryMonitor.apk", "EmBatteryMonitor.apk"));
    }

    @Test
    public void rejectsNonHttpProtocol() {
        assertThrows(IOException.class, () -> HifosSystemSettingPlugin.validateDownloadTarget(
            "file:///upload/EmBatteryMonitor.apk", "EmBatteryMonitor.apk"));
    }

    @Test
    public void rejectsCredentialsQueryAndFragment() {
        String[] addresses = {
            "http://user@127.0.0.1:8081/upload/EmBatteryMonitor.apk",
            "http://127.0.0.1:8081/upload/EmBatteryMonitor.apk?other=true",
            "http://127.0.0.1:8081/upload/EmBatteryMonitor.apk#other"
        };
        for (String address : addresses) {
            assertThrows(IOException.class, () -> HifosSystemSettingPlugin.validateDownloadTarget(
                address, "EmBatteryMonitor.apk"));
        }
    }

    @Test
    public void rejectsMissingUrl() {
        assertThrows(IOException.class, () -> HifosSystemSettingPlugin.validateDownloadTarget(
            null, "EmBatteryMonitor.apk"));
    }
}
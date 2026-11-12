/**
 * Mock UDP INTERLOCKMANAGER XML message for StepperIdle dialog.
 * Mirrors the raw format received from the HifosUdpAlarm native plugin
 * and parsed by StepperIDLEActivity.kt in hifos2 legacy.
 *
 * The XML is designed so that splitting the <Table diffgr:…> chunk by "</"
 * produces the following indices (matching Kotlin hardcoded offsets):
 *   [0]  → PREAMBLE (discarded — pushes remaining fields to correct positions)
 *   [1]  → TIME     (발생시간)
 *   [2]  → COL1     (IDLE state, discarded)
 *   [3]  → MACHINE  (장비명 / EQPID)
 *   [4]  → COL3     (discarded)
 *   [5]  → COL4     (discarded)
 *   [6]  → LOTID    (LOTNAME)
 *   [7]  → COL6     (discarded)
 *   [8]  → COL7     (discarded)
 *   [9]  → COL8     (discarded)
 *   [10] → WAFER    (WAFER_NO)
 */
export const stepperIdleMockMessage = `<diffgr:diffgram xmlns:msdata="urn:schemas-microsoft-com:xml-msdata" xmlns:diffgr="urn:schemas-microsoft-com:xml-diffgram-v1">
  <DocumentElement xmlns="">
    <INTERLOCKMANAGER>
      <Table diffgr:id="Table1" msdata:rowOrder="0">
        <PREAMBLE>X</PREAMBLE>
        <TIME>2026-10-21T09:15:30.000+09:00</TIME>
        <COL1>IDLE</COL1>
        <MACHINE>STEPPER-EQP-01</MACHINE>
        <COL3></COL3>
        <COL4></COL4>
        <LOTID>LOT-DEMO-IDLE-01</LOTID>
        <COL6></COL6>
        <COL7></COL7>
        <COL8></COL8>
        <WAFER>12</WAFER>
      </Table>
    </INTERLOCKMANAGER>
  </DocumentElement>
  <EVENT_TYPE>STEPPERIDLE</EVENT_TYPE>
</diffgr:diffgram>`;

/** Empty result fixture — no table rows present */
export const stepperIdleEmptyMessage = `<diffgr:diffgram xmlns:msdata="urn:schemas-microsoft-com:xml-msdata" xmlns:diffgr="urn:schemas-microsoft-com:xml-diffgram-v1">
  <DocumentElement xmlns="">
    <INTERLOCKMANAGER>
    </INTERLOCKMANAGER>
  </DocumentElement>
</diffgr:diffgram>`;

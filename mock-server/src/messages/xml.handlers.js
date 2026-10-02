import { readXmlTag } from '../utils/xml.js';

export function handleXmlMessage(messageName, body, store) {
  const name = String(messageName || '')
    .trim()
    .toUpperCase();
  const xml = store.getXmlFixtures();

  if (name === 'GETFLOORDATA') {
    return `<FABS>${xml.floors.map((floor) => `<ITEM><FLOOR>${floor}</FLOOR></ITEM>`).join('')}</FABS>`;
  }

  if (name === 'GETBAYDATA') {
    const floor = readXmlTag(body, 'FLOOR') || '1F';
    const bays = xml.baysByFloor[floor] || [];
    return `<FABS>${bays.map((bay) => `<ITEM><AREANAME>${bay}</AREANAME></ITEM>`).join('')}</FABS>`;
  }

  if (name === 'GETPROCESSFACTORYLOT') {
    const lotId = readXmlTag(body, 'LOTID') || 'LOT-DEMO-01';
    const lot = store.getLot(lotId) || store.getLot('LOT-DEMO-01');
    return `<BODY><LOTPROCESSSTATE>WAIT</LOTPROCESSSTATE><LOTHOLDSTATE>NotOnHold</LOTHOLDSTATE><LOTSTATE>Released</LOTSTATE><JOBCODE>${lot.JOBCODE}</JOBCODE><PRODUCTQUANTITY>${lot.PRODUCTQUANTITY}</PRODUCTQUANTITY><OPERATIONDESCRIPTION>${lot.PROCESSSTEP}</OPERATIONDESCRIPTION></BODY>`;
  }

  if (name === 'INFACTORY') {
    const count = Array.from({ length: 7 }, (_unused, index) =>
      readXmlTag(body, `CHANGEFACTORY${index}`),
    ).filter(Boolean).length;
    return `<BODY><SUCCESSLOT>${count}</SUCCESSLOT></BODY>`;
  }

  return '<BODY><RESULT>UNKNOWN_MESSAGE</RESULT></BODY>';
}

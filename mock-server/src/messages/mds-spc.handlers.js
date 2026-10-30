import { pass } from '../utils/response.js';

const MOCK_DESCRIPTION = [
  'Action 01',
  'Action 02',
  'Action 03',
  'Action 04',
  'Action 05',
  'Action 06',
  'Action 07',
  'Action 08',
  'Action 09',
  'Action 10',
  'Action 11',
  'Inspection 12',
  'Inspection 13',
].join('|');

export function createMDSSpcHandlers() {
  return {
    MDSCONTENT: () => pass({ DESCRIPTION: MOCK_DESCRIPTION }),
    MDSINSERT: () => pass({ RESULT: 'OK' }),
  };
}

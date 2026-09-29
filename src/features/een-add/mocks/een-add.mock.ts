import type { EenAddResponse, EenAddService } from '../types/een-add.types';

export type EenAddMockCase =
  | 'success'
  | 'tag-id-error'
  | 'route-error'
  | 'operation-error'
  | 'position-error'
  | 'insert-error'
  | 'empty-tags'
  | 'empty-routes'
  | 'empty-operations';

const ROUTES = [{ PROCESSFLOWNAME: 'ROUTE-A' }, { PROCESSFLOWNAME: 'ROUTE-B' }];

const OPERATIONS = [
  { PROCESSOPERATIONNAME: '10001', PODESC: 'Inspection' },
  { PROCESSOPERATIONNAME: '10002', PODESC: 'Packaging' },
];

const TAG_LIST = [
  ['TAG-001', 'Surface scratch observed'],
  ['TAG-002', 'Particle contamination'],
  ['TAG-003', 'Edge chipping'],
]
  .map((columns) => columns.join('\t'))
  .join('\n');

const POSITIONS = [{ POSITION: '01' }, { POSITION: '05' }, { POSITION: '12' }];

function success(messageBody: Record<string, unknown> = {}): EenAddResponse {
  return { isSuccess: true, messageBody, errorMessage: '' };
}

function failure(errorMessage: string): EenAddResponse {
  return { isSuccess: false, messageBody: {}, errorMessage };
}

function listResponse(items: Record<string, unknown>[]): EenAddResponse {
  return success({ ITEMS: { ITEM: items } });
}

export function createEenAddMockService(mockCase: EenAddMockCase = 'success'): EenAddService {
  return {
    getProcessFlow() {
      if (mockCase === 'route-error') return Promise.resolve(failure('GETPROCESSFLOW mock error'));
      if (mockCase === 'empty-routes') return Promise.resolve(listResponse([]));

      return Promise.resolve(
        success({
          PROCESSFLOWNAME: 'ROUTE-A',
          ITEMS: { ITEM: ROUTES.map((item) => ({ ...item })) },
        }),
      );
    },
    getProcessOperation(_facility, _product, processFlow) {
      if (mockCase === 'operation-error') {
        return Promise.resolve(failure('GETPROCESSOPERATION mock error'));
      }
      if (mockCase === 'empty-operations') return Promise.resolve(listResponse([]));

      const items = processFlow === 'ROUTE-B' ? [OPERATIONS[1]] : OPERATIONS;
      return Promise.resolve(listResponse(items.map((item) => ({ ...item }))));
    },
    getTagId() {
      if (mockCase === 'tag-id-error') return Promise.resolve(failure('GETTAGID mock error'));
      if (mockCase === 'empty-tags') return Promise.resolve(success({ TAGLIST: '' }));

      return Promise.resolve(success({ TAGLIST: TAG_LIST }));
    },
    getTagPosition() {
      if (mockCase === 'position-error')
        return Promise.resolve(failure('GETTAGPOSITION mock error'));

      return Promise.resolve(listResponse(POSITIONS.map((item) => ({ ...item }))));
    },
    insertEen() {
      if (mockCase === 'insert-error') return Promise.resolve(failure('INSERTEEN mock error'));

      return Promise.resolve(success({ RESULT: 'OK' }));
    },
  };
}

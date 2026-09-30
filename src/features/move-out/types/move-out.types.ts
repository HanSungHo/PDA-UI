/**
 * Payload returned from Input Scope Data to Move Out.
 * Mirrors legacy InputScopeDataActivity setResult extras: LOTID, LOGO, WAFERLIST.
 */
export interface InputScopeReturnResult {
  lotId: string;
  logo: string;
  waferList: string;
}

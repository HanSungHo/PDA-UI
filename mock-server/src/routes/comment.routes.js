import { Router } from 'express';

export function createCommentRouter({ registry, store }) {
  const router = Router();

  router.post('/comment/list', (request, response) => {
    const comments = store.getComments(request.body?.LOTID);
    response.json({
      context: {
        lotId: request.body?.LOTID || '',
        operation: request.body?.OPERATION || '',
        subOperation: request.body?.SUBOPERATION || '',
        processStep: request.body?.PROCESSSTEP || '',
        operSequence: request.body?.OPERSEQUENCE || '',
        facility: request.body?.FACILITY || '',
      },
      items: comments.map((comment) => ({
        no: comment.no,
        subOperation: comment.subOperation,
        workCode: comment.workCode,
        trackType: comment.trackType,
        isCheck: comment.isCheck,
        writer: comment.writer,
        writeTime: comment.writeTime,
        reader: comment.reader,
        readTime: comment.readTime,
        description: comment.description,
      })),
    });
  });

  router.post('/comment', (request, response) => {
    const result = registry.handle('COMMENT', request.body || {});
    response.json(JSON.parse(result.result).MSGBODY);
  });

  router.post('/commentSet', (request, response) => {
    const result = registry.handle('COMMENTSET', request.body || {});
    const parsed = JSON.parse(result.result);
    if (parsed.STATUS === 'FAIL') {
      response.status(400).json({ message: parsed.ERRMSG });
      return;
    }
    response.json({ ok: true });
  });

  return router;
}

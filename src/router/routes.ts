import type { RouteRecordRaw } from 'vue-router';

import { ROUTE } from '~/constants/routes.ts';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: { path: `/${ROUTE.main}` } },
      { path: ROUTE.main, component: () => import('../features/main/pages/ActivityMainPage.vue') },
      { path: 'index', component: () => import('../pages/IndexPage.vue') },
      { path: 'second', component: () => import('../pages/SecondPage.vue') },
      {
        path: 'esheet/draw-menu-preview',
        component: () => import('../features/esheet/pages/ESheetDrawMenuPreviewPage.vue'),
      },
    ],
  },
  {
    path: `/${ROUTE.rcpInquire}`,
    component: () => import('../features/rcp-inquire/pages/RCPInquirePage.vue'),
  },
  {
    path: `/${ROUTE.furnaceRemote}`,
    name: ROUTE.furnaceRemote,
    component: () => import('../features/remote-furnace-kec/pages/RemoteFurnaceKecPage.vue'),
  },
  {
    path: '/comment-view',
    component: () => import('../features/comment-view/pages/CommentViewPage.vue'),
  },
  {
    path: '/esheet',
    component: () => import('../pages/ESheetPage.vue'),
  },
  {
    path: `/${ROUTE.remoteMachineSelect}`,
    component: () => import('../features/remote-machine-select/pages/RemoteMachineSelectPage.vue'),
  },
  {
    path: `/${ROUTE.measRemote}`,
    component: () =>
      import('../features/remote-machine-select/pages/RemoteChildUnavailablePage.vue'),
    props: { flow: 'meas' },
  },
  {
    path: `/${ROUTE.remoteImpMain}`,
    component: () =>
      import('../features/remote-machine-select/pages/RemoteChildUnavailablePage.vue'),
    props: { flow: 'imp' },
  },
  {
    path: `/${ROUTE.remoteCvd}`,
    component: () =>
      import('../features/remote-machine-select/pages/RemoteChildUnavailablePage.vue'),
    props: { flow: 'cvd' },
  },
  {
    path: '/esheet-legacy',
    component: () => import('../pages/ESheetLegacyPage.vue'),
  },
  {
    path: '/mask-location-dialog',
    component: () =>
      import('../features/esheet/components/mask-location-dialog/MaskLocationDialog.vue'),
  },
  {
    path: `/${ROUTE.commentList}`,
    component: () => import('../features/comment-list/pages/CommentListPage.vue'),
  },
  {
    path: `/${ROUTE.diffParam}`,
    component: () => import('../features/diff-inst-parameter/pages/DiffInstParameterPage.vue'),
  },
  {
    path: '/batch-move-in',
    component: () => import('../features/batch-move-in/pages/BatchMoveInPage.vue'),
  },
  {
    path: `/${ROUTE.remoteRamco}`,
    component: () => import('../features/remote-ramco/pages/RemoteRamcoPage.vue'),
    props: (route) => ({
      initialLotId: typeof route.query.lotId === 'string' ? route.query.lotId : '',
    }),
  },
  {
    path: `/${ROUTE.batchMoveOut}`,
    component: () => import('../features/batch-move-out/pages/BatchMoveOutPage.vue'),
  },
  {
    path: `/${ROUTE.batchsub}`,
    name: ROUTE.batchsub,
    component: () => import('../features/batchsub/pages/BatchsubPage.vue'),
  },
  {
    path: `/${ROUTE.batchLotList}`,
    name: ROUTE.batchLotList,
    component: () => import('../features/batch-lot-list/pages/BatchLotListPage.vue'),
  },
  {
    path: '/process-inquire',
    component: () => import('../features/move-in/pages/ProcessInquire.vue'),
  },
  {
    path: `/${ROUTE.waferSkip}`,
    component: () => import('../features/move-out/pages/WaferSkipPage.vue'),
  },
  {
    path: `/${ROUTE.inputScopeData}`,
    name: 'input-scope-data',
    component: () => import('../features/input-scope-data/pages/InputScopeDataPage.vue'),
  },
  {
    path: `/${ROUTE.moveOut}`,
    name: 'move-out',
    component: () => import('../features/move-out/pages/MoveOutPage.vue'),
  },
  {
    path: `/${ROUTE.eenAdd}`,
    name: ROUTE.eenAdd,
    component: () => import('../features/een-add/pages/EenAddPage.vue'),
  },
  {
    path: `/${ROUTE.eenSetting}`,
    name: ROUTE.eenSetting,
    component: () => import('../features/een-setting/pages/EENSettingPage.vue'),
  },
  {
    path: `/${ROUTE.eenDelete}`,
    name: ROUTE.eenDelete,
    component: () => import('../features/een-setting/pages/EENDeletePage.vue'),
  },
  {
    path: `/${ROUTE.eenModify}`,
    name: ROUTE.eenModify,
    component: () => import('../features/een-setting/pages/EENModifyPage.vue'),
  },
  {
    path: `/${ROUTE.moveInInline}`,
    component: () => import('../features/move-in/pages/MoveInInline.vue'),
  },
  {
    path: `/${ROUTE.etchInspection}`,
    name: ROUTE.etchInspection,
    component: () => import('../features/etch-inspection/pages/EtchInspectionPage.vue'),
  },
  {
    path: `/${ROUTE.waferSelect}`,
    component: () => import('../features/move-out/pages/WaferSelectPage.vue'),
  },
  {
    path: `/${ROUTE.lotStatus}`,
    name: ROUTE.lotStatus,
    component: () => import('../features/lot-status/pages/LotStatusPage.vue'),
  },

  {
    path: '/move-in/:lotId?',
    name: 'move-in',
    component: () => import('../features/move-in/pages/MoveInPage.vue'),
    children: [
      {
        path: 'process-inquire',
        name: 'move-in-process-inquire',
        component: () => import('../features/move-in/pages/ProcessInquire.vue'),
      },
      {
        path: 'inline',
        name: 'move-in-inline',
        component: () => import('../features/move-in/pages/MoveInInline.vue'),
      },
      {
        path: 'batch-lot-list',
        name: 'move-in-batch-lot-list',
        component: () => import('../features/batch-lot-list/pages/BatchLotListPage.vue'),
      },
      {
        path: 'batch-move-in',
        name: 'move-in-batch-move-in',
        component: () => import('../features/batch-move-in/pages/BatchMoveInPage.vue'),
      },
      {
        path: 'comment-list',
        name: 'move-in-comment-list',
        component: () => import('../features/comment-list/pages/CommentListPage.vue'),
      },
    ],
  },
  {
    path: `/${ROUTE.rework}`,
    component: () => import('../features/rework/pages/ReworkPage.vue'),
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('../pages/ErrorNotFound.vue'),
  },
];

export default routes;

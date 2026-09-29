import type { RouteRecordRaw } from 'vue-router';

import { ROUTE } from '~/constants/routes.ts';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: { path: `/${ROUTE.main}` } },
      { path: ROUTE.main, component: () => import('../features/main/pages/ActivityMainPage.vue') },
      { path: '', component: () => import('../pages/IndexPage.vue') },
      { path: 'second', component: () => import('../pages/SecondPage.vue') },
      {
        path: 'esheet/draw-menu-preview',
        component: () => import('../features/esheet/pages/ESheetDrawMenuPreviewPage.vue'),
      },
    ],
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
    path: '/esheet-legacy',
    component: () => import('../pages/ESheetLegacyPage.vue'),
  },
  {
    path: '/mask-location-dialog',
    component: () =>
      import('../features/esheet/components/mask-location-dialog/MaskLocationDialog.vue'),
  },
  {
    path: '/comment-list',
    component: () => import('../features/comment-list/pages/CommentListPage.vue'),
  },
  {
    path: '/batch-move-in',
    component: () => import('../features/batch-move-in/pages/BatchMoveInPage.vue'),
  },
  {
    path: '/batch-move-out',
    component: () => import('../features/batch-move-out/pages/BatchMoveOutPage.vue'),
  },
  {
    path: '/batch-lot-list',
    name: 'batch-lot-list',
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
    path: `/${ROUTE.eenAdd}`,
    name: ROUTE.eenAdd,
    component: () => import('../features/een-add/pages/EenAddPage.vue'),
  },
  {
    path: `/${ROUTE.moveInInline}`,
    component: () => import('../features/move-in/pages/MoveInInline.vue'),
  },
  {
    path: `/${ROUTE.waferSelect}`,
    component: () => import('../features/move-out/pages/WaferSelectPage.vue'),
  
  },
  
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('../pages/ErrorNotFound.vue'),
  },
];

export default routes;

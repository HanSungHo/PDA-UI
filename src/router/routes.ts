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
    path: '/mask-location-dialog',
    component: () => import('../features/e-sheet/components/MaskLocationDialog.vue'),
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
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('../pages/ErrorNotFound.vue'),
  },
];

export default routes;

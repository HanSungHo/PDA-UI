import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
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

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('../pages/ErrorNotFound.vue'),
  },
];

export default routes;

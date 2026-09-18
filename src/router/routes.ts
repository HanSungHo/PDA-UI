import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('../pages/IndexPage.vue') },
      { path: 'second', component: () => import('../pages/SecondPage.vue') },
      { path: 'example', component: () => import('../features/example/pages/ExamplePage.vue') },
      {
        path: 'esheet/draw-menu-preview',
        component: () => import('../features/esheet/pages/ESheetDrawMenuPreviewPage.vue'),
      },
      {
        path: 'comment-view',
        component: () => import('../features/comment-view/pages/CommentViewPage.vue'),
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('../pages/ErrorNotFound.vue'),
  },
];

export default routes;

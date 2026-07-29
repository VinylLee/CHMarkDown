import { createRouter, createWebHashHistory } from 'vue-router'
import TodoView from '../views/TodoView.vue'
import NotesView from '../views/NotesView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'todos',
      component: TodoView,
    },
    {
      path: '/notes',
      name: 'notes',
      component: NotesView,
    },
  ],
})

export default router

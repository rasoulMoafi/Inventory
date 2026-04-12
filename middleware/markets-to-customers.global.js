export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/markets') {
    return navigateTo('/customers')
  }
  if (to.path.startsWith('/markets/')) {
    return navigateTo(to.path.replace(/^\/markets/, '/customers'))
  }
})

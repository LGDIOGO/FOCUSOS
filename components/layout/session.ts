// Encerrar sessão: compartilhado entre Sidebar (desktop) e MobileNav (sheet "Mais").
export async function signOutAndRedirect() {
  const { auth } = await import('@/lib/firebase/config')
  await auth.signOut()
  window.location.href = '/'
}

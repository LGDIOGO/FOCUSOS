// Destinos de navegação do app (puro: sem React/ícones, para poder testar).
// O ícone é resolvido em components/layout/navIcons.ts pela chave `icon`.

export type NavIconKey =
  | 'resumo' | 'agenda' | 'trabalho' | 'habitos' | 'metas' | 'insights'
  | 'financas' | 'livros' | 'estudos' | 'aposentadoria' | 'ia'

export interface NavDestination {
  label: string
  href: string
  icon: NavIconKey
}

/** Todos os destinos, na ordem da Sidebar. */
export const NAV_DESTINATIONS: NavDestination[] = [
  { label: 'Resumo',        href: '/dashboard',               icon: 'resumo' },
  { label: 'Agenda',        href: '/dashboard/agenda',        icon: 'agenda' },
  { label: 'Hábitos',       href: '/dashboard/habits',        icon: 'habitos' },
  { label: 'Trabalho',      href: '/dashboard/trabalho',      icon: 'trabalho' },
  { label: 'Metas',         href: '/dashboard/goals',         icon: 'metas' },
  { label: 'Insights',      href: '/dashboard/insights',      icon: 'insights' },
  { label: 'Finanças',      href: '/dashboard/finance',       icon: 'financas' },
  { label: 'Livros',        href: '/dashboard/books',         icon: 'livros' },
  { label: 'Estudos',       href: '/dashboard/study',         icon: 'estudos' },
  { label: 'Aposentadoria', href: '/dashboard/aposentadoria', icon: 'aposentadoria' },
  { label: 'IA',            href: '/dashboard/ia',            icon: 'ia' },
]

/** Destinos fixos na barra inferior (ordem de exibição). O resto vai para "Mais". */
export const PRIMARY_HREFS = [
  '/dashboard',
  '/dashboard/agenda',
  '/dashboard/habits',
  '/dashboard/trabalho',
]

/** Ordem dos destinos dentro do sheet "Mais". */
export const MORE_HREFS = [
  '/dashboard/goals',
  '/dashboard/finance',
  '/dashboard/study',
  '/dashboard/books',
  '/dashboard/insights',
  '/dashboard/aposentadoria',
  '/dashboard/ia',
]

export function splitNavDestinations(items: NavDestination[] = NAV_DESTINATIONS) {
  const primary = PRIMARY_HREFS
    .map((href) => items.find((i) => i.href === href))
    .filter((i): i is NavDestination => !!i)
  const rest = items.filter((i) => PRIMARY_HREFS.indexOf(i.href) === -1)
  const rank = (href: string) => { const k = MORE_HREFS.indexOf(href); return k === -1 ? MORE_HREFS.length : k }
  const more = rest.slice().sort((a, b) => rank(a.href) - rank(b.href))
  return { primary, more }
}

/** "Mais" fica ativo quando a rota atual é um destino secundário. */
export function isMoreActive(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return splitNavDestinations().more.some((i) => isRouteActive(pathname, i.href))
}

/** Rota ativa: igual ao href ou subrota dele. `/dashboard` (Resumo) só casa exato. */
export function isRouteActive(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false
  if (pathname === href) return true
  if (href === '/dashboard') return false
  return pathname.startsWith(href + '/')
}

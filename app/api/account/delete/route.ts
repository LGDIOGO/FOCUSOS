import { handleDelete } from '@/lib/server/accountHandlers'
import { realAdmin } from '@/lib/server/accountAdmin'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  return handleDelete(req, realAdmin())
}

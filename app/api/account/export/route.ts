import { handleExport } from '@/lib/server/accountHandlers'
import { realAdmin } from '@/lib/server/accountAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  return handleExport(req, realAdmin())
}

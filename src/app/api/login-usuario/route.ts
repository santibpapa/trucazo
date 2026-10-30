import { loginWithUsername } from '@/lib/login-username'

export async function POST(request: Request) {
  return loginWithUsername(request)
}

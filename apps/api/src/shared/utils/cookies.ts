import { env } from '../config/env.js'

/**
 * Opções padrão para o cookie de refresh token.
 *  - dev: sameSite=lax e secure=false → funciona em localhost
 *  - prod: sameSite=none e secure=true → necessário em deploy cross-domain
 *    (web e api em domínios .onrender.com diferentes)
 */
export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
  path: '/',
}

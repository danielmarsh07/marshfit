/**
 * Extrai a mensagem amigável de um erro Axios — primeiro tenta os detalhes
 * de validação do Zod, depois o campo `error`, e por último cai em uma
 * mensagem genérica.
 */
export function mensagemDeErro(e: unknown, fallback = 'Não foi possível concluir a operação. Tente novamente.'): string {
  const err = e as { response?: { data?: { error?: string; detalhes?: Record<string, string[]> } } }
  const detalhes = err.response?.data?.detalhes
  if (detalhes) {
    const primeiro = Object.values(detalhes).flat()[0]
    if (primeiro) return primeiro
  }
  return err.response?.data?.error ?? fallback
}

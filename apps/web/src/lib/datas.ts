const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function diaSemanaNome(d: number, curto = false): string {
  return (curto ? DIAS_SEMANA_CURTO : DIAS_SEMANA)[d] ?? ''
}

/** "2026-05-12" -> "Seg, 12/05" */
export function formatarDataCurta(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  const data = new Date(Date.UTC(a, m - 1, d))
  return `${DIAS_SEMANA_CURTO[data.getUTCDay()]}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

export function formatarDataLonga(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  const data = new Date(Date.UTC(a, m - 1, d))
  return `${DIAS_SEMANA[data.getUTCDay()]}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}`
}

export function hojeIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isHoje(iso: string): boolean {
  return iso === hojeIso()
}

export function formatarBRL(v: string | number): string {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

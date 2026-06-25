/**
 * Utilidades puras para deduplicar a lista de pedidos do painel do
 * lojista quando polling + realtime entregam o mesmo registro mais de uma
 * vez, e para impedir que toasts disparem repetidamente para o mesmo evento.
 *
 * Ficam isoladas para poderem ser cobertas por testes unitários sem montar
 * o componente inteiro.
 */

export interface DedupOrderLike {
  id: string;
  created_at: string;
}

/**
 * Mescla uma lista atual de pedidos com novos itens vindos do realtime/poll,
 * mantendo no máximo uma entrada por `id`. A versão mais recente (último
 * `updated_at`/conteúdo) substitui a antiga. A ordem final é por
 * `created_at` desc, igual ao painel.
 */
export function mergeOrders<T extends DedupOrderLike>(
  existing: readonly T[],
  incoming: readonly T[],
): T[] {
  const byId = new Map<string, T>();
  for (const o of existing) byId.set(o.id, o);
  for (const o of incoming) byId.set(o.id, o); // incoming wins
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

/**
 * Guarda em memória os event ids já notificados, retornando `true` apenas
 * quando é a primeira vez que aquele evento é visto. Useful pra evitar
 * toasts duplicados quando o mesmo INSERT chega via realtime e via polling.
 *
 * Aceita Set externo (para o consumer manter referência estável).
 */
export function shouldEmitOnce(seen: Set<string>, eventId: string | null | undefined): boolean {
  if (!eventId) return false;
  if (seen.has(eventId)) return false;
  seen.add(eventId);
  // proteção: nunca crescer indefinidamente
  if (seen.size > 500) {
    const first = seen.values().next().value;
    if (first) seen.delete(first);
  }
  return true;
}
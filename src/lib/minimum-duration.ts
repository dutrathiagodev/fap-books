// Faz uma operação demorar pelo menos "minimumMs". Usado no "Esqueci minha senha": enviar o e-mail (conta existe) leva mais
// tempo que não enviar (conta não existe), e essa diferença deixaria alguém descobrir quais e-mails têm cadastro medindo a
// resposta. Com o piso, as duas respostas levam praticamente o mesmo tempo.
export async function withMinimumDuration<T>(
  minimumMs: number,
  operation: () => Promise<T>,
  now: () => number = Date.now,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<T> {
  const startedAt = now();
  const result = await operation();
  const remaining = minimumMs - (now() - startedAt);
  if (remaining > 0) await sleep(remaining);
  return result;
}

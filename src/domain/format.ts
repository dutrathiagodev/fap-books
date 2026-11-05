// Textos de contagem e números no padrão da tela (português do Brasil).

// Escolhe o singular quando a quantidade é exatamente 1 (zero e os demais usam o plural, como "0 exemplares").
export function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

// Número com separador de milhar do Brasil (1.234). Aceita as opções do Intl (ex.: casas decimais).
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return value.toLocaleString("pt-BR", options);
}

import { normalizeDescription } from "./quickEntry";
import type { Category } from "./types";

/**
 * Palpite de categoria por estabelecimento conhecido — vale só quando o histórico ainda não
 * ensinou nada sobre aquela descrição. Nomes batem com as categorias padrão.
 */
const MERCHANT_RULES: [RegExp, string][] = [
  // Ordem importa: o mais específico primeiro ("amazon prime" antes de "amazon", "mercado livre" antes de "mercado").
  [/\b(netflix|spotify|disney|hbo|prime video|amazon prime|youtube|apple|icloud|google one|deezer|globoplay|paramount|crunchyroll|chatgpt|openai|claude|anthropic|notion|github|adobe|canva)\b/, "Assinaturas"],
  [/\b(amazon|mercado livre|mercadolivre|shopee|shein|aliexpress|magalu|magazine luiza|americanas|casas bahia|netshoes|centauro|renner|riachuelo|zara|nike|adidas|kabum|fast shop|leroy merlin|tok stok)\b/, "Compras"],
  [/\b(ifood|rappi|ze delivery|aiqfome|restaurante|lanchonete|padaria|pizzaria|hamburgueria|burger|mc ?donalds|mcdonald|subway|outback|coco bambu|habibs|starbucks|cafeteria|sushi|churrascaria)\b/, "Alimentação"],
  [/\b(mercado|supermercado|atacadao|assai|carrefour|pao de acucar|hortifruti|sacolao|acougue)\b/, "Mercado"],
  [/\b(uber|cabify|taxi|metro|onibus|bilhete unico|posto|shell|ipiranga|petrobras|combustivel|gasolina|estacionamento|sem parar|veloe|conectcar|pedagio)\b/, "Transporte"],
  [/\b(aluguel|condominio|enel|cemig|copel|celesc|sabesp|copasa|sanepar|comgas|energia eletrica|conta de luz|conta de agua)\b/, "Moradia"],
  [/\b(farmacia|drogaria|droga raia|drogasil|pague menos|panvel|hospital|clinica|laboratorio|dentista|unimed|amil|sulamerica|hapvida|academia|smart fit|bluefit|gympass|wellhub)\b/, "Saúde"],
  [/\b(cinema|cinemark|ingresso|teatro|steam|playstation|psn|xbox|nintendo)\b/, "Lazer"],
  [/\b(udemy|alura|faculdade|escola|livraria|kindle)\b/, "Educação"],
  [/\b(barbearia|salao|cabeleireiro|manicure|estetica|perfumaria|boticario|natura|sephora)\b/, "Cuidados pessoais"],
  [/\b(hotel|airbnb|booking|latam|decolar|passagem aerea|hostel)\b/, "Viagem"],
  [/\b(iof|anuidade|tarifa|juros|multa|darf|ipva|iptu)\b/, "Impostos e taxas"],
];

export function guessCategoryByMerchant(description: string, categories: Category[]): string | null {
  const text = ` ${normalizeDescription(description)} `;
  if (!text.trim()) return null;
  for (const [pattern, name] of MERCHANT_RULES) {
    if (!pattern.test(text)) continue;
    const category = categories.find((item) => item.name === name && item.kind === "expense" && !item.archived);
    if (category) return category.id;
  }
  return null;
}

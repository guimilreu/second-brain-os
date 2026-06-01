const LAST_ACCOUNT_KEY = "sbo:lastAccountId";
const LAST_CATEGORY_KEY = "sbo:lastCategory";

export function getLastAccountId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem(LAST_ACCOUNT_KEY) ?? undefined;
}

export function setLastAccountId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_ACCOUNT_KEY, id);
}

export function getLastCategory(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem(LAST_CATEGORY_KEY) ?? undefined;
}

export function setLastCategory(category: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_CATEGORY_KEY, category);
}

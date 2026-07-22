import type { DrinkWithCurrentPrice } from '../types/api.js';

export interface DrinkCategoryGroup {
  category_id: number;
  category_name: string;
  drinks: DrinkWithCurrentPrice[];
}

/**
 * Gruppiert verfügbare Getränke nach Kategorie. Die Reihenfolge entspricht der
 * vom Backend gelieferten Sortierung (category_sort_order, dann Name), da die
 * Gruppen in Erscheinungsreihenfolge aufgebaut werden.
 */
export function groupDrinksByCategory(drinks: DrinkWithCurrentPrice[]): DrinkCategoryGroup[] {
  const groups: DrinkCategoryGroup[] = [];
  const index = new Map<number, DrinkCategoryGroup>();

  for (const drink of drinks) {
    let group = index.get(drink.category_id);
    if (!group) {
      group = {
        category_id: drink.category_id,
        category_name: drink.category_name,
        drinks: [],
      };
      index.set(drink.category_id, group);
      groups.push(group);
    }
    group.drinks.push(drink);
  }

  return groups;
}

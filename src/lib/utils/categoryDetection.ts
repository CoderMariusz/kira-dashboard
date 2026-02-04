import type { ShoppingCategory } from '@/lib/types/database';

// ═══════════════════════════════════════════
// CATEGORY KEYWORDS MAP
// ═══════════════════════════════════════════

/**
 * Mapping of category names to keywords for auto-detection.
 * Minimum 10 keywords per category required.
 */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Nabiał': [
    'mleko', 'ser', 'jogurt', 'twarog', 'twaróg', 'smietana', 'śmietana',
    'maslo', 'masło', 'kefir', 'maslanka', 'maślanka', 'serek', 'fromage',
    'parmezan', 'mozzarella', 'feta', 'camembert', 'ricotta', 'mascarpone'
  ],
  'Pieczywo': [
    'chleb', 'bulka', 'bułka', 'bulki', 'bułki', 'bagietka', 'croissant',
    'paczek', 'pączek', 'drozdzowka', 'drożdżówka', 'kajzerka', 'tost',
    'chalka', 'chałka', 'precel', 'ciabatta', 'focaccia', 'razowy', 'graham',
    'pieczywo', 'rogalik', 'rogaliki'
  ],
  'Owoce i Warzywa': [
    'jablko', 'jabłko', 'jablka', 'jabłka', 'banan', 'pomarancza', 'pomarańcza',
    'gruszka', 'truskawka', 'pomidor', 'ogorek', 'ogórek', 'marchew', 'marchewka',
    'ziemniak', 'salata', 'sałata', 'papryka', 'cebula', 'czosnek',
    'brokul', 'brokuł', 'kalafior', 'winogrono', 'arbuz', 'melon',
    'kapusta', 'owoc', 'warzywa', 'owoce', 'ziemniaki', 'kartofle',
    'szpinak', 'dynia', 'rzodkiewka', 'pietruszka', 'por', 'seler'
  ],
  'Mięso i Ryby': [
    'kurczak', 'wolowina', 'wołowina', 'wieprzowina', 'szynka', 'kielbasa',
    'kiełbasa', 'losos', 'łosoś', 'tunczyk', 'tuńczyk', 'dorsz',
    'sledz', 'śledź', 'pstrag', 'pstrąg', 'filet', 'schab',
    'poledwica', 'polędwica', 'karkowka', 'karkówka', 'udka', 'mieso', 'mięso',
    'ryba', 'boczek', 'salami', 'parowki', 'parówki', 'indyk'
  ],
  'Chemia i Higiena': [
    'proszek', 'plyn', 'płyn', 'mydlo', 'mydło', 'szampon', 'pasta',
    'odswiezacz', 'odświeżacz', 'papier', 'zmywak', 'gabka', 'gąbka',
    'wybielacz', 'zmiekczacz', 'zmiękczacz', 'srodek', 'środek',
    'czyscik', 'czyścik', 'balsam', 'chemia', 'higiena',
    'detergent', 'plyn do naczyn', 'płyn do naczyń', 'toaletowy'
  ],
  'Napoje': [
    'woda', 'sok', 'kawa', 'herbata', 'cola',
    'piwo', 'wino', 'napoj', 'napój', 'lemoniada', 'kompot',
    'sprite', 'fanta', 'pepsi', 'energy', 'drink',
    'juice', 'smoothie', 'nektar'
  ],
  'Mrożonki': [
    'lody', 'mrozone', 'mrożone', 'pizza', 'frytki', 'mrozonki', 'mrożonki',
    'pierogi', 'nuggetsy', 'kotlet', 'smietanka', 'śmietanka',
    'sorbet', 'deser', 'churros', 'frozen', 'mrozny', 'mroźny'
  ],
};

// ═══════════════════════════════════════════
// DETECTION FUNCTION
// ═══════════════════════════════════════════

/**
 * Detects category from product name using keyword matching.
 * 
 * Performs case-insensitive partial matching against CATEGORY_KEYWORDS map.
 * 
 * @param productName - Product name to detect category for
 * @param categories - Available categories to match against
 * @returns Category ID if match found, null otherwise
 * 
 * @example
 * ```ts
 * detectCategory('mleko 2%', categories) // Returns ID for 'Nabiał' category
 * detectCategory('chleb razowy', categories) // Returns ID for 'Pieczywo' category
 * detectCategory('unknown product', categories) // Returns null
 * ```
 */
/**
 * Find a category by name with fuzzy matching.
 * Exact match first, then partial (e.g. "Chemia" matches "Chemia i Higiena").
 */
function findCategoryByName(
  categoryName: string,
  categories: ShoppingCategory[]
): ShoppingCategory | undefined {
  const lower = categoryName.toLowerCase();
  // Exact match
  const exact = categories.find(cat => cat.name.toLowerCase() === lower);
  if (exact) return exact;
  // Partial: category name starts with keyword or keyword starts with category name
  return categories.find(cat => {
    const catLower = cat.name.toLowerCase();
    return catLower.startsWith(lower) || lower.startsWith(catLower);
  });
}

export function detectCategory(
  productName: string,
  categories: ShoppingCategory[]
): string | null {
  // Handle empty/null input
  if (!productName || productName.trim() === '') {
    // Return "Inne" fallback even for empty names
    const inne = categories.find(cat => cat.name === 'Inne');
    return inne?.id ?? null;
  }

  const normalizedProduct = productName.toLowerCase().trim();

  // Search for matching keywords
  for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedProduct.includes(keyword.toLowerCase())) {
        // Find category by name (with fuzzy matching)
        const category = findCategoryByName(categoryName, categories);
        if (category) return category.id;
      }
    }
  }

  // Fallback: assign to "Inne" category so items always display
  const inne = categories.find(cat => cat.name === 'Inne');
  return inne?.id ?? null;
}

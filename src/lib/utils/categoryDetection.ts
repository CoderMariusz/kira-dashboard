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
    'mleko', 'ser', 'jogurt', 'twaróg', 'śmietana', 
    'masło', 'kefir', 'maślanka', 'serek', 'fromage',
    'parmezan', 'mozzarella', 'feta', 'camembert'
  ],
  'Pieczywo': [
    'chleb', 'bułka', 'bagietka', 'croissant', 'pączek',
    'drożdżówka', 'kajzerka', 'tost', 'chałka', 'precel',
    'ciabatta', 'focaccia', 'razowy', 'graham'
  ],
  'Owoce i Warzywa': [
    'jabłko', 'jabłka', 'banan', 'pomarańcza', 'gruszka', 'truskawka',
    'pomidor', 'ogórek', 'marchew', 'ziemniak', 'sałata',
    'papryka', 'cebula', 'czosnek', 'brokuł', 'kalafior',
    'winogrono', 'arbuz', 'melon', 'kapusta', 'owoc', 'warzywa'
  ],
  'Mięso i Ryby': [
    'kurczak', 'wołowina', 'wieprzowina', 'szynka', 'kielbasa',
    'łosoś', 'tuńczyk', 'dorsz', 'śledź', 'pstrąg',
    'filet', 'schab', 'polędwica', 'karkówka', 'udka'
  ],
  'Chemia': [
    'proszek', 'płyn', 'mydło', 'szampon', 'pasta',
    'odświeżacz', 'papier', 'zmywak', 'gąbka', 'deterrent',
    'wybielacz', 'zmiękczacz', 'środek', 'czyścik', 'balsam'
  ],
  'Napoje': [
    'woda', 'sok', 'kawa', 'herbata', 'cola',
    'piwo', 'wino', 'napój', 'lemoniada', 'kompot',
    'sprite', 'fanta', 'pepsi', 'energy', 'drink'
  ],
  'Mrożonki': [
    'lody', 'mrożone', 'pizza', 'frytki', 'warzywa',
    'ryba', 'pierogi', 'nuggetsy', 'kotlet', 'śmietanka',
    'sorbet', 'deser', 'churros', 'frozen', 'mroźny'
  ],
  'Apteka': [
    'lek', 'tabletka', 'syrop', 'witamina', 'plaster',
    'bandaż', 'maść', 'krople', 'żel', 'antybiotyk',
    'aspiryna', 'paracetamol', 'ibuprom', 'krem', 'suplement'
  ],
  'Majsterkowanie': [
    'śruba', 'gwóźdź', 'młotek', 'wiertło', 'farba',
    'pędzel', 'taśma', 'klej', 'silikon', 'wkrętak',
    'piła', 'śrubokręt', 'gwoździe', 'nakrętka', 'podkładka'
  ],
  'Meble': [
    'stół', 'krzesło', 'szafa', 'półka', 'lampka',
    'lustro', 'regał', 'stolik', 'fotel', 'kanapa',
    'łóżko', 'komoda', 'biurko', 'szafka', 'wieszak'
  ]
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
export function detectCategory(
  productName: string,
  categories: ShoppingCategory[]
): string | null {
  // Handle empty/null input
  if (!productName || productName.trim() === '') {
    return null;
  }

  const normalizedProduct = productName.toLowerCase().trim();

  // Search for matching keywords
  for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedProduct.includes(keyword.toLowerCase())) {
        // Find category by name
        const category = categories.find(cat => cat.name === categoryName);
        return category?.id || null;
      }
    }
  }

  return null;
}

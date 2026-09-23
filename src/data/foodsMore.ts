import type { Food } from '@/types'

/**
 * More built-in foods (September 2026), merged into BUILT_IN_FOODS.
 *
 * - Vietnamese dishes: typical restaurant/street portions. Calories follow
 *   published per-portion figures (USDA "beef and rice noodle soup", MyFitnessPal
 *   aggregates, Vietnamese calorie guides); macros are estimated from typical
 *   recipes and add up to the calories. Portions vary a lot, so treat as estimates.
 * - Fruit, staples and packaged items: USDA FoodData Central values, rounded.
 *
 * Names carry the Vietnamese and English names; search ignores accents.
 */

function f(uuid: string, name: string, kcal: number, protein: number, carbs: number, fat: number, servingSize: number, servingUnit: string): Food {
  return { uuid, name, kcalPerServing: kcal, protein, carbs, fat, servingSize, servingUnit, isCustom: false, isFavorite: false, updatedAt: 0 }
}

export const MORE_FOODS: Food[] = [
  // ── Vietnamese: noodle soups & noodle bowls ──────────────────────
  f('food-vn-pho-bo',           'Phở bò (beef pho)',                        450, 30, 60, 10, 1, 'bowl'),
  f('food-vn-pho-ga',           'Phở gà (chicken pho)',                     400, 28, 55, 7,  1, 'bowl'),
  f('food-vn-bun-bo-hue',       'Bún bò Huế (spicy beef noodle soup)',      480, 30, 55, 15, 1, 'bowl'),
  f('food-vn-bun-rieu',         'Bún riêu cua (crab noodle soup)',          420, 22, 55, 12, 1, 'bowl'),
  f('food-vn-hu-tieu',          'Hủ tiếu Nam Vang (pork & seafood noodle soup)', 420, 25, 58, 10, 1, 'bowl'),
  f('food-vn-mi-quang',         'Mì Quảng (turmeric noodles)',              540, 30, 62, 19, 1, 'bowl'),
  f('food-vn-cao-lau',          'Cao lầu (Hội An pork noodles)',            500, 28, 60, 16, 1, 'bowl'),
  f('food-vn-bun-cha',          'Bún chả (grilled pork & vermicelli)',      580, 30, 60, 24, 1, 'serving'),
  f('food-vn-bun-thit-nuong',   'Bún thịt nướng (grilled pork vermicelli bowl)', 520, 25, 65, 18, 1, 'bowl'),
  f('food-vn-bun-thit-nuong-cha-gio', 'Bún thịt nướng chả giò (with fried spring rolls)', 650, 27, 75, 27, 1, 'bowl'),
  f('food-vn-bun-dau',          'Bún đậu mắm tôm (vermicelli, fried tofu & pork)', 700, 30, 70, 33, 1, 'set'),
  f('food-vn-sup-cua',          'Súp cua (crab soup)',                      180, 12, 18, 6,  1, 'bowl'),

  // ── Vietnamese: rice dishes ──────────────────────────────────────
  f('food-vn-com-tam-suon',     'Cơm tấm sườn (broken rice, grilled pork chop)', 620, 32, 70, 23, 1, 'plate'),
  f('food-vn-com-tam-suon-bi-cha', 'Cơm tấm sườn bì chả (broken rice, full plate)', 780, 40, 80, 33, 1, 'plate'),
  f('food-vn-com-ga',           'Cơm gà (chicken rice)',                    600, 32, 75, 18, 1, 'plate'),
  f('food-vn-com-chien',        'Cơm chiên Dương Châu (fried rice)',        650, 20, 85, 25, 1, 'plate'),
  f('food-vn-xoi-ga',           'Xôi gà (sticky rice with chicken)',        480, 20, 70, 13, 1, 'pack'),
  f('food-vn-xoi-xeo',          'Xôi xéo (sticky rice with mung bean)',     450, 12, 72, 12, 1, 'pack'),
  f('food-vn-banh-chung',       'Bánh chưng (sticky rice cake, 1 slice)',   400, 12, 55, 15, 1, 'slice'),

  // ── Vietnamese: bánh mì, rolls & small plates ────────────────────
  f('food-vn-banh-mi-thit',     'Bánh mì thịt (pork bánh mì)',              450, 22, 52, 17, 1, 'sandwich'),
  f('food-vn-banh-mi-ga',       'Bánh mì gà (chicken bánh mì)',             380, 24, 48, 10, 1, 'sandwich'),
  f('food-vn-banh-mi-trung',    'Bánh mì trứng (egg bánh mì)',              380, 15, 48, 14, 1, 'sandwich'),
  f('food-vn-goi-cuon',         'Gỏi cuốn (fresh spring roll, shrimp & pork)', 90, 6, 12, 2, 1, 'roll'),
  f('food-vn-cha-gio',          'Chả giò (fried spring roll)',              150, 5, 10, 10, 1, 'roll'),
  f('food-vn-banh-xeo',         'Bánh xèo (sizzling crepe)',                400, 14, 40, 20, 1, 'crepe'),
  f('food-vn-banh-cuon',        'Bánh cuốn (steamed rice rolls)',           380, 16, 60, 8,  1, 'plate'),
  f('food-vn-banh-beo',         'Bánh bèo (steamed rice cakes)',            250, 8,  40, 6,  1, 'plate'),
  f('food-vn-banh-khot',        'Bánh khọt (mini crispy pancakes, 6 pcs)',  350, 10, 36, 18, 1, 'serving'),
  f('food-vn-bot-chien',        'Bột chiên (fried rice-flour cake)',        450, 10, 50, 23, 1, 'plate'),
  f('food-vn-banh-bao',         'Bánh bao (steamed pork bun)',              330, 13, 45, 11, 1, 'bun'),
  f('food-vn-goi-du-du',        'Gỏi đu đủ (green papaya salad)',           260, 15, 30, 9,  1, 'plate'),
  f('food-vn-hot-vit-lon',      'Hột vịt lộn (balut)',                      190, 14, 2,  14, 1, 'egg'),

  // ── Vietnamese: home-style mains & sides ─────────────────────────
  f('food-vn-bo-kho',           'Bò kho (beef stew)',                       420, 32, 15, 25, 1, 'bowl'),
  f('food-vn-ca-kho-to',        'Cá kho tộ (caramelized braised fish)',     280, 25, 10, 15, 1, 'serving'),
  f('food-vn-thit-kho-trung',   'Thịt kho trứng (braised pork belly & egg)', 420, 22, 8, 33, 1, 'serving'),
  f('food-vn-canh-chua',        'Canh chua cá (sour fish soup)',            180, 16, 14, 6,  1, 'bowl'),
  f('food-vn-rau-muong-xao',    'Rau muống xào tỏi (garlic water spinach)', 150, 4,  8,  11, 1, 'plate'),
  f('food-vn-bo-luc-lac',       'Bò lúc lắc (shaking beef)',                380, 30, 10, 24, 1, 'serving'),
  f('food-vn-ga-xao-sa-ot',     'Gà xào sả ớt (lemongrass chili chicken)',  300, 28, 8,  17, 1, 'serving'),
  f('food-vn-nem-nuong',        'Nem nướng (grilled pork sausage)',         280, 18, 8,  20, 100, 'g'),
  f('food-vn-cha-lua',          'Chả lụa (Vietnamese pork roll)',           190, 15, 5,  12, 100, 'g'),
  f('food-vn-lap-xuong',        'Lạp xưởng (Chinese sausage, 1 link)',      150, 6,  6,  11.5, 1, 'link'),

  // ── Vietnamese: staples & condiments ─────────────────────────────
  f('food-vn-bun-noodles',      'Bún / bánh phở (rice noodles, cooked)',    108, 1.8, 24, 0.2, 100, 'g'),
  f('food-vn-xoi',              'Xôi (sticky rice, cooked)',                97, 2,  21, 0.2, 100, 'g'),
  f('food-vn-banh-trang',       'Bánh tráng (rice paper, 1 sheet)',         33, 0.6, 7.8, 0, 1, 'sheet'),
  f('food-vn-nuoc-mam',         'Nước mắm (fish sauce, 1 tbsp)',            6,  1,  0.6, 0, 1, 'tbsp'),
  f('food-vn-nuoc-cham',        'Nước chấm (dipping sauce, 2 tbsp)',        30, 0.5, 7, 0, 2, 'tbsp'),

  // ── Vietnamese: drinks & desserts ────────────────────────────────
  f('food-vn-ca-phe-sua-da',    'Cà phê sữa đá (iced coffee with condensed milk)', 150, 3, 24, 4.5, 1, 'glass'),
  f('food-vn-bac-xiu',          'Bạc xỉu (milky iced coffee)',              190, 5,  28, 6,  1, 'glass'),
  f('food-vn-ca-phe-den',       'Cà phê đen đá (black iced coffee, sweetened)', 50, 0.3, 12, 0, 1, 'glass'),
  f('food-vn-tra-sua',          'Trà sữa trân châu (bubble milk tea, 500 ml)', 350, 3, 62, 10, 1, 'cup'),
  f('food-vn-sinh-to-bo',       'Sinh tố bơ (avocado smoothie)',            350, 5,  40, 19, 1, 'glass'),
  f('food-vn-nuoc-mia',         'Nước mía (sugarcane juice, 400 ml)',       180, 0,  45, 0,  1, 'glass'),
  f('food-vn-che',              'Chè đậu xanh (mung bean sweet soup)',      300, 6,  55, 6,  1, 'cup'),
  f('food-vn-banh-flan',        'Bánh flan (caramel custard)',              150, 5,  22, 5,  1, 'cup'),

  // ── Tropical fruit (per 100 g) ───────────────────────────────────
  f('food-dragon-fruit',        'Thanh long (dragon fruit)',                60, 1.2, 13, 0.4, 100, 'g'),
  f('food-lychee',              'Vải (lychee)',                             66, 0.8, 16.5, 0.4, 100, 'g'),
  f('food-longan',              'Nhãn (longan)',                            60, 1.3, 15, 0.1, 100, 'g'),
  f('food-jackfruit',           'Mít (jackfruit)',                          95, 1.7, 23, 0.6, 100, 'g'),
  f('food-durian',              'Sầu riêng (durian)',                       147, 1.5, 27, 5.3, 100, 'g'),
  f('food-rambutan',            'Chôm chôm (rambutan)',                     68, 0.7, 16.5, 0.2, 100, 'g'),
  f('food-mangosteen',          'Măng cụt (mangosteen)',                    73, 0.4, 18, 0.6, 100, 'g'),
  f('food-pomelo',              'Bưởi (pomelo)',                            38, 0.8, 9.6, 0, 100, 'g'),
  f('food-papaya',              'Đu đủ (papaya)',                           43, 0.5, 11, 0.3, 100, 'g'),
  f('food-guava',               'Ổi (guava)',                               68, 2.6, 14, 1, 100, 'g'),
  f('food-passion-fruit',       'Chanh dây (passion fruit)',                97, 2.2, 23, 0.7, 100, 'g'),
  f('food-star-fruit',          'Khế (star fruit)',                         31, 1, 6.7, 0.3, 100, 'g'),
  f('food-sapodilla',           'Hồng xiêm (sapodilla)',                    83, 0.4, 20, 1.1, 100, 'g'),

  // ── Protein ──────────────────────────────────────────────────────
  f('food-chicken-wings',       'Chicken Wings (cooked, with skin)',        290, 27, 0, 19.5, 100, 'g'),
  f('food-chicken-drumstick',   'Chicken Drumstick (cooked, with skin)',    216, 27, 0, 11, 100, 'g'),
  f('food-rotisserie-chicken',  'Rotisserie Chicken (meat & skin)',         239, 27, 0, 13.6, 100, 'g'),
  f('food-pork-chop',           'Pork Chop (cooked)',                       231, 26, 0, 14, 100, 'g'),
  f('food-pork-belly',          'Pork Belly (cooked)',                      518, 9.3, 0, 53, 100, 'g'),
  f('food-pork-sausage',        'Pork Sausage (cooked)',                    325, 18, 1, 27, 100, 'g'),
  f('food-lamb',                'Lamb (lean, cooked)',                      206, 28, 0, 9.5, 100, 'g'),
  f('food-cod',                 'Cod (cooked)',                             105, 23, 0, 0.9, 100, 'g'),
  f('food-sardines',            'Sardines (canned in oil, drained)',        208, 25, 0, 11.5, 100, 'g'),
  f('food-mackerel',            'Mackerel (cooked)',                        262, 24, 0, 18, 100, 'g'),
  f('food-beef-jerky',          'Beef Jerky',                               116, 9.4, 3.1, 7.3, 28, 'g'),
  f('food-turkey-bacon',        'Turkey Bacon (2 slices)',                  70, 5, 1, 5, 30, 'g'),
  f('food-hot-dog-frank',       'Hot Dog Frank (beef, 1)',                  186, 7, 1.7, 17, 1, 'frank'),
  f('food-casein',              'Casein Protein (1 scoop)',                 120, 24, 3, 1, 33, 'g'),
  f('food-protein-shake-rtd',   'Protein Shake (ready-to-drink, 340 ml)',   150, 30, 3, 2.5, 1, 'bottle'),

  // ── Dairy & alternatives ─────────────────────────────────────────
  f('food-milk-2',              '2% Milk (240ml)',                          122, 8, 12, 4.8, 240, 'ml'),
  f('food-skyr',                'Skyr (plain)',                             95, 16.5, 6, 0.3, 150, 'g'),
  f('food-kefir',               'Kefir (low-fat, 240ml)',                   104, 9, 12, 2.5, 240, 'ml'),
  f('food-greek-yogurt-flavored', 'Greek Yogurt (flavored, 150g)',          140, 13, 17, 2, 150, 'g'),
  f('food-string-cheese',       'String Cheese (1 stick)',                  80, 7, 1, 6, 1, 'stick'),
  f('food-feta',                'Feta Cheese',                              264, 14, 4, 21, 100, 'g'),
  f('food-swiss-cheese',        'Swiss Cheese',                             380, 27, 1.5, 28, 100, 'g'),
  f('food-heavy-cream',         'Heavy Cream (1 tbsp)',                     51, 0.4, 0.4, 5.4, 15, 'ml'),
  f('food-sour-cream',          'Sour Cream (2 tbsp)',                      60, 0.7, 1.4, 5.8, 30, 'g'),
  f('food-condensed-milk',      'Sweetened Condensed Milk (1 tbsp)',        64, 1.6, 11, 1.7, 20, 'g'),
  f('food-coconut-milk',        'Coconut Milk (canned, 100ml)',             197, 2, 3, 20, 100, 'ml'),

  // ── Grains, bread & breakfast ────────────────────────────────────
  f('food-egg-noodles',         'Egg Noodles (cooked)',                     138, 4.5, 25, 2, 100, 'g'),
  f('food-udon',                'Udon Noodles (cooked)',                    105, 2.6, 21, 0.4, 100, 'g'),
  f('food-soba',                'Soba Noodles (cooked)',                    99, 5, 21, 0.1, 100, 'g'),
  f('food-oatmeal-cooked',      'Oatmeal (cooked with water, 1 cup)',       166, 6, 28, 3.6, 234, 'g'),
  f('food-instant-oatmeal',     'Instant Oatmeal (flavored packet)',        160, 4, 32, 2, 1, 'packet'),
  f('food-baguette',            'Baguette',                                 135, 4.5, 26, 1.2, 50, 'g'),
  f('food-croissant',           'Croissant (butter)',                       231, 4.7, 26, 12, 1, 'croissant'),
  f('food-blueberry-muffin',    'Blueberry Muffin (bakery)',                420, 6, 60, 17, 1, 'muffin'),
  f('food-glazed-donut',        'Glazed Donut',                             260, 3.5, 31, 14, 1, 'donut'),
  f('food-pancakes',            'Pancakes (2 medium, plain)',               340, 9, 50, 12, 2, 'pancakes'),
  f('food-waffle',              'Waffle (frozen, toasted)',                 100, 2.5, 15, 3.3, 1, 'waffle'),
  f('food-banana-bread',        'Banana Bread (1 slice)',                   196, 2.6, 33, 6.3, 1, 'slice'),

  // ── Fruit & veg ──────────────────────────────────────────────────
  f('food-cherries',            'Cherries',                                 63, 1, 16, 0.2, 100, 'g'),
  f('food-plum',                'Plum (medium)',                            30, 0.5, 7.5, 0.2, 1, 'plum'),
  f('food-grapefruit',          'Grapefruit (half)',                        52, 0.9, 13, 0.2, 1, 'half'),
  f('food-cantaloupe',          'Cantaloupe',                               34, 0.8, 8, 0.2, 100, 'g'),
  f('food-medjool-date',        'Medjool Date (1)',                         66, 0.4, 18, 0, 1, 'date'),
  f('food-raisins',             'Raisins',                                  85, 0.9, 22, 0.1, 28, 'g'),
  f('food-dried-mango',         'Dried Mango',                              128, 1, 31, 0.5, 40, 'g'),
  f('food-bok-choy',            'Bok Choy (cooked)',                        12, 1.6, 1.8, 0.2, 100, 'g'),
  f('food-bean-sprouts',        'Bean Sprouts (raw)',                       30, 3, 6, 0.2, 100, 'g'),
  f('food-eggplant',            'Eggplant (cooked)',                        35, 0.8, 8.7, 0.2, 100, 'g'),
  f('food-kimchi',              'Kimchi',                                   15, 1.1, 2.4, 0.5, 100, 'g'),
  f('food-seaweed-snack',       'Roasted Seaweed Snack',                    25, 0.5, 1, 2, 5, 'g'),

  // ── Snacks & spreads ─────────────────────────────────────────────
  f('food-hummus',              'Hummus (2 tbsp)',                          50, 2.4, 4.3, 2.9, 30, 'g'),
  f('food-tortilla-chips',      'Tortilla Chips',                           140, 2, 18, 7, 28, 'g'),
  f('food-pretzels',            'Pretzels',                                 108, 3, 23, 0.8, 28, 'g'),
  f('food-saltines',            'Saltine Crackers (5)',                     63, 1.4, 11, 1.4, 5, 'crackers'),
  f('food-trail-mix',           'Trail Mix',                                190, 5, 18, 12, 40, 'g'),
  f('food-mixed-nuts',          'Mixed Nuts (roasted)',                     170, 5, 6, 15, 28, 'g'),
  f('food-nutella',             'Nutella (2 tbsp)',                         200, 2, 21, 11, 37, 'g'),
  f('food-jam',                 'Jam (1 tbsp)',                             56, 0, 14, 0, 20, 'g'),
  f('food-sugar',               'Sugar (1 tsp)',                            16, 0, 4.2, 0, 4, 'g'),

  // ── Oils & sauces ────────────────────────────────────────────────
  f('food-coconut-oil',         'Coconut Oil (1 tbsp)',                     121, 0, 0, 13.5, 1, 'tbsp'),
  f('food-avocado-oil',         'Avocado Oil (1 tbsp)',                     124, 0, 0, 14, 1, 'tbsp'),
  f('food-oyster-sauce',        'Oyster Sauce (1 tbsp)',                    9, 0.2, 2, 0, 1, 'tbsp'),
  f('food-hoisin',              'Hoisin Sauce (1 tbsp)',                    35, 0.5, 7, 0.5, 1, 'tbsp'),

  // ── Drinks ───────────────────────────────────────────────────────
  f('food-latte',               'Latte (whole milk, 350ml)',                190, 10, 15, 10, 1, 'cup'),
  f('food-cappuccino',          'Cappuccino (whole milk, 240ml)',           110, 6, 9, 6, 1, 'cup'),
  f('food-energy-drink',        'Energy Drink (250ml)',                     110, 0, 28, 0, 1, 'can'),
  f('food-coconut-water',       'Coconut Water (330ml)',                    63, 0.7, 15, 0.2, 1, 'carton'),
  f('food-sweet-iced-tea',      'Sweet Iced Tea (500ml)',                   180, 0, 45, 0, 1, 'bottle'),

  // ── Meals & takeaway ─────────────────────────────────────────────
  f('food-chicken-nuggets',     'Chicken Nuggets (6 pieces)',               260, 14, 16, 16, 6, 'pieces'),
  f('food-fried-chicken',       'Fried Chicken (drumstick, breaded)',       195, 16, 6, 12, 1, 'piece'),
  f('food-burrito',             'Chicken Burrito',                          700, 35, 80, 26, 1, 'burrito'),
  f('food-beef-taco',           'Beef Taco',                                170, 8, 13, 10, 1, 'taco'),
  f('food-caesar-salad',        'Chicken Caesar Salad',                     440, 30, 14, 29, 1, 'bowl'),
  f('food-spaghetti-bolognese', 'Spaghetti Bolognese',                      600, 28, 75, 20, 1, 'plate'),
  f('food-mac-cheese',          'Mac and Cheese',                           400, 16, 44, 17, 1, 'cup'),
  f('food-chicken-curry-rice',  'Chicken Curry with Rice',                  650, 30, 75, 24, 1, 'plate'),
  f('food-pad-thai',            'Pad Thai',                                 650, 25, 80, 25, 1, 'plate'),
  f('food-dumplings',           'Pork Dumplings (6)',                       380, 16, 38, 18, 6, 'pieces'),
  f('food-poke-bowl',           'Salmon Poke Bowl',                         650, 35, 80, 20, 1, 'bowl'),
  f('food-bibimbap',            'Bibimbap',                                 560, 24, 80, 16, 1, 'bowl'),
  f('food-miso-soup',           'Miso Soup',                                40, 3, 5, 1.3, 1, 'cup'),
  f('food-turkey-sub',          'Turkey Sub (6-inch)',                      280, 18, 46, 3.5, 1, 'sub'),
]

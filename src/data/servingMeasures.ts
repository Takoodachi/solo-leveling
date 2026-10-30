import type { Food } from '@/types'

/**
 * What one serving of a built-in food measured in a portion (a bowl, a piece, a can) weighs, or
 * holds for a drink, so it can be logged in grams and ounces too (October 2026). Soups count with
 * their broth. Typical portions: the chains' published serving weights, the size in the food's own
 * name where it gives one, else common portion weights for the dish (USDA FNDDS portions, Japan's
 * food composition tables, Vietnamese street-food portions). Portions vary, so these are close,
 * not exact; the serving stays the main way to log such a food.
 */
const GRAMS: Record<string, number> = {
  'food-egg-large': 50, 'food-egg-white': 33, 'food-vn-hot-vit-lon': 70,
  // Vietnam
  'food-vn-pho-bo': 700, 'food-vn-pho-ga': 650, 'food-vn-bun-bo-hue': 750, 'food-vn-bun-rieu': 700,
  'food-vn-hu-tieu': 650, 'food-vn-mi-quang': 500, 'food-vn-cao-lau': 400, 'food-vn-bun-cha': 550,
  'food-vn-bun-thit-nuong': 450, 'food-vn-bun-thit-nuong-cha-gio': 520, 'food-vn-bun-dau': 600, 'food-vn-sup-cua': 300,
  'food-vn-com-tam-suon': 450, 'food-vn-com-tam-suon-bi-cha': 550, 'food-vn-com-ga': 450, 'food-vn-com-chien': 400,
  'food-vn-xoi-ga': 300, 'food-vn-xoi-xeo': 280, 'food-vn-banh-chung': 180, 'food-vn-banh-mi-thit': 230,
  'food-vn-banh-mi-ga': 220, 'food-vn-banh-mi-trung': 200, 'food-vn-goi-cuon': 90, 'food-vn-cha-gio': 50,
  'food-vn-banh-xeo': 250, 'food-vn-banh-cuon': 350, 'food-vn-banh-beo': 250, 'food-vn-banh-khot': 200,
  'food-vn-bot-chien': 300, 'food-vn-banh-bao': 180, 'food-vn-goi-du-du': 250, 'food-vn-bo-kho': 450,
  'food-vn-ca-kho-to': 200, 'food-vn-thit-kho-trung': 250, 'food-vn-canh-chua': 400, 'food-vn-rau-muong-xao': 200,
  'food-vn-bo-luc-lac': 250, 'food-vn-ga-xao-sa-ot': 220, 'food-vn-lap-xuong': 40, 'food-vn-banh-trang': 10,
  'food-vn-che': 300, 'food-vn-banh-flan': 100,
  'food-vn-banh-mi-xiu-mai': 280, 'food-vn-banh-mi-khong': 80, 'food-vn-pho-cuon': 250, 'food-vn-pho-xao': 400,
  'food-vn-mi-xao-bo': 400, 'food-vn-bun-mam': 700, 'food-vn-bun-ca': 650, 'food-vn-bun-bo-nam-bo': 450,
  'food-vn-mien-ga': 600, 'food-vn-banh-canh-cua': 650, 'food-vn-chao-ga': 450, 'food-vn-chao-long': 500,
  'food-vn-com-rang-dua-bo': 450, 'food-vn-com-van-phong': 550, 'food-vn-banh-trang-tron': 150, 'food-vn-banh-trang-nuong': 120,
  'food-vn-banh-bot-loc': 200, 'food-vn-banh-gio': 200, 'food-vn-banh-trung-thu': 45, 'food-vn-goi-ga': 300,
  'food-vn-dau-hu-sot-ca': 300, 'food-vn-trung-chien': 110, 'food-vn-suon-xao-chua-ngot': 300, 'food-vn-canh-rau': 300,
  'food-vn-che-ba-mau': 300, 'food-vn-che-thai': 300,
  // Everyday foods and dishes
  'food-hot-dog-frank': 57, 'food-string-cheese': 28, 'food-instant-oatmeal': 43, 'food-croissant': 57,
  'food-blueberry-muffin': 140, 'food-glazed-donut': 64, 'food-pancakes': 150, 'food-waffle': 35,
  'food-banana-bread': 60, 'food-plum': 66, 'food-grapefruit': 123, 'food-medjool-date': 24,
  'food-saltines': 15, 'food-oyster-sauce': 18, 'food-hoisin': 16,
  'food-chicken-nuggets': 96, 'food-fried-chicken': 75, 'food-burrito': 350, 'food-beef-taco': 80,
  'food-caesar-salad': 300, 'food-spaghetti-bolognese': 450, 'food-mac-cheese': 200, 'food-chicken-curry-rice': 450,
  'food-pad-thai': 400, 'food-dumplings': 180, 'food-poke-bowl': 450, 'food-bibimbap': 500,
  'food-miso-soup': 240, 'food-turkey-sub': 220,
  // Japan
  'food-jp-gohan': 150, 'food-jp-gyudon': 380, 'food-jp-katsudon': 450, 'food-jp-oyakodon': 420,
  'food-jp-unadon': 380, 'food-jp-kaisendon': 400, 'food-jp-curry-rice': 450, 'food-jp-katsu-curry': 550,
  'food-jp-omurice': 400, 'food-jp-hambagu': 200, 'food-jp-tonkatsu': 150, 'food-jp-makunouchi': 400,
  'food-jp-sukiyaki': 400, 'food-jp-yakisoba': 350, 'food-jp-okonomiyaki': 300, 'food-jp-ramen-tonkotsu': 900,
  'food-jp-ramen-shoyu': 800, 'food-jp-ramen-miso': 850, 'food-jp-tsukemen': 650, 'food-jp-cup-noodle': 77,
  'food-jp-kake-udon': 550, 'food-jp-kitsune-udon': 600, 'food-jp-tempura-udon': 600, 'food-jp-zaru-soba': 300,
  'food-jp-nigiri-salmon': 30, 'food-jp-nigiri-tuna': 30, 'food-jp-nigiri-ebi': 25, 'food-jp-nigiri-tamago': 35,
  'food-jp-california-roll': 200, 'food-jp-spicy-tuna-roll': 210, 'food-jp-ebi-tempura': 60, 'food-jp-gyoza': 150,
  'food-jp-takoyaki': 150, 'food-jp-yakitori': 40, 'food-jp-oden': 350, 'food-jp-natto': 45,
  'food-jp-tamagoyaki': 60, 'food-jp-salad-chicken': 110, 'food-jp-umeboshi': 10, 'food-jp-onigiri-salmon': 110,
  'food-jp-onigiri-tuna-mayo': 110, 'food-jp-onigiri-ume': 105, 'food-jp-famichiki': 85, 'food-jp-karaage-kun': 100,
  'food-jp-tamago-sando': 130, 'food-jp-katsu-sando': 160, 'food-jp-nikuman': 110, 'food-jp-melon-pan': 100,
  'food-jp-curry-pan': 100, 'food-jp-shokupan': 60, 'food-jp-mochi': 50, 'food-jp-daifuku': 70,
  'food-jp-dorayaki': 80, 'food-jp-taiyaki': 100, 'food-jp-senbei': 20, 'food-jp-pocky': 36,
  // US chains and diner food
  'food-us-big-mac': 219, 'food-us-quarter-pounder': 200, 'food-us-mcd-cheeseburger': 114, 'food-us-mcchicken': 143,
  'food-us-filet-o-fish': 136, 'food-us-mcnuggets-10': 162, 'food-us-egg-mcmuffin': 137, 'food-us-sausage-mcmuffin': 164,
  'food-us-hash-brown': 53, 'food-us-hotcakes': 230, 'food-us-mcflurry-oreo': 285, 'food-us-whopper': 270,
  'food-us-daves-single': 220, 'food-us-double-double': 330, 'food-us-cfa-sandwich': 183, 'food-us-cfa-spicy': 183,
  'food-us-cfa-nuggets-8': 113, 'food-us-cfa-grilled-8': 113, 'food-us-cfa-waffle-fries': 125, 'food-us-cfa-sauce': 28,
  'food-us-chipotle-bowl': 500, 'food-us-chipotle-burrito': 600, 'food-us-chipotle-guac': 113, 'food-us-chipotle-chips': 113,
  'food-us-crunchy-taco': 78, 'food-us-bean-burrito': 198, 'food-us-crunchwrap': 254, 'food-us-tb-quesadilla': 180,
  'food-us-orange-chicken': 162, 'food-us-broccoli-beef': 153, 'food-us-kung-pao': 162, 'food-us-panda-chow-mein': 266,
  'food-us-panda-fried-rice': 266, 'food-us-kfc-breast': 160, 'food-us-pepperoni-pizza': 110, 'food-us-italian-bmt': 220,
  'food-us-pbj': 105, 'food-us-grilled-cheese': 130, 'food-us-blt': 150, 'food-us-club-sandwich': 250,
  'food-us-philly': 300, 'food-us-pulled-pork': 220, 'food-us-corn-dog': 110, 'food-us-buffalo-wings': 220,
  'food-us-meatloaf': 115, 'food-us-chili': 250, 'food-us-clam-chowder': 245, 'food-us-cobb-salad': 350,
  'food-us-mashed-potatoes': 210, 'food-us-coleslaw': 70, 'food-us-cornbread': 65, 'food-us-biscuit': 60,
  'food-us-biscuits-gravy': 300, 'food-us-breakfast-burrito': 250, 'food-us-eggs-benedict': 300, 'food-us-french-toast': 130,
  'food-us-avocado-toast': 120, 'food-us-cheerios': 28, 'food-us-pop-tart': 50, 'food-us-quest-bar': 60,
  'food-us-clif-bar': 68, 'food-us-rxbar': 52, 'food-us-kind-bar': 40, 'food-us-snickers': 52,
  'food-us-reeses': 42, 'food-us-doritos': 28, 'food-us-cheez-it': 30, 'food-us-pringles': 28,
  'food-us-cookie': 30, 'food-us-brownie': 56, 'food-us-apple-pie': 155, 'food-us-cheesecake': 125,
}

/** Drinks, sauces poured by the spoon and oils: by volume, so they log in ml and fl oz. */
const ML: Record<string, number> = {
  'food-vn-nuoc-mam': 15, 'food-vn-nuoc-cham': 30, 'food-coconut-oil': 15, 'food-avocado-oil': 15,
  'food-vn-ca-phe-sua-da': 250, 'food-vn-bac-xiu': 300, 'food-vn-ca-phe-den': 200, 'food-vn-tra-sua': 500,
  'food-vn-sinh-to-bo': 400, 'food-vn-nuoc-mia': 400, 'food-vn-sua-dau-nanh': 250, 'food-vn-tra-tac': 500,
  'food-vn-ca-phe-muoi': 200, 'food-vn-ca-phe-trung': 150, 'food-vn-bia': 330,
  'food-protein-shake-rtd': 340, 'food-latte': 350, 'food-cappuccino': 240, 'food-energy-drink': 250,
  'food-coconut-water': 330, 'food-sweet-iced-tea': 500,
  'food-jp-pocari': 500, 'food-jp-calpis-water': 500, 'food-jp-matcha-latte': 350, 'food-jp-beer': 350,
  'food-jp-sake': 180, 'food-jp-chuhai': 350,
  'food-us-sbux-latte': 473, 'food-us-sbux-caramel-mac': 473, 'food-us-sbux-frapp': 473, 'food-us-sbux-psl': 473,
  'food-us-sbux-shaken-esp': 473, 'food-us-sbux-matcha': 473, 'food-us-core-power': 414, 'food-us-premier-protein': 325,
  'food-us-milkshake': 470, 'food-us-lemonade': 470, 'food-us-dr-pepper': 355, 'food-us-light-beer': 355,
  'food-us-white-wine': 150, 'food-us-spirits': 44,
}

/** A built-in food with what its serving weighs or holds, where the table above knows it. */
export function withServingMeasure(food: Food): Food {
  const servingMl = ML[food.uuid]
  const servingGrams = GRAMS[food.uuid]
  return servingMl ? { ...food, servingMl } : servingGrams ? { ...food, servingGrams } : food
}

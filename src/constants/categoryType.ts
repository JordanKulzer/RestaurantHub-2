// src/constants/categoryType.ts
export const categoryTypeMap: Record<
  string,
  { type: string; keyword?: string }
> = {
  // ☕ Coffee & Bakery
  cafe: { type: "cafe" },
  coffee: { type: "cafe", keyword: "coffee" },
  bakery: { type: "bakery" },
  breakfast: { type: "bakery", keyword: "breakfast" },
  brunch: { type: "restaurant", keyword: "brunch" },

  // 🍣 Asian Cuisine
  sushi: { type: "restaurant", keyword: "sushi" },
  japanese: { type: "restaurant", keyword: "japanese" },
  chinese: { type: "restaurant", keyword: "chinese" },
  korean: { type: "restaurant", keyword: "korean" },
  thai: { type: "restaurant", keyword: "thai" },
  vietnamese: { type: "restaurant", keyword: "pho" },

  // 🌮 Latin & American
  mexican: { type: "restaurant", keyword: "mexican" },
  tacos: { type: "restaurant", keyword: "tacos" },
  bbq: { type: "restaurant", keyword: "barbecue" },
  american: { type: "restaurant", keyword: "american" },
  burgers: { type: "restaurant", keyword: "burger" },
  pizza: { type: "restaurant", keyword: "pizza" },
  wings: { type: "restaurant", keyword: "wings" },
  diner: { type: "restaurant", keyword: "diner" },

  // 🍝 European & Mediterranean
  italian: { type: "restaurant", keyword: "italian" },
  french: { type: "restaurant", keyword: "french" },
  greek: { type: "restaurant", keyword: "greek" },
  mediterranean: { type: "restaurant", keyword: "mediterranean" },
  spanish: { type: "restaurant", keyword: "tapas" },

  // 🍸 Social / Nightlife
  bar: { type: "bar" },
  pub: { type: "bar" },
  brewery: { type: "bar", keyword: "brewery" },
  cocktail: { type: "bar", keyword: "cocktail" },
  wine: { type: "bar", keyword: "wine" },
  nightlife: { type: "night_club" },

  // 🥗 Health / Specialty
  vegan: { type: "restaurant", keyword: "vegan" },
  vegetarian: { type: "restaurant", keyword: "vegetarian" },
  healthy: { type: "restaurant", keyword: "healthy" },
  smoothie: { type: "restaurant", keyword: "smoothie" },

  // 🍦 Dessert / Snacks
  dessert: { type: "restaurant", keyword: "dessert" },
  icecream: { type: "restaurant", keyword: "ice cream" },
  donuts: { type: "bakery", keyword: "donuts" },
  chocolate: { type: "bakery", keyword: "chocolate" },

  // 🍽️ General
  restaurant: { type: "restaurant" },
  takeout: { type: "meal_takeaway" },
  delivery: { type: "meal_delivery" },
};

export const CATEGORY_OPTIONS = Object.keys(categoryTypeMap).map((key) => ({
  label: key.charAt(0).toUpperCase() + key.slice(1),
  value: key,
}));

// // src/constants/categoryType.ts
// export const categoryTypeMap: Record<
//   string,
//   { type: string; keyword?: string }
// > = {
//   // ☕ Coffee & Bakery
//   cafe: { type: "cafe" },
//   coffee: { type: "cafe", keyword: "coffee" },
//   bakery: { type: "bakery" },
//   breakfast: { type: "bakery", keyword: "breakfast" },
//   brunch: { type: "restaurant", keyword: "brunch" },

//   // 🍣 Asian Cuisine
//   sushi: { type: "restaurant", keyword: "sushi" },
//   japanese: { type: "restaurant", keyword: "japanese" },
//   chinese: { type: "restaurant", keyword: "chinese" },
//   korean: { type: "restaurant", keyword: "korean" },
//   thai: { type: "restaurant", keyword: "thai" },
//   vietnamese: { type: "restaurant", keyword: "pho" },

//   // 🌮 Latin & American
//   mexican: { type: "restaurant", keyword: "mexican" },
//   tacos: { type: "restaurant", keyword: "tacos" },
//   bbq: { type: "restaurant", keyword: "barbecue" },
//   american: { type: "restaurant", keyword: "american" },
//   burgers: { type: "restaurant", keyword: "burger" },
//   pizza: { type: "restaurant", keyword: "pizza" },
//   wings: { type: "restaurant", keyword: "wings" },
//   diner: { type: "restaurant", keyword: "diner" },

//   // 🍝 European & Mediterranean
//   italian: { type: "restaurant", keyword: "italian" },
//   french: { type: "restaurant", keyword: "french" },
//   greek: { type: "restaurant", keyword: "greek" },
//   mediterranean: { type: "restaurant", keyword: "mediterranean" },
//   spanish: { type: "restaurant", keyword: "tapas" },

//   // 🍸 Social / Nightlife
//   bar: { type: "bar" },
//   pub: { type: "bar" },
//   brewery: { type: "bar", keyword: "brewery" },
//   cocktail: { type: "bar", keyword: "cocktail" },
//   wine: { type: "bar", keyword: "wine" },
//   nightlife: { type: "night_club" },

//   // 🥗 Health / Specialty
//   vegan: { type: "restaurant", keyword: "vegan" },
//   vegetarian: { type: "restaurant", keyword: "vegetarian" },
//   healthy: { type: "restaurant", keyword: "healthy" },
//   smoothie: { type: "restaurant", keyword: "smoothie" },

//   // 🍦 Dessert / Snacks
//   dessert: { type: "restaurant", keyword: "dessert" },
//   icecream: { type: "restaurant", keyword: "ice cream" },
//   donuts: { type: "bakery", keyword: "donuts" },
//   chocolate: { type: "bakery", keyword: "chocolate" },

//   // 🍽️ General
//   restaurant: { type: "restaurant" },
//   takeout: { type: "meal_takeaway" },
//   delivery: { type: "meal_delivery" },
// };

// export const CATEGORY_OPTIONS = Object.keys(categoryTypeMap).map((key) => ({
//   label: key.charAt(0).toUpperCase() + key.slice(1),
//   value: key,
// }));

export const CATEGORY_OPTIONS = [
  // ☕ Morning & Café
  { label: "Coffee & Café", value: "coffee,cafes" },
  { label: "Bakery / Donuts", value: "bakeries,donuts" },
  { label: "Breakfast / Brunch", value: "breakfast_brunch" },
  { label: "Smoothies & Juice Bars", value: "juicebars,smoothies" },

  // 🍣 Asian
  { label: "Sushi / Japanese", value: "sushi,japanese" },
  { label: "Chinese", value: "chinese" },
  { label: "Thai", value: "thai" },
  { label: "Korean", value: "korean" },
  { label: "Vietnamese / Pho", value: "vietnamese" },
  { label: "Indian", value: "indpak" },

  // 🌮 Latin & American
  { label: "Mexican / Tacos", value: "mexican" },
  { label: "Tex-Mex", value: "tex-mex" },
  { label: "BBQ / Grills", value: "bbq" },
  { label: "Burgers / American", value: "burgers,tradamerican" },
  { label: "Wings / Sports Bars", value: "sportsbars" },
  { label: "Southern / Soul Food", value: "southern,soulfood" },
  { label: "Seafood", value: "seafood" },
  { label: "Steakhouses", value: "steak" },

  // 🍝 European & Mediterranean
  { label: "Italian", value: "italian" },
  { label: "French", value: "french" },
  { label: "Greek / Mediterranean", value: "greek,mediterranean" },
  { label: "Spanish / Tapas", value: "spanish,tapas" },
  { label: "Eastern European", value: "eastern_european" },

  // 🍕 Casual & Comfort
  { label: "Pizza", value: "pizza" },
  { label: "Diners / Comfort Food", value: "diners,comfortfood" },
  { label: "Sandwiches / Delis", value: "sandwiches,delis" },
  { label: "Food Trucks", value: "foodtrucks" },

  // 🍸 Social / Nightlife
  { label: "Bars / Nightlife", value: "bars,nightlife" },
  { label: "Breweries / Taprooms", value: "breweries" },
  { label: "Wine Bars", value: "wine_bars" },
  { label: "Cocktail Lounges", value: "cocktailbars" },

  // 🍦 Desserts / Specialty
  { label: "Dessert / Ice Cream", value: "desserts,icecream" },
  { label: "Chocolate / Candy", value: "chocolate,candy" },
  { label: "Frozen Yogurt", value: "frozenyogurt" },

  // 🥗 Health & Lifestyle
  { label: "Vegan / Vegetarian", value: "vegan,vegetarian" },
  { label: "Healthy / Organic", value: "healthmarkets,organic_stores" },
];

export const templates = {
  general: {
    name: "Neighbourhood",
    category: "General retail",
    headline: "Everyday essentials. A little closer.",
    description:
      "A familiar local shop, with collections for every corner of your day.",
    sections: ["Everyday essentials", "Home & living"],
    sample: "homehome-imphal",
  },
  fashion: {
    name: "Atelier",
    category: "Clothing & handloom",
    headline: "Wear a story of your own.",
    description:
      "An editorial storefront for clothing, handloom and seasonal collections.",
    sections: ["Handloom", "Everyday clothing"],
    sample: "leikai-handlooms",
  },
  electronics: {
    name: "Circuit",
    category: "Electronics & mobiles",
    headline: "Find your next everyday upgrade.",
    description:
      "Compare specifications, browse devices and explore useful accessories.",
    sections: ["Phones", "Audio & accessories"],
    sample: "mobile-planet",
  },
  vehicles: {
    name: "Showroom",
    category: "Cars",
    headline: "Your next drive starts here.",
    description:
      "Wide vehicle photography with the details buyers need before a viewing.",
    sections: ["Pre-owned cars", "Premium selection"],
    sample: "imphal-motors",
  },
  motorcycles: {
    name: "Ride",
    category: "Motorcycles",
    headline: "Find your freedom on two wheels.",
    description:
      "A bold motorcycle showroom for commuters, roadsters and touring bikes.",
    sections: ["Roadsters", "Touring"],
    sample: "leikai-rides",
  },
};
export const templateForCategory = (category) =>
  ({
    fashion: "fashion",
    mobiles: "electronics",
    electronics: "electronics",
    vehicles: "vehicles",
    motorcycles: "motorcycles",
  })[category] || "general";

import { useEffect, useState } from "react";
import "./App.css";
import AdminDashboard from "./AdminDashboard";
import AdminLogin from "./AdminLogin";
import { apiFetch } from "./api";

type Language = "en" | "he";
type Currency = "ILS" | "USD";

const sweatshirtOptions = {
  sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  colors: ["Black", "White", "Grey", "Blue", "Pink"],
  fonts: ["Classic", "Elegant", "Modern", "Handwritten"],
  vinylColors: [
    "White",
    "Black",
    "Gold",
    "Silver",
    "Pink",
    "Blue",
  ],
};

const tumblerOptions = {
  colors: ["White", "Black", "Pink", "Blue", "Purple", "Sage"],
  fonts: ["Classic", "Elegant", "Modern", "Handwritten"],
  vinylColors: ["White", "Black", "Gold", "Silver", "Pink", "Blue"],
};

const products = [
  {
    id: 1,
    name: "Personalized Sweatshirt",
    hebrew: "סווטשירט בהתאמה אישית",
    price: 145,
    category: "APPAREL",
    art: "sweatshirt",
    image: "/images/products/personalized-sweatshirt.jpg",
  },
  {
    id: 2,
    name: "Personalized T-Shirt",
    hebrew: "חולצה בהתאמה אישית",
    price: 95,
    category: "APPAREL",
    art: "sweatshirt",
  },
  {
    id: 3,
    name: "Custom Name Tumbler",
    hebrew: "כוס תרמית עם שם אישי",
    price: 85,
    category: "DRINKWARE",
    art: "tumbler",
  },
  {
    id: 4,
    name: "Personalized Coffee Mug",
    hebrew: "ספל אישי",
    price: 55,
    category: "DRINKWARE",
    art: "tumbler",
  },
  {
    id: 5,
    name: "Personalized Cutting Board",
    hebrew: "קרש חיתוך אישי",
    price: 110,
    category: "HOME & KITCHEN",
    art: "home-gift",
  },
  {
    id: 6,
    name: "Custom Kitchen Canister",
    hebrew: "צנצנת מטבח אישית",
    price: 75,
    category: "HOME & KITCHEN",
    art: "home-gift",
  },
  {
    id: 7,
    name: "Personalized Challah Board",
    hebrew: "קרש חלה אישי",
    price: 160,
    category: "SHABBOS & YOM TOV",
    art: "home-gift",
  },
  {
    id: 8,
    name: "Shabbos Gift Set",
    hebrew: "מארז מתנה לשבת",
    price: 195,
    category: "SHABBOS & YOM TOV",
    art: "gift-box",
  },
  {
    id: 9,
    name: "Personalized Birthday Gift",
    hebrew: "מתנת יום הולדת אישית",
    price: 90,
    category: "BIRTHDAY GIFTS",
    art: "gift-box",
  },
  {
    id: 10,
    name: "Birthday Gift Box",
    hebrew: "מארז יום הולדת",
    price: 175,
    category: "BIRTHDAY GIFTS",
    art: "gift-box",
  },
  {
    id: 11,
    name: "Personalized Gift Box",
    hebrew: "מארז מתנה אישי",
    price: 175,
    category: "GIFT BOXES",
    art: "gift-box",
  },
  {
    id: 12,
    name: "Deluxe Gift Bundle",
    hebrew: "מארז מתנה מפנק",
    price: 245,
    category: "GIFT BOXES",
    art: "gift-box",
  },
  {
    id: 13,
    name: "Personalized Home Sign",
    hebrew: "שלט אישי לבית",
    price: 120,
    category: "HOME DECOR",
    art: "home-gift",
  },
  {
    id: 14,
    name: "Custom Decorative Tray",
    hebrew: "מגש דקורטיבי אישי",
    price: 135,
    category: "HOME DECOR",
    art: "home-gift",
  },
  {
    id: 15,
    name: "Personalized Keychain",
    hebrew: "מחזיק מפתחות אישי",
    price: 35,
    category: "ACCESSORIES",
    art: "gift-box",
  },
  {
    id: 16,
    name: "Custom Vinyl Decals",
    hebrew: "מדבקות ויניל בהתאמה אישית",
    price: 30,
    category: "ACCESSORIES",
    art: "gift-box",
  },
  {
    id: 17,
    name: "Custom Personalized Item",
    hebrew: "פריט בהתאמה אישית",
    price: 100,
    category: "OTHER",
    art: "gift-box",
  },
      {
    id: 18,
    name: "Personalized Marble Hairbrush",
    hebrew: "מברשת שיער אישית",
    price: 32,
    category: "ACCESSORIES",
    art: "gift-box",
    image: "/images/products/personalized-hairbrush.png",
  },
];

const content = {
  en: {
    announcement: "Thoughtful gifts, made personal.",
    shop: "Shop",
    gifts: "Gifts",
    occasions: "By Occasion",
    apparel: "Apparel",
    home: "Home & Kitchen",
    custom: "Custom Orders",
    heroEyebrow: "A LITTLE MORE PERSONAL",
    heroTitle: "The art of making it yours.",
    heroText:
      "Thoughtful gifts, everyday favorites, and special little things made uniquely for you.",
    shopCollection: "SHOP THE COLLECTION",
    explore: "EXPLORE OUR SHOP",
    categoriesTitle: "A little something for everyone",
    categoriesText:
      "Find something special, whether you're shopping for yourself or someone you love.",
    categoryNames: [
      "Apparel",
      "Cups & Tumblers",
      "Home & Kitchen",
      "Shabbos & Yom Tov",
      "Birthday Gifts",
      "Gift Boxes",
      "Home Décor",
      "Accessories",
      "Other",
    ],
    featuredLabel: "THE GOOD STUFF",
    featuredTitle: "Personalized favorites",
    featuredText: "Everyday essentials, with your own special touch.",
    viewAll: "VIEW ALL",
    add: "EXPLORE ITEM",
    customEyebrow: "HAVE SOMETHING ELSE IN MIND?",
    customTitle: "Dream it. We'll make it personal.",
    customText:
      "Have an idea for something you don't see in our shop? Tell us what you're imagining and let's create something special.",
    customButton: "REQUEST A CUSTOM ORDER",
    footerText: "Thoughtful things. Personal touches. Made with love.",
    newsletter: "A little something in your inbox",
    newsletterText: "Be the first to hear about new collections and special offers.",
    email: "Your email address",
    subscribe: "SUBSCRIBE",
    currencyNote: "",
  },
  he: {
    announcement: "מתנות עם מחשבה, בהתאמה אישית.",
    shop: "חנות",
    gifts: "מתנות",
    occasions: "לפי אירוע",
    apparel: "ביגוד",
    home: "לבית ולמטבח",
    custom: "הזמנות מיוחדות",
    heroEyebrow: "קצת יותר אישי",
    heroTitle: "הופכים כל דבר לשלך.",
    heroText:
      "מתנות מיוחדות, פריטים יומיומיים ודברים קטנים שנוצרים במיוחד בשבילך.",
    shopCollection: "לצפייה בקולקציה",
    explore: "לגלות את החנות",
    categoriesTitle: "משהו מיוחד לכל אחת ואחד",
    categoriesText: "מצאו מתנה מיוחדת לעצמכם או למישהו שאתם אוהבים.",
    categoryNames: [
      "ביגוד",
      "כוסות ובקבוקים",
      "לבית ולמטבח",
      "שבת וחג",
      "מתנות יום הולדת",
      "מארזי מתנה",
      "עיצוב הבית",
      "אביזרים",
      "אחר",
    ],
    featuredLabel: "הפריטים האהובים",
    featuredTitle: "הבחירות האישיות שלנו",
    featuredText: "פריטים יומיומיים עם נגיעה אישית.",
    viewAll: "לכל המוצרים",
    add: "לצפייה בפריט",
    customEyebrow: "יש לכם רעיון אחר?",
    customTitle: "דמיינו. אנחנו נהפוך אותו לאישי.",
    customText:
      "מחפשים משהו שלא מופיע בחנות? ספרו לנו מה אתם מדמיינים וניצור משהו מיוחד.",
    customButton: "בקשה להזמנה מיוחדת",
    footerText: "מתנות עם מחשבה. נגיעות אישיות.",
    newsletter: "משהו קטן לתיבת הדואר שלכם",
    newsletterText: "היו הראשונים להתעדכן בקולקציות חדשות ובהטבות.",
    email: "כתובת אימייל",
    subscribe: "הרשמה",
    currencyNote: "",
  },
};

function Storefront() {
  const [language, setLanguage] = useState<Language>("en");
  const [currency, setCurrency] = useState<Currency>("ILS");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedProduct, setSelectedProduct] =
    useState<(typeof products)[number] | null>(null);
  const [personalization, setPersonalization] = useState("");

  const [selectedSize, setSelectedSize] = useState("M");
  const [selectedColor, setSelectedColor] = useState("Black");
  const [selectedFont, setSelectedFont] = useState("Classic");
  const [selectedVinylColor, setSelectedVinylColor] = useState("White");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [orderConfirmation, setOrderConfirmation] = useState<number | string | null>(null);
  const [cart, setCart] = useState<
    {
      id: string;
      productId: number;
      name: string;
      hebrew: string;
      price: number;
      size: string;
      color: string;
      font: string;
      vinylColor: string;
      personalization: string;
      quantity: number;
    }[]
  >(() => {
    try {
      const savedCart = localStorage.getItem("custom-corner-cart");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("custom-corner-cart", JSON.stringify(cart));
  }, [cart]);
  const vinylColorCodes: Record<string, string> = {
  White: "#ffffff",
  Black: "#222222",
  Gold: "#d4af37",
  Silver: "#c0c0c0",
  Pink: "#e78cae",
  Blue: "#4a90c6",
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    setOrderConfirmation(null);
    setCheckoutError("");

    const newItem = {
      id: `${Date.now()}-${Math.random()}`,
      productId: selectedProduct.id,
      name: selectedProduct.name,
      hebrew: selectedProduct.hebrew,
      price: selectedProduct.price,
      size: selectedSize,
      color: selectedColor,
      font: selectedFont,
      vinylColor: selectedVinylColor,
      personalization: personalization.trim(),
      quantity: 1,
    };

    setCart((currentCart) => [...currentCart, newItem]);
    setIsCheckoutOpen(false);
    setIsCartOpen(true);
  };

  const updateCartQuantity = (id: string, change: number) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(1, item.quantity + change) }
            : item
        )
    );
  };

  const removeFromCart = (id: string) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== id));
  };

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const handleCheckoutSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCheckoutError("");

    if (cart.length === 0) {
      setCheckoutError(isHebrew ? "הסל ריק." : "Your bag is empty.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          items: cart,
          subtotal: cartSubtotal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to submit your order.");
      }

      setOrderConfirmation(data.orderId);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setIsCheckoutOpen(false);
    } catch (error) {
      console.error("Checkout submission failed:", error);
      setCheckoutError(
        isHebrew
          ? "לא ניתן לשלוח את ההזמנה כרגע. בדקו שהשרת פועל ונסו שוב."
          : error instanceof Error
            ? error.message
            : "Unable to submit your order. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const t = content[language];
  const isHebrew = language === "he";

  // Temporary display estimate only. We'll connect a live exchange-rate
  // service through the backend before the store launches.
  const temporaryRate = 3.7;

  function formatPrice(price: number) {
    const amount =
      currency === "ILS" ? price : price / temporaryRate;

    return new Intl.NumberFormat(
      currency === "ILS" ? "he-IL" : "en-US",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }
    ).format(amount);
  }

const categories = [
  { name: t.categoryNames[0], image: "apparel", color: "lavender", filter: "APPAREL" },
  { name: t.categoryNames[1], image: "cups", color: "blue", filter: "DRINKWARE" },
  { name: t.categoryNames[2], image: "home", color: "lilac", filter: "HOME & KITCHEN" },
  { name: t.categoryNames[3], image: "shabbos", color: "purple", filter: "SHABBOS & YOM TOV" },
  { name: t.categoryNames[4], image: "birthday", color: "pink", filter: "BIRTHDAY GIFTS" },
  { name: t.categoryNames[5], image: "gifts", color: "white", filter: "GIFT BOXES" },
  { name: t.categoryNames[6], image: "decor", color: "lilac", filter: "HOME DECOR" },
  { name: t.categoryNames[7], image: "accessories", color: "blue", filter: "ACCESSORIES" },
  { name: t.categoryNames[8], image: "other", color: "lavender", filter: "OTHER" },
];

  const filteredProducts =
  selectedCategory === "ALL"
    ? products
    : products.filter(
        (product) => product.category === selectedCategory
      );

  return (
    <div className="site" dir={isHebrew ? "rtl" : "ltr"}>
      <div className="announcement">
        {t.announcement}
      </div>

      <header className="header">
        <a className="logo" href="#">
          <img
            src="/images/The-Custom-Corner-Logo.png"
            alt="The Custom Corner"
            className="logo-image"
          />
        </a>

        <nav className="main-nav">
          <a href="#shop">{t.shop}</a>
          <a href="#shop">{t.gifts}</a>
          <a href="#categories">{t.occasions}</a>
          <a href="#shop">{t.apparel}</a>
          <a href="#categories">{t.home}</a>
          <a href="#custom">{t.custom}</a>
        </nav>

        <div className="header-actions">
          <select
            aria-label="Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          >
            <option value="en">EN</option>
            <option value="he">עב</option>
          </select>

          <select
            aria-label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            <option value="ILS">₪ ILS</option>
            <option value="USD">$ USD</option>
          </select>

          <button
            className="cart-link cart-button"
            type="button"
            aria-label={isHebrew ? "סל קניות" : "Shopping bag"}
            onClick={() => {
              setIsCheckoutOpen(false);
              setIsCartOpen(true);
            }}
          >
            {isHebrew ? `סל (${cartItemCount})` : `BAG (${cartItemCount})`}
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-image">
            <div className="hero-art">
              <div className="hero-art-card">
                <span>MADE</span>
                <span>JUST</span>
                <span>FOR YOU</span>
                <div className="hero-art-line" />
                <small>THE PERSONAL TOUCH</small>
              </div>
            </div>
          </div>

          <div className="hero-content">
            <span className="eyebrow">{t.heroEyebrow}</span>
            <h1>{t.heroTitle}</h1>
            <p>{t.heroText}</p>
            <a className="primary-button" href="#categories">
              {t.shopCollection}
            </a>
          </div>

          <div className="hero-number">01 / PERSONALIZED FOR YOU</div>
        </section>

        <section className="intro-section" id="categories">
          <span className="eyebrow">{t.explore}</span>
          <h2>{t.categoriesTitle}</h2>
          <p>{t.categoriesText}</p>
        </section>

        <section className="category-grid">
          {categories.map((category) => (
            <a
              href="#shop"
              className={`category-card ${category.color}`}
              key={category.image}
              onClick={() => setSelectedCategory(category.filter)}
            >
              <div className="category-art">
                <span>{category.name}</span>
              </div>
            </a>
          ))}
        </section>

        <section className="featured-section" id="shop">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t.featuredLabel}</span>
              <h2>{t.featuredTitle}</h2>
              <p>{t.featuredText}</p>
            </div>
            <a href="#categories" className="text-link">
              {t.viewAll} →
            </a>
          </div>

          <div className="filter-bar">
            <button
              className={selectedCategory === "ALL" ? "active" : ""}
              onClick={() => setSelectedCategory("ALL")}
            >
              {isHebrew ? "הכל" : "ALL PRODUCTS"}
            </button>

            {categories.map((category) => (
              <button
                key={category.filter}
                className={
                  selectedCategory === category.filter ? "active" : ""
                }
                onClick={() => setSelectedCategory(category.filter)}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="product-grid">
            {filteredProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-image">
                  {"image" in product && product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                    />
                  ) : (
                    <div className={`product-art ${product.art}`}>
                      <span>PERSONALIZED</span>
                    </div>
                  )}

                  <span className="product-category">
                    {product.category}
                  </span>
                </div>

                <div className="product-details">
                  <div>
                    <h3>{isHebrew ? product.hebrew : product.name}</h3>
                    <p>{formatPrice(product.price)}</p>
                  </div>
                  <a
                    href="#product-details"
                    className="product-link"
                    onClick={() => setSelectedProduct(product)}
                  >
                    {t.add}
                  </a>
                </div>
              </article>
            ))}

            {filteredProducts.length === 0 && (
              <p className="empty-products">
                {isHebrew
                  ? "מוצרים חדשים יתווספו בקרוב."
                  : "New products in this category are coming soon."}
              </p>
            )}
          </div>
        </section>
        
                {selectedProduct && (
          <section className="product-detail-section" id="product-details">
            <button
              className="back-to-shop"
              onClick={() => {
                setSelectedProduct(null);
                setPersonalization("");
              }}
            >
              {isHebrew ? "חזרה לחנות" : "← BACK TO SHOP"}
            </button>

            <div className="product-detail-layout">
            <div className="product-detail-image">
              <div
                className={`product-art ${selectedProduct.art} ${
                  selectedProduct.name === "Personalized Sweatshirt" ||
                  selectedProduct.name === "Personalized T-Shirt"
                    ? `sweatshirt-${selectedColor.toLowerCase()}`
                    : selectedProduct.name === "Custom Name Tumbler"
                      ? `tumbler-${selectedColor.toLowerCase()}`
                      : ""
                } font-${selectedFont.toLowerCase()}`}
                style={{
                  "--vinyl-color": vinylColorCodes[selectedVinylColor],
                } as React.CSSProperties}
              >
                <span>
                  {personalization || "PERSONALIZED"}
                </span>
              </div>
            </div>

              <div className="product-detail-content">
                <span className="eyebrow">
                  {selectedProduct.category}
                </span>

                <h2>
                  {isHebrew
                    ? selectedProduct.hebrew
                    : selectedProduct.name}
                </h2>

                <p className="product-detail-price">
                  {formatPrice(selectedProduct.price)}
                </p>

                <p>
                  {isHebrew
                    ? "הוסיפו נגיעה אישית למוצר שלכם."
                    : "Make this item uniquely yours with your own personalization."}
                </p>

                {selectedProduct.name === "Personalized Sweatshirt" && (
                  <div className="product-options">
                    <label htmlFor="sweatshirt-size">Size</label>
                    <select
                      id="sweatshirt-size"
                      value={selectedSize}
                      onChange={(e) => setSelectedSize(e.target.value)}
                    >
                      {sweatshirtOptions.sizes.map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>

                    <label htmlFor="sweatshirt-color">Sweatshirt Color</label>
                    <select
                      id="sweatshirt-color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                    >
                      {sweatshirtOptions.colors.map((color) => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>

                    <label htmlFor="sweatshirt-font">Personalization Font</label>
                    <select
                      id="sweatshirt-font"
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                    >
                      {sweatshirtOptions.fonts.map((font) => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>

                    <label htmlFor="vinyl-color">Vinyl Color</label>
                    <select
                      id="vinyl-color"
                      value={selectedVinylColor}
                      onChange={(e) => setSelectedVinylColor(e.target.value)}
                    >
                      {sweatshirtOptions.vinylColors.map((color) => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedProduct.name === "Personalized T-Shirt" && (
                  <div className="product-options">
                    <label htmlFor="tshirt-size">T-Shirt Size</label>
                    <select
                      id="tshirt-size"
                      value={selectedSize}
                      onChange={(e) => setSelectedSize(e.target.value)}
                    >
                      {sweatshirtOptions.sizes.map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>

                    <label htmlFor="tshirt-color">T-Shirt Color</label>
                    <select
                      id="tshirt-color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                    >
                      {sweatshirtOptions.colors.map((color) => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>

                    <label htmlFor="tshirt-font">Personalization Font</label>
                    <select
                      id="tshirt-font"
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                    >
                      {sweatshirtOptions.fonts.map((font) => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>

                    <label htmlFor="tshirt-vinyl-color">Vinyl Color</label>
                    <select
                      id="tshirt-vinyl-color"
                      value={selectedVinylColor}
                      onChange={(e) => setSelectedVinylColor(e.target.value)}
                    >
                      {sweatshirtOptions.vinylColors.map((color) => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedProduct.name === "Custom Name Tumbler" && (
                  <div className="product-options">
                    <label htmlFor="tumbler-color">Tumbler Color</label>
                    <select
                      id="tumbler-color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                    >
                      {tumblerOptions.colors.map((color) => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>

                    <label htmlFor="tumbler-font">Personalization Font</label>
                    <select
                      id="tumbler-font"
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                    >
                      {tumblerOptions.fonts.map((font) => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>

                    <label htmlFor="tumbler-vinyl-color">Vinyl Color</label>
                    <select
                      id="tumbler-vinyl-color"
                      value={selectedVinylColor}
                      onChange={(e) => setSelectedVinylColor(e.target.value)}
                    >
                      {tumblerOptions.vinylColors.map((color) => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                  </div>
                )}

                <label htmlFor="personalization">
                  {isHebrew
                    ? "מה תרצו לכתוב על המוצר?"
                    : "What would you like personalized?"}
                </label>

                <input
                  id="personalization"
                  type="text"
                  value={personalization}
                  onChange={(e) => setPersonalization(e.target.value)}
                  placeholder={
                    isHebrew
                      ? "הקלידו שם או טקסט"
                      : "Enter a name or wording"
                  }
                />

                <p className="personalization-note">
                  {isHebrew
                    ? "אפשר להשאיר ריק אם אין צורך בהתאמה אישית."
                    : "You can leave this blank if you don't need personalization."}
                </p>

                <button className="add-to-cart-button" type="button" onClick={addToCart}>
                  {isHebrew ? "הוספה לסל" : "ADD TO BAG"}
                </button>
              </div>
            </div>
          </section>
        )}

        {isCartOpen && (
          <div className="cart-overlay" onClick={() => setIsCartOpen(false)}>
            <aside
              className="cart-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={isHebrew ? "סל הקניות שלך" : "Your shopping bag"}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="cart-drawer-heading">
                <div>
                  <span className="eyebrow">THE CUSTOM CORNER</span>
                  <h2>{isHebrew ? "סל הקניות שלך" : "Your Shopping Bag"}</h2>
                </div>
                <button
                  className="cart-close"
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  aria-label={isHebrew ? "סגירה" : "Close bag"}
                >
                  ×
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="cart-empty">
                  {orderConfirmation !== null ? (
                    <>
                      <h3>{isHebrew ? "ההזמנה נשלחה בהצלחה!" : "Your order has been submitted!"}</h3>
                      <p>
                        {isHebrew
                          ? `מספר ההזמנה שלך: ${orderConfirmation}`
                          : `Your order number is #${orderConfirmation}.`}
                      </p>
                      <p>
                        {isHebrew
                          ? "ניצור איתך קשר לאישור ההזמנה ותיאום האיסוף."
                          : "We will contact you to confirm your order and arrange pickup."}
                      </p>
                    </>
                  ) : (
                    <p>{isHebrew ? "סל הקניות שלך עדיין ריק." : "Your bag is looking a little empty."}</p>
                  )}
                  <button type="button" className="add-to-cart-button" onClick={() => setIsCartOpen(false)}>
                    {isHebrew ? "המשך בקניות" : "CONTINUE SHOPPING"}
                  </button>
                </div>
              ) : (
                <>
                  <div className="cart-items">
                    {cart.map((item) => (
                      <article className="cart-item" key={item.id}>
                        <div className="cart-item-art">
                          <span>{item.productId === 1 || item.productId === 2 ? "APPAREL" : item.productId === 3 || item.productId === 4 ? "DRINKWARE" : "GIFT"}</span>
                        </div>
                        <div className="cart-item-info">
                          <h3>{isHebrew ? item.hebrew : item.name}</h3>
                          <p>{formatPrice(item.price)}</p>
                          {(item.productId === 1 || item.productId === 2) && (
                            <p>{isHebrew ? "מידה" : "Size"}: {item.size} · {isHebrew ? "צבע" : "Color"}: {item.color}</p>
                          )}
                          {item.productId === 3 && (
                            <p>{isHebrew ? "צבע" : "Color"}: {item.color}</p>
                          )}
                          {(item.productId === 1 || item.productId === 2 || item.productId === 3) && (
                            <p>{isHebrew ? "גופן" : "Font"}: {item.font} · {isHebrew ? "צבע ויניל" : "Vinyl"}: {item.vinylColor}</p>
                          )}
                          {item.personalization && (
                            <p>{isHebrew ? "כיתוב" : "Text"}: {item.personalization}</p>
                          )}
                          <div className="cart-item-actions">
                            <div className="quantity-control">
                              <button type="button" onClick={() => updateCartQuantity(item.id, -1)} aria-label="Decrease quantity">−</button>
                              <span>{item.quantity}</span>
                              <button type="button" onClick={() => updateCartQuantity(item.id, 1)} aria-label="Increase quantity">+</button>
                            </div>
                            <button className="remove-item" type="button" onClick={() => removeFromCart(item.id)}>
                              {isHebrew ? "הסרה" : "REMOVE"}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!isCheckoutOpen ? (
                    <div className="cart-summary">
                      <div className="cart-subtotal">
                        <span>{isHebrew ? "סכום ביניים" : "Subtotal"}</span>
                        <strong>{formatPrice(cartSubtotal)}</strong>
                      </div>
                      <p>
                        {isHebrew
                          ? "איסוף מהחנות בלבד בשלב זה. פרטי ההזמנה הסופיים יאושרו לאחר יצירת קשר."
                          : "Store pickup only. Final order details will be confirmed with you."}
                      </p>
                      <button
                        type="button"
                        className="add-to-cart-button"
                        onClick={() => setIsCheckoutOpen(true)}
                      >
                        {isHebrew ? "המשך לפרטי ההזמנה" : "CONTINUE TO CHECKOUT"}
                      </button>
                    </div>
                  ) : (
                    <form
                      className="checkout-form"
                      onSubmit={handleCheckoutSubmit}
                    >
                      <button
                        type="button"
                        className="checkout-back"
                        onClick={() => setIsCheckoutOpen(false)}
                      >
                        {isHebrew ? "חזרה לסל" : "← BACK TO BAG"}
                      </button>

                      <h3>{isHebrew ? "פרטי יצירת קשר" : "Your Contact Details"}</h3>
                      <p className="checkout-intro">
                        {isHebrew
                          ? "מלאו את הפרטים כדי להכין בקשת הזמנה."
                          : "Enter your details so we can prepare your order request."}
                      </p>

                      <label htmlFor="checkout-name">
                        {isHebrew ? "שם מלא" : "Full name"}
                      </label>
                      <input
                        id="checkout-name"
                        type="text"
                        value={customerName}
                        onChange={(event) => setCustomerName(event.target.value)}
                        autoComplete="name"
                        required
                      />

                      <label htmlFor="checkout-phone">
                        {isHebrew ? "מספר טלפון" : "Phone number"}
                      </label>
                      <input
                        id="checkout-phone"
                        type="tel"
                        value={customerPhone}
                        onChange={(event) => setCustomerPhone(event.target.value)}
                        autoComplete="tel"
                        required
                      />

                      <label htmlFor="checkout-email">
                        {isHebrew ? "כתובת אימייל" : "Email address"}
                      </label>
                      <input
                        id="checkout-email"
                        type="email"
                        value={customerEmail}
                        onChange={(event) => setCustomerEmail(event.target.value)}
                        autoComplete="email"
                        required
                      />

                      <div className="pickup-notice">
                        <strong>{isHebrew ? "איסוף מהחנות" : "Store Pickup"}</strong>
                        <p>
                          {isHebrew
                            ? "בשלב זה ניתן לאסוף את ההזמנה מהחנות בלבד. פרטי האיסוף יתואמו לאחר שנאשר את ההזמנה."
                            : "Orders are pickup-only for now. We will coordinate pickup details after confirming your request."}
                        </p>
                      </div>

                      <div className="checkout-total">
                        <span>{isHebrew ? "סכום ביניים" : "Subtotal"}</span>
                        <strong>{formatPrice(cartSubtotal)}</strong>
                      </div>

                      <p className="checkout-email-note">
                        {isHebrew
                          ? "ההזמנה תישלח ישירות דרך האתר. ניצור איתך קשר לאישור ותיאום האיסוף."
                          : "Your order will be submitted directly through the website. We will contact you to confirm pickup details."}
                      </p>

                      {checkoutError && (
                        <p className="checkout-error" role="alert">{checkoutError}</p>
                      )}

                      <button type="submit" className="add-to-cart-button" disabled={isSubmitting}>
                        {isSubmitting
                          ? (isHebrew ? "שולחים..." : "SUBMITTING...")
                          : (isHebrew ? "שליחת הזמנה" : "PLACE ORDER")}
                      </button>
                    </form>
                  )}
                </>
              )}
            </aside>
          </div>
        )}

        <section className="custom-section" id="custom">
          <div className="custom-image">
          <div className="custom-art">
            <span>YOUR IDEA</span>
            <span>OUR PERSONAL TOUCH</span>
          </div>
        </div>
          <div className="custom-content">
            <span className="eyebrow">{t.customEyebrow}</span>
            <h2>{t.customTitle}</h2>
            <p>{t.customText}</p>
            <a href="mailto:info.thecustomcorner@gmail.com" className="primary-button">
              {t.customButton}
            </a>
          </div>
        </section>

        <section className="newsletter-section">
          <span className="eyebrow">STAY IN THE LOOP</span>
          <h2>{t.newsletter}</h2>
          <p>{t.newsletterText}</p>
          <form onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder={t.email}
              aria-label={t.email}
            />
            <button type="submit">{t.subscribe}</button>
          </form>
        </section>
      </main>

      <footer className="footer">
        <a className="logo footer-logo" href="#">
          The<span>Custom</span>Corner 
          <small>PERSONALIZED GOODS</small>
        </a>
        <p>{t.footerText}</p>
        <span>© 2026 The Custom Corner</span>
      </footer>
    </div>
  );
}

function AdminGate() {
  const [state, setState] = useState<"checking" | "ready" | "error">("checking");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    apiFetch("/api/auth/me")
      .then((response) => {
        if (!active) return;
        if (response.status === 401) {
          window.location.replace("/admin/login");
          return;
        }
        setState(response.ok ? "ready" : "error");
      })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [retryKey]);

  if (state === "ready") return <AdminDashboard />;
  if (state === "checking") return <div className="admin-auth-check">Checking administrator session…</div>;
  return (
    <div className="admin-auth-check">
      <div>We couldn’t verify your administrator session. <button type="button" onClick={() => { setState("checking"); setRetryKey((value) => value + 1); }}>Try again</button> <a href="/admin/login">Sign in</a></div>
    </div>
  );
}

function App() {
  const route = window.location.pathname.replace(/\/+$/, "") || "/";
  if (route === "/admin/login") return <AdminLogin />;
  if (route === "/admin") return <AdminGate />;
  return <Storefront />;
}

export default App;

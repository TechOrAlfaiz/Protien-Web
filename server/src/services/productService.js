import { Product, User } from '../models.js';

export async function queryProducts(params = {}) {
  const {
    category, subcategory, brand, goal, diet, type,
    min, max, rating, inStock, sort, q: text,
    page, limit = 100
  } = params;

  const filter = {};

  if (category && category !== 'All') filter.category = category;
  if (subcategory) filter.subcategory = subcategory;
  if (brand) {
    const brandList = brand.includes(',') ? brand.split(',') : [brand];
    filter.brand = { $in: brandList };
  }
  if (goal) filter.goal = goal;
  if (diet) filter.diet = diet;
  if (type) {
    const typeList = type.includes(',') ? type.split(',') : [type];
    filter.type = { $in: typeList };
  }

  if (min !== undefined || max !== undefined) {
    filter.price = {};
    if (min !== undefined && min !== '') filter.price.$gte = Number(min);
    if (max !== undefined && max !== '') filter.price.$lte = Number(max);
  }

  if (rating) {
    filter.rating = { $gte: Number(rating) };
  }

  if (inStock === 'true' || inStock === true) {
    filter.stock = { $gt: 0 };
  }

  if (text && String(text).trim()) {
    const rx = new RegExp(String(text).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: rx },
      { description: rx },
      { category: rx },
      { goal: rx },
      { brand: rx },
      { subcategory: rx }
    ];
  }

  const sortOrder = {
    l: { price: 1 },
    h: { price: -1 },
    r: { rating: -1 },
    n: { createdAt: -1 },
    p: { rating: -1, stock: -1 }
  }[sort] || { createdAt: -1 };

  const parsedLimit = Math.min(Math.max(1, Number(limit) || 20), 100);

  // If page is provided, return structured pagination
  if (page) {
    const parsedPage = Math.max(1, Number(page) || 1);
    const skip = (parsedPage - 1) * parsedLimit;
    const [items, total] = await Promise.all([
      Product.find(filter).sort(sortOrder).skip(skip).limit(parsedLimit),
      Product.countDocuments(filter)
    ]);
    return {
      products: items,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    };
  }

  // Backwards-compatible array response when page is omitted
  return await Product.find(filter).sort(sortOrder).limit(parsedLimit);
}

export async function getSuggestions(rawQuery = '') {
  const q = String(rawQuery).trim();
  const trendingKeywords = [
    'Magnesium Glycinate', 'Creatine Monohydrate', 'Whey Isolate',
    'KSM-66 Ashwagandha', 'Marine Collagen', 'Sleep Recovery', 'Omega-3 DHA'
  ];

  if (!q) {
    const featured = await Product.find({ isFeatured: true }).limit(5);
    return {
      products: featured,
      categories: ['Protein', 'Performance', 'Vitamins', 'Ayurvedic', 'Beauty'],
      goals: ['Sleep', 'Focus', 'Recovery', 'Glow', 'Daily'],
      trendingKeywords
    };
  }

  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const [matchedProducts, distinctCategories] = await Promise.all([
    Product.find({
      $or: [{ name: rx }, { category: rx }, { goal: rx }, { brand: rx }]
    }).limit(6),
    Product.distinct('category', { category: rx })
  ]);

  return {
    products: matchedProducts,
    categories: distinctCategories.slice(0, 4),
    goals: ['Sleep', 'Focus', 'Recovery', 'Glow', 'Daily'].filter(g => rx.test(g)),
    trendingKeywords: trendingKeywords.filter(k => rx.test(k))
  };
}

export async function getFrequentlyBoughtTogether(slug) {
  const main = await Product.findOne({ slug });
  if (!main) throw { status: 404, message: 'Main formulation not found' };

  let companions = await Product.find({
    category: main.category === 'Protein' ? 'Performance' : main.category === 'Ayurvedic' ? 'Vitamins' : 'Ayurvedic',
    slug: { $ne: slug }
  }).limit(2);

  if (companions.length < 2) {
    const fallback = await Product.find({ slug: { $ne: slug } }).limit(2);
    companions = fallback;
  }

  const allItems = [main, ...companions];
  const combinedPrice = allItems.reduce((acc, curr) => acc + curr.price, 0);
  const bundleDiscount = Math.round(combinedPrice * 0.12);
  const bundlePrice = combinedPrice - bundleDiscount;

  return {
    main,
    companions,
    combinedPrice,
    bundleDiscount,
    bundlePrice,
    discountPercent: 12
  };
}

export async function getPersonalizedRecommendations(userId) {
  if (!userId) {
    return await Product.find({ isFeatured: true }).limit(6);
  }

  const user = await User.findById(userId).populate('recentlyViewed.product');
  if (!user || user.recommendationConsent === false) {
    return await Product.find({ isFeatured: true }).limit(6);
  }

  const viewed = (user.recentlyViewed || [])
    .map(v => v.product)
    .filter(Boolean);

  if (viewed.length === 0) {
    return await Product.find({ isFeatured: true }).limit(6);
  }

  const categories = [...new Set(viewed.map(p => p.category))];
  const viewedIds = viewed.map(p => p._id);

  let recs = await Product.find({
    category: { $in: categories },
    _id: { $nin: viewedIds },
    stock: { $gt: 0 }
  }).sort({ rating: -1 }).limit(6);

  if (recs.length < 4) {
    const more = await Product.find({
      _id: { $nin: [...viewedIds, ...recs.map(r => r._id)] }
    }).sort({ isFeatured: -1, rating: -1 }).limit(6 - recs.length);
    recs = [...recs, ...more];
  }

  return recs;
}


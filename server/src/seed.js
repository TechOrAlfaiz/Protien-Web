import 'dotenv/config';
import dns from 'node:dns';
import mongoose from 'mongoose';

dns.setServers(['8.8.8.8', '1.1.1.1']);

import { Product } from './models.js';
const rows = [
  ['Whey Isolate Chocolate', 'Protein', 'Whey Protein', 'Recovery', 'Vegetarian', 'tub', '#6b3f2a', 3290, 4.7, 45, 'Ananta Apex'],
  ['Plant Protein Vanilla', 'Protein', 'Plant Protein', 'Recovery', 'Vegan', 'tub', '#c9b98f', 2890, 4.5, 30, 'Ananta Apex'],
  ['Creatine Monohydrate', 'Performance', 'Creatine', 'Recovery', 'Vegan', 'tub', '#2f4a6b', 1290, 4.8, 60, 'Ananta Apex'],
  ['Magnesium Glycinate', 'Vitamins', 'Minerals', 'Sleep', 'Vegan', 'bottle', '#3e5a48', 1490, 4.8, 85, 'Ananta Elements'],
  ['Ashwagandha KSM-66', 'Ayurvedic', 'Adaptogens', 'Sleep', 'Vegan', 'bottle', '#7a5a2b', 990, 4.4, 25, 'Ananta Veda'],
  ['Lion’s Mane Complex', 'Vitamins', 'Nootropics', 'Focus', 'Vegan', 'bottle', '#5b4a6e', 1790, 4.6, 18, 'Ananta Elements'],
  ['L-Theanine 200 mg', 'Vitamins', 'Amino Acids', 'Focus', 'Vegan', 'bottle', '#2c6a6a', 1190, 4.5, 50, 'Ananta Elements'],
  ['Marine Collagen Powder', 'Beauty', 'Collagen', 'Glow', 'Non-vegetarian', 'pouch', '#b5838d', 2490, 4.6, 15, 'Ananta Elements'],
  ['Biotin 10,000 mcg', 'Beauty', 'Biotin', 'Glow', 'Vegan', 'bottle', '#c08a5a', 890, 4.3, 40, 'Ananta Elements'],
  ['Omega-3 Fish Oil', 'Vitamins', 'Fatty Acids', 'Recovery', 'Non-vegetarian', 'bottle', '#d0a33a', 1690, 4.7, 6, 'Ananta Elements'],
  ['Daily Multivitamin', 'Vitamins', 'Multivitamins', 'Daily', 'Vegan', 'bottle', '#4f7a3a', 1390, 4.5, 90, 'Ananta Elements'],
  ['Triphala Blend', 'Ayurvedic', 'Herbal Digestion', 'Daily', 'Vegan', 'pouch', '#8a7a3a', 690, 4.2, 0, 'Ananta Veda']
];

const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  throw new Error('MONGO_URI is missing from .env');
}

await mongoose.connect(mongoURI);
console.log('MongoDB connected successfully');

await Product.deleteMany({});
await Product.insertMany(rows.map(([name, category, subcategory, goal, diet, type, color, price, rating, stock, brand], i) => ({
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  name, category, subcategory, goal, diet, type, color, price, rating, stock, brand,
  description: `${name}: 100% pure, third-party laboratory tested with verified batch certificates. Formulated for clinical bioavailability and peak physiological absorption.`,
  batch: 'AN-26' + (11 + i),
  bestBefore: 'Oct 2028'
})));
console.log('Seeded', rows.length, 'products with brand and subcategory metadata');
await mongoose.disconnect();

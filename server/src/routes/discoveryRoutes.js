import { Router } from 'express';
import { Banner, Review, Product } from '../models.js';
import { optionalAuth } from '../middleware/auth.js';
import { wrap } from '../middleware/errorHandler.js';
import {
  getSuggestions,
  getPersonalizedRecommendations
} from '../services/productService.js';

const router = Router();

/* ------------------------------------------------------------
   1. CLINICAL GUIDES
   ------------------------------------------------------------ */
export const CLINICAL_GUIDES = [
  {
    slug: 'whey-isolate-vs-concentrate',
    title: 'The Definitive Guide: Cold-Microfiltered Whey Isolate vs. Concentrate',
    excerpt: 'Understanding bioavailable native protein, nitrogen retention rates, lactose removal, and peptide absorption kinetics.',
    readTime: '6 min read',
    category: 'Performance Science',
    author: 'Dr. Alok Verma, PhD Sports Nutrition',
    date: 'Nov 2026',
    heroImage: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=1200&q=80',
    recommendedSlugs: ['whey-isolate', 'creatine-creapure'],
    content: `When choosing a protein formulation, processing temperature and filtration methods dictate amino acid integrity. Cross-flow microfiltration (CFM) isolates protein without denaturing delicate beta-lactoglobulin and alpha-lactalbumin fractions. For athletes and digestive-sensitive individuals, cold-microfiltered Whey Isolate delivers 90%+ bioavailable protein per scoop with virtually zero lactose, fat, or cholesterol.`
  },
  {
    slug: 'circadian-biology-magnesium-stacking',
    title: 'Optimizing Circadian Biology: Magnesium Glycinate & Non-REM Sleep Architecture',
    excerpt: 'How chelated magnesium and L-theanine work synergistically to prolong slow-wave delta sleep without daytime grogginess.',
    readTime: '8 min read',
    category: 'Circadian Biology',
    author: 'Ananta Formulation Research Lab',
    date: 'Oct 2026',
    heroImage: 'https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=1200&q=80',
    recommendedSlugs: ['magnesium-glycinate', 'ashwagandha-ksm66'],
    content: `Slow-wave sleep (delta sleep) is the critical hormonal window during which human growth hormone (HGH) peaks and cellular somatic repair takes place. Magnesium bonded to glycine crosses the blood-brain barrier effectively, activating parasympathetic GABA-A receptors. Combined with KSM-66® Ashwagandha to blunt evening cortisol spikes, this stack facilitates natural restorative sleep onset.`
  },
  {
    slug: 'lions-mane-ashwagandha-neuro-synergy',
    title: 'Neuro-Endocrine Synergy: Dual-Extracted Lion’s Mane & Sensoril® Ashwagandha',
    excerpt: 'Stimulating Nerve Growth Factor (NGF) while moderating serum cortisol for sustained executive focus and zero brain fog.',
    readTime: '7 min read',
    category: 'Nootropics & Adaptogens',
    author: 'Clinical Botanicals Board',
    date: 'Sep 2026',
    heroImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80',
    recommendedSlugs: ['lions-mane-extract', 'ashwagandha-ksm66'],
    content: `The combination of standardized Hericium erinaceus (Lion's Mane) dual-extract with adaptogenic Withania somnifera creates a synergistic environment for cognitive endurance. While hericenones and erinacines promote neuroplasticity, standardized withanolides downregulate HPA-axis overstimulation under intense mental workloads.`
  }
];

router.get('/guides', (req, res) => res.json(CLINICAL_GUIDES));

router.get('/guides/:slug', wrap(async (req, res) => {
  const guide = CLINICAL_GUIDES.find(g => g.slug === req.params.slug);
  if (!guide) {
    return res.status(404).json({ error: 'Clinical guide article not found', code: 'GUIDE_NOT_FOUND' });
  }
  const recommendedProducts = await Product.find({ slug: { $in: guide.recommendedSlugs } });
  res.json({ ...guide, products: recommendedProducts });
}));

/* ------------------------------------------------------------
   2. SMART AUTOCOMPLETE SEARCH
   ------------------------------------------------------------ */
router.get('/search/suggest', wrap(async (req, res) => {
  const suggestions = await getSuggestions(req.query.q);
  res.json(suggestions);
}));

/* ------------------------------------------------------------
   3. PERSONALIZED RECOMMENDATIONS
   ------------------------------------------------------------ */
router.get('/recommendations/personalized', optionalAuth, wrap(async (req, res) => {
  const recommendations = await getPersonalizedRecommendations(req.user?.id);
  res.json(recommendations);
}));

/* ------------------------------------------------------------
   4. PROMOTIONAL BANNERS
   ------------------------------------------------------------ */
router.get('/banners', wrap(async (req, res) => {
  const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
  res.json(banners);
}));

/* ------------------------------------------------------------
   5. REVIEW HELPFUL VOTING
   ------------------------------------------------------------ */
router.post('/reviews/:id/helpful', wrap(async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { $inc: { helpfulCount: 1 } },
    { new: true }
  );
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json({ helpfulCount: review.helpfulCount });
}));

export default router;


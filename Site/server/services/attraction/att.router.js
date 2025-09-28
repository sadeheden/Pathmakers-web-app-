import { Router } from 'express';
import {
  getAttractions,
  getAttractionById,
  addAttraction,
  updateAttraction,
  deleteAttraction,
  getAttractionsByCity,
    resolveAttractionNames  
} from './att.controller.js';

const router = Router();

router
.post('/resolve-names', resolveAttractionNames) // <— NEW
  .get('/city/:city', getAttractionsByCity)
  .get('/', getAttractions)
  .get('/:id', getAttractionById)
  .post('/', addAttraction)
  .put('/:id', updateAttraction)
  .delete('/:id', deleteAttraction);
// in attractions.routes.js
// attractions.routes.js
router.get('/city/:slug', async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();
    const city = await Cities.findOne({ slug });

    if (!city) {
      return res.status(404).json({ success: false, message: "City not found" });
    }

    res.json({
      success: true,
      city: city.name,
      attractions: city.attractions
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});



export default router;

import Router from 'express';
const router = Router();
console.log("reached telegram.js");


router.post('/', async (req, res) => {
  console.log('✅ ROUTER POST / HIT');
  console.log('Body:', req.body);
  res.json({ ok: true, hit: true });
});

router.post('/webhook', async (req, res) => {  // Try this too
  console.log('✅ ROUTER POST /webhook HIT');
  res.json({ ok: true });
});

export default router;

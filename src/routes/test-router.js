import express from 'express';
const router = express.Router();

router.post('/', (req, res) => {
  console.log('✅ SEPARATE FILE ROUTER HIT');
  res.json({ ok: true });
});

console.log('✅ test-router.js LOADED');  // Prove file runs

export default router;
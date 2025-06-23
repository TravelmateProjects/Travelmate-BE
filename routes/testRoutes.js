const express = require('express');
const router = express.Router();

// Debug endpoint to test CORS and connectivity
router.get('/test', (req, res) => {
  console.log('=== Test Endpoint Hit ===');
  console.log('Origin:', req.get('origin'));
  console.log('User-Agent:', req.get('user-agent'));
  console.log('Cookies:', req.cookies);
  console.log('Headers:', req.headers);
  console.log('========================');
  
  res.json({
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    origin: req.get('origin'),
    cookies: req.cookies,
    env: process.env.NODE_ENV || 'development'
  });
});

// Test CORS specifically
router.post('/test-cors', (req, res) => {
  console.log('=== CORS Test ===');
  console.log('Body:', req.body);
  console.log('Origin:', req.get('origin'));
  console.log('Cookies:', req.cookies);
  
  res.json({
    message: 'CORS is working!',
    receivedBody: req.body,
    origin: req.get('origin'),
    cookies: req.cookies
  });
});

module.exports = router;

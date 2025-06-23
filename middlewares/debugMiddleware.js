// Test CORS and Cookie functionality
const express = require('express');

const testCorsAndCookies = (req, res, next) => {
  console.log('=== CORS & Cookie Debug Info ===');
  console.log('Origin:', req.get('origin'));
  console.log('User-Agent:', req.get('user-agent'));
  console.log('Cookies received:', req.cookies);
  console.log('Headers:', {
    'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials'),
    'Set-Cookie': res.get('Set-Cookie')
  });
  console.log('================================');
  next();
};

module.exports = testCorsAndCookies;

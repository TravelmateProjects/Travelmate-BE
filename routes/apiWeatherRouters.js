const express = require('express');
const router = express.Router();
const apiweatherController = require('../controllers/apiWeatherController');

router.get('/current', apiweatherController.getCurrentWeather);
router.get('/forecast', apiweatherController.getForecastWeather);

module.exports = router;

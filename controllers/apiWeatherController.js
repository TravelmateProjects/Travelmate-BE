const axios = require('axios');

const API_KEY = process.env.WEATHER_API_KEY;

/**
 * Controller lấy thời tiết hiện tại từ WeatherAPI
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
const getCurrentWeather = async (req, res) => {
    try {
        const city = req.query.city;
        
        if (!city) {
            return res.status(400).json({ error: 'City is required' });
        }

        const response = await axios.get('http://api.weatherapi.com/v1/current.json', {
            params: {
                key: API_KEY,
                q: city,
                lang: 'eng'
            },
        });

        const data = response.data;
        
        res.json({
            city: data.location.name,
            country: data.location.country,
            temp_c: data.current.temp_c,
            feelslike_c: data.current.feelslike_c,
            condition: data.current.condition,
            icon: data.current.condition.icon,
            wind_kph: data.current.wind_kph,
            wind_degree: data.current.wind_degree,
            wind_dir: data.current.wind_dir,
            humidity: data.current.humidity,
            pressure_mb: data.current.pressure_mb,
            precip_mm: data.current.precip_mm,
            cloud: data.current.cloud,
            uv: data.current.uv,
            vis_km: data.current.vis_km,
            gust_kph: data.current.gust_kph,
        });
    } catch (err) {
        console.error('WeatherAPI Current Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to fetch weather' });
    }
};

/**
 * Controller lấy dự báo thời tiết theo ngày từ WeatherAPI
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
const getForecastWeather = async (req, res) => {
    try {
        const city = req.query.city;
        const days = req.query.days || 3;

        if (!city) {
            return res.status(400).json({ error: 'City is required' });
        }

        const response = await axios.get('http://api.weatherapi.com/v1/forecast.json', {
            params: {
                key: API_KEY,
                q: city,
                days,
                lang: 'eng'
            },
        });

        const forecastDays = response.data.forecast.forecastday.map(day => ({
            date: day.date,
            condition: day.day.condition,
            icon: day.day.condition.icon,
            avg_temp_c: day.day.avgtemp_c,
            max_temp_c: day.day.maxtemp_c,
            min_temp_c: day.day.mintemp_c,
            will_it_rain: day.day.daily_will_it_rain,
            daily_chance_of_rain: day.day.daily_chance_of_rain

        }));

        res.json({
            city: response.data.location.name,
            forecast: forecastDays
        });
    } catch (err) {
        console.error('WeatherAPI Forecast Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to fetch forecast' });
    }
};

module.exports = {
    getCurrentWeather,
    getForecastWeather
};

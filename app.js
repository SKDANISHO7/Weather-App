// API configuration
const api = {
    weather: {
        url: "https://api.openweathermap.org/data/2.5/weather?units=metric&",
        key: "9fd3e42f107014b62cb7b2bbfcbea1bd"
    },
    forecast: {
        url: "https://api.openweathermap.org/data/2.5/forecast?units=metric&",
        key: "9fd3e42f107014b62cb7b2bbfcbea1bd"
    },
    airQuality: {
        url: "https://api.openweathermap.org/data/2.5/air_pollution?",
        key: "9fd3e42f107014b62cb7b2bbfcbea1bd"
    },
    geocoding: {
        url: "https://api.openweathermap.org/geo/1.0/direct?limit=1&",
        key: "9fd3e42f107014b62cb7b2bbfcbea1bd"
    }
};

// DOM elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const recentSearches = document.getElementById('recent-searches');
const favoriteBtn = document.getElementById('favorite-btn');
const themeToggle = document.getElementById('theme-toggle');
const searchDropdown = document.getElementById('search-dropdown');

// Background elements
const weatherBackground = document.querySelector('.weather-background');
const gradientAnimation = document.querySelector('.gradient-animation');
const dayNightOverlay = document.querySelector('.day-night-overlay');
const sunriseSunsetAnimation = document.querySelector('.sunrise-sunset-animation');

// Current weather elements
const cityName = document.getElementById('city-name');
const currentDate = document.getElementById('current-date');
const weatherIcon = document.getElementById('weather-icon');
const currentTemp = document.getElementById('current-temp');
const weatherDescription = document.getElementById('weather-description');
const tempMax = document.getElementById('temp-max');
const tempMin = document.getElementById('temp-min');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('wind-speed');
const pressure = document.getElementById('pressure');
const visibility = document.getElementById('visibility');
const sunrise = document.getElementById('sunrise');
const sunset = document.getElementById('sunset');
const airQualityContainer = document.getElementById('air-quality-container');
const airQuality = document.getElementById('air-quality');
const airQualityStatus = document.getElementById('air-quality-status');
const qualityIndicator = document.getElementById('quality-indicator');

// Forecast elements
const forecastDays = document.getElementById('forecast-days');
const hourlyForecast = document.getElementById('hourly-forecast');
const comparisonGrid = document.getElementById('comparison-grid');

// Temperature scale elements
const scaleItems = document.querySelectorAll('.scale-item');
let currentScale = 'celsius';

// App state
let currentCity = '';
let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
let recentCities = JSON.parse(localStorage.getItem('weatherRecentSearches')) || [];
let isDarkMode = localStorage.getItem('weatherDarkMode') === 'true';

// Add new state variables for search
let currentRegion = '';
let searchTimeout = null;

// Weather preview cache and state
let weatherCache = new Map();
let debounceTimer;

// Initialize the app
// Load last city from localStorage, fallback to Nanded
const lastCity = localStorage.getItem('weatherLastCity') || 'Nanded, Maharashtra';
document.addEventListener('DOMContentLoaded', () => {
    checkWeather(lastCity);
    setupEventListeners();
    updateRecentSearchesUI();
    updateFavoriteButton();
    applyTheme();
});

function setupEventListeners() {
    // Search button click event
    searchBtn.addEventListener('click', () => {
        const city = searchInput.value.trim();
        if (city) {
            checkWeather(city);
            searchInput.blur();
            searchDropdown.classList.remove('active');
            recentSearches.classList.remove('active');
        }
    });

    // Enter key press event
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const city = searchInput.value.trim();
            if (city) {
                checkWeather(city);
                searchInput.blur();
                searchDropdown.classList.remove('active');
                recentSearches.classList.remove('active');
            }
        }
    });

    // Temperature scale toggle
    scaleItems.forEach(item => {
        item.addEventListener('click', () => {
            scaleItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentScale = item.dataset.scale;
            updateTemperatureScale();
        });
    });

    // Search input focus/blur and input handling
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.length < 2 && recentCities.length > 0) {
            recentSearches.classList.add('active');
        } else if (searchInput.value.length >= 2) {
            searchDropdown.classList.add('active');
        }
    });

    searchInput.addEventListener('input', handleSearchInput);

    // Handle clicks outside search components
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && 
            !recentSearches.contains(e.target) && 
            !searchDropdown.contains(e.target)) {
            recentSearches.classList.remove('active');
            searchDropdown.classList.remove('active');
        }
    });

    // Favorite button click
    favoriteBtn.addEventListener('click', toggleFavorite);

    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
}

async function checkWeather(city) {
    try {
        showLoading();
        clearError();

        // First get coordinates
        const geoUrl = `${api.geocoding.url}q=${city}&appid=${api.geocoding.key}`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (!geoData || geoData.length === 0) {
            throw new Error('City not found');
        }

        // Store the original city name before making the weather API call
        const originalCityName = city;

        // Get current weather
        const weatherUrl = `${api.weather.url}lat=${geoData[0].lat}&lon=${geoData[0].lon}&appid=${api.weather.key}`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();

        // Use the original city name instead of the API response city name
        weatherData.name = originalCityName;

        updateUI(weatherData, city);
        addToRecentSearches(city);

        // Get forecast
        const forecastUrl = `${api.forecast.url}lat=${geoData[0].lat}&lon=${geoData[0].lon}&appid=${api.forecast.key}`;
        const forecastResponse = await fetch(forecastUrl);
        const forecastData = await forecastResponse.json();
        updateForecast(forecastData);

        // Get air quality
        const airQualityUrl = `${api.airQuality.url}lat=${geoData[0].lat}&lon=${geoData[0].lon}&appid=${api.airQuality.key}`;
        const airQualityResponse = await fetch(airQualityUrl);
        const airQualityData = await airQualityResponse.json();
        updateAirQuality(airQualityData);

        // After successful weather fetch:
        localStorage.setItem('weatherLastCity', city);

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

function updateUI(data, originalCity) {
    // Use the original city name for display
    cityName.textContent = originalCity;
    currentCity = originalCity;

    currentDate.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Update weather icon and temperature
    weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    
    // Store temperature values in dataset for scale conversion
    currentTemp.dataset.celsius = Math.round(data.main.temp);
    currentTemp.dataset.fahrenheit = Math.round((data.main.temp * 9/5) + 32);
    currentTemp.dataset.kelvin = Math.round(data.main.temp + 273.15);
    
    tempMax.dataset.celsius = Math.round(data.main.temp_max);
    tempMax.dataset.fahrenheit = Math.round((data.main.temp_max * 9/5) + 32);
    tempMax.dataset.kelvin = Math.round(data.main.temp_max + 273.15);
    
    tempMin.dataset.celsius = Math.round(data.main.temp_min);
    tempMin.dataset.fahrenheit = Math.round((data.main.temp_min * 9/5) + 32);
    tempMin.dataset.kelvin = Math.round(data.main.temp_min + 273.15);
    
    // Update all temperature displays
    updateTemperatureScale();
    
    weatherDescription.textContent = data.weather[0].description;

    // Update details
    humidity.textContent = `${data.main.humidity}%`;
    windSpeed.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`; // Convert m/s to km/h
    pressure.textContent = `${data.main.pressure} hPa`;
    visibility.textContent = `${(data.visibility / 1000).toFixed(1)} km`;

    // Update sunrise and sunset
    const sunriseTime = new Date(data.sys.sunrise * 1000);
    const sunsetTime = new Date(data.sys.sunset * 1000);
    sunrise.textContent = sunriseTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    sunset.textContent = sunsetTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Update weather details (comparison-grid)
    if (comparisonGrid) {
        comparisonGrid.innerHTML = `
            <div class="metric-card wind">
                <div class="metric-icon">
                    <i class="fas fa-wind"></i>
                </div>
                <div class="metric-info">
                    <h3>Wind Status</h3>
                    <div class="metric-value">${Math.round(data.wind.speed * 3.6)} km/h</div>
                    <div class="metric-direction">
                        <i class="fas fa-location-arrow"></i>
                        <span>${data.wind.deg !== undefined ? degToCompass(data.wind.deg) : '--'}</span>
                    </div>
                </div>
            </div>
            <div class="metric-card humidity">
                <div class="metric-icon">
                    <i class="fas fa-tint"></i>
                </div>
                <div class="metric-info">
                    <h3>Humidity</h3>
                    <div class="metric-value">${data.main.humidity}%</div>
                    <div class="humidity-bar">
                        <div class="bar-fill" style="width: ${data.main.humidity}%"></div>
                    </div>
                </div>
            </div>
            <div class="metric-card visibility">
                <div class="metric-icon">
                    <i class="fas fa-eye"></i>
                </div>
                <div class="metric-info">
                    <h3>Visibility</h3>
                    <div class="metric-value">${data.visibility ? (data.visibility / 1000).toFixed(1) : '--'} km</div>
                    <div class="visibility-status">${getVisibilityStatus(data.visibility)}</div>
                </div>
            </div>
            <div class="metric-card pressure">
                <div class="metric-icon">
                    <i class="fas fa-compress-alt"></i>
                </div>
                <div class="metric-info">
                    <h3>Air Pressure</h3>
                    <div class="metric-value">${data.main.pressure} hPa</div>
                    <div class="pressure-trend">
                        <i class="fas fa-arrow-up"></i>
                        <span>${getPressureTrend(data.main.pressure)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Update weather background and time-based effects
    updateWeatherBackground(data);
    updateDayNightCycle(data);
    updateSunriseSunsetAnimation(data);
    updateWeatherAnimation(data); // <-- Call the new function here

    // Update favorite button
    updateFavoriteButton();

    // Update temperature scale
    updateTemperatureScale();
}

function degToCompass(num) {
    if (typeof num !== 'number') return '--';
    const val = Math.floor((num / 22.5) + 0.5);
    const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return arr[(val % 16)];
}

function getVisibilityStatus(visibility) {
    if (!visibility && visibility !== 0) return '--';
    const km = visibility / 1000;
    if (km >= 10) return 'Clear view';
    if (km >= 4) return 'Good';
    if (km >= 2) return 'Moderate';
    if (km >= 1) return 'Low';
    return 'Very Low';
}

function getPressureTrend(pressure) {
    // Placeholder: In real apps, compare with previous value or use API trend
    if (pressure > 1013) return 'Rising';
    if (pressure < 1013) return 'Falling';
    return 'Stable';
}

// --- THEME SYSTEM ---
function applyWeatherTheme({ weather, isDay, temp, humidity, isDarkMode }) {
    // Remove all weather/time classes
    document.body.className = '';
    weatherBackground.className = 'weather-background';

    // Set base theme classes
    document.body.classList.add(isDarkMode ? 'dark-mode' : 'light-mode');
    document.body.classList.add(weather, isDay ? 'day' : 'night');
    weatherBackground.classList.add(weather, isDay ? 'day' : 'night');

    // Set CSS variables for gradients and overlays
    // (These will be used in styles.css for backgrounds, overlays, and UI)
    let gradient = '';
    let overlay = '';
    let accent = '';
    let climateEffect = '';
    // Weather-based gradients
    if (weather === 'clear') {
        gradient = isDay
            ? 'linear-gradient(135deg, #56ccf2 0%, #2f80ed 100%)'
            : 'linear-gradient(135deg, #232526 0%, #414345 100%)';
        accent = isDay ? '#ffe066' : '#bfcfff';
    } else if (weather === 'clouds') {
        gradient = isDay
            ? 'linear-gradient(135deg, #a2a6a7 0%, #717e88 100%)'
            : 'linear-gradient(135deg, #292E49 0%, #536976 100%)';
        accent = '#bfcfff';
    } else if (weather === 'rain' || weather === 'rainy') {
        gradient = isDay
            ? 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)'
            : 'linear-gradient(135deg, #232526 0%, #414345 100%)';
        accent = '#4facfe';
        overlay = 'rain';
    } else if (weather === 'thunderstorm') {
        gradient = isDay
            ? 'linear-gradient(135deg, #283E51 0%, #4B79A1 100%)'
            : 'linear-gradient(135deg, #0f0c29 0%, #302b63 100%)';
        accent = '#ffd700';
        overlay = 'thunderstorm';
    } else if (weather === 'snow') {
        gradient = isDay
            ? 'linear-gradient(135deg, #bcc7cf 0%, #aab5bc 100%)'
            : 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)';
        accent = '#e0eaff';
        overlay = 'snow';
    } else if (weather === 'mist' || weather === 'fog' || weather === 'haze') {
        gradient = isDay
            ? 'linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)'
            : 'linear-gradient(135deg, #2C3E50 0%, #3498DB 100%)';
        accent = '#bfcfff';
        overlay = 'fog';
    } else {
        gradient = isDay
            ? 'linear-gradient(135deg, #56ccf2 0%, #2f80ed 100%)'
            : 'linear-gradient(135deg, #232526 0%, #414345 100%)';
        accent = '#ffe066';
    }
    // Climate-based overlays
    if (typeof temp === 'number') {
        if (temp >= 35) climateEffect = 'heat';
        else if (temp <= 5) climateEffect = 'frost';
    }
    if (typeof humidity === 'number' && humidity >= 85) climateEffect = 'humid';
    // Set CSS variables
    document.body.style.setProperty('--weather-gradient', gradient);
    document.body.style.setProperty('--weather-accent', accent);
    document.body.style.setProperty('--weather-overlay', overlay);
    document.body.style.setProperty('--weather-climate', climateEffect);
}

// --- updateWeatherBackground: now uses applyWeatherTheme ---
function updateWeatherBackground(data) {
    const weather = data.weather[0].main.toLowerCase();
    const isDay = isDayTime(data);
    const temp = data.main.temp;
    const humidity = data.main.humidity;
    // Always use isDarkMode from state
    applyWeatherTheme({ weather, isDay, temp, humidity, isDarkMode });    // Remove any previous effect overlays
    const prevEffect = document.getElementById('weather-effect');
    if (prevEffect) prevEffect.remove();

    // Create a new effect overlay
    const effect = document.createElement('div');
    effect.id = 'weather-effect';
    effect.style.position = 'fixed';
    effect.style.top = '0';
    effect.style.left = '0';
    effect.style.width = '100vw';
    effect.style.height = '100vh';
    effect.style.pointerEvents = 'none';
    effect.style.zIndex = '0';
    effect.style.transition = 'opacity 0.8s cubic-bezier(0.4,0,0.2,1)';
    effect.style.opacity = '0';
    setTimeout(() => { effect.style.opacity = '1'; }, 30);

    // Helper: create parallax wrapper
    function parallaxWrap(child, speed = 0.5) {
        const wrapper = document.createElement('div');
        wrapper.className = 'parallax-wrap';
        wrapper.style.position = 'absolute';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.top = '0';
        wrapper.style.left = '0';
        wrapper.style.pointerEvents = 'none';
        wrapper.style.zIndex = '1';
        wrapper.appendChild(child);
        // Parallax effect on mouse move
        window.onmousemove = (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * speed * 30;
            const y = (e.clientY / window.innerHeight - 0.5) * speed * 30;
            wrapper.style.transform = `translate(${x}px,${y}px)`;
        };
        return wrapper;
    }    // --- SUN & MOON ANIMATION ---
    // Remove previous sun/moon if any
    const prevSun = document.getElementById('sun-anim');
    if (prevSun) prevSun.remove();
    const prevMoon = document.getElementById('moon-anim');
    if (prevMoon) prevMoon.remove();

    // Calculate sun/moon position based on time
    const now = new Date();
    const sunrise = new Date(data.sys.sunrise * 1000);
    const sunset = new Date(data.sys.sunset * 1000);
    const timezoneOffset = data.timezone;
    const localTime = new Date(now.getTime() + (timezoneOffset * 1000));
    let percent = 0;
    if (isDay) {
        percent = (localTime - sunrise) / (sunset - sunrise);
        percent = Math.max(0, Math.min(1, percent));
    } else {
        // Night: moon moves from sunset to next sunrise
        let nextSunrise = new Date(sunrise.getTime() + 24 * 60 * 60 * 1000);
        percent = (localTime - sunset) / (nextSunrise - sunset);
        percent = Math.max(0, Math.min(1, percent));
    }
    // Sun or moon position: move in an arc across the sky
    const skyArc = (p) => {
        // Arc: left to right, y = sin(pi * p)
        const x = 10 + 80 * p; // 10vw to 90vw
        const y = 60 - 40 * Math.sin(Math.PI * p); // 60vh to 20vh (arc)
        return { x, y };
    };
    if (isDay) {
        const sun = document.createElement('div');
        sun.id = 'sun-anim';
        sun.className = 'sun-anim sun-glow';
        const pos = skyArc(percent);
        sun.style.position = 'absolute';
        sun.style.left = pos.x + 'vw';
        sun.style.top = pos.y + 'vh';
        sun.style.width = '90px';
        sun.style.height = '90px';
        sun.style.borderRadius = '50%';
        sun.style.boxShadow = '0 0 80px 40px #ffe066, 0 0 200px 80px #fffbe6';
        sun.style.zIndex = '5';
        sun.style.transition = 'left 1s linear, top 1s linear';
        effect.appendChild(sun);
    } else {
        const moon = document.createElement('div');
        moon.id = 'moon-anim';
        moon.className = 'moon-anim moon-glow';
        const pos = skyArc(percent);
        moon.style.position = 'absolute';
        moon.style.left = pos.x + 'vw';
        moon.style.top = pos.y + 'vh';
        moon.style.width = '70px';
        moon.style.height = '70px';
        moon.style.borderRadius = '50%';
        moon.style.background = 'radial-gradient(circle at 60% 40%, #fff 80%, #e0e0e0 100%)';
        moon.style.boxShadow = '0 0 60px 20px #e0eaff, 0 0 120px 40px #bfcfff';
        moon.style.zIndex = '5';
        moon.style.transition = 'left 1s linear, top 1s linear';
        effect.appendChild(moon);
    }

    // --- WEATHER EFFECTS ---
    if (weather === 'rain' || weather === 'rainy') {
        // Clouds
        const clouds = document.createElement('div');
        clouds.className = 'cloud-effect';
        clouds.innerHTML = '<div class="cloud"></div><div class="cloud c2"></div><div class="cloud c3"></div>';
        setCloudAnimationDelays(clouds);
        effect.appendChild(parallaxWrap(clouds, 0.3));
        // Rain
        const rain = document.createElement('div');
        rain.className = 'rain-effect';
        for (let i = 0; i < 80; i++) {
            const drop = document.createElement('div');
            drop.className = 'raindrop';
            drop.style.left = Math.random() * 100 + 'vw';
            drop.style.animationDelay = (Math.random() * 1.2) + 's';
            drop.style.height = (14 + Math.random() * 14) + 'px';
            rain.appendChild(drop);
        }
        effect.appendChild(rain);
        // Wind (more gusts)
        const wind = document.createElement('div');
        wind.className = 'wind-effect';
        let windHtml = '';
        for (let i = 0; i < 10; i++) {
            windHtml += `<div class="wind w${i}"></div>`;
        }
        wind.innerHTML = windHtml;
        setWindAnimationDelays(wind, 10);
        effect.appendChild(parallaxWrap(wind, 0.2));
        // Rain GIF
        const rainGif = document.createElement('img');
        rainGif.src = '201.gif';
        rainGif.alt = '';
        rainGif.style.position = 'absolute';
        rainGif.style.bottom = '0';
        rainGif.style.right = '0';
        rainGif.style.width = '200px';
        rainGif.style.height = 'auto';
        rainGif.style.zIndex = '10';
        rainGif.style.opacity = '0.7';        effect.appendChild(rainGif);
    } else if (weather === 'snow') {
        // Clouds
        const clouds = document.createElement('div');
        clouds.className = 'cloud-effect';
        clouds.innerHTML = '<div class="cloud"></div><div class="cloud c2"></div><div class="cloud c3"></div>';
        setCloudAnimationDelays(clouds);
        effect.appendChild(parallaxWrap(clouds, 0.2));
        // Snowflakes
        const snow = document.createElement('div');
        snow.className = 'snow-effect';
        for (let i = 0; i < 60; i++) {
            const flake = document.createElement('div');
            flake.className = 'snowflake';
            flake.style.left = Math.random() * 100 + 'vw';
            flake.style.animationDelay = (Math.random() * 6) + 's';
            flake.style.width = flake.style.height = (6 + Math.random() * 10) + 'px';
            snow.appendChild(flake);
        }
        effect.appendChild(snow);
        // Wind (more gusts)
        const wind = document.createElement('div');
        wind.className = 'wind-effect';
        let windHtml = '';
        for (let i = 0; i < 10; i++) {
            windHtml += `<div class="wind w${i}"></div>`;
        }
        wind.innerHTML = windHtml;
        setWindAnimationDelays(wind, 10);
        effect.appendChild(parallaxWrap(wind, 0.15));
        // Snow GIF
        const snowGif = document.createElement('img');
        snowGif.src = '200w.gif';
        snowGif.alt = 'Snow Animation';
        snowGif.style.position = 'absolute';
        snowGif.style.bottom = '0';
        snowGif.style.left = '0';
        snowGif.style.width = '200px';
        snowGif.style.height = 'auto';
        snowGif.style.zIndex = '10';
        snowGif.style.opacity = '0.7';        effect.appendChild(snowGif);
    } else if (weather === 'thunderstorm') {
        // Clouds
        const clouds = document.createElement('div');
        clouds.className = 'cloud-effect';
        clouds.innerHTML = '<div class="cloud"></div><div class="cloud c2"></div><div class="cloud c3"></div>';
        setCloudAnimationDelays(clouds);
        effect.appendChild(parallaxWrap(clouds, 0.25));
        // Rain
        const rain = document.createElement('div');
        rain.className = 'rain-effect';
        for (let i = 0; i < 80; i++) {
            const drop = document.createElement('div');
            drop.className = 'raindrop';
            drop.style.left = Math.random() * 100 + 'vw';
            drop.style.animationDelay = (Math.random() * 1.2) + 's';
            drop.style.height = (14 + Math.random() * 14) + 'px';
            rain.appendChild(drop);
        }
        effect.appendChild(rain);
        // Wind (more gusts)
        const wind = document.createElement('div');
        wind.className = 'wind-effect';
        let windHtml = '';
        for (let i = 0; i < 12; i++) {
            windHtml += `<div class="wind w${i}"></div>`;
        }
        wind.innerHTML = windHtml;
        setWindAnimationDelays(wind, 12);
        effect.appendChild(parallaxWrap(wind, 0.2));
        // Lightning (animated, always visible)
        const thunder = document.createElement('div');
        thunder.className = 'thunder-effect';
        thunder.innerHTML = '<div class="lightning"></div>';
        effect.appendChild(thunder);
        // Thunderstorm GIF
        const thunderGif = document.createElement('img');
        thunderGif.src = '201.gif';
        thunderGif.alt = 'Thunderstorm Animation';
        thunderGif.style.position = 'absolute';
        thunderGif.style.bottom = '0';
        thunderGif.style.right = '0';
        thunderGif.style.width = '200px';
        thunderGif.style.height = 'auto';
        thunderGif.style.zIndex = '10';
        thunderGif.style.opacity = '0.7';
        effect.appendChild(thunderGif);
        // Audio
        addWeatherAudio('https://cdn.pixabay.com/audio/2022/07/26/audio_124bfae7e2.mp3', 'Thunderstorm');
        // Animate lightning flashes (always visible)
        setInterval(() => {
            const lightning = thunder.querySelector('.lightning');
            if (lightning) {
                lightning.style.opacity = '1';
                setTimeout(() => { lightning.style.opacity = '0'; }, 220 + Math.random() * 200);
            }
        }, 1800 + Math.random() * 1800);
    } else if (weather === 'mist' || weather === 'fog' || weather === 'haze') {
        // Animated fog overlay
        const fog = document.createElement('div');
        fog.className = 'fog-effect';
        for (let i = 0; i < 4; i++) {
            const fogLayer = document.createElement('div');
            fogLayer.className = 'fog-layer';
            fogLayer.style.animationDelay = (i * 2) + 's';
            fog.appendChild(fogLayer);
        }
        effect.appendChild(parallaxWrap(fog, 0.1));
    } else if (weather === 'clear' && isDay) {
        // Sun rays and subtle glow (always to the right)
        // Sun is already added above
        const rays = document.createElement('div');
        rays.className = 'sun-rays';
        for (let i = 0; i < 8; i++) {
            const ray = document.createElement('div');
            ray.className = 'sun-ray';
            ray.style.transform = `rotate(${i * 45}deg)`;
            rays.appendChild(ray);
        }
        effect.appendChild(rays);
    } else if (weather === 'clear' && !isDay) {
        // Twinkling stars (always visible, high z-index)
        const stars = document.createElement('div');
        stars.className = 'star-effect';
        for (let i = 0; i < 60; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + 'vw';
            star.style.top = Math.random() * 100 + 'vh';
            star.style.animationDelay = (Math.random() * 5) + 's';
            stars.appendChild(star);
        }
        effect.appendChild(stars);
    } else if (weather === 'clouds') {
        const clouds = document.createElement('div');
        clouds.className = 'cloud-effect';
        clouds.innerHTML = '<div class="cloud"></div><div class="cloud c2"></div><div class="cloud c3"></div>';
        setCloudAnimationDelays(clouds);
        effect.appendChild(parallaxWrap(clouds, 0.2));
        // Wind (more gusts)
        const wind = document.createElement('div');
        wind.className = 'wind-effect';
        let windHtml = '';
        for (let i = 0; i < 8; i++) {
            windHtml += `<div class="wind w${i}"></div>`;
        }
        wind.innerHTML = windHtml;
        setWindAnimationDelays(wind, 8);
        effect.appendChild(parallaxWrap(wind, 0.1));
    }
    document.body.appendChild(effect);

    // Force a repaint to ensure smooth transition
    weatherBackground.offsetHeight;
    
    // Update gradient animation
    gradientAnimation.classList.remove('active');
    gradientAnimation.offsetHeight;
    gradientAnimation.classList.add('active');
    
    // Update overlay based on time of day
    updateDayNightCycle(data);
}

function updateSunriseSunsetAnimation(data) {
    const currentTime = new Date().getTime();
    const sunriseTime = new Date(data.sys.sunrise * 1000).getTime();
    const sunsetTime = new Date(data.sys.sunset * 1000).getTime();

    if (currentTime >= sunriseTime && currentTime < sunsetTime) {
        weatherBackground.classList.add('sunrise');
        weatherBackground.classList.remove('sunset');
    } else {
        weatherBackground.classList.add('sunset');
        weatherBackground.classList.remove('sunrise');
    }
}

// --- IMPROVED: updateDayNightCycle for mobile sunrise/sunset theme ---
function updateDayNightCycle(data) {
    const now = new Date();
    const sunrise = new Date(data.sys.sunrise * 1000);
    const sunset = new Date(data.sys.sunset * 1000);
    // Get precise timezone offset and calculate local time
    const timezoneOffset = data.timezone;
    const localTime = new Date(now.getTime() + (timezoneOffset * 1000));
    // Use API-provided sunrise/sunset times directly as they're already in local time
    const localSunrise = sunrise;
    const localSunset = sunset;
    // Use same transition window for all devices for consistency
    const transitionMins = 45; // always 45 minutes for both desktop and mobile
    // Calculate sunrise/sunset transitions
    const sunriseStart = new Date(localSunrise.getTime() - transitionMins * 60 * 1000);
    const sunriseEnd = new Date(localSunrise.getTime() + transitionMins * 60 * 1000);
    const sunsetStart = new Date(localSunset.getTime() - transitionMins * 60 * 1000);
    const sunsetEnd = new Date(localSunset.getTime() + transitionMins * 60 * 1000);
    // Determine time of day and transition states
    const isDay = localTime > localSunrise && localTime < localSunset;
    const isSunrise = localTime >= sunriseStart && localTime <= sunriseEnd;
    const isSunset = localTime >= sunsetStart && localTime <= sunsetEnd;
    // Calculate transition progress (0 to 1)
    let transitionProgress = 0;
    if (isSunrise) {
        transitionProgress = (localTime - sunriseStart) / (sunriseEnd - sunriseStart);
    } else if (isSunset) {
        transitionProgress = (localTime - sunsetStart) / (sunsetEnd - sunsetStart);
    }
    // Update overlay classes and opacity based on time
    dayNightOverlay.className = 'day-night-overlay';
    if (isSunrise) {
        dayNightOverlay.classList.add('sunrise-overlay');
        dayNightOverlay.style.opacity = Math.min(0.95, 0.7 + (transitionProgress * 0.25));
        dayNightOverlay.style.backdropFilter = `blur(${1 + transitionProgress}px) brightness(${1 + (transitionProgress * 0.15)})`;
    } else if (isSunset) {
        dayNightOverlay.classList.add('sunset-overlay');
        dayNightOverlay.style.opacity = Math.min(0.95, 0.7 + (transitionProgress * 0.25));
        dayNightOverlay.style.backdropFilter = `blur(${1 + transitionProgress}px) saturate(${1 + (transitionProgress * 0.2)})`;
    } else {
        dayNightOverlay.classList.add(isDay ? 'day-overlay' : 'night-overlay');
        dayNightOverlay.style.opacity = '0.95';
        dayNightOverlay.style.backdropFilter = 'none';
    }
    // Handle sunrise/sunset animations
    const sunriseSunsetOpacity = isSunrise || isSunset ? Math.min(1, 0.7 + (transitionProgress * 0.3)) : 0;
    sunriseSunsetAnimation.className = 'sunrise-sunset-animation';
    sunriseSunsetAnimation.classList.add(isSunrise ? 'sunrise-animation' : 'sunset-animation');
    sunriseSunsetAnimation.style.opacity = sunriseSunsetOpacity.toString();
}

function isDayTime(data) {
    const now = new Date();
    const sunrise = new Date(data.sys.sunrise * 1000);
    const sunset = new Date(data.sys.sunset * 1000);
    
    // Get timezone offset in milliseconds
    const timezoneOffset = data.timezone;
    const localTime = new Date(now.getTime() + (timezoneOffset * 1000));
    
    // Convert sunrise/sunset to local time
    const localSunrise = sunrise;  // API already provides these in correct timezone
    const localSunset = sunset;    // API already provides these in correct timezone
    
    // Compare times using getTime() for more precise comparison
    return localTime.getTime() > localSunrise.getTime() && localTime.getTime() < localSunset.getTime();
}

function isWithinTimeRange(current, target, minutesRange) {
    const rangeMs = minutesRange * 60 * 1000;
    return Math.abs(current - target) <= rangeMs;
}

function updateTemperatureScale() {
    const tempElements = [
        { element: currentTemp, suffix: '°' },
        { element: tempMax, suffix: '°' },
        { element: tempMin, suffix: '°' }
    ];

    tempElements.forEach(temp => {
        if (!temp.element.dataset[currentScale]) return;
        
        const value = temp.element.dataset[currentScale];
        let scaleSymbol = '';
        
        if (currentScale === 'celsius') scaleSymbol = 'C';
        else if (currentScale === 'fahrenheit') scaleSymbol = 'F';
        else if (currentScale === 'kelvin') scaleSymbol = 'K';
        
        temp.element.textContent = `${value}${temp.suffix}${scaleSymbol}`;
    });
}

function updateAirQuality(data) {
    const aqi = data.list[0].main.aqi;
    airQuality.textContent = `AQI: ${aqi}`;
    
    // Position indicator on the quality meter (0-100% scale for 1-5 AQI)
    const position = ((aqi - 1) / 4) * 100;
    qualityIndicator.style.left = `${position}%`;
    
    // Set status and color based on AQI
    let status = '';
    let statusClass = '';
    
    switch(aqi) {
        case 1:
            status = 'Good';
            statusClass = 'quality-good';
            break;
        case 2:
            status = 'Moderate';
            statusClass = 'quality-moderate';
            break;
        case 3:
            status = 'Unhealthy for Sensitive Groups';
            statusClass = 'quality-unhealthy';
            break;
        case 4:
            status = 'Unhealthy';
            statusClass = 'quality-very-unhealthy';
            break;
        case 5:
            status = 'Very Unhealthy/Hazardous';
            statusClass = 'quality-hazardous';
            break;
        default:
            status = 'Unknown';
    }
    
    airQualityStatus.textContent = status;
    airQualityStatus.className = `quality-status ${statusClass}`;
    
    // Show the container if it was hidden
    airQualityContainer.style.display = 'block';
}

function updateForecast(data) {
    // Group forecast data by day
    const dailyForecast = groupForecastByDay(data.list);
    
    // Clear previous forecast
    forecastDays.innerHTML = '';
    hourlyForecast.innerHTML = '';
    
    // Add forecast for next 5 days
    dailyForecast.slice(0, 5).forEach((day, index) => {
        const dayData = day.data[0]; // Use first entry of the day for daily forecast
        const date = new Date(dayData.dt * 1000);
        
        const dayElement = document.createElement('div');
        dayElement.className = `forecast-day ${index === 0 ? 'active' : ''}`;
        dayElement.dataset.date = date.toISOString().split('T')[0];
        
        dayElement.innerHTML = `
            <div class="day-name">${index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' })}</div>
            <div class="day-date">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            <img src="https://openweathermap.org/img/wn/${dayData.weather[0].icon}@2x.png" alt="${dayData.weather[0].description}" class="forecast-icon">
            <div class="forecast-temp">${Math.round(dayData.main.temp)}°C</div>
            <div class="forecast-description">${dayData.weather[0].description}</div>
            <div class="forecast-details">
                <div><i class="fas fa-temperature-arrow-up"></i> ${Math.round(dayData.main.temp_max)}°</div>
                <div><i class="fas fa-temperature-arrow-down"></i> ${Math.round(dayData.main.temp_min)}°</div>
            </div>
        `;
        
        // Add click event to show hourly forecast for the day
        dayElement.addEventListener('click', () => {
            document.querySelectorAll('.forecast-day').forEach(el => el.classList.remove('active'));
            dayElement.classList.add('active');
            updateHourlyForecast(day.data);
        });
        
        forecastDays.appendChild(dayElement);
        
        // Show hourly forecast for today by default
        if (index === 0) {
            updateHourlyForecast(day.data);
        }
    });
}

function groupForecastByDay(forecastList) {
    const days = {};
    
    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateString = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' });
        
        if (!days[dateString]) {
            days[dateString] = {
                date: dateString,
                data: []
            };
        }
        
        days[dateString].data.push(item);
    });
    
    return Object.values(days);
}

function updateHourlyForecast(hourlyData) {
    hourlyForecast.innerHTML = '';
    
    hourlyData.forEach(item => {
        const date = new Date(item.dt * 1000);
        const timeString = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        
        const hourElement = document.createElement('div');
        hourElement.className = 'hourly-item';
        
        hourElement.innerHTML = `
            <div class="hour-time">${timeString}</div>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="${item.weather[0].description}" class="hour-icon">
            <div class="hour-temp">${Math.round(item.main.temp)}°</div>
            <div class="forecast-description">${item.weather[0].description}</div>
        `;
        
        hourlyForecast.appendChild(hourElement);
    });
}

async function handleSearchInput(e) {
    const query = e.target.value.trim().toLowerCase();
    
    // Clear previous timeout
    clearTimeout(debounceTimer);
    clearTimeout(searchTimeout);
    
    if (query.length < 2) {
        searchDropdown.classList.remove('active');
        recentSearches.classList.add('active');
        return;
    }

    recentSearches.classList.remove('active');
    debounceTimer = setTimeout(() => updateSearchDropdown(query), 300);
}

async function updateSearchDropdown(query) {
    searchDropdown.innerHTML = '';
    let hasResults = false;

    // Search in Indian cities first
    for (const [state, cities] of Object.entries(indianCities)) {
        const filteredCities = cities.filter(city => 
            city.toLowerCase().includes(query) || 
            state.toLowerCase().includes(query)
        );

        if (filteredCities.length > 0) {
            hasResults = true;
            const regionGroup = document.createElement('div');
            regionGroup.className = 'region-group';
            
            const regionHeader = document.createElement('div');
            regionHeader.className = 'region-header';
            regionHeader.innerHTML = `
                ${state} (${filteredCities.length})
                <i class="fas fa-chevron-down"></i>
            `;
            
            const regionContent = document.createElement('div');
            regionContent.className = 'region-content';

            // Add click handler for collapsing/expanding
            regionHeader.addEventListener('click', () => {
                regionHeader.classList.toggle('collapsed');
                regionContent.classList.toggle('collapsed');
            });

            for (const city of filteredCities) {
                const cityItem = document.createElement('div');
                cityItem.className = 'city-item';
                cityItem.innerHTML = `
                    <span>${city}, ${state}</span>
                    <div class="weather-preview">
                        <div class="loading-spinner" style="display: none;"></div>
                        <span class="weather-data"></span>
                    </div>
                `;
                
                cityItem.addEventListener('click', () => {
                    searchInput.value = `${city}, ${state}`;
                    checkWeather(`${city}, ${state}`);
                    searchDropdown.classList.remove('active');
                });
                
                cityItem.addEventListener('mouseenter', () => loadWeatherPreview(cityItem, city));
                regionContent.appendChild(cityItem);
            }

            regionGroup.appendChild(regionHeader);
            regionGroup.appendChild(regionContent);
            searchDropdown.appendChild(regionGroup);
        }
    }

    if (!hasResults) {
        searchDropdown.innerHTML = `
            <div class="error-message">
                No cities found matching "${query}"
            </div>
        `;
    }

    searchDropdown.classList.add('active');
}

async function loadWeatherPreview(cityItem, city) {
    const weatherPreview = cityItem.querySelector('.weather-preview');
    const loadingSpinner = weatherPreview.querySelector('.loading-spinner');
    const weatherData = weatherPreview.querySelector('.weather-data');
    
    // Format city name to use state for better accuracy
    const stateName = cityItem.querySelector('span').textContent.split(', ')[1];
    const cacheKey = `${city}, ${stateName}`;

    // Check cache first
    if (weatherCache.has(cacheKey)) {
        updateWeatherPreview(weatherPreview, weatherCache.get(cacheKey));
        return;
    }

    try {
        loadingSpinner.style.display = 'inline-block';
        weatherData.textContent = '';

        // Get coordinates first
        const encodedCity = encodeURIComponent(`${city}, ${stateName}, India`);
        const geoResponse = await fetch(`${api.geocoding.url}q=${encodedCity}&appid=${api.geocoding.key}`);
        const geoData = await geoResponse.json();

        if (!geoData || geoData.length === 0) {
            throw new Error('City not found');
        }

        // Use coordinates to get weather
        const response = await fetch(
            `${api.weather.url}lat=${geoData[0].lat}&lon=${geoData[0].lon}&appid=${api.weather.key}`
        );
        const data = await response.json();

        if (data.cod === 200) {
            const weather = {
                temp: Math.round(data.main.temp),
                description: data.weather[0].main,
            };
            weatherCache.set(cacheKey, weather);
            updateWeatherPreview(weatherPreview, weather);
        } else {
            throw new Error('City not found');
        }
    } catch (error) {
        weatherData.innerHTML = '<i class="fas fa-exclamation-circle"></i> Unavailable';
        weatherData.style.opacity = '0.7';
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

function updateWeatherPreview(weatherPreview, weather) {
    const weatherData = weatherPreview.querySelector('.weather-data');
    const icon = getWeatherIcon(weather.description);
    weatherData.innerHTML = `<i class="${icon}"></i> ${weather.temp}°C`;
}

function getWeatherIcon(condition) {
    switch(condition.toLowerCase()) {
        case 'clear':
            return 'fas fa-sun';
        case 'clouds':
            return 'fas fa-cloud';
        case 'rain':
        case 'drizzle':
            return 'fas fa-cloud-rain';
        case 'thunderstorm':
            return 'fas fa-bolt';
        case 'snow':
            return 'fas fa-snowflake';
        case 'mist':
        case 'fog':
        case 'haze':
            return 'fas fa-smog';
        default:
            return 'fas fa-cloud';
    }
}

function addToRecentSearches(city) {
    // Remove if already exists
    recentCities = recentCities.filter(c => c.toLowerCase() !== city.toLowerCase());
    
    // Add to beginning
    recentCities.unshift(city);
    
    // Keep only last 5 searches
    if (recentCities.length > 5) {
        recentCities = recentCities.slice(0, 5);
    }
    
    // Save to localStorage
    localStorage.setItem('weatherRecentSearches', JSON.stringify(recentCities));
    
    // Update UI
    updateRecentSearchesUI();
}

function updateRecentSearchesUI() {
    recentSearches.innerHTML = '';
    
    if (recentCities.length === 0) {
        const noRecent = document.createElement('div');
        noRecent.className = 'recent-item';
        noRecent.textContent = 'No recent searches';
        recentSearches.appendChild(noRecent);
        return;
    }
    
    recentCities.forEach(city => {
        const item = document.createElement('div');
        item.className = 'recent-item';
        item.textContent = city;
        item.addEventListener('click', () => {
            checkWeather(city);
            searchInput.value = city;
            recentSearches.classList.remove('active');
        });
        recentSearches.appendChild(item);
    });
}

function toggleFavorite() {
    if (!currentCity) return;
    
    const index = favorites.indexOf(currentCity);
    
    if (index === -1) {
        // Add to favorites
        favorites.push(currentCity);
        favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
        favoriteBtn.classList.add('active');
    } else {
        // Remove from favorites
        favorites.splice(index, 1);
        favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
        favoriteBtn.classList.remove('active');
    }
    
    // Save to localStorage
    localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
}

function updateFavoriteButton() {
    if (!currentCity) {
        favoriteBtn.style.display = 'none';
        return;
    }
    
    favoriteBtn.style.display = 'block';
    
    if (favorites.includes(currentCity)) {
        favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
        favoriteBtn.classList.add('active');
    } else {
        favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
        favoriteBtn.classList.remove('active');
    }
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('weatherDarkMode', isDarkMode);
    applyTheme();
    
    // Reapply current weather background with new theme
    if (currentCity) {
        const currentWeather = weatherBackground.className.match(/\b(clear|clouds|rain|snow|thunderstorm|mist)\b/);
        const isDay = weatherBackground.classList.contains('day');
        
        weatherBackground.className = 'weather-background';
        if (currentWeather && currentWeather[0]) {
            weatherBackground.classList.add(currentWeather[0], isDay ? 'day' : 'night');
        }
    }
}

function applyTheme() {
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        themeToggle.title = 'Switch to Light Mode';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        themeToggle.title = 'Switch to Dark Mode';
    }
    
    // Force a repaint to ensure all theme changes are applied
    document.body.style.display = 'none';
    document.body.offsetHeight; // trigger a reflow
    document.body.style.display = '';
}

function showLoading() {
    loading.classList.add('active');
}

function hideLoading() {
    loading.classList.remove('active');
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('active');
}

function clearError() {
    errorMessage.classList.remove('active');
}

// Add this helper function at the end of the file:
function setCloudAnimationDelays(cloudsContainer) {
    const now = Date.now();
    const clouds = cloudsContainer.querySelectorAll('.cloud, .c2, .c3');
    clouds.forEach((cloud, i) => {
        // Use a hash of the current time and index for a pseudo-random but persistent delay
        const moveDelay = ((now / 1000 + i * 13) % 60) * -1; // negative so it starts mid-animation
        const morphDelay = ((now / 1000 + i * 7) % 12) * -1;
        const floatDelay = ((now / 1000 + i * 5) % 8) * -1;
        cloud.style.setProperty('--cloud-move-delay', moveDelay + 's');
        cloud.style.setProperty('--cloud-morph-delay', morphDelay + 's');
        cloud.style.setProperty('--cloud-float-delay', floatDelay + 's');
        // Set a random horizontal starting position for more natural movement
        cloud.style.left = (8 + Math.random() * 70) + 'vw';
        // Set a random vertical offset for floating effect
        cloud.style.top = (30 + Math.random() * 80) + 'px';
        void cloud.offsetWidth;
    });
}

function setWindAnimationDelays(windContainer, gusts = 6) {
    const now = Date.now();
    const winds = windContainer.querySelectorAll('.wind, .w2, .w3');
    winds.forEach((wind, i) => {
        // Use a hash of the current time and index for a pseudo-random but persistent delay
        const moveDelay = ((now / 1000 + i * 13) % 60) * -1; // match clouds: 60s cycle
        const swayDelay = ((now / 1000 + i * 3) % 3) * -1;
        wind.style.setProperty('--wind-move-delay', moveDelay + 's');
        wind.style.setProperty('--wind-sway-delay', swayDelay + 's');
        // Set a random horizontal starting position for more natural movement
        wind.style.left = (8 + Math.random() * 70) + 'vw';
        // Set a random vertical offset for floating effect (match clouds)
        wind.style.top = (30 + Math.random() * 80) + 'px';
        // Duplicate gusts for more prominent wind effect
        if (i < gusts) {
            const gust = wind.cloneNode(true);
            gust.style.opacity = '0.7';
            gust.style.transform = `translateY(${-Math.random() * 20}px) rotate(${Math.random() * 10 - 5}deg)`;
            windContainer.appendChild(gust);
        }
        void wind.offsetWidth;
    });
}

// New function to update weather animation classes
function updateWeatherAnimation(data) {
    const currentTime = new Date().getTime();
    const sunriseTime = new Date(data.sys.sunrise * 1000).getTime();
    const sunsetTime = new Date(data.sys.sunset * 1000).getTime();
    const weatherCondition = data.weather[0].main.toLowerCase();

    // Remove all weather classes
    weatherBackground.classList.remove('day', 'night', 'thunder', 'rain', 'wind');

    // Determine day or night
    if (currentTime >= sunriseTime && currentTime < sunsetTime) {
        weatherBackground.classList.add('day');
    } else {
        weatherBackground.classList.add('night');
    }

    // Add specific weather animations
    if (weatherCondition.includes('thunderstorm')) {
        weatherBackground.classList.add('thunder');
    } else if (weatherCondition.includes('rain')) {
        weatherBackground.classList.add('rain');
    } else if (weatherCondition.includes('wind')) {
        weatherBackground.classList.add('wind');
    }
}

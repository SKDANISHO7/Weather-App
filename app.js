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
        url: "http://api.openweathermap.org/data/2.5/air_pollution?",
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
document.addEventListener('DOMContentLoaded', () => {
    checkWeather('Nanded, Maharashtra');
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

        // Update weather background and time-based effects
    updateWeatherBackground(data);
    updateDayNightCycle(data);

    // Update favorite button
    updateFavoriteButton();

    // Update temperature scale
    updateTemperatureScale();
}

function updateWeatherBackground(data) {
    const weather = data.weather[0].main.toLowerCase();
    const isDay = isDayTime(data);
    
    // First remove all weather classes
    weatherBackground.className = 'weather-background';
    
    // Force a repaint to ensure smooth transition
    weatherBackground.offsetHeight;
    
    // Add new weather and time of day classes
    weatherBackground.classList.add(weather, isDay ? 'day' : 'night');
    
    // Update gradient animation
    gradientAnimation.classList.remove('active');
    // Force repaint
    gradientAnimation.offsetHeight;
    gradientAnimation.classList.add('active');
    
    // Update overlay based on time of day
    updateDayNightCycle(data);
}

function updateDayNightCycle(data) {
    const now = new Date();
    const sunrise = new Date(data.sys.sunrise * 1000);
    const sunset = new Date(data.sys.sunset * 1000);
    
    // Add timezone offset
    const timezoneOffset = data.timezone;
    const localTime = new Date(now.getTime() + (timezoneOffset * 1000));
    
    const isDay = isDayTime(data);
    const isSunrise = isWithinTimeRange(localTime, sunrise, 30); // 30 minutes around sunrise
    const isSunset = isWithinTimeRange(localTime, sunset, 30); // 30 minutes around sunset

    // Update day/night overlay
    dayNightOverlay.className = 'day-night-overlay';
    dayNightOverlay.classList.add(isDay ? 'day-overlay' : 'night-overlay');
    
    // Handle sunrise/sunset animations
    sunriseSunsetAnimation.className = 'sunrise-sunset-animation';
    if (isSunrise) {
        sunriseSunsetAnimation.classList.add('sunrise-animation');
        sunriseSunsetAnimation.style.opacity = '1';
    } else if (isSunset) {
        sunriseSunsetAnimation.classList.add('sunset-animation');
        sunriseSunsetAnimation.style.opacity = '1';
    } else {
        sunriseSunsetAnimation.style.opacity = '0';
    }
}

function isDayTime(data) {
    const now = new Date();
    const sunrise = new Date(data.sys.sunrise * 1000);
    const sunset = new Date(data.sys.sunset * 1000);
    
    // Add timezone offset
    const timezoneOffset = data.timezone;
    const localTime = new Date(now.getTime() + (timezoneOffset * 1000));
    
    return localTime > sunrise && localTime < sunset;
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

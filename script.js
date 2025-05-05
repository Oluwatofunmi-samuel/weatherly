document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const locationBtn = document.getElementById('location-btn');
    const searchSuggestions = document.getElementById('search-suggestions');
    const weatherDisplay = document.getElementById('weather-display');
    const forecastSection = document.getElementById('forecast-section');
    const forecastContainer = document.getElementById('forecast-container');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const errorMessage = document.getElementById('error-message');
    const favoriteBtn = document.getElementById('favorite-btn');
    const favoritesSection = document.getElementById('favorites-section');
    const favoritesContainer = document.getElementById('favorites-container');
    
    // API Configuration
    const API_KEY = 'f04de2d4d631476b8d5103315252804';
    const BASE_URL = 'https://api.weatherapi.com/v1';
    let currentLocation = '';
    let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
    let weatherUpdateInterval;

    // Initialize the app
    init();

    function init() {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (favorites.length > 0) {
            renderFavorites();
            favoritesSection.classList.remove('hidden');
        }

        if (urlParams.has('location')) {
            const locationParam = urlParams.get('location');
            searchInput.value = locationParam;
            fetchWeather(locationParam);
        } else {
            getLocation();
        }
        
        setupFavoriteButton();
    }

    function setupFavoriteButton() {
        favoriteBtn.addEventListener('click', toggleFavorite);
    }

    // Event Listeners
    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) fetchWeather(query);
    });

    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) fetchWeather(query);
        } else if (searchInput.value.length > 2) {
            fetchSuggestions(searchInput.value);
        } else {
            searchSuggestions.classList.add('hidden');
        }
    });

    locationBtn.addEventListener('click', getLocation);

    // Weather Functions
    async function fetchWeather(location) {
        try {
            loading.classList.remove('hidden');
            weatherDisplay.classList.add('hidden');
            error.classList.add('hidden');
            searchSuggestions.classList.add('hidden');

            const [currentResponse, forecastResponse] = await Promise.all([
                fetch(`${BASE_URL}/current.json?key=${API_KEY}&q=${location}&dt=${Date.now()}`),
                fetch(`${BASE_URL}/forecast.json?key=${API_KEY}&q=${location}&days=5&dt=${Date.now()}`)
            ]);

            const [currentData, forecastData] = await Promise.all([
                currentResponse.json(),
                forecastResponse.json()
            ]);

            if (currentData.error || forecastData.error) {
                throw new Error(currentData.error?.message || forecastData.error?.message);
            }

            console.log('Forecast Data:', forecastData); // Debug log

            renderWeather(currentData, forecastData);
            currentLocation = location;
            loading.classList.add('hidden');
            weatherDisplay.classList.remove('hidden');
            forecastSection.classList.remove('hidden');
            updateBackground(currentData.current.condition.code, currentData.current.is_day);
            updateFavoriteButton();
            updateShareLink(location);
        } catch (err) {
            showError(err.message);
        }
    }

    function renderWeather(currentData, forecastData) {
        const { location, current } = currentData;
        
        if (weatherUpdateInterval) clearInterval(weatherUpdateInterval);
        
        // Update current weather
        document.getElementById('location-name').textContent = `${location.name}, ${location.country}`;
        document.getElementById('current-temp').textContent = `${Math.round(current.temp_c)}°C`;
        document.getElementById('feels-like').textContent = `Feels like ${Math.round(current.feelslike_c)}°C`;
        document.getElementById('humidity').textContent = `${current.humidity}%`;
        document.getElementById('wind-speed').textContent = `${current.wind_kph} km/h`;
        document.getElementById('visibility').textContent = `${current.vis_km} km`;
        document.getElementById('pressure').textContent = `${current.pressure_mb} hPa`;
        document.getElementById('current-condition').textContent = current.condition.text;
        
        document.getElementById('weather-icon').innerHTML = `<i class="ph ${getWeatherIcon(current.condition.code, current.is_day)}"></i>`;
        updateLocalTime(location);
        
        weatherUpdateInterval = setInterval(() => {
            const isDay = new Date().getHours() >= 6 && new Date().getHours() < 18;
            updateBackground(current.condition.code, isDay);
        }, 3600000);
        
        renderForecast(forecastData.forecast.forecastday, location.tz_id);
        addToHistory(location.name);
    }

    function updateLocalTime(location) {
        const updateTime = () => {
            const now = new Date();
            const options = { 
                timeZone: location.tz_id,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            };
            
            document.getElementById('current-time').textContent = 
                now.toLocaleTimeString('en-US', options);
            
            document.getElementById('current-date').textContent = 
                now.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    timeZone: location.tz_id
                });
        };
        updateTime();
        setInterval(updateTime, 60000);
    }

    function renderForecast(forecastDays, timezone) {
        forecastContainer.innerHTML = '';
        const now = new Date();
        
        forecastDays.forEach(day => {
            const date = new Date(day.date + 'T12:00:00');
            const options = { timeZone: timezone };
            
            const currentDate = now.toLocaleDateString('en-US', options);
            const forecastDate = date.toLocaleDateString('en-US', options);
            const isCurrentDay = currentDate === forecastDate;
            
            const currentHour = new Date().toLocaleString('en-US', {
                hour: 'numeric',
                hour12: false,
                timeZone: timezone
            });

            const isDay = isCurrentDay ? 
                currentHour >= 6 && currentHour < 18 :
                true;

            const forecastCard = document.createElement('div');
            forecastCard.className = 'forecast-card weather-card p-3 rounded-lg shadow-md flex flex-col items-center transition-all hover:shadow-lg';
            forecastCard.innerHTML = `
                <p class="font-medium text-sm">${date.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    timeZone: timezone 
                })}</p>
                <p class="text-xs text-gray-500 mb-1">${date.toLocaleDateString('en-US', {
                    month: 'numeric',
                    day: 'numeric',
                    timeZone: timezone
                })}</p>
                <div class="text-3xl my-1"><i class="ph ${getWeatherIcon(day.day.condition.code, isDay)}"></i></div>
                <div class="flex justify-between w-full mt-1">
                    <span class="font-bold text-sm">${Math.round(day.day.maxtemp_c)}°</span>
                    <span class="text-gray-500 text-sm">${Math.round(day.day.mintemp_c)}°</span>
                </div>
            `;
            forecastContainer.appendChild(forecastCard);
        });
    }

   function getWeatherIcon(code, isDay) {
        const iconMap = {
            1000: isDay ? 'ph-sun' : 'ph-moon',
            1003: isDay ? 'ph-cloud-sun' : 'ph-cloud-moon',
            1006: 'ph-cloud',
            1009: 'ph-cloud',
            1030: 'ph-cloud-fog',
            1063: 'ph-cloud-drizzle',
            1066: 'ph-snowflake',
            1069: 'ph-cloud-snow',
            1072: 'ph-cloud-drizzle',
            1087: 'ph-cloud-lightning',
            1114: 'ph-snowflake',
            1117: 'ph-snowflake',
            1135: 'ph-cloud-fog',
            1147: 'ph-cloud-fog',
            1150: 'ph-cloud-drizzle',
            1153: 'ph-cloud-drizzle',
            1168: 'ph-cloud-drizzle',
            1171: 'ph-cloud-drizzle',
            1180: 'ph-cloud-rain',
            1183: 'ph-cloud-rain',
            1186: 'ph-cloud-rain',
            1189: 'ph-cloud-rain',
            1192: 'ph-cloud-rain',
            1195: 'ph-cloud-rain',
            1198: 'ph-cloud-rain',
            1201: 'ph-cloud-rain',
            1204: 'ph-cloud-snow',
            1207: 'ph-cloud-snow',
            1210: 'ph-snowflake',
            1213: 'ph-snowflake',
            1216: 'ph-snowflake',
            1219: 'ph-snowflake',
            1222: 'ph-snowflake',
            1225: 'ph-snowflake',
            1237: 'ph-circle-dashed',
            1240: 'ph-cloud-drizzle',
            1243: 'ph-cloud-rain',
            1246: 'ph-cloud-rain',
            1249: 'ph-cloud-snow',
            1252: 'ph-cloud-snow',
            1255: 'ph-snowflake',
            1258: 'ph-snowflake',
            1261: 'ph-circle-dashed',
            1264: 'ph-circle-dashed',
            1273: 'ph-cloud-lightning',
            1276: 'ph-cloud-lightning',
            1279: 'ph-cloud-lightning',
            1282: 'ph-cloud-lightning'
        };
        return iconMap[code] || 'ph-question';
    }

    function updateBackground(weatherCode, isDay) {
        document.body.classList.remove('bg-sunny', 'bg-rainy', 'bg-cloudy', 'bg-night');
        if (!isDay) document.body.classList.add('bg-night');
        else if (weatherCode === 1000) document.body.classList.add('bg-sunny');
        else if (weatherCode >= 1063 && weatherCode <= 1264) document.body.classList.add('bg-rainy');
        else document.body.classList.add('bg-cloudy');
    }

    // Location Functions
    function getLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const { latitude, longitude } = position.coords;
                    fetchWeather(`${latitude},${longitude}`);
                },
                err => {
                    showError('Enable location services or search manually');
                    console.error('Geolocation error:', err);
                    weatherDisplay.classList.remove('hidden');
                }
            );
        } else {
            showError('Geolocation not supported');
        }
    }

    // Favorites Functions
    function toggleFavorite() {
        if (!currentLocation) return;
        const index = favorites.findIndex(fav => fav.location.toLowerCase() === currentLocation.toLowerCase());
        
        if (index === -1) {
            favorites.unshift({ location: currentLocation, timestamp: new Date().toISOString() });
        } else {
            favorites.splice(index, 1);
        }
        
        localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
        renderFavorites();
        updateFavoriteButton();
        favoritesSection.classList.toggle('hidden', favorites.length === 0);
    }

    function updateFavoriteButton() {
        const isFavorite = favorites.some(fav => fav.location.toLowerCase() === currentLocation.toLowerCase());
        favoriteBtn.innerHTML = isFavorite ? '<i class="ph ph-star-fill text-yellow-500"></i>' : '<i class="ph ph-star"></i>';
        favoriteBtn.title = isFavorite ? 'Remove favorite' : 'Add favorite';
    }

    function renderFavorites() {
        favoritesContainer.innerHTML = '';
        favorites.forEach(fav => {
            const card = document.createElement('div');
            card.className = 'weather-card p-3 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer';
            card.innerHTML = `
                <div class="flex justify-between items-center">
                    <h4 class="font-medium text-sm">${fav.location}</h4>
                    <button class="text-yellow-500 hover:text-yellow-600">
                        <i class="ph ph-star-fill"></i>
                    </button>
                </div>
            `;
            card.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                favorites = favorites.filter(f => f.location !== fav.location);
                localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
                renderFavorites();
                if (currentLocation === fav.location) updateFavoriteButton();
            });
            card.addEventListener('click', () => fetchWeather(fav.location));
            favoritesContainer.appendChild(card);
        });
    }

    // Search Suggestions
    async function fetchSuggestions(query) {
        try {
            const response = await fetch(`${BASE_URL}/search.json?key=${API_KEY}&q=${query}`);
            const data = await response.json();
            if (data.length > 0) renderSuggestions(data);
            else searchSuggestions.classList.add('hidden');
        } catch (err) {
            console.error('Suggestions error:', err);
            searchSuggestions.classList.add('hidden');
        }
    }

    function renderSuggestions(suggestions) {
        searchSuggestions.innerHTML = '';
        suggestions.slice(0, 5).forEach(item => {
            const suggestion = document.createElement('div');
            suggestion.className = 'p-2 hover:bg-gray-100 cursor-pointer flex items-center text-sm';
            suggestion.innerHTML = `<i class="ph ph-map-pin mr-2 text-blue-500"></i>${item.name}, ${item.country}`;
            suggestion.addEventListener('click', () => {
                searchInput.value = item.name;
                searchSuggestions.classList.add('hidden');
                fetchWeather(item.name);
            });
            searchSuggestions.appendChild(suggestion);
        });

        const history = getSearchHistory();
        if (history.length > 0) {
            const header = document.createElement('div');
            header.className = 'p-2 text-xs text-gray-500 border-t border-gray-200';
            header.textContent = 'Recent searches';
            searchSuggestions.appendChild(header);

            history.forEach(item => {
                const historyItem = document.createElement('div');
                historyItem.className = 'p-2 hover:bg-gray-100 cursor-pointer flex items-center text-sm';
                historyItem.innerHTML = `<i class="ph ph-clock-counter-clockwise mr-2 text-gray-500"></i>${item}`;
                historyItem.addEventListener('click', () => {
                    searchInput.value = item;
                    searchSuggestions.classList.add('hidden');
                    fetchWeather(item);
                });
                searchSuggestions.appendChild(historyItem);
            });
        }
        searchSuggestions.classList.remove('hidden');
    }

    // Utility Functions
    function showError(message) {
        loading.classList.add('hidden');
        errorMessage.textContent = message;
        error.classList.remove('hidden');
    }

    function addToHistory(city) {
        let history = getSearchHistory().filter(item => item.toLowerCase() !== city.toLowerCase());
        history.unshift(city);
        if (history.length > 5) history = history.slice(0, 5);
        localStorage.setItem('weatherSearchHistory', JSON.stringify(history));
    }

    function getSearchHistory() {
        return JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];
    }

    function updateShareLink(location) {
        const url = new URL(window.location.href);
        url.searchParams.set('location', location);
        navigator.clipboard.writeText(url.toString());
    }
}); 

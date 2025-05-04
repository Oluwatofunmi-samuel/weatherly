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
                // Load favorites if any
                if (favorites.length > 0) {
                    renderFavorites();
                    favoritesSection.classList.remove('hidden');
                }

                // Try to get user's location on load
                getLocation();
            }

            // Event Listeners
            searchBtn.addEventListener('click', () => {
                const query = searchInput.value.trim();
                if (query) {
                    fetchWeather(query);
                }
            });

            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    const query = searchInput.value.trim();
                    if (query) {
                        fetchWeather(query);
                    }
                } else if (searchInput.value.length > 2) {
                    fetchSuggestions(searchInput.value);
                } else {
                    searchSuggestions.classList.add('hidden');
                }
            });

            locationBtn.addEventListener('click', getLocation);
            favoriteBtn.addEventListener('click', toggleFavorite);

            // Weather Data Functions
            async function fetchWeather(location) {
                try {
                    // Show loading state
                    loading.classList.remove('hidden');
                    weatherDisplay.classList.add('hidden');
                    forecastSection.classList.add('hidden');
                    error.classList.add('hidden');
                    searchSuggestions.classList.add('hidden');

                    // Fetch current weather
                    const currentResponse = await fetch(`${BASE_URL}/current.json?key=${API_KEY}&q=${location}`);
                    const currentData = await currentResponse.json();

                    if (currentData.error) {
                        throw new Error(currentData.error.message);
                    }

                    // Fetch forecast
                    const forecastResponse = await fetch(`${BASE_URL}/forecast.json?key=${API_KEY}&q=${location}&days=5`);
                    const forecastData = await forecastResponse.json();

                    if (forecastData.error) {
                        throw new Error(forecastData.error.message);
                    }

                    // Update UI
                    renderWeather(currentData, forecastData);
                    currentLocation = location;

                    // Hide loading and show weather
                    loading.classList.add('hidden');
                    weatherDisplay.classList.remove('hidden');
                    forecastSection.classList.remove('hidden');

                    // Update background based on weather condition
                    updateBackground(currentData.current.condition.code, currentData.current.is_day);
                    
                    // Update favorite button state
                    updateFavoriteButton();
                } catch (err) {
                    showError(err.message);
                }
            }

            function renderWeather(currentData, forecastData) {
                const { location, current } = currentData;
                
                // Clear any existing time update interval
                if (weatherUpdateInterval) {
                    clearInterval(weatherUpdateInterval);
                }
                
                // Update current weather
                document.getElementById('location-name').textContent = `${location.name}, ${location.country}`;
                document.getElementById('current-temp').textContent = `${Math.round(current.temp_c)}°C`;
                document.getElementById('feels-like').textContent = `Feels like ${Math.round(current.feelslike_c)}°C`;
                document.getElementById('humidity').textContent = `${current.humidity}%`;
                document.getElementById('wind-speed').textContent = `${current.wind_kph} km/h`;
                document.getElementById('visibility').textContent = `${current.vis_km} km`;
                document.getElementById('pressure').textContent = `${current.pressure_mb} mb`;
                document.getElementById('current-condition').textContent = current.condition.text;
                
                // Update weather icon
                const weatherIcon = getWeatherIcon(current.condition.code, current.is_day);
                document.getElementById('weather-icon').innerHTML = `<i class="ph ${weatherIcon}"></i>`;
                
                // Update date and time
                updateLocalTime(location);
                
                // Update background based on current time
                updateBackground(current.condition.code, current.is_day);
                
                // Set up periodic background updates for day/night transitions
                weatherUpdateInterval = setInterval(() => {
                    const now = new Date();
                    const isDay = now.getHours() >= 6 && now.getHours() < 18;
                    updateBackground(current.condition.code, isDay);
                }, 3600000); // Check every hour
                
                // Render forecast
                renderForecast(forecastData.forecast.forecastday);
                
                // Add to search history
                addToHistory(location.name);
            }

            function updateLocalTime(location) {
                function updateTime() {
                    const now = new Date();
                    const options = { 
                        timeZone: location.tz_id,
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false
                    };
                    const timeString = now.toLocaleTimeString('en-US', options);
                    document.getElementById('current-time').textContent = timeString;
                    
                    // Update date
                    const dateOptions = { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        timeZone: location.tz_id
                    };
                    document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', dateOptions);
                }
                
                // Update immediately and then every minute
                updateTime();
                setInterval(updateTime, 60000);
            }

            function renderForecast(forecastDays) {
                forecastContainer.innerHTML = '';
                
                forecastDays.forEach(day => {
                    const date = new Date(day.date);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    const weatherIcon = getWeatherIcon(day.day.condition.code, 1); // Always use day icons for forecast
                    
                    const forecastCard = document.createElement('div');
                    forecastCard.className = 'forecast-card weather-card p-3 rounded-lg shadow-md flex flex-col items-center transition-all hover:shadow-lg';
                    forecastCard.innerHTML = `
                        <p class="font-medium text-sm">${dayName}</p>
                        <p class="text-xs text-gray-500 mb-1">${date.getDate()}/${date.getMonth() + 1}</p>
                        <div class="text-3xl my-1"><i class="ph ${weatherIcon}"></i></div>
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
                    1063: 'ph-cloud-rain',
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
                    1240: 'ph-cloud-rain',
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
                const body = document.body;
                
                // Remove any existing weather classes
                body.classList.remove('bg-sunny', 'bg-rainy', 'bg-cloudy', 'bg-night');
                
                // Determine the appropriate background based on weather and time
                if (!isDay) {
                    // Night time
                    body.classList.add('bg-night');
                } else if (weatherCode === 1000) {
                    // Sunny
                    body.classList.add('bg-sunny');
                } else if (weatherCode >= 1063 && weatherCode <= 1264) {
                    // Rainy/snowy
                    body.classList.add('bg-rainy');
                } else {
                    // Cloudy/default
                    body.classList.add('bg-cloudy');
                }
            }

            // Search Suggestions
            async function fetchSuggestions(query) {
                try {
                    const response = await fetch(`${BASE_URL}/search.json?key=${API_KEY}&q=${query}`);
                    const data = await response.json();
                    
                    if (data.length > 0) {
                        renderSuggestions(data);
                    } else {
                        searchSuggestions.classList.add('hidden');
                    }
                } catch (err) {
                    console.error('Error fetching suggestions:', err);
                    searchSuggestions.classList.add('hidden');
                }
            }

            function renderSuggestions(suggestions) {
                searchSuggestions.innerHTML = '';
                
                suggestions.slice(0, 5).forEach(item => {
                    const suggestionItem = document.createElement('div');
                    suggestionItem.className = 'p-2 hover:bg-gray-100 cursor-pointer flex items-center text-sm';
                    suggestionItem.innerHTML = `
                        <i class="ph ph-map-pin mr-2 text-blue-500"></i>
                        <span>${item.name}, ${item.country}</span>
                    `;
                    
                    suggestionItem.addEventListener('click', () => {
                        searchInput.value = item.name;
                        searchSuggestions.classList.add('hidden');
                        fetchWeather(item.name);
                    });
                    
                    searchSuggestions.appendChild(suggestionItem);
                });
                
                // Show history items
                const history = getSearchHistory();
                if (history.length > 0) {
                    const historyHeader = document.createElement('div');
                    historyHeader.className = 'p-2 text-xs text-gray-500 border-t border-gray-200';
                    historyHeader.textContent = 'Recent searches';
                    searchSuggestions.appendChild(historyHeader);
                    
                    history.forEach(item => {
                        const historyItem = document.createElement('div');
                        historyItem.className = 'p-2 hover:bg-gray-100 cursor-pointer flex items-center text-sm';
                        historyItem.innerHTML = `
                            <i class="ph ph-clock-counter-clockwise mr-2 text-gray-500"></i>
                            <span>${item}</span>
                        `;
                        
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

            // Location Functions
            function getLocation() {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        position => {
                            const { latitude, longitude } = position.coords;
                            fetchWeather(`${latitude},${longitude}`);
                        },
                        err => {
                            showError('Unable to retrieve your location. Please enable location services or search manually.');
                            console.error('Geolocation error:', err);
                        }
                    );
                } else {
                    showError('Geolocation is not supported by your browser. Please search manually.');
                }
            }

            // UI Functions
            function showError(message) {
                loading.classList.add('hidden');
                errorMessage.textContent = message;
                error.classList.remove('hidden');
            }

            // Favorites Functions
            function updateFavoriteButton() {
                const isFavorite = favorites.some(fav => fav.location.toLowerCase() === currentLocation.toLowerCase());
                favoriteBtn.innerHTML = isFavorite ? '<i class="ph ph-star-fill text-yellow-500"></i>' : '<i class="ph ph-star"></i>';
                favoriteBtn.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
            }

            function toggleFavorite() {
                if (!currentLocation) return;
                
                const index = favorites.findIndex(fav => fav.location.toLowerCase() === currentLocation.toLowerCase());
                
                if (index === -1) {
                    // Add to favorites
                    favorites.unshift({
                        location: currentLocation,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    // Remove from favorites
                    favorites.splice(index, 1);
                }
                
                // Save to localStorage
                localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
                
                // Update UI
                renderFavorites();
                updateFavoriteButton();
                
                // Show/hide favorites section
                if (favorites.length > 0) {
                    favoritesSection.classList.remove('hidden');
                } else {
                    favoritesSection.classList.add('hidden');
                }
            }

            function renderFavorites() {
                favoritesContainer.innerHTML = '';
                
                favorites.forEach(fav => {
                    const favoriteCard = document.createElement('div');
                    favoriteCard.className = 'weather-card p-3 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer';
                    favoriteCard.innerHTML = `
                        <div class="flex justify-between items-center">
                            <h4 class="font-medium text-sm">${fav.location}</h4>
                            <button class="text-yellow-500 hover:text-yellow-600">
                                <i class="ph ph-star-fill"></i>
                            </button>
                        </div>
                    `;
                    
                    favoriteCard.addEventListener('click', () => {
                        fetchWeather(fav.location);
                    });
                    
                    const starBtn = favoriteCard.querySelector('button');
                    starBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        favorites = favorites.filter(f => f.location !== fav.location);
                        localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
                        renderFavorites();
                        
                        if (favorites.length === 0) {
                            favoritesSection.classList.add('hidden');
                        }
                        
                        if (currentLocation === fav.location) {
                            updateFavoriteButton();
                        }
                    });
                    
                    favoritesContainer.appendChild(favoriteCard);
                });
            }

            // Utility Functions
            function addToHistory(city) {
                let history = getSearchHistory();
                history = history.filter(item => item.toLowerCase() !== city.toLowerCase());
                history.unshift(city);
                if (history.length > 5) history = history.slice(0, 5);
                localStorage.setItem('weatherSearchHistory', JSON.stringify(history));
            }

            function getSearchHistory() {
                return JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];
            }
        });

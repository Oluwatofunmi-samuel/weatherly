// script.js
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

        // Check for location in URL first
        checkUrlForLocation();
        
        // If no location in URL, try geolocation
        if (!window.location.search.includes('location')) {
            getLocation();
        }
        
        // Set up favorite button
        setupFavoriteButton();
    }

    // Event Listeners
    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            fetchWeather(query);
        }
    });

    // ... (keep all other existing code the same until getLocation function)

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

    function checkUrlForLocation() {
        const urlParams = new URLSearchParams(window.location.search);
        const locationParam = urlParams.get('location');
        
        if (locationParam) {
            searchInput.value = locationParam;
            fetchWeather(locationParam);
        }
    }

    // ... (keep all remaining existing code below exactly as before)
    // [Rest of the code remains unchanged from previous version]
}); 

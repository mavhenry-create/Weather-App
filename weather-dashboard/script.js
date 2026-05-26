let selectedPlaceId = null; // Variable to store the selected place ID for fetching weather data on button click
let selectedPlaceObj = null; // Variable to store the selected place object for quick access to details when fetching weather data on button click
const suggestionMap = new Map(); // Map to store placeId and corresponding place details for quick access on suggestion click

function debounce(fn, delay = 300) {
  // debounce function to limit the rate of API calls while typing in the search input
  let timerId;

  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

const searchInput = document.getElementById("search-input");
const getWeatherBtn = document.getElementById("get-weather-btn");
const errorMessage = document.getElementById("error-message");
const loadingIndicator = document.getElementById("loading-indicator");
const modalsContainer = document.getElementById("modals-container");

const backendUrl = {
  suggestions: (query) => `/api/suggestions?q=${encodeURIComponent(query)}`,
  places: (query) => `/api/places?query=${encodeURIComponent(query)}`,
  weather: (placeId) => `/api/weather?placeId=${encodeURIComponent(placeId)}`,
};
// Main function to fetch weather data based on user input or selected suggestion and return both weather data and selected place details for display
async function getWeatherData() {
  const search = searchInput.value.trim();
  if (!search) {
    alert("Please enter a city name.");
    return null;
  }
  // If a place has been selected from the suggestions, use its place ID to fetch weather data. Otherwise, find the place based on the search input and then fetch weather data for the first matching result.
  try {
    let weatherData;
    let selectedPlace;
    if (selectedPlaceId) {
      const weatherRes = await fetch(backendUrl.weather(selectedPlaceId)); // When a suggestion is selected, use the cached place ID to fetch weather data directly without needing to find the place again
      if (!weatherRes.ok) {
        throw new Error(
          `Failed fetching weather data status: ${weatherRes.status}`,
        );
      }
      weatherData = await weatherRes.json();
      console.log("Weather data received:", weatherData);
      selectedPlace = selectedPlaceObj; // Use the cached place object from the suggestion map
    } else {
      const placeRes = await fetch(backendUrl.places(search));
      if (!placeRes.ok) {
        throw new Error(`Failed finding place status: ${placeRes.status}`);
      }

      const placeData = await placeRes.json();

      if (!Array.isArray(placeData) || placeData.length === 0) {
        alert(
          "No matching location found. Please try a different search term.",
        );
        return null;
      }
      console.log("Weather data received:", placeData);
      selectedPlace = placeData[0]; // Assuming the first result is the most relevant
      selectedPlaceObj = selectedPlace; // Cache the selected place object
      const weatherRes = await fetch(
        backendUrl.weather(selectedPlace.place_id),
      );
      if (!weatherRes.ok) {
        throw new Error(
          `Failed fetching weather data status: ${weatherRes.status}`,
        );
      }
      weatherData = await weatherRes.json();
      console.log("Weather data received:", weatherData);
    }

    return { weatherData, selectedPlace };
  } catch (error) {
    console.error(error);
    alert("Failed to fetch weather data. Please try again later.");
    return null;
  }
}

async function fetchSuggestions(query) {
  if (!query) {
    return [];
  }
  try {
    const resAutoComplete = await fetch(backendUrl.suggestions(query));
    if (!resAutoComplete.ok) {
      throw new Error(
        `Failed fetching autocomplete suggestions status: ${resAutoComplete.status}`,
      );
    }
    const suggestions = await resAutoComplete.json();
    console.log("Autocomplete suggestions received:", suggestions);
    return suggestions.map((item) => {
      // Construct the label for each suggestion by combining available details (name, region, country) while filtering out any empty values to avoid extra commas
      const labelParts = [item.name, item.adm_area1, item.country].filter(
        Boolean,
      );
      const label = labelParts.join(", ");

      return {
        // Return an object for each suggestion containing the label for display and the place details for quick access when a suggestion is clicked
        label: label,
        placeId: item.place_id,
        name: item.name,
        region: item.adm_area1,
        country: item.country,
      };
    });
  } catch (error) {
    console.error("Error fetching autocomplete suggestions:", query, error);
    return [];
  }
}

async function renderSuggestions(options) {
  // Render the autocomplete suggestions in the datalist element and store the place details in a map for quick access when a suggestion is clicked
  const suggestionsOptions = document.getElementById("place_suggestions");
  suggestionsOptions.innerHTML = "";
  suggestionMap.clear();

  if (options.length === 0) {
    return;
  }

  options.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.label;
    suggestionMap.set(item.label, item); //set the label as key and the entire item as value for quick access on click
    suggestionsOptions.appendChild(option);
  });
}

async function displayWeather() {
  // Main function to display weather data in the UI by fetching it based on user input or selected suggestion and then updating the relevant DOM elements with the received data
  const { weatherData, selectedPlace } = (await getWeatherData()) || {};
  if (!weatherData || !selectedPlace) {
    return;
  }

  const { units = "auto" } = weatherData || {};
  const tempUnit = units === "us" ? "°F" : "°C";
  const windUnit = units === "us" ? "mph" : "km/h";
  const { current = {}, daily = {} } = weatherData || {};
  const { name = "", region = "", country = "" } = selectedPlace || {};
  const {
    temperature = "",
    summary = "",
    icon_num = "",
    cloud_cover = "",
    wind = {},
  } = current || {};
  const { speed = "", dir = "" } = wind || {};

  const todayDaily = daily?.data?.[0] || {};
  const {
    day = "",
    all_day = {},
    summary: dailySummary = "",
  } = todayDaily || {};
  const { temperature_max = "", temperature_min = "" } = all_day || {};
  const weeklyDaily = daily?.data || [];
  for (let i = 1; i < 6; i++) {
    const dailyData = weeklyDaily[i] || {};
    const {
      day: dailyDay = "",
      all_day: dailyAllDay = {},
      summary: dailySummary = "",
      icon: dailyIconNum = "",
    } = dailyData || {};
    const {
      temperature_max: dailyTempMax = "",
      temperature_min: dailyTempMin = "",
    } = dailyAllDay || {};
    const dayDateEl = document.getElementById(`day${i + 1}-date`);
    const daySummaryEl = document.getElementById(`day${i + 1}-summary`);
    const dayTempHighEl = document.getElementById(`day${i + 1}-temphigh`);
    const dayTempLowEl = document.getElementById(`day${i + 1}-templow`);
    const dayIconEl = document.getElementById(`day${i + 1}-icon`);

    if (dayDateEl) dayDateEl.textContent = dailyDay;
    if (daySummaryEl) daySummaryEl.textContent = dailySummary;
    if (dayTempHighEl)
      dayTempHighEl.textContent = `High: ${dailyTempMax}${tempUnit}`;
    if (dayTempLowEl)
      dayTempLowEl.textContent = `Low: ${dailyTempMin}${tempUnit}`;
    if (dayIconEl) {
      dayIconEl.src = getIconUrl(dailyIconNum);
      dayIconEl.hidden = false;
    }
  }
  
  document.getElementById("city-name").textContent = name;
  document.getElementById("region").textContent = region;
  document.getElementById("country-code").textContent = country;
  document.getElementById("date").textContent = new Date().toLocaleDateString(
    undefined,
    { month: "long", day: "numeric", year: "numeric" },
  );
  document.getElementById("temperature").textContent =
    `Temperature: ${temperature}${tempUnit}`;
  document.getElementById("temphigh").textContent =
    `High: ${temperature_max}${tempUnit}`;
  document.getElementById("templow").textContent =
    `Low: ${temperature_min}${tempUnit}`;
  document.getElementById("daily-summary").textContent =
    `Summary: ${dailySummary}`;
  document.getElementById("summary").textContent = `Condition: ${summary}`;
  document.getElementById("cloud-cover").textContent =
    `Cloud Cover: ${cloud_cover}%`;
  document.getElementById("wind").textContent =
    `Wind: ${dir} ${speed} ${windUnit}`;
  document.getElementById("weather-icon").src = getIconUrl(icon_num);
  document.getElementById("weather-icon").hidden = false;
  document.getElementById("temp").textContent = `${temperature}${tempUnit}`;
}

const debounceFetch = debounce(async (query) => {
  const suggestions = await fetchSuggestions(query);
  await renderSuggestions(suggestions);
}, 300);

searchInput.addEventListener(`input`, async (e) => {
  const currVal = e.target.value;
  const query = currVal.trim();

  if (suggestionMap.has(currVal)) {
    const selectedPlaceData = suggestionMap.get(currVal);
    selectedPlaceId = selectedPlaceData ? selectedPlaceData.placeId : null;
    selectedPlaceObj = selectedPlaceData || null;
    return;
  }

  if (query.length < 2) {
    selectedPlaceId = null;
    document.getElementById("place_suggestions").replaceChildren(); // Clear suggestions from datalist
    suggestionMap.clear();
    return;
  }

  debounceFetch(query);
});
function getIconUrl(icon_num) {
  return `/medium/${icon_num}.png`;
}

getWeatherBtn.addEventListener("click", () => {
 const currentWeatherModal = document.getElementById("current-weather-modal");
 displayWeather();
 if (currentWeatherModal) {
   currentWeatherModal.hidden = false;
 }
});

document.getElementById("toggle-forecast-btn").addEventListener("click", () => {
  const forecastModal = document.getElementById("forecast-modal");
  if (forecastModal) {
    forecastModal.hidden = !forecastModal.hidden; // Toggle the visibility of the forecast modal when the button is clicked
  }
})

// dark mode toggle
const themeToggleBtn = document.getElementById("theme-toggle-btn");
themeToggleBtn.addEventListener("click", () => {
  document.getElementById("theme-toggle-btn").textContent =
    document.documentElement.classList.contains("dark") ? "🌑" : "🌕";
  document.documentElement.classList.toggle("dark");
});

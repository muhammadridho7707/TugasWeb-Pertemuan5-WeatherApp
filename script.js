const API_KEY = "693b661ac99d5c2ded31b1c2905deae8";

const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";
const HISTORY_KEY = "skylook_history";
const UNIT_KEY = "skylook_unit";

const DEFAULT_CITY = "Belawan";

const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const weatherCard = document.getElementById("weatherCard");
const statusBar = document.getElementById("statusBar");
const statusText = document.getElementById("statusText");
const localTimeEl = document.getElementById("localTime");
const localDateEl = document.getElementById("localDate");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistory");
const navLinks = document.querySelectorAll(".nav-link");
const mainNav = document.getElementById("mainNav");
const hamburgerBtn = document.getElementById("hamburgerBtn");
const forecastGrid = document.getElementById("forecastGrid");
const forecastTitle = document.getElementById("forecastTitle");
const DAY_NAMES_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const sections = ["weatherCard", "tentang", "kontak"]
  .map((id) => document.getElementById(id))
  .filter(Boolean);

let unit = localStorage.getItem(UNIT_KEY) || "metric";
let clockTimer = null;
let map = null;
let mapMarker = null;
let homeCity = null;

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.forEach((l) => l.classList.toggle("is-active", l === link));
    closeMobileMenu();
  });
});

function openMobileMenu() {
  mainNav.classList.add("is-open");
  hamburgerBtn.classList.add("is-open");
  hamburgerBtn.setAttribute("aria-expanded", "true");
}

function closeMobileMenu() {
  mainNav.classList.remove("is-open");
  hamburgerBtn.classList.remove("is-open");
  hamburgerBtn.setAttribute("aria-expanded", "false");
}

hamburgerBtn.addEventListener("click", () => {
  const isOpen = mainNav.classList.contains("is-open");
  isOpen ? closeMobileMenu() : openMobileMenu();
});

if ("IntersectionObserver" in window && sections.length) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const activeLink = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
        if (activeLink) {
          navLinks.forEach((l) => l.classList.toggle("is-active", l === activeLink));
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((section) => sectionObserver.observe(section));
}

function showLoading(message) {
  statusText.textContent = message || "Memuat data cuaca...";
  statusBar.hidden = false;
}

function hideLoading() {
  statusBar.hidden = true;
}

function showPlaceholder() {
  weatherCard.innerHTML = `
    <div class="hero-placeholder">
      <div class="hero-emoji">🧭</div>
      <h2>Cari kota untuk melihat cuacanya</h2>
      <p>Ketik nama kota pada kolom pencarian di atas, atau izinkan akses lokasi untuk melihat cuaca di tempatmu sekarang.</p>
    </div>`;
}

function showError(message) {
  weatherCard.innerHTML = `
    <div class="hero-error">
      <div class="hero-emoji">⚠️</div>
      <h2>Terjadi kesalahan</h2>
      <p>${message}</p>
    </div>`;
}

async function fetchWeatherByCity(city) {
  const url = `${BASE_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${unit}&lang=id`;
  return fetchWeather(url);
}

async function fetchWeatherByCoords(lat, lon) {
  const url = `${BASE_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${unit}&lang=id`;
  return fetchWeather(url);
}

async function fetchWeather(url) {
  showLoading("Memuat data cuaca...");
  try {
    const response = await fetch(url);

    if (response.status === 404) {
      throw new Error("NOT_FOUND");
    }
    if (response.status === 401) {
      throw new Error("INVALID_KEY");
    }
    if (!response.ok) {
      throw new Error("API_ERROR");
    }

    const data = await response.json();
    renderWeather(data);
    startLocalClock(data.timezone);
    updateMap(data.coord.lat, data.coord.lon, data.name);
    saveToHistory(data.name);
    return data;
  } catch (err) {
    handleFetchError(err);
    return null;
  } finally {
    hideLoading();
  }
}

function handleFetchError(err) {
  if (err.message === "NOT_FOUND") {
    showError("Kota tidak ditemukan. Periksa kembali ejaan nama kota, lalu coba lagi.");
  } else if (err.message === "INVALID_KEY") {
    showError("API key OpenWeatherMap belum diisi atau tidak valid. Buka script.js dan isi variabel API_KEY dengan key milikmu.");
  } else if (err.message === "API_ERROR") {
    showError("Server cuaca sedang bermasalah. Coba beberapa saat lagi.");
  } else if (err instanceof TypeError) {
    showError("Tidak dapat terhubung ke internet. Periksa koneksimu, lalu coba lagi.");
  } else {
    showError("Terjadi kesalahan yang tidak terduga. Silakan coba lagi.");
  }
  console.error(err);
}

function renderWeather(data) {
  const tempUnit = unit === "metric" ? "°C" : "°F";
  const windUnit = unit === "metric" ? "m/s" : "mph";
  const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

  weatherCard.innerHTML = `
    <div class="hero-main">
      <div class="hero-loc">
        <span class="loc-tag">${data.sys.country || ""}</span>
        <h2>${data.name}</h2>
        <p class="hero-desc">${data.weather[0].description}</p>
      </div>

      <div class="hero-temp-block">
        <img class="hero-icon" src="${iconUrl}" alt="${data.weather[0].description}">
        <div>
          <span class="hero-temp">${Math.round(data.main.temp)}${tempUnit}</span>
          <div class="unit-toggle">
            <button type="button" data-unit="metric" class="${unit === "metric" ? "is-active" : ""}">°C</button>
            <button type="button" data-unit="imperial" class="${unit === "imperial" ? "is-active" : ""}">°F</button>
          </div>
        </div>
      </div>

      <div class="hero-stats">
        <div class="hero-stat">
          <span class="stat-label">Terasa seperti</span>
          <span class="stat-value">${Math.round(data.main.feels_like)}${tempUnit}</span>
        </div>
        <div class="hero-stat">
          <span class="stat-label">Kelembaban</span>
          <span class="stat-value">${data.main.humidity}%</span>
        </div>
        <div class="hero-stat">
          <span class="stat-label">Angin</span>
          <span class="stat-value">${data.wind.speed} ${windUnit}</span>
        </div>
      </div>
    </div>
  `;
  weatherCard.querySelectorAll(".unit-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.unit === unit) return;
      unit = btn.dataset.unit;
      localStorage.setItem(UNIT_KEY, unit);
      fetchWeatherByCity(data.name);
      if (homeCity) fetchForecast(homeCity.lat, homeCity.lon);
    });
  });
}

function setHomeCity(lat, lon, name) {
  homeCity = { lat, lon, name };
  if (forecastTitle) forecastTitle.textContent = `Ramalan 5 Hari — ${name}`;
  fetchForecast(lat, lon);
}

async function fetchForecast(lat, lon) {
  forecastGrid.innerHTML = `<p class="forecast-loading">Memuat ramalan...</p>`;
  try {
    const url = `${FORECAST_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${unit}&lang=id`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("FORECAST_ERROR");

    const data = await response.json();
    const dailyForecast = buildDailyForecast(data);
    renderForecast(dailyForecast);
  } catch (err) {
    console.error(err);
    forecastGrid.innerHTML = `<p class="forecast-empty">Gagal memuat ramalan cuaca.</p>`;
  }
}

function toCityLocalDate(unixSeconds, timezoneOffsetSeconds) {
  const browserOffsetMs = new Date().getTimezoneOffset() * 60000;
  return new Date(unixSeconds * 1000 + browserOffsetMs + timezoneOffsetSeconds * 1000);
}

function buildDailyForecast(data) {
  const tz = data.city.timezone;

  const grouped = data.list.reduce((acc, item) => {
    const localDate = toCityLocalDate(item.dt, tz);
    const key = `${localDate.getFullYear()}-${localDate.getMonth()}-${localDate.getDate()}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push({ ...item, localDate });
    return acc;
  }, {});

  const now = toCityLocalDate(Math.floor(Date.now() / 1000), tz);
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  return Object.entries(grouped)
    .filter(([key]) => key !== todayKey)
    .slice(0, 5)
    .map(([, items]) => {
      const temps = items.map((item) => item.main.temp);
      const midday = items.reduce((closest, item) => {
        const diff = Math.abs(item.localDate.getHours() - 12);
        const closestDiff = Math.abs(closest.localDate.getHours() - 12);
        return diff < closestDiff ? item : closest;
      });

      return {
        date: midday.localDate,
        min: Math.round(Math.min(...temps)),
        max: Math.round(Math.max(...temps)),
        icon: midday.weather[0].icon,
        description: midday.weather[0].description,
        hourly: items.map((item) => ({
          hour: item.localDate.getHours(),
          temp: Math.round(item.main.temp),
        })),
      };
    });
}

function buildTempChart(days) {
  const W = 700;
  const H = 80;
  const PAD_X = 10;
  const allTemps = days.flatMap((d) => d.hourly.map((h) => h.temp));
  const tMin = Math.min(...allTemps);
  const tMax = Math.max(...allTemps);
  const range = tMax - tMin || 1;

  const cardW = Math.floor((W - PAD_X * 2) / days.length);

  const points = days.map((day, di) => {
    const midHour = day.hourly.reduce((a, b) =>
      Math.abs(a.hour - 12) < Math.abs(b.hour - 12) ? a : b
    );
    const x = PAD_X + di * cardW + cardW / 2;
    const y = H - 14 - ((midHour.temp - tMin) / range) * (H - 28);
    return { x, y, temp: midHour.temp };
  });

  const pathD = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `C ${cx} ${prev.y} ${cx} ${p.y} ${p.x} ${p.y}`;
    })
    .join(" ");

  const fillD = `${pathD} L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`;

  const labels = points
    .map(
      (p) =>
        `<text x="${p.x}" y="${p.y - 6}" text-anchor="middle" class="chart-label">${p.temp}${unit === "metric" ? "°" : "°F"}</text>`
    )
    .join("");

  return `
    <svg class="forecast-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--sky-bright)" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="var(--sky-bright)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${fillD}" fill="url(#chartFill)"/>
      <path d="${pathD}" stroke="var(--sky-bright)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      ${labels}
    </svg>`;
}

function renderForecast(days) {
  const tempUnit = unit === "metric" ? "°C" : "°F";

  if (days.length === 0) {
    forecastGrid.innerHTML = `<p class="forecast-empty">Data ramalan tidak tersedia.</p>`;
    return;
  }

  const chart = buildTempChart(days);

  const cards = days
    .map(
      (day) => `
      <div class="forecast-card">
        <span class="forecast-day">${DAY_NAMES_ID[day.date.getDay()]}</span>
        <span class="forecast-date">${day.date.getDate()}/${day.date.getMonth() + 1}</span>
        <img class="forecast-icon" src="https://openweathermap.org/img/wn/${day.icon}@2x.png" alt="${day.description}">
        <span class="forecast-desc">${day.description}</span>
        <span class="forecast-temp"><strong>${day.max}${tempUnit}</strong> <span class="temp-min">${day.min}${tempUnit}</span></span>
      </div>`
    )
    .join("");

  forecastGrid.innerHTML = `
    <div class="forecast-chart-wrap">${chart}</div>
    <div class="forecast-cards-wrap">${cards}</div>
  `;
}

function startLocalClock(timezoneOffsetSeconds) {
  if (clockTimer) clearInterval(clockTimer);

  const update = () => {
    const nowUtcMs = Date.now() + new Date().getTimezoneOffset() * 60000;
    const cityTime = new Date(nowUtcMs + timezoneOffsetSeconds * 1000);

    const hh = String(cityTime.getHours()).padStart(2, "0");
    const mm = String(cityTime.getMinutes()).padStart(2, "0");
    const ss = String(cityTime.getSeconds()).padStart(2, "0");
    localTimeEl.textContent = `${hh}:${mm}:${ss}`;

    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    localDateEl.textContent = `${days[cityTime.getDay()]}, ${cityTime.getDate()} ${months[cityTime.getMonth()]} ${cityTime.getFullYear()}`;
  };

  update();
  clockTimer = setInterval(update, 1000);
}

function updateMap(lat, lon, label) {
  if (!map) {
    map = L.map("map", { zoomControl: false, attributionControl: true }).setView([lat, lon], 10);
    L.tileLayer("https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 20,
    }).addTo(map);
    mapMarker = L.marker([lat, lon]).addTo(map);
  } else {
    map.setView([lat, lon], 10);
    mapMarker.setLatLng([lat, lon]);
  }
  mapMarker.bindPopup(label).openPopup();
  setTimeout(() => map.invalidateSize(), 200);
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveToHistory(city) {
  let history = getHistory();
  history = history.filter((item) => item.toLowerCase() !== city.toLowerCase());
  history.unshift(city);
  history = history.slice(0, 8);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const history = getHistory();

  if (history.length === 0) {
    historyList.innerHTML = `<li class="history-empty">Belum ada riwayat pencarian.</li>`;
    return;
  }

  historyList.innerHTML = history
    .map((city) => `<li><button type="button" class="history-chip" data-city="${city}">${city}</button></li>`)
    .join("");

  historyList.querySelectorAll(".history-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      cityInput.value = chip.dataset.city;
      fetchWeatherByCity(chip.dataset.city);
    });
  });
}

clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;
  fetchWeatherByCity(city);
});

function initLocation() {
  showPlaceholder();

  const isSecureEnough = window.isSecureContext || location.protocol === "file:";
  if (!isSecureEnough) {
    console.warn("Geolocation membutuhkan origin aman (https/localhost). Buka lewat server lokal, bukan file://.");
  }

  if (!("geolocation" in navigator)) {
    showLoading(`Browser tidak mendukung lokasi, menampilkan ${DEFAULT_CITY} sebagai default...`);
    fetchWeatherByCity(DEFAULT_CITY)
      .then((data) => data && setHomeCity(data.coord.lat, data.coord.lon, data.name))
      .finally(hideLoading);
    return;
  }

  showLoading("Mendeteksi lokasimu...");
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      const data = await fetchWeatherByCoords(latitude, longitude);
      if (data) setHomeCity(latitude, longitude, data.name);
    },
    async (error) => {
      let reason;
      switch (error.code) {
        case error.PERMISSION_DENIED:
          reason = "Izin lokasi ditolak. Klik ikon gembok/lokasi di address bar lalu izinkan akses lokasi, atau buka lewat http://localhost, bukan file://.";
          break;
        case error.POSITION_UNAVAILABLE:
          reason = "Posisi tidak dapat dideteksi. Pastikan location service di perangkatmu aktif.";
          break;
        case error.TIMEOUT:
          reason = "Deteksi lokasi terlalu lama. Coba lagi dengan koneksi yang lebih stabil.";
          break;
        default:
          reason = "Gagal mendeteksi lokasi karena alasan yang tidak diketahui.";
      }
      console.warn("Geolocation gagal:", reason);
      const data = await fetchWeatherByCity(DEFAULT_CITY);
      if (data) setHomeCity(data.coord.lat, data.coord.lon, data.name);
    },
    { timeout: 8000 }
  );
}

renderHistory();
initLocation();
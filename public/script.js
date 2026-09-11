const API_KEY = "e8d03753dfdc8f5416938e3c5023c80b";

const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";
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
const sections = ["weatherCard", "tentang", "kontak"]
  .map((id) => document.getElementById(id))
  .filter(Boolean);

let unit = localStorage.getItem(UNIT_KEY) || "metric"; // metric = °C, imperial = °F
let clockTimer = null;
let map = null;
let mapMarker = null;

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
    // fetch gagal total, biasanya karena tidak ada koneksi internet
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
    });
  });
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
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
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
    fetchWeatherByCity(DEFAULT_CITY).finally(hideLoading);
    return;
  }

  showLoading("Mendeteksi lokasimu...");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      fetchWeatherByCoords(latitude, longitude);
    },
    (error) => {
      // Kasih tahu alasan sebenarnya, baru fallback ke kota default
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
      fetchWeatherByCity(DEFAULT_CITY);
    },
    { timeout: 8000 }
  );
}

renderHistory();
initLocation();
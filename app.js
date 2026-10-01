const carsList = document.getElementById("cars-list");
const loadingState = document.getElementById("loading");
const emptyState = document.getElementById("empty");
const filtersForm = document.getElementById("filters-form");
const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");
const pageInfo = document.getElementById("page-info");
const addCarBtn = document.getElementById("add-car-btn");
const createCarModal = document.getElementById("create-car-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const cancelCreateBtn = document.getElementById("cancel-create-btn");
const createCarForm = document.getElementById("create-car-form");
const errorBanner = document.getElementById("error-banner");
const API_URL = "https://bk-car-sql-alchemy-ls11.onrender.com/cars/";
const CREATE_API_URL = "https://bk-car-sql-alchemy-ls11.onrender.com/cars/add/";
const LIMIT = 10;
const BODY_TYPES = new Set([
  "sedan",
  "crossover",
  "hatchback",
  "wagon",
  "coupe",
  "convertible",
  "minivan",
  "pickup",
  "suv",
]);

const state = {
  offset: 0,
  page: 1,
  hasNextPage: false,
  currentCars: [],
};

function escapeHtml(value) {
  const normalized = value == null ? "" : String(value);

  return normalized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getFiltersFromForm() {
  const formData = new FormData(filtersForm);
  const filters = {};

  for (const [key, value] of formData.entries()) {
    if (value === "" || value === null || value === undefined) {
      continue;
    }

    filters[key] = String(value).trim();
  }

  return filters;
}

function buildQueryString() {
  const params = new URLSearchParams();
  const filters = getFiltersFromForm();

  Object.entries(filters).forEach(([key, value]) => {
    params.set(key, value);
  });

  params.set("limit", String(LIMIT));
  params.set("offset", String(state.offset));

  return params.toString();
}

function showErrorBanner(message) {
  errorBanner.textContent = message;
  errorBanner.classList.remove("hidden");
}

function hideErrorBanner() {
  errorBanner.textContent = "";
  errorBanner.classList.add("hidden");
}

function handleApiError(error, fallbackMessage) {
  if (
    error &&
    (error.name === "TypeError" || error.message?.includes("Failed to fetch"))
  ) {
    showErrorBanner(
      "Не вдалося з'єднатись з сервером. Перевірте чи запустили бекенд",
    );
    return;
  }

  const status = Number(error?.status ?? error?.message?.match(/\d{3}/)?.[0]);

  if (status === 409) {
    showErrorBanner("Помилка 409");
    return;
  }

  if (status === 404) {
    showErrorBanner("Авто не знайдене - можливо вже видалене");
    return;
  }

  if (status === 422) {
    showErrorBanner("Перевірте правильність заповнення форм");
    return;
  }

  showErrorBanner(fallbackMessage || "Сталася помилка");
}

function updatePaginationControls() {
  prevPageBtn.disabled = state.page <= 1;
  nextPageBtn.disabled = !state.hasNextPage;
  pageInfo.textContent = `Сторінка ${state.page}`;
}

function renderCar(car) {
  const article = document.createElement("article");
  article.className = "car-card";

  const tags = Array.isArray(car.tags) ? car.tags : [];
  const statusClass = car.is_available
    ? "status-available"
    : "status-unavailable";
  const statusText = car.is_available ? "Available" : "Unavailable";

  article.innerHTML = `
    <h2>${escapeHtml(car.model || "—")}</h2>

    <dl class="car-meta">
      <div>
        <dt>Seller</dt>
        <dd>${escapeHtml(car.seller_name || "—")}</dd>
      </div>
      <div>
        <dt>VIN</dt>
        <dd>${escapeHtml(car.vin || "—")}</dd>
      </div>
      <div>
        <dt>Body</dt>
        <dd>${escapeHtml(car.body_type || "—")}</dd>
      </div>
      <div>
        <dt>Engine</dt>
        <dd>${escapeHtml(car.engine_volume || "—")}</dd>
      </div>
      <div>
        <dt>Price</dt>
        <dd>${escapeHtml(car.price ?? "—")}</dd>
      </div>
      <div>
        <dt>Rating</dt>
        <dd>${escapeHtml(car.rating ?? "—")}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd class="${statusClass}">${statusText}</dd>
      </div>
      <div>
        <dt>Year</dt>
        <dd>${escapeHtml(car.year ?? "—")}</dd>
      </div>
    </dl>

    <div class="car-description">${escapeHtml(car.description || "No description provided.")}</div>

    <div class="car-tags">
      ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("") || "<span>No tags</span>"}
    </div>

    <div class="car-card-actions">
      <button type="button" class="edit-car-btn" data-action="edit" data-id="${escapeHtml(car.id ?? "")}">Редагувати</button>
      <button type="button" class="delete-car-btn" data-action="delete" data-id="${escapeHtml(car.id ?? "")}">Видалити</button>
    </div>
  `;

  return article;
}

function renderCars(cars) {
  carsList.innerHTML = "";
  state.currentCars = Array.isArray(cars) ? cars : [];

  if (!Array.isArray(cars) || cars.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  cars.forEach((car) => {
    carsList.appendChild(renderCar(car));
  });
}

async function loadCars() {
  hideErrorBanner();

  try {
    loadingState.classList.remove("hidden");
    emptyState.classList.add("hidden");

    const query = buildQueryString();
    const response = await fetch(`${API_URL}?${query}`);

    if (!response.ok) {
      throw { status: response.status };
    }

    const cars = await response.json();
    const items = Array.isArray(cars) ? cars : [];

    renderCars(items);
    state.hasNextPage = items.length === LIMIT;
    updatePaginationControls();
    hideErrorBanner();
  } catch (error) {
    console.error("Failed to load cars:", error);
    renderCars([]);
    state.hasNextPage = false;
    updatePaginationControls();
    handleApiError(error, "Не вдалося завантажити список авто");
  } finally {
    loadingState.classList.add("hidden");
  }
}

function clearCreateFormErrors() {
  document.querySelectorAll(".field-error").forEach((element) => {
    element.textContent = "";
  });
}

function setCreateFormError(fieldName, message) {
  const target = document.querySelector(`[data-error-for="${fieldName}"]`);
  if (target) {
    target.textContent = message;
  }
}

function buildCarPayload() {
  const formData = new FormData(createCarForm);
  const payload = {};

  const model = String(formData.get("model") || "").trim();
  const sellerName = String(formData.get("seller_name") || "").trim();
  const vin = String(formData.get("vin") || "").trim();
  const bodyType = String(formData.get("body_type") || "").trim();
  const engineVolumeRaw = String(formData.get("engine_volume") || "").trim();
  const priceRaw = String(formData.get("price") || "").trim();
  const ratingRaw = String(formData.get("rating") || "").trim();
  const isAvailableVal = String(formData.get("is_available") || "true");
  const description = String(formData.get("description") || "").trim();
  const yearRaw = String(formData.get("year") || "").trim();
  const tagsRaw = String(formData.get("tags") || "").trim();

  if (model) payload.model = model;
  if (sellerName) payload.seller_name = sellerName;
  if (vin) payload.vin = vin;
  if (bodyType) payload.body_type = bodyType;
  if (engineVolumeRaw) payload.engine_volume = Number(engineVolumeRaw);
  if (priceRaw) payload.price = Number(priceRaw);
  if (ratingRaw) payload.rating = Number(ratingRaw);
  payload.is_available = isAvailableVal === "true";
  if (description) payload.description = description;
  if (yearRaw) payload.year = Number(yearRaw);

  const tags = tagsRaw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);

  payload.tags = tags;

  return payload;
}

function validateCarPayload(payload) {
  const errors = {};

  if (!payload.model || payload.model.length > 1000) {
    errors.model = "Модель обов'язкова і не більше 1000 символів";
  }

  if (!payload.seller_name || payload.seller_name.length > 500) {
    errors.seller_name = "ПІБ продавця обов'язкове і не більше 500 символів";
  }

  if (!payload.vin || payload.vin.length !== 17) {
    errors.vin = "VIN має містити рівно 17 символів";
  }

  if (!payload.body_type || !BODY_TYPES.has(payload.body_type)) {
    errors.body_type = "Оберіть коректний тип кузова";
  }

  if (
    payload.engine_volume === undefined ||
    !Number.isFinite(payload.engine_volume) ||
    payload.engine_volume <= 0
  ) {
    errors.engine_volume = "Об'єм двигуна є обов'язковим і має бути > 0";
  }

  if (
    payload.price === undefined ||
    !Number.isFinite(payload.price) ||
    payload.price < 0
  ) {
    errors.price = "Ціна є обов'язковою і не може бути від'ємною";
  }

  if (
    payload.rating !== undefined &&
    (!Number.isFinite(payload.rating) ||
      payload.rating < 0 ||
      payload.rating > 5)
  ) {
    errors.rating = "Рейтинг має бути числом від 0 до 5";
  }

  if (payload.description && payload.description.length > 5000) {
    errors.description = "Опис не може перевищувати 5000 символів";
  }

  if (
    payload.year !== undefined &&
    (!Number.isFinite(payload.year) || payload.year <= 0)
  ) {
    errors.year = "Рік має бути коректним числом";
  }

  if (payload.tags && payload.tags.length > 12) {
    errors.tags = "Тегів не може бути більше 12";
  }

  return errors;
}

function openCreateModal() {
  createCarForm.dataset.mode = "create";
  createCarForm.dataset.carId = "";
  document.getElementById("create-car-title").textContent = "Додати авто";
  const submitButton = createCarForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = "Створити";
  }

  clearCreateFormErrors();
  createCarForm.reset();
  document.getElementById("is_available").value = "true";
  createCarModal.classList.remove("hidden");
  createCarModal.setAttribute("aria-hidden", "false");
}

function openEditModal(carId) {
  const car = state.currentCars.find(
    (item) => String(item.id) === String(carId),
  );

  if (!car) {
    return;
  }

  createCarForm.dataset.mode = "edit";
  createCarForm.dataset.carId = String(car.id);
  document.getElementById("create-car-title").textContent = "Редагувати авто";
  const submitButton = createCarForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = "Зберегти";
  }

  clearCreateFormErrors();
  createCarForm.reset();

  Object.entries({
    model: car.model,
    seller_name: car.seller_name,
    vin: car.vin,
    body_type: car.body_type,
    engine_volume: car.engine_volume,
    price: car.price,
    rating: car.rating,
    is_available: String(car.is_available),
    description: car.description,
    year: car.year,
    tags: Array.isArray(car.tags) ? car.tags.join(", ") : "",
  }).forEach(([fieldName, value]) => {
    const field = createCarForm.elements.namedItem(fieldName);
    if (field && value !== undefined && value !== null) {
      field.value = value;
    }
  });

  createCarModal.classList.remove("hidden");
  createCarModal.setAttribute("aria-hidden", "false");
}

function closeCreateModal() {
  createCarModal.classList.add("hidden");
  createCarModal.setAttribute("aria-hidden", "true");
  createCarForm.reset();
  createCarForm.dataset.mode = "create";
  createCarForm.dataset.carId = "";
  clearCreateFormErrors();
  document.getElementById("create-car-title").textContent = "Додати авто";
  const submitButton = createCarForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = "Створити";
  }
}

async function handleCreateCar(event) {
  event.preventDefault();
  hideErrorBanner();
  clearCreateFormErrors();

  const payload = buildCarPayload();
  const errors = validateCarPayload(payload);

  if (Object.keys(errors).length > 0) {
    Object.entries(errors).forEach(([field, message]) => {
      setCreateFormError(field, message);
    });
    return;
  }

  const isEdit = createCarForm.dataset.mode === "edit";

  try {
    const requestUrl = isEdit
      ? `${API_URL}${createCarForm.dataset.carId}`
      : CREATE_API_URL;
    const requestMethod = isEdit ? "PATCH" : "POST";

    const response = await fetch(requestUrl, {
      method: requestMethod,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw { status: response.status };
    }

    closeCreateModal();
    hideErrorBanner();
    await loadCars();
  } catch (error) {
    console.error("Failed to save car:", error);
    handleApiError(
      error,
      isEdit ? "Не вдалося оновити авто" : "Не вдалося створити авто",
    );
  }
}

filtersForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.offset = 0;
  state.page = 1;
  loadCars();
});

prevPageBtn.addEventListener("click", () => {
  if (state.page <= 1) {
    return;
  }

  state.page -= 1;
  state.offset = Math.max(0, state.offset - LIMIT);
  loadCars();
});

nextPageBtn.addEventListener("click", () => {
  if (!state.hasNextPage) {
    return;
  }

  state.page += 1;
  state.offset += LIMIT;
  loadCars();
});

carsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const { action, id } = button.dataset;

  if (action === "edit") {
    openEditModal(id);
    return;
  }

  if (action === "delete") {
    const confirmed = window.confirm("Видалити це авто?");
    if (!confirmed) {
      return;
    }

    hideErrorBanner();

    try {
      const response = await fetch(`${API_URL}${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw { status: response.status };
      }

      const nextCars = state.currentCars.filter(
        (car) => String(car.id) !== String(id),
      );
      renderCars(nextCars);
      state.hasNextPage = nextCars.length === LIMIT;
      updatePaginationControls();
      hideErrorBanner();
    } catch (error) {
      console.error("Failed to delete car:", error);
      handleApiError(error, "Не вдалося видалити авто");
    }
  }
});

addCarBtn.addEventListener("click", openCreateModal);
closeModalBtn.addEventListener("click", closeCreateModal);
cancelCreateBtn.addEventListener("click", closeCreateModal);
createCarForm.addEventListener("submit", handleCreateCar);
createCarModal.addEventListener("click", (event) => {
  if (event.target.dataset.closeModal === "true") {
    closeCreateModal();
  }
});

updatePaginationControls();
loadCars();

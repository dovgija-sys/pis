// @ts-ignore -- Vite loads this stylesheet at runtime.
import "./scss/main.scss";

interface PortfolioAsset {
  symbol: string;
  name: string;
  weight: number;
}

interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
}

interface Portfolio {
  id: string;
  name: string;
  balance: number;
  change: number;
  invested: number;
  assets: PortfolioAsset[];
}

type ViewName = "dashboard" | "portfolios" | "editor";
type InputSelector =
  | "#asset-search"
  | "#portfolio-name"
  | "#principal"
  | "#annual-rate"
  | "#years"
  | "#asset-price"
  | "#share-quantity"
  | "#stop-loss"
  | "#contribution"
  | "#edit-contribution";

function element(selector: InputSelector, parent?: ParentNode): HTMLInputElement;
function element<T extends Element = HTMLElement>(
  selector: string,
  parent?: ParentNode,
): T;
function element<T extends Element = HTMLElement>(
  selector: string,
  parent: ParentNode = document,
): T {
  const found = parent.querySelector<T>(selector);
  if (!found) throw new Error(`Required page element not found: ${selector}`);
  return found;
}

function maybeElement<T extends Element = HTMLElement>(
  selector: string,
  parent: ParentNode,
): T | null {
  return parent.querySelector<T>(selector);
}

function elements<T extends Element = HTMLElement>(
  selector: string,
  parent: ParentNode = document,
): T[] {
  return Array.from(parent.querySelectorAll<T>(selector));
}

function requiredData(elementNode: HTMLElement, key: string): string {
  const value = elementNode.dataset[key];
  if (!value) throw new Error(`Required data-${key} attribute is missing.`);
  return value;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});
const storageKey = "invest-analytics-portfolios";
const assetDirectory: MarketAsset[] = [
  { symbol: "AAPL", name: "Apple Inc.", price: 210.1 },
  { symbol: "MSFT", name: "Microsoft Corp.", price: 425.22 },
  { symbol: "TSLA", name: "Tesla Inc.", price: 210.1 },
  { symbol: "GOOGL", name: "Alphabet Inc.", price: 176.82 },
  { symbol: "NVDA", name: "NVIDIA Corp.", price: 138.85 },
  { symbol: "AMZN", name: "Amazon.com Inc.", price: 186.49 },
];
const palettes = ["#4a422b", "#d9d5ca", "#328440", "#c6c3bc", "#9d8b63", "#a9c5a6"];
const defaultPortfolios: Portfolio[] = [
  {
    id: "main",
    name: "Основний портфель",
    balance: 24500,
    change: 5.3,
    invested: 23260,
    assets: [
      { symbol: "AAPL", name: "Apple Inc.", weight: 35 },
      { symbol: "MSFT", name: "Microsoft Corp.", weight: 25 },
      { symbol: "TSLA", name: "Tesla Inc.", weight: 20 },
      { symbol: "GOOGL", name: "Alphabet Inc.", weight: 10 },
      { symbol: "NVDA", name: "NVIDIA Corp.", weight: 10 },
    ],
  },
  {
    id: "tech",
    name: "Технологічний",
    balance: 12400,
    change: 8.1,
    invested: 11472,
    assets: [
      { symbol: "NVDA", name: "NVIDIA Corp.", weight: 45 },
      { symbol: "AAPL", name: "Apple Inc.", weight: 30 },
      { symbol: "MSFT", name: "Microsoft Corp.", weight: 25 },
    ],
  },
  {
    id: "dividend",
    name: "Дивідендний",
    balance: 8450,
    change: 2.4,
    invested: 8252,
    assets: [
      { symbol: "MSFT", name: "Microsoft Corp.", weight: 40 },
      { symbol: "GOOGL", name: "Alphabet Inc.", weight: 35 },
      { symbol: "AMZN", name: "Amazon.com Inc.", weight: 25 },
    ],
  },
];

function isPortfolioAsset(value: unknown): value is PortfolioAsset {
  if (!value || typeof value !== "object") return false;
  const asset = value as Record<string, unknown>;
  return typeof asset.symbol === "string" &&
    typeof asset.name === "string" &&
    typeof asset.weight === "number" &&
    Number.isFinite(asset.weight) &&
    asset.weight >= 0 &&
    asset.weight <= 100;
}

function isPortfolio(value: unknown): value is Portfolio {
  if (!value || typeof value !== "object") return false;
  const portfolio = value as Record<string, unknown>;
  if (
    typeof portfolio.id !== "string" ||
    typeof portfolio.name !== "string" ||
    typeof portfolio.balance !== "number" ||
    !Number.isFinite(portfolio.balance) ||
    portfolio.balance < 0 ||
    typeof portfolio.invested !== "number" ||
    !Number.isFinite(portfolio.invested) ||
    portfolio.invested < 0 ||
    typeof portfolio.change !== "number" ||
    !Number.isFinite(portfolio.change) ||
    !Array.isArray(portfolio.assets) ||
    portfolio.assets.length === 0 ||
    !portfolio.assets.every(isPortfolioAsset)
  ) {
    return false;
  }
  const totalWeight = portfolio.assets.reduce(
    (total: number, asset: PortfolioAsset) => total + asset.weight,
    0,
  );
  return Math.abs(totalWeight - 100) < 0.01;
}

function setAppStatus(message: string, isError = false): void {
  const status = element("#app-status");
  status.textContent = message;
  status.classList.toggle("app-status--error", isError);
  status.hidden = !message;
}

function loadPortfolios(): Portfolio[] {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return structuredClone(defaultPortfolios);
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isPortfolio)) {
      throw new Error("Stored portfolio data does not match the application schema.");
    }
    return parsed;
  } catch (error) {
    console.error("Unable to load saved portfolios.", error);
    setAppStatus("Не вдалося завантажити збережені портфелі. Показано демонстраційні дані.", true);
    return structuredClone(defaultPortfolios);
  }
}

function persistPortfolios(): boolean {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(portfolios));
    return true;
  } catch (error) {
    console.error("Unable to save portfolios to local storage.", error);
    setAppStatus("Зміни залишилися на цій сторінці, але браузер не зміг їх зберегти.", true);
    return false;
  }
}

const portfolios = loadPortfolios();
const views = elements<HTMLElement>("[data-view]");
const navigation = element("#main-navigation");
const menuToggle = element(".menu-toggle");
const portfolioOptions = element(".portfolio-options");
const editorAssets = element("#editor-assets");
const assetSearch = element("#asset-search");
const suggestions = element("#asset-suggestions");
let selectedPortfolioId = portfolios[0].id;
let createNewPortfolio = true;
let customPortfolioNumber = portfolios.reduce((nextNumber, portfolio) => {
  const match = /^custom-(\d+)$/.exec(portfolio.id);
  return match ? Math.max(nextNumber, Number(match[1]) + 1) : nextNumber;
}, 1);
let editingOriginalAssets: PortfolioAsset[] = [];
let pendingEditContribution = 0;
let chartRange: "1m" | "6m" | "1y" = "6m";

function showView(viewName: ViewName, updateHistory = true) {
  for (const view of views) view.hidden = view.dataset.view !== viewName;
  for (const link of elements("#main-navigation [data-view-link]")) {
    const active = link.dataset.viewLink === viewName;
    link.classList.toggle("nav-link--active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  navigation?.classList.remove("is-open");
  menuToggle?.setAttribute("aria-expanded", "false");
  menuToggle?.setAttribute("aria-label", "Відкрити меню");
  if (updateHistory && window.location.hash !== `#${viewName}`) {
    window.history.pushState({ view: viewName }, "", `#${viewName}`);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function money(value: number): string {
  return currency.format(value);
}

function renderPortfolioOptions() {
  portfolioOptions.replaceChildren();
  for (const portfolio of portfolios) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `portfolio-option${portfolio.id === selectedPortfolioId ? " is-selected" : ""}`;
    button.dataset.selectPortfolio = portfolio.id;
    const name = document.createElement("span");
    name.className = "portfolio-option-name";
    name.textContent = portfolio.name;
    const balance = document.createElement("span");
    balance.className = "portfolio-option-balance";
    balance.textContent = money(portfolio.balance);
    const change = document.createElement("span");
    change.className = "portfolio-option-change";
    change.textContent = `${portfolio.change >= 0 ? "+" : ""}${portfolio.change.toFixed(1)}%`;
    button.append(name, balance, change);
    portfolioOptions.append(button);
  }
}

function selectedPortfolio(): Portfolio {
  const portfolio = portfolios.find((item) => item.id === selectedPortfolioId);
  if (!portfolio) throw new Error(`Selected portfolio not found: ${selectedPortfolioId}`);
  return portfolio;
}

function renderPortfolioChart(portfolio: Portfolio): void {
  const labelsByRange = {
    "1m": ["1 тиж", "2 тиж", "3 тиж", "4 тиж"],
    "6m": ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер", "Лип", "Сер"],
    "1y": ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер", "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"],
  };
  const labels = labelsByRange[chartRange];
  const periodCount = labels.length;
  const growth = portfolio.change / 100;
  const initialValue = portfolio.balance / Math.max(0.01, 1 + growth);
  const values = labels.map((_, index) => {
    const progress = index / Math.max(1, periodCount - 1);
    const fluctuation = Math.sin(index * 2.1 + portfolio.balance / 1000) * portfolio.balance * 0.018;
    return initialValue + (portfolio.balance - initialValue) * progress + fluctuation;
  });
  const minimum = Math.min(...values);
  const valueRange = Math.max(...values) - minimum || 1;
  const points = values.map((value, index) => {
    const x = index / Math.max(1, periodCount - 1) * 760;
    const y = 166 - (value - minimum) / valueRange * 140;
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  const line = `M${points.join(" L")}`;
  element<SVGPathElement>("#portfolio-chart-line").setAttribute("d", line);
  element<SVGPathElement>("#portfolio-chart-fill").setAttribute("d", `${line} L760 190 L0 190 Z`);
  const axis = element(".portfolio-chart .chart-axis");
  axis.replaceChildren(...labels.map((labelText) => {
    const label = document.createElement("span");
    label.textContent = labelText;
    return label;
  }));
}

function renderPortfolioDetails() {
  const portfolio = selectedPortfolio();
  selectedPortfolioId = portfolio.id;
  element("#selected-portfolio-title").textContent = portfolio.name;
  element("#selected-portfolio-balance").textContent = money(portfolio.balance);
  const portfolioProfit = portfolio.balance - portfolio.invested;
  element("#selected-portfolio-change").textContent =
    `${portfolioProfit >= 0 ? "+" : "−"}${money(Math.abs(portfolioProfit))} (${portfolio.change.toFixed(1)}% за цей час)`;
  element("#allocation-total").textContent =
    `${(portfolio.balance / 1000).toFixed(1)}k`;

  let cumulative = 0;
  const segments = portfolio.assets.map((asset, index) => {
    const start = cumulative;
    cumulative += asset.weight;
    return `${palettes[index % palettes.length]} ${start}% ${cumulative}%`;
  });
  element("#allocation-chart").style.background =
    `radial-gradient(closest-side, #fff 68%, transparent 69%), conic-gradient(${segments.join(", ")})`;
  renderPortfolioChart(portfolio);

  const legend = element("#allocation-legend");
  legend.replaceChildren();
  for (const [index, asset] of portfolio.assets.entries()) {
    const row = document.createElement("li");
    row.className = "allocation-row";
    const swatch = document.createElement("span");
    swatch.className = "allocation-color";
    swatch.style.backgroundColor = palettes[index % palettes.length];
    const label = document.createElement("strong");
    label.textContent = `${asset.symbol} (${asset.name})`;
    const weight = document.createElement("span");
    weight.textContent = `${asset.weight.toFixed(1)}%`;
    const value = document.createElement("span");
    value.className = "allocation-value";
    value.textContent = money(portfolio.balance * asset.weight / 100);
    row.append(swatch, label, weight, value);
    legend.append(row);
  }
  renderPortfolioOptions();
  renderRiskAssetOptions();
}

function renderDashboard() {
  const total = portfolios.reduce((sum, portfolio) => sum + portfolio.balance, 0);
  const invested = portfolios.reduce((sum, portfolio) => sum + portfolio.invested, 0);
  const profit = total - invested;
  const rate = invested > 0 ? profit / invested * 100 : 0;
  const sign = profit >= 0 ? "+" : "−";
  element("#home-balance").textContent = money(total);
  const growth = element("#home-growth");
  growth.textContent = `${sign}${money(Math.abs(profit))} (${sign}${rate.toFixed(1)}%)`;
  growth.classList.toggle("negative-growth", profit < 0);
  const portfolio = selectedPortfolio();
  element("#home-feature-name").textContent = portfolio.name;
  element("#home-feature-value").textContent =
    `${money(portfolio.balance)} (${portfolio.change >= 0 ? "+" : ""}${portfolio.change.toFixed(1)}%)`;
}

function renderRiskAssetOptions(updatePrice = false): void {
  const select = element<HTMLSelectElement>("#risk-asset");
  const editing = element("#view-editor").classList.contains("is-editing");
  const assets = editing || createNewPortfolio
    ? readEditorAssets()
    : selectedPortfolio().assets;
  const previousSymbol = select.value;
  const availableAssets = assets.length ? assets : assetDirectory.map((asset) => ({
    symbol: asset.symbol,
    name: asset.name,
    weight: 0,
  }));
  select.replaceChildren(...availableAssets.map((asset) => {
    const option = document.createElement("option");
    option.value = asset.symbol;
    option.textContent = `${asset.symbol} — ${asset.name}`;
    return option;
  }));
  const selectedSymbol = availableAssets.some((asset) => asset.symbol === previousSymbol)
    ? previousSymbol
    : availableAssets[0].symbol;
  select.value = selectedSymbol;
  if (updatePrice || selectedSymbol !== previousSymbol) {
    const marketAsset = assetDirectory.find((asset) => asset.symbol === selectedSymbol);
    if (marketAsset) {
      element("#asset-price").value = marketAsset.price.toFixed(2);
      element("#stop-loss").value = (marketAsset.price * 0.9).toFixed(2);
      updateRisk();
    }
  }
}

function buildAssetRow(asset: PortfolioAsset) {
  const row = document.createElement("li");
  row.className = "asset-row";
  row.dataset.symbol = asset.symbol;
  row.dataset.weight = String(asset.weight);
  const symbol = document.createElement("span");
  symbol.className = "asset-symbol";
  symbol.textContent = asset.symbol;
  const name = document.createElement("span");
  name.className = "asset-company";
  name.textContent = asset.name;
  const weight = document.createElement("span");
  weight.className = "asset-weight";
  weight.textContent = `${asset.weight}%`;
  const remove = document.createElement("button");
  remove.className = "text-button";
  remove.type = "button";
  remove.dataset.removeAsset = asset.symbol;
  remove.setAttribute("aria-label", `Видалити ${asset.symbol}`);
  remove.textContent = "Видалити";
  row.append(symbol, name, weight, remove);
  return row;
}

function readEditorAssets(): PortfolioAsset[] {
  return elements<HTMLElement>(".asset-row", editorAssets).map((row) => {
    const symbol = row.dataset.symbol;
    const weight = Number(row.dataset.weight);
    if (!symbol || !Number.isFinite(weight) || weight < 0 || weight > 100) {
      throw new Error("An editor asset has invalid symbol or allocation data.");
    }
    const marketAsset = assetDirectory.find((asset) => asset.symbol === symbol);
    return { symbol, name: marketAsset?.name ?? symbol, weight };
  });
}

function updateEditorWeights() {
  const rows = [...elements<HTMLElement>(".asset-row", editorAssets)];
  if (!rows.length) return;
  const weight = Math.floor(100 / rows.length);
  let remaining = 100;
  rows.forEach((row, index) => {
    const currentWeight = index === rows.length - 1 ? remaining : weight;
    remaining -= currentWeight;
    row.dataset.weight = String(currentWeight);
    element(".asset-weight", row).textContent = `${currentWeight}%`;
  });
}

function updateNormalizedWeights() {
  const rows = [...elements<HTMLElement>(".asset-row", editorAssets)];
  if (!rows.length) return;
  const currentTotal = rows.reduce((total, row) => total + Number(row.dataset.weight), 0);
  if (currentTotal <= 0) return updateEditorWeights();
  const normalized = rows.map((row) => {
    const exactWeight = Number(row.dataset.weight) / currentTotal * 100;
    return { row, weight: Math.floor(exactWeight), remainder: exactWeight % 1 };
  });
  let remaining = 100 - normalized.reduce((total, item) => total + item.weight, 0);
  for (const item of [...normalized].sort((a, b) => b.remainder - a.remainder)) {
    if (remaining <= 0) break;
    item.weight += 1;
    remaining -= 1;
  }
  for (const item of normalized) {
    item.row.dataset.weight = String(item.weight);
    element(".asset-weight", item.row).textContent = `${item.weight}%`;
  }
}

function updatePurchaseWeights(newAsset: MarketAsset) {
  const rows = [...elements<HTMLElement>(".asset-row", editorAssets)];
  if (!rows.length) {
    editorAssets.append(buildAssetRow({ ...newAsset, weight: 100 }));
    return;
  }

  const currentTotal = rows.reduce((total, row) => total + Number(row.dataset.weight), 0);
  if (currentTotal <= 0) {
    updateEditorWeights();
    return updatePurchaseWeights(newAsset);
  }

  const targetExistingWeight = 90;
  const scaledWeights = rows.map((row) => {
    const exactWeight = Number(row.dataset.weight) / currentTotal * targetExistingWeight;
    return { row, weight: Math.floor(exactWeight), remainder: exactWeight % 1 };
  });
  let remaining = targetExistingWeight - scaledWeights.reduce((total, item) => total + item.weight, 0);
  for (const item of [...scaledWeights].sort((a, b) => b.remainder - a.remainder)) {
    if (remaining <= 0) break;
    item.weight += 1;
    remaining -= 1;
  }
  for (const item of scaledWeights) {
    item.row.dataset.weight = String(item.weight);
    element(".asset-weight", item.row).textContent = `${item.weight}%`;
  }
  editorAssets.append(buildAssetRow({ ...newAsset, weight: 10 }));
  updateDashboardBuySummary(newAsset);
}

function updateDashboardBuySummary(asset: MarketAsset) {
  const result = element("#buy-distribution-result");
  result.classList.remove("distribution-result--error");
  result.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = `Додано ${asset.symbol} (10% портфеля):`;
  const breakdown = document.createElement("span");
  breakdown.textContent = `Частки інших акцій пропорційно зменшено. ${[...elements<HTMLElement>(".asset-row", editorAssets)]
    .map((row) => `${row.dataset.symbol} (${row.dataset.weight}%)`)
    .join(" · ")}`;
  result.append(title, breakdown);
}

function markEditDistributionDirty(): void {
  const isEditing = element("#view-editor").classList.contains("is-editing");
  const isAllocation = element<HTMLInputElement>('input[name="portfolio-strategy"]:checked').value === "allocate";
  if (!isEditing || !isAllocation) return;
  pendingEditContribution = 0;
  const result = element("#edit-distribution-result");
  result.classList.remove("distribution-result--error");
  result.textContent = "Склад активів змінено. Натисніть «Розподілити» перед збереженням.";
}

function setEditStrategy(strategy: "allocate" | "buy") {
  const isAllocation = strategy === "allocate";
  const isEditing = element("#view-editor").classList.contains("is-editing");
  element("#edit-allocation").hidden = !isEditing || !isAllocation;
  element("#asset-search-block").hidden = isEditing && isAllocation;
  element("#edit-buy-result").hidden = !isEditing || isAllocation;
  element("#asset-search").value = "";
  suggestions.hidden = true;
  pendingEditContribution = 0;
  element("#edit-contribution").value = "0";

  if (isEditing) editorAssets.replaceChildren(...editingOriginalAssets.map(buildAssetRow));
  const allocationResult = element("#edit-distribution-result");
  allocationResult.classList.remove("distribution-result--error");
  allocationResult.textContent = requiredData(allocationResult, "empty");
  element("#buy-distribution-result").textContent =
    "Оберіть акцію, щоб розподілити частки портфеля.";
  elements(".strategy-option").forEach((option) => {
    const input = element<HTMLInputElement>("input", option);
    const selected = input.value === strategy;
    option.classList.toggle("is-selected", selected);
    input.checked = selected;
  });
  if (isEditing) {
    const portfolio = selectedPortfolio();
    element("#principal").value = String(portfolio.balance);
    updateForecast();
    element("#asset-list-title").textContent = isAllocation
      ? "Наявні активи у портфелі:"
      : "Актуальний склад портфеля:";
    element("#buy-distribution-result").classList.remove("distribution-result--error");
    if (isAllocation) {
      element("#buy-distribution-result").textContent =
        "Оберіть акцію, щоб розподілити частки портфеля.";
    }
    renderRiskAssetOptions();
  }
}

function renderSuggestions() {
  const query = assetSearch.value.trim().toLowerCase();
  suggestions.replaceChildren();
  if (!query) {
    suggestions.hidden = true;
    return;
  }
  const existing = new Set([...elements<HTMLElement>(".asset-row", editorAssets)].map((row) => row.dataset.symbol));
  const searchResults = assetDirectory.filter((asset) =>
    asset.symbol.toLowerCase().includes(query) || asset.name.toLowerCase().includes(query),
  );
  const matches = searchResults.filter((asset) => !existing.has(asset.symbol));
  for (const asset of matches) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "suggestion-option";
    option.setAttribute("role", "option");
    option.dataset.addSymbol = asset.symbol;
    const identity = document.createElement("span");
    const symbol = document.createElement("strong");
    symbol.textContent = asset.symbol;
    identity.append(symbol, document.createTextNode(` · ${asset.name}`));
    const price = document.createElement("span");
    price.textContent = money(asset.price);
    const addLabel = document.createElement("span");
    addLabel.className = "suggestion-add";
    addLabel.textContent = "+ Додати";
    option.append(identity, price, addLabel);
    suggestions.append(option);
  }
  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "suggestion-empty";
    empty.textContent = searchResults.length
      ? "Ця акція вже є у портфелі."
      : "Акцій за цим запитом не знайдено.";
    suggestions.append(empty);
  }
  suggestions.hidden = false;
}

function addAsset(symbol: string) {
  const asset = assetDirectory.find((item) => item.symbol === symbol);
  const exists = [...elements<HTMLElement>(".asset-row", editorAssets)]
    .some((row) => row.dataset.symbol === symbol);
  if (!asset || exists) return;
  const isEditingPurchase = element("#view-editor").classList.contains("is-editing") &&
    element<HTMLInputElement>('input[name="portfolio-strategy"]:checked').value === "buy";
  if (isEditingPurchase) {
    updatePurchaseWeights(asset);
  } else {
    editorAssets.append(buildAssetRow({ ...asset, weight: 0 }));
    updateEditorWeights();
  }
  markEditDistributionDirty();
  renderRiskAssetOptions();
  assetSearch.value = "";
  suggestions.hidden = true;
}

function updateForecast() {
  const principal = Number(element("#principal").value);
  const rate = Number(element("#annual-rate").value) / 100;
  const years = Number(element("#years").value);
  const total = element("#forecast-total");
  const profit = element("#forecast-profit");
  const valid = Number.isFinite(principal) && principal >= 0 &&
    Number.isFinite(rate) && rate >= 0 && rate <= 1 &&
    Number.isInteger(years) && years >= 1 && years <= 50;

  if (!valid) {
    total.textContent = "Перевірте дані";
    profit.textContent = "Ставка: 0–100%, строк: 1–50 років.";
    element("#home-forecast-result").textContent = "Перевірте параметри прогнозу";
    return;
  }
  const values = Array.from({ length: years + 1 }, (_, year) => principal * (1 + rate) ** year);
  const max = Math.max(values[years], 1);
  const points = values.map((value, index) => {
    const x = (index / years) * 760;
    const y = 176 - (value / max) * 150;
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  const line = `M${points.join(" L")}`;
  element("#forecast-chart-line").setAttribute("d", line);
  element("#forecast-chart-fill").setAttribute("d", `${line} L760 190 L0 190 Z`);
  const axis = element("#forecast-axis");
  axis.replaceChildren();
  for (let year = 1; year <= years; year += 1) {
    const label = document.createElement("span");
    label.textContent = `Рік ${year}`;
    axis.append(label);
  }
  total.textContent = money(values[years]);
  const forecastProfit = values[years] - principal;
  const profitSign = forecastProfit >= 0 ? "+" : "−";
  profit.textContent = `(${profitSign}${money(Math.abs(forecastProfit))} прибутку)`;
  element("#home-forecast-result").textContent =
    `${profitSign}${money(Math.abs(forecastProfit))} прибутку`;
}

function updateRisk() {
  const price = Number(element("#asset-price").value);
  const quantity = Number(element("#share-quantity").value);
  const stop = Number(element("#stop-loss").value);
  const loss = element("#risk-loss");
  const formula = element("#risk-formula");
  const warning = element("#risk-warning");
  const symbol = element<HTMLSelectElement>("#risk-asset").value;
  const valid = Number.isFinite(price) && price > 0 &&
    Number.isInteger(quantity) && quantity > 0 &&
    Number.isFinite(stop) && stop > 0 && stop < price;

  if (!valid) {
    loss.textContent = "—";
    formula.textContent = "Вкажіть ціну, кількість та Stop Loss нижче ціни акції.";
    warning.classList.add("risk-warning--error");
    element("#risk-warning-title").textContent = "Перевірте параметри ризику";
    element("#risk-warning-message").textContent =
      "Stop Loss має бути додатним числом і нижчим за поточну ціну акції.";
    element("#home-risk-result").textContent = "Перевірте параметри Stop Loss";
    return;
  }
  const potentialLoss = (price - stop) * quantity;
  loss.textContent = `-${money(potentialLoss)}`;
  formula.textContent =
    `${symbol}: (${money(price)} − ${money(stop)}) × ${quantity} акцій`;
  element("#home-risk-result").textContent = `-${money(potentialLoss)} збитку`;
  const riskPercent = ((price - stop) / price) * 100;
  const highRisk = riskPercent >= 10;
  warning.classList.toggle("risk-warning--error", highRisk);
  element("#risk-warning-title").textContent = highRisk
    ? "Зверніть увагу на рівень ризику"
    : "Волатильність у межах норми";
  element("#risk-warning-message").textContent = highRisk
    ? `Stop Loss нижчий за ціну акції на ${riskPercent.toFixed(1)}%.`
    : "Stop Loss встановлено менш ніж на 10% нижче ціни купівлі.";
  if (element("#view-editor").classList.contains("is-editing")) {
    element("#risk-warning-title").textContent =
      highRisk ? "Високий ризик волатильності" : "Попередження про волатильність";
  }
}

function startNewPortfolio() {
  createNewPortfolio = true;
  editingOriginalAssets = [];
  pendingEditContribution = 0;
  element("#view-editor").classList.remove("is-editing");
  element("#editor-title").textContent = "Створення інвестиційного портфеля";
  element("#editor-page-description").textContent =
    "Задайте параметри, розподіліть кошти та перевірте прогнози прибутку і ризиків.";
  element("#editor-form-title").textContent = "Параметри портфеля та активи";
  element("#edit-strategy").hidden = true;
  element("#create-distribution").hidden = false;
  element("#asset-search-label").textContent = "Пошук акції (автодоповнення)";
  element("#asset-list-title").textContent = "Обрані активи";
  element("#asset-search-help").textContent = "Пошук за тикером або назвою компанії.";
  setEditStrategy("allocate");
  element("#forecast-title").textContent = "Складний відсоток за розподілом";
  element("#forecast-description").textContent =
    "Сума майбутнього капіталу з урахуванням початкових інвестицій та річної ставки.";
  element("#risk-title").textContent = "Розрахунок ризиків (Stop Loss)";
  element("#risk-description").textContent =
    "Розрахунок потенційного збитку для заданої ціни, кількості акцій та рівня Stop Loss.";
  element("#portfolio-name").value = "Зелений енерго-технологічний";
  element("#principal").value = "15000";
  element("#annual-rate").value = "14";
  element("#years").value = "5";
  editorAssets.replaceChildren(
    buildAssetRow({ symbol: "AAPL", name: "Apple Inc.", weight: 40 }),
    buildAssetRow({ symbol: "TSLA", name: "Tesla Inc.", weight: 35 }),
    buildAssetRow({ symbol: "NVDA", name: "NVIDIA Corp.", weight: 25 }),
  );
  renderRiskAssetOptions(true);
  element("#contribution").value = "15000";
  element("#distribution-result").textContent =
    "Вкажіть активи та розподіліть внесок пропорційно до їхніх часток.";
  element("#edit-contribution").value = "0";
  element("#edit-distribution-result").textContent =
    requiredData(element("#edit-distribution-result"), "empty");
  element("#buy-distribution-result").textContent =
    "Оберіть акцію, щоб розподілити частки портфеля.";
  element("#save-portfolio").textContent = "Зберегти портфель";
  element("#save-status").textContent = "";
  element("#save-status").classList.remove("form-status--error");
  updateForecast();
  updateRisk();
  showView("editor");
}

function editSelectedPortfolio() {
  const portfolio = selectedPortfolio();
  createNewPortfolio = false;
  element("#view-editor").classList.add("is-editing");
  element("#editor-title").textContent = `Редагування портфеля: «${portfolio.name}»`;
  element("#editor-page-description").textContent =
    "Змініть параметри, додайте нові акції, перерозподіліть кошти та оновіть рівні ризику.";
  element("#editor-form-title").textContent = "1. Налаштування та стратегія";
  element("#edit-strategy").hidden = false;
  element("#create-distribution").hidden = true;
  element("#asset-search-label").textContent =
    "Оберіть акцію для докупівлі (автодоповнення):";
  element("#asset-list-title").textContent = "Актуальний склад портфеля:";
  element("#asset-search-help").textContent =
    "Виберіть акцію зі списку та додайте її до портфеля.";
  element("#forecast-title").textContent = "Оновлений складний відсоток";
  element("#forecast-description").textContent =
    "Ставка та строк розраховані на основі історії акцій у вашому портфелі.";
  element("#risk-title").textContent = "Скрипт 2: Розрахунок ризиків (Stop Loss)";
  element("#risk-description").textContent =
    "Різниця між ціною та Stop Loss, помножена на кількість акцій.";
  element("#portfolio-name").value = portfolio.name;
  editingOriginalAssets = portfolio.assets.map((asset) => ({ ...asset }));
  element("#edit-contribution").value = "0";
  element("#edit-distribution-result").textContent =
    requiredData(element("#edit-distribution-result"), "empty");
  element("#principal").value = String(portfolio.balance);
  element("#annual-rate").value = "12";
  element("#years").value = "5";
  element("#forecast-total").textContent = money(portfolio.balance * 1.12 ** 5);
  element("#forecast-profit").textContent =
    `(+${money(portfolio.balance * 1.12 ** 5 - portfolio.balance)} прибутку)`;
  setEditStrategy("allocate");
  updateForecast();
  updateRisk();
  element("#save-portfolio").textContent = "Зберегти зміни у портфелі";
  element("#save-status").textContent = "";
  showView("editor");
}

for (const link of elements("[data-view-link]")) {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    if (link.dataset.viewLink === "editor") startNewPortfolio();
    else if (link.dataset.viewLink === "dashboard" || link.dataset.viewLink === "portfolios") {
      showView(link.dataset.viewLink);
    }
  });
}
elements("[data-open-view]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.hasAttribute("data-new-portfolio")) startNewPortfolio();
    else if (button.hasAttribute("data-edit-portfolio")) editSelectedPortfolio();
    else if (button.dataset.openView === "dashboard" || button.dataset.openView === "portfolios") {
      showView(button.dataset.openView);
    }
  });
});
menuToggle?.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
  navigation.classList.toggle("is-open", open);
});
const profileButton = element<HTMLButtonElement>(".user-avatar");
const profilePopover = element("#profile-popover");
profileButton.addEventListener("click", () => {
  const open = profileButton.getAttribute("aria-expanded") !== "true";
  profileButton.setAttribute("aria-expanded", String(open));
  profilePopover.hidden = !open;
});
document.addEventListener("click", (event) => {
  if (!(event.target instanceof Node)) return;
  if (!profileButton.contains(event.target) && !profilePopover.contains(event.target)) {
    profileButton.setAttribute("aria-expanded", "false");
    profilePopover.hidden = true;
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && profileButton.getAttribute("aria-expanded") === "true") {
    profileButton.setAttribute("aria-expanded", "false");
    profilePopover.hidden = true;
    profileButton.focus();
  }
  if (event.key === "Escape" && menuToggle?.getAttribute("aria-expanded") === "true") {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Відкрити меню");
    navigation.classList.remove("is-open");
    menuToggle.focus();
  }
});
elements<HTMLButtonElement>("[data-chart-range]").forEach((button) => {
  button.addEventListener("click", () => {
    const range = button.dataset.chartRange;
    if (range !== "1m" && range !== "6m" && range !== "1y") return;
    chartRange = range;
    elements("[data-chart-range]").forEach((option) => {
      const active = option === button;
      option.classList.toggle("is-active", active);
      option.setAttribute("aria-pressed", String(active));
    });
    renderPortfolioChart(selectedPortfolio());
  });
});
element<HTMLSelectElement>("#risk-asset").addEventListener("change", (event) => {
  const selectedSymbol = (event.currentTarget as HTMLSelectElement).value;
  const asset = assetDirectory.find((item) => item.symbol === selectedSymbol);
  if (asset) {
    element("#asset-price").value = asset.price.toFixed(2);
    element("#stop-loss").value = (asset.price * 0.9).toFixed(2);
  }
  updateRisk();
});
element("[data-delete-portfolio]").addEventListener("click", () => {
  const portfolio = selectedPortfolio();
  if (portfolios.length === 1) {
    setAppStatus("У портфелі має залишитися хоча б один запис.", true);
    return;
  }
  if (!window.confirm(`Видалити портфель «${portfolio.name}»? Цю дію не можна скасувати.`)) return;
  portfolios.splice(portfolios.findIndex((item) => item.id === portfolio.id), 1);
  selectedPortfolioId = portfolios[0].id;
  renderPortfolioDetails();
  renderDashboard();
  const saved = persistPortfolios();
  if (saved) setAppStatus(`Портфель «${portfolio.name}» видалено.`);
});

function syncViewFromLocation(): void {
  const route = window.location.hash.slice(1);
  if (route === "portfolios") showView("portfolios", false);
  else if (route === "editor" || route === "analytics") showView("editor", false);
  else showView("dashboard", false);
}

window.addEventListener("hashchange", syncViewFromLocation);
portfolioOptions.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest<HTMLElement>("[data-select-portfolio]");
  if (!button) return;
  const portfolioId = button.dataset.selectPortfolio;
  if (!portfolioId) return;
  selectedPortfolioId = portfolioId;
  renderPortfolioDetails();
  renderDashboard();
});
editorAssets.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest<HTMLElement>("[data-remove-asset]");
  if (!button) return;
  const row = button.closest(".asset-row");
  if (!row) return;
  row.remove();
  const isEditingPurchase = element("#view-editor").classList.contains("is-editing") &&
    element<HTMLInputElement>('input[name="portfolio-strategy"]:checked').value === "buy";
  if (isEditingPurchase) updateNormalizedWeights();
  else updateEditorWeights();
  markEditDistributionDirty();
  renderRiskAssetOptions();
});
assetSearch.addEventListener("input", renderSuggestions);
assetSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    const first = maybeElement<HTMLElement>("[data-add-symbol]", suggestions);
    if (first?.dataset.addSymbol) addAsset(first.dataset.addSymbol);
  }
  if (event.key === "Escape") suggestions.hidden = true;
});
suggestions.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const option = event.target.closest<HTMLElement>("[data-add-symbol]");
  if (option?.dataset.addSymbol) addAsset(option.dataset.addSymbol);
});
element("#edit-strategy").addEventListener("change", (event) => {
  if (!(event.target instanceof Element)) return;
  const selected = event.target.closest<HTMLElement>(".strategy-option");
  if (!selected) return;
  const input = element<HTMLInputElement>("input", selected);
  setEditStrategy(input.value === "buy" ? "buy" : "allocate");
});
element("#add-asset").addEventListener("click", () => {
  const first = maybeElement<HTMLElement>("[data-add-symbol]", suggestions);
  if (first?.dataset.addSymbol) addAsset(first.dataset.addSymbol);
  else renderSuggestions();
});
element("#distribute-money").addEventListener("click", () => {
  const contribution = Number(element("#contribution").value);
  const assets = [...elements<HTMLElement>(".asset-row", editorAssets)];
  const output = element("#distribution-result");
  if (!Number.isFinite(contribution) || contribution <= 0 || !assets.length) {
    output.textContent = "Вкажіть суму більше нуля та додайте хоча б один актив.";
    output.classList.add("distribution-result--error");
    return;
  }
  output.classList.remove("distribution-result--error");
  output.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = `Суму ${money(contribution)} розподілено:`;
  const list = document.createElement("span");
  list.textContent = assets.map((row) =>
    `${row.dataset.symbol} (${row.dataset.weight}%): ${money(contribution * Number(row.dataset.weight) / 100)}`,
  ).join(" · ");
  output.append(title, list);
  element("#principal").value = String(contribution);
  updateForecast();
});
element("#contribution").addEventListener("input", () => {
  element("#principal").value = element("#contribution").value;
  updateForecast();
});

element("#distribute-edit").addEventListener("click", () => {
  const contribution = Number(element("#edit-contribution").value);
  const rows = [...elements<HTMLElement>(".asset-row", editorAssets)];
  const output = element("#edit-distribution-result");
  const weightTotal = rows.reduce((total, row) => total + Number(row.dataset.weight), 0);
  if (!Number.isFinite(contribution) || contribution <= 0 || !rows.length || weightTotal !== 100) {
    pendingEditContribution = 0;
    output.textContent = "Вкажіть суму більше нуля та перевірте частки активів.";
    output.classList.add("distribution-result--error");
    return;
  }

  pendingEditContribution = contribution;
  output.classList.remove("distribution-result--error");
  output.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = "Результат пропорційного розподілу суми:";
  const breakdown = document.createElement("span");
  breakdown.textContent = rows.map((row) =>
    `${row.dataset.symbol}: +${money(contribution * Number(row.dataset.weight) / 100)}`,
  ).join(" · ");
  output.append(title, breakdown);

  const portfolio = portfolios.find((item) => item.id === selectedPortfolioId) ?? portfolios[0];
  element("#principal").value = String(portfolio.balance + contribution);
  updateForecast();
});
element("#edit-contribution").addEventListener("input", () => {
  pendingEditContribution = 0;
  const output = element("#edit-distribution-result");
  output.classList.remove("distribution-result--error");
  output.textContent = Number(element("#edit-contribution").value) > 0
    ? "Сума змінена. Натисніть «Розподілити» перед збереженням."
    : "Без додаткового внеску баланс портфеля не зміниться.";
});

for (const id of ["principal", "annual-rate", "years"]) {
  element(`#${id}`).addEventListener("input", updateForecast);
}
for (const id of ["asset-price", "share-quantity", "stop-loss"]) {
  element(`#${id}`).addEventListener("input", updateRisk);
}
element("#save-portfolio").addEventListener("click", () => {
  const name = element("#portfolio-name").value.trim();
  const assets = readEditorAssets();
  const status = element("#save-status");
  if (!name || !assets.length) {
    status.textContent = "Вкажіть назву портфеля та додайте хоча б один актив.";
    status.classList.add("form-status--error");
    return;
  }
  const totalWeight = assets.reduce((total, asset) => total + asset.weight, 0);
  if (Math.abs(totalWeight - 100) >= 0.01) {
    status.textContent = "Сумарна частка активів має дорівнювати 100%.";
    status.classList.add("form-status--error");
    return;
  }
  status.classList.remove("form-status--error");
  let savedPortfolioName = name;
  if (createNewPortfolio) {
    const initialBalance = Number(element("#contribution").value);
    if (!Number.isFinite(initialBalance) || initialBalance < 0) {
      status.textContent = "Внесок має бути числом не менше нуля.";
      status.classList.add("form-status--error");
      return;
    }
    const portfolio = {
      id: `custom-${customPortfolioNumber++}`,
      name,
      balance: initialBalance,
      invested: initialBalance,
      change: 0,
      assets,
    };
    portfolios.push(portfolio);
    selectedPortfolioId = portfolio.id;
    createNewPortfolio = false;
  } else {
    const portfolio = selectedPortfolio();
    if (element<HTMLInputElement>('input[name="portfolio-strategy"]:checked').value === "allocate") {
      const requestedContribution = Number(element("#edit-contribution").value);
      if (!Number.isFinite(requestedContribution) || requestedContribution < 0) {
        status.textContent = "Сума поповнення має бути числом не менше нуля.";
        status.classList.add("form-status--error");
        return;
      }
      if (requestedContribution > 0 && pendingEditContribution !== requestedContribution) {
        status.textContent = "Натисніть «Розподілити», щоб застосувати поповнення.";
        status.classList.add("form-status--error");
        return;
      }
      if (pendingEditContribution > 0) {
        portfolio.balance += pendingEditContribution;
        portfolio.invested += pendingEditContribution;
      }
    }
    portfolio.name = name;
    portfolio.assets = assets;
    portfolio.change = portfolio.invested > 0
      ? (portfolio.balance - portfolio.invested) / portfolio.invested * 100
      : 0;
    savedPortfolioName = portfolio.name;
  }
  const persisted = persistPortfolios();
  renderPortfolioDetails();
  renderDashboard();
  status.textContent = persisted
    ? "Портфель збережено."
    : "Портфель оновлено на цій сторінці, але не вдалося зберегти зміни у браузері.";
  status.classList.toggle("form-status--error", !persisted);
  setAppStatus(
    persisted
      ? `Портфель «${savedPortfolioName}» збережено.`
      : "Портфель оновлено на цій сторінці, але не вдалося зберегти його у браузері.",
    !persisted,
  );
  pendingEditContribution = 0;
  element("#editor-title").textContent = `Редагування портфеля: «${savedPortfolioName}»`;
  showView("portfolios");
});

element("#cancel-portfolio").addEventListener("click", () => {
  suggestions.hidden = true;
  element("#save-status").textContent = "";
  showView("portfolios");
});

renderPortfolioOptions();
renderPortfolioDetails();
renderDashboard();
updateForecast();
updateRisk();
syncViewFromLocation();

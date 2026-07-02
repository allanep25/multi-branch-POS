const DEFAULT_APP_SETTINGS = {
  taxEnabled: true,
  taxRate: 12,
  serviceFeeEnabled: false,
  serviceFeeRate: 0,
  receiptHeader: "",
  receiptFooter: "Thank you.",
  printerName: "Generic Bluetooth Thermal Printer",
  printerPaperWidth: "58",
  printerConnected: false,
  autoPrintEnabled: true,
};
const STORAGE_KEYS = {
  products: "cafecloud.products",
  sales: "cafecloud.sales",
  stores: "cafecloud.stores",
  activeStore: "cafecloud.activeStore",
  cashier: "cafecloud.cashier",
  recentProducts: "cafecloud.recentProducts",
  customers: "cafecloud.customers",
  employees: "cafecloud.employees",
  promotions: "cafecloud.promotions",
  appSettings: "cafecloud.appSettings",
};

const demoStores = [
  { id: "store-main", name: "Downtown Cafe", code: "DTC", location: "Main Street" },
  { id: "store-mall", name: "Mall Kiosk", code: "MLK", location: "City Mall" },
  { id: "store-campus", name: "Campus Brew", code: "CMP", location: "University Walk" },
];

const demoMenu = [
  createProduct("Americano", "COF-001", "Coffee", 95, { "store-main": 80, "store-mall": 45, "store-campus": 58 }, "Hot Coffee"),
  createProduct("Spanish Latte", "COF-002", "Coffee", 150, { "store-main": 60, "store-mall": 36, "store-campus": 42 }, "Iced Coffee"),
  createProduct("Cappuccino", "COF-003", "Coffee", 135, { "store-main": 54, "store-mall": 30, "store-campus": 38 }, "Hot Coffee"),
  createProduct("Matcha Latte", "TEA-101", "Tea", 165, { "store-main": 38, "store-mall": 24, "store-campus": 34 }, "Milk Tea"),
  createProduct("Iced Lemon Tea", "TEA-102", "Tea", 85, { "store-main": 70, "store-mall": 52, "store-campus": 61 }, "Fruit Tea"),
  createProduct("Croissant", "BAK-201", "Pastry", 120, { "store-main": 28, "store-mall": 18, "store-campus": 22 }, "Croissant"),
  createProduct("Blueberry Muffin", "BAK-202", "Pastry", 90, { "store-main": 34, "store-mall": 20, "store-campus": 26 }, "Muffin"),
  createProduct("Chicken Pesto Sandwich", "FD-301", "Meals", 210, { "store-main": 24, "store-mall": 16, "store-campus": 18 }, "Sandwich"),
  createProduct("Tuna Melt", "FD-302", "Meals", 185, { "store-main": 22, "store-mall": 14, "store-campus": 16 }, "Sandwich"),
  createProduct("Reusable Tumbler", "MR-401", "Merch", 390, { "store-main": 12, "store-mall": 8, "store-campus": 10 }, "Drinkware"),
];

const demoEmployees = [
  { id: "employee-admin", name: "Admin Owner", role: "admin", pin: "0000", status: "Active", storeId: "store-main" },
  { id: "employee-cashier", name: "Ava Smith", role: "cashier", pin: "1234", status: "Active", storeId: "store-main" },
  { id: "employee-manager", name: "Manager", role: "manager", pin: "9999", status: "Active", storeId: "store-main" },
];

const demoPromotions = [
  { id: "promo-none", name: "No discount", percent: 0, active: true },
  { id: "promo-staff", name: "Staff meal", percent: 5, active: true },
  { id: "promo-happy-hour", name: "Happy hour", percent: 10, active: true },
  { id: "promo-senior-pwd", name: "Senior / PWD", percent: 20, active: true },
];

let stores = load(STORAGE_KEYS.stores, demoStores);
let activeStoreId = load(STORAGE_KEYS.activeStore, stores[0]?.id);
let products = normalizeProducts(load(STORAGE_KEYS.products, demoMenu));
let sales = load(STORAGE_KEYS.sales, []);
let cashier = load(STORAGE_KEYS.cashier, null);
let customers = load(STORAGE_KEYS.customers, []);
let employees = load(STORAGE_KEYS.employees, demoEmployees);
ensureDefaultEmployees();
let promotions = load(STORAGE_KEYS.promotions, demoPromotions);
let appSettings = { ...DEFAULT_APP_SETTINGS, ...load(STORAGE_KEYS.appSettings, {}) };
let cart = [];
let activeCategory = "All";
let activeSubcategory = "All";
let selectedStockStoreId = activeStoreId;
let orderFilters = { date: "", payment: "All", status: "All" };
let recentProductIds = load(STORAGE_KEYS.recentProducts, []);
let backendMode = false;
let backendSaveTimer = null;
let isHydratingBackend = false;
let autoPrintAfterReceipt = false;
let activeTenderInput = null;
let discountApprovalGranted = false;
let cartStage = "order";

const els = {
  loginScreen: document.querySelector("#loginScreen"),
  loginForm: document.querySelector("#loginForm"),
  loginName: document.querySelector("#loginName"),
  loginPin: document.querySelector("#loginPin"),
  loginRole: document.querySelector("#loginRole"),
  sidebarToggle: document.querySelector("#sidebarToggle"),
  sidebarBackdrop: document.querySelector("#sidebarBackdrop"),
  searchToggle: document.querySelector("#searchToggle"),
  topbarSearch: document.querySelector("#topbarSearch"),
  currentUser: document.querySelector("#currentUser"),
  currentRole: document.querySelector("#currentRole"),
  topbarUser: document.querySelector("#topbarUser"),
  topbarRole: document.querySelector("#topbarRole"),
  logoutBtn: document.querySelector("#logoutBtn"),
  tabs: document.querySelectorAll(".nav-tab"),
  views: {
    register: document.querySelector("#registerView"),
    orders: document.querySelector("#ordersView"),
    customers: document.querySelector("#customersView"),
    inventory: document.querySelector("#inventoryView"),
    stock: document.querySelector("#stockView"),
    promotions: document.querySelector("#promotionsView"),
    sales: document.querySelector("#salesView"),
    stores: document.querySelector("#storesView"),
    employees: document.querySelector("#employeesView"),
    settings: document.querySelector("#settingsView"),
  },
  storeSelect: document.querySelector("#storeSelect"),
  registerStoreLabel: document.querySelector("#registerStoreLabel"),
  inventoryStoreLabel: document.querySelector("#inventoryStoreLabel"),
  salesStoreLabel: document.querySelector("#salesStoreLabel"),
  currentClock: document.querySelector("#currentClock"),
  productSearch: document.querySelector("#productSearch"),
  categoryTabs: document.querySelector("#categoryTabs"),
  subcategoryTabs: document.querySelector("#subcategoryTabs"),
  recentItems: document.querySelector("#recentItems"),
  productGrid: document.querySelector("#productGrid"),
  cartPanel: document.querySelector("#cartPanel"),
  cartOrderStep: document.querySelector("#cartOrderStep"),
  cartCheckoutStep: document.querySelector("#cartCheckoutStep"),
  cartItems: document.querySelector("#cartItems"),
  orderType: document.querySelector("#orderType"),
  customerName: document.querySelector("#customerName"),
  paymentMethod: document.querySelector("#paymentMethod"),
  paymentReference: document.querySelector("#paymentReference"),
  orderNote: document.querySelector("#orderNote"),
  cartPromoSelect: document.querySelector("#cartPromoSelect"),
  adjustmentTabs: document.querySelectorAll("[data-adjustment-tab]"),
  discountPanel: document.querySelector("#discountPanel"),
  promoPanel: document.querySelector("#promoPanel"),
  discountInput: document.querySelector("#discountInput"),
  cashInput: document.querySelector("#cashInput"),
  splitPaymentPanel: document.querySelector("#splitPaymentPanel"),
  splitCashInput: document.querySelector("#splitCashInput"),
  splitCardInput: document.querySelector("#splitCardInput"),
  splitGcashInput: document.querySelector("#splitGcashInput"),
  splitBankInput: document.querySelector("#splitBankInput"),
  paymentKeypad: document.querySelector("#paymentKeypad"),
  cashLabel: document.querySelector("#cashLabel"),
  subtotal: document.querySelector("#subtotal"),
  orderSubtotal: document.querySelector("#orderSubtotal"),
  taxRow: document.querySelector("#taxRow"),
  taxLabel: document.querySelector("#taxLabel"),
  tax: document.querySelector("#tax"),
  serviceFeeRow: document.querySelector("#serviceFeeRow"),
  serviceFeeLabel: document.querySelector("#serviceFeeLabel"),
  serviceFee: document.querySelector("#serviceFee"),
  total: document.querySelector("#total"),
  changeDue: document.querySelector("#changeDue"),
  checkoutBtn: document.querySelector("#checkoutBtn"),
  goCheckoutBtn: document.querySelector("#goCheckoutBtn"),
  backToOrderBtn: document.querySelector("#backToOrderBtn"),
  clearCartBtn: document.querySelector("#clearCartBtn"),
  productForm: document.querySelector("#productForm"),
  clearProductFormBtn: document.querySelector("#clearProductFormBtn"),
  inventoryTable: document.querySelector("#inventoryTable"),
  exportMenuCsvBtn: document.querySelector("#exportMenuCsvBtn"),
  exportMenuXlsxBtn: document.querySelector("#exportMenuXlsxBtn"),
  importMenuCsvInput: document.querySelector("#importMenuCsvInput"),
  productVariant: document.querySelector("#productVariant"),
  seedBtn: document.querySelector("#seedBtn"),
  grossSales: document.querySelector("#grossSales"),
  transactionCount: document.querySelector("#transactionCount"),
  averageOrder: document.querySelector("#averageOrder"),
  costOfGoods: document.querySelector("#costOfGoods"),
  grossProfit: document.querySelector("#grossProfit"),
  profitMargin: document.querySelector("#profitMargin"),
  shiftCashTotal: document.querySelector("#shiftCashTotal"),
  shiftDigitalTotal: document.querySelector("#shiftDigitalTotal"),
  shiftExceptionCount: document.querySelector("#shiftExceptionCount"),
  salesList: document.querySelector("#salesList"),
  exportBtn: document.querySelector("#exportBtn"),
  storeForm: document.querySelector("#storeForm"),
  storeGrid: document.querySelector("#storeGrid"),
  stockTable: document.querySelector("#stockTable"),
  stockBranchSelect: document.querySelector("#stockBranchSelect"),
  exportStockCsvBtn: document.querySelector("#exportStockCsvBtn"),
  exportStockXlsxBtn: document.querySelector("#exportStockXlsxBtn"),
  exportAllStockCsvBtn: document.querySelector("#exportAllStockCsvBtn"),
  importStockCsvInput: document.querySelector("#importStockCsvInput"),
  stockForm: document.querySelector("#stockForm"),
  stockProductId: document.querySelector("#stockProductId"),
  stockProductSelect: document.querySelector("#stockProductSelect"),
  stockQuantityInput: document.querySelector("#stockQuantityInput"),
  clearStockFormBtn: document.querySelector("#clearStockFormBtn"),
  stockNewItemForm: document.querySelector("#stockNewItemForm"),
  stockNewName: document.querySelector("#stockNewName"),
  stockNewSku: document.querySelector("#stockNewSku"),
  stockNewCategory: document.querySelector("#stockNewCategory"),
  stockNewPrice: document.querySelector("#stockNewPrice"),
  stockNewQty: document.querySelector("#stockNewQty"),
  stockedItemCount: document.querySelector("#stockedItemCount"),
  lowStockItemCount: document.querySelector("#lowStockItemCount"),
  soldOutItemCount: document.querySelector("#soldOutItemCount"),
  branchStatusList: document.querySelector("#branchStatusList"),
  lowStockAlert: document.querySelector("#lowStockAlert"),
  userAvatar: document.querySelector("#userAvatar"),
  topbarAvatar: document.querySelector("#topbarAvatar"),
  footerSales: document.querySelector("#footerSales"),
  footerOrders: document.querySelector("#footerOrders"),
  footerAverage: document.querySelector("#footerAverage"),
  dineInCount: document.querySelector("#dineInCount"),
  takeawayCount: document.querySelector("#takeawayCount"),
  deliveryCount: document.querySelector("#deliveryCount"),
  ordersList: document.querySelector("#ordersList"),
  orderDateFilter: document.querySelector("#orderDateFilter"),
  orderPaymentFilter: document.querySelector("#orderPaymentFilter"),
  orderStatusFilter: document.querySelector("#orderStatusFilter"),
  clearOrderFiltersBtn: document.querySelector("#clearOrderFiltersBtn"),
  customerCount: document.querySelector("#customerCount"),
  repeatCustomerCount: document.querySelector("#repeatCustomerCount"),
  customerSalesTotal: document.querySelector("#customerSalesTotal"),
  customersTable: document.querySelector("#customersTable"),
  customerForm: document.querySelector("#customerForm"),
  customerRecordId: document.querySelector("#customerRecordId"),
  customerRecordName: document.querySelector("#customerRecordName"),
  customerPhone: document.querySelector("#customerPhone"),
  customerNotes: document.querySelector("#customerNotes"),
  clearCustomerFormBtn: document.querySelector("#clearCustomerFormBtn"),
  promotionCards: document.querySelector("#promotionCards"),
  promotionsTable: document.querySelector("#promotionsTable"),
  promoForm: document.querySelector("#promoForm"),
  promoId: document.querySelector("#promoId"),
  promoName: document.querySelector("#promoName"),
  promoPercent: document.querySelector("#promoPercent"),
  promoActive: document.querySelector("#promoActive"),
  clearPromoFormBtn: document.querySelector("#clearPromoFormBtn"),
  activePromoLabel: document.querySelector("#activePromoLabel"),
  cashierCount: document.querySelector("#cashierCount"),
  managerCount: document.querySelector("#managerCount"),
  employeeSignedIn: document.querySelector("#employeeSignedIn"),
  employeeForm: document.querySelector("#employeeForm"),
  employeeId: document.querySelector("#employeeId"),
  employeeName: document.querySelector("#employeeName"),
  employeeRole: document.querySelector("#employeeRole"),
  employeeStore: document.querySelector("#employeeStore"),
  employeePin: document.querySelector("#employeePin"),
  employeeStatus: document.querySelector("#employeeStatus"),
  clearEmployeeFormBtn: document.querySelector("#clearEmployeeFormBtn"),
  employeesTable: document.querySelector("#employeesTable"),
  settingsStatus: document.querySelector("#settingsStatus"),
  settingsTaxRateLabel: document.querySelector("#settingsTaxRateLabel"),
  settingsServiceFeeLabel: document.querySelector("#settingsServiceFeeLabel"),
  feeSettingsForm: document.querySelector("#feeSettingsForm"),
  taxEnabled: document.querySelector("#taxEnabled"),
  taxRateInput: document.querySelector("#taxRateInput"),
  serviceFeeEnabled: document.querySelector("#serviceFeeEnabled"),
  serviceFeeRateInput: document.querySelector("#serviceFeeRateInput"),
  receiptSettingsForm: document.querySelector("#receiptSettingsForm"),
  receiptHeaderInput: document.querySelector("#receiptHeaderInput"),
  receiptFooterInput: document.querySelector("#receiptFooterInput"),
  printerNameInput: document.querySelector("#printerNameInput"),
  printerPaperWidth: document.querySelector("#printerPaperWidth"),
  printerConnected: document.querySelector("#printerConnected"),
  autoPrintEnabled: document.querySelector("#autoPrintEnabled"),
  connectPrinterBtn: document.querySelector("#connectPrinterBtn"),
  exportBackupBtn: document.querySelector("#exportBackupBtn"),
  importBackupInput: document.querySelector("#importBackupInput"),
  receiptModal: document.querySelector("#receiptModal"),
  receiptPaper: document.querySelector("#receiptPaper"),
  closeReceiptBtn: document.querySelector("#closeReceiptBtn"),
  printReceiptBtn: document.querySelector("#printReceiptBtn"),
  toast: document.querySelector("#toast"),
};

function createProduct(name, sku, category, price, stockByStore, options = "", cost = 0) {
  return { id: crypto.randomUUID(), name, sku, category, options, price, cost, stockByStore };
}

function load(key, fallback) {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : fallback;
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureDefaultEmployees() {
  demoEmployees.forEach((demoEmployee) => {
    const hasDefaultLogin = employees.some(
      (employee) =>
        employee.role === demoEmployee.role &&
        employee.pin === demoEmployee.pin &&
        (employee.status || "Active") === "Active"
    );
    if (!hasDefaultLogin) employees.unshift({ ...demoEmployee });
  });
}

function canUseBackend() {
  return location.protocol.startsWith("http") && location.hostname !== "";
}

async function loadBackendState() {
  if (!canUseBackend()) return;
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) return;
    const state = await response.json();
    isHydratingBackend = true;
    backendMode = true;
    if (!state || !state.products) {
      isHydratingBackend = false;
      saveBackendState();
      return;
    }
    stores = state.stores?.length ? state.stores : stores;
    products = normalizeProducts(state.products || products);
    sales = state.sales || sales;
    customers = state.customers || customers;
    employees = state.employees || employees;
    ensureDefaultEmployees();
    promotions = state.promotions || promotions;
    appSettings = { ...DEFAULT_APP_SETTINGS, ...(state.appSettings || appSettings) };
    recentProductIds = state.recentProductIds || recentProductIds;
    activeStoreId = state.activeStoreId || activeStoreId;
    selectedStockStoreId = state.selectedStockStoreId || activeStoreId;
    render();
  } catch {
    backendMode = false;
  } finally {
    isHydratingBackend = false;
  }
}

function appState() {
  return {
    stores,
    products,
    sales,
    customers,
    employees,
    promotions,
    appSettings,
    recentProductIds,
    activeStoreId,
    selectedStockStoreId,
    updatedAt: new Date().toISOString(),
  };
}

function saveBackendState() {
  if (!backendMode || isHydratingBackend) return;
  window.clearTimeout(backendSaveTimer);
  backendSaveTimer = window.setTimeout(() => {
    fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(appState()),
    }).catch(() => {
      backendMode = false;
      renderSettings();
    });
  }, 350);
}

function normalizeProducts(items) {
  return items.map((product) => {
    if (product.stockByStore) return product;
    return { ...product, stockByStore: { [activeStoreId || "store-main"]: product.stock || 0 } };
  });
}

function activeStore() {
  return stores.find((store) => store.id === activeStoreId) || stores[0];
}

function activeStoreSales() {
  return sales.filter((sale) => sale.storeId === activeStoreId);
}

function activeCompletedSales() {
  return activeStoreSales().filter((sale) => (sale.status || "Completed") === "Completed");
}

function visibleOrderSales() {
  return activeStoreSales().filter((sale) => {
    const status = sale.status || "Completed";
    const payment = sale.paymentMethod || "Cash";
    const date = sale.createdAt?.slice(0, 10) || "";
    return (
      (!orderFilters.date || date === orderFilters.date) &&
      (orderFilters.payment === "All" || payment === orderFilters.payment) &&
      (orderFilters.status === "All" || status === orderFilters.status)
    );
  });
}

function storeStock(product, storeId = activeStoreId) {
  return Number(product.stockByStore?.[storeId]) || 0;
}

function productInitials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function stockStatus(stock) {
  if (stock <= 0) return { label: "Sold out", level: "out" };
  if (stock <= 10) return { label: "Low stock", level: "low" };
  return { label: "In stock", level: "ok" };
}

function categoryClass(category) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function createSku(category, item, index) {
  const categoryCode = category.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "ITM";
  const itemCode = item.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "NEW";
  return `${categoryCode}-${itemCode}-${String(index).padStart(3, "0")}`;
}

function money(value) {
  return `PHP ${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCartTotals() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = Math.min(Number(els.discountInput.value) || 0, subtotal);
  const taxable = Math.max(subtotal - discount, 0);
  const taxRate = appSettings.taxEnabled ? Number(appSettings.taxRate) / 100 : 0;
  const serviceFeeRate = appSettings.serviceFeeEnabled ? Number(appSettings.serviceFeeRate) / 100 : 0;
  const tax = taxable * taxRate;
  const serviceFee = taxable * serviceFeeRate;
  const total = taxable + tax + serviceFee;
  const isCash = els.paymentMethod.value === "Cash";
  const isSplit = els.paymentMethod.value === "Split";
  const splitPaid = [
    els.splitCashInput,
    els.splitCardInput,
    els.splitGcashInput,
    els.splitBankInput,
  ].reduce((sum, input) => sum + (Number(input.value) || 0), 0);
  const paid = isSplit ? splitPaid : isCash ? Number(els.cashInput.value) || 0 : total;
  return { subtotal, discount, tax, serviceFee, total, cash: paid, change: Math.max(paid - total, 0) };
}

function getTicketMeta() {
  return {
    orderType: els.orderType.value,
    customerName: els.customerName.value.trim(),
    paymentMethod: els.paymentMethod.value,
    paymentReference: els.paymentReference.value.trim(),
    splitPayments:
      els.paymentMethod.value === "Split"
        ? {
            Cash: Number(els.splitCashInput.value) || 0,
            Card: Number(els.splitCardInput.value) || 0,
            GCash: Number(els.splitGcashInput.value) || 0,
            "Bank Transfer": Number(els.splitBankInput.value) || 0,
          }
        : null,
    orderNote: els.orderNote.value.trim(),
  };
}

function cartQtyForProduct(productId) {
  return cart.filter((item) => item.productId === productId).reduce((sum, item) => sum + item.qty, 0);
}

function persistAll() {
  save(STORAGE_KEYS.stores, stores);
  save(STORAGE_KEYS.products, products);
  save(STORAGE_KEYS.sales, sales);
  save(STORAGE_KEYS.activeStore, activeStoreId);
  save(STORAGE_KEYS.cashier, cashier);
  save(STORAGE_KEYS.recentProducts, recentProductIds);
  save(STORAGE_KEYS.customers, customers);
  save(STORAGE_KEYS.employees, employees);
  save(STORAGE_KEYS.promotions, promotions);
  save(STORAGE_KEYS.appSettings, appSettings);
  saveBackendState();
}

function render() {
  if (stores.length && !stores.some((store) => store.id === activeStoreId)) activeStoreId = stores[0].id;
  renderStoresSelect();
  renderStoreLabels();
  renderCategories();
  renderRecentItems();
  renderProducts();
  renderCart();
  renderOrders();
  renderCustomers();
  renderPromotions();
  renderInventory();
  renderSales();
  renderStores();
  renderBranchStatus();
  renderStockBranchSelect();
  renderStockOverview();
  renderFooterMetrics();
  renderEmployees();
  renderSettings();
  renderSession();
  renderCartPromos();
  renderLowStockAlert();
  persistAll();
}

function renderSession() {
  document.body.classList.toggle("logged-out", !cashier);
  document.body.dataset.role = cashier?.role || "";
  els.loginScreen.setAttribute("aria-hidden", cashier ? "true" : "false");
  els.currentUser.textContent = cashier?.name || "Cashier";
  els.topbarUser.textContent = cashier?.name || "Cashier";
  const roleLabel = roleName(cashier?.role);
  els.currentRole.textContent = roleLabel;
  els.topbarRole.textContent = roleLabel;
  els.userAvatar.textContent = (cashier?.name || "C").slice(0, 1).toUpperCase();
  els.topbarAvatar.textContent = (cashier?.name || "C").slice(0, 1).toUpperCase();
  renderRoleAccess();
}

function roleName(role) {
  if (role === "admin") return "Admin";
  if (role === "manager") return "Manager";
  return "Cashier";
}

function canAccessView(viewName, role = cashier?.role) {
  const tab = [...els.tabs].find((item) => item.dataset.view === viewName);
  if (!tab) return false;
  const roles = tab.dataset.roles;
  return !roles || roles.split(" ").includes(role);
}

function renderRoleAccess() {
  els.tabs.forEach((tab) => tab.classList.toggle("role-hidden", cashier ? !canAccessView(tab.dataset.view) : false));
}

function setActiveView(viewName) {
  if (cashier && !canAccessView(viewName)) {
    showToast("Access not allowed for this role.");
    viewName = "register";
  }
  els.tabs.forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  Object.entries(els.views).forEach(([name, view]) => view.classList.toggle("active", name === viewName));
  closeSidebar();
}

function setSidebarOpen(open) {
  document.body.classList.toggle("sidebar-open", open);
  els.sidebarToggle.setAttribute("aria-expanded", open ? "true" : "false");
  els.sidebarToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

function closeSidebar() {
  setSidebarOpen(false);
}

function renderClock() {
  const now = new Date();
  els.currentClock.textContent = now.toLocaleString("en-PH", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderStoresSelect() {
  els.storeSelect.innerHTML = stores
    .map((store) => `<option value="${store.id}" ${store.id === activeStoreId ? "selected" : ""}>${store.name}</option>`)
    .join("");
  els.storeSelect.disabled = cashier?.role !== "admin";
}

function renderStockBranchSelect() {
  if (!stores.some((store) => store.id === selectedStockStoreId)) selectedStockStoreId = activeStoreId || stores[0]?.id;
  const visibleStores = cashier?.role === "admin" ? stores : stores.filter((store) => store.id === activeStoreId);
  els.stockBranchSelect.innerHTML = visibleStores
    .map((store) => `<option value="${store.id}" ${store.id === selectedStockStoreId ? "selected" : ""}>${store.name}</option>`)
    .join("");
  els.stockBranchSelect.disabled = cashier?.role !== "admin";
}

function renderStoreLabels() {
  const store = activeStore();
  const label = store ? `${store.name} (${store.code})` : "No store selected";
  if (els.registerStoreLabel) els.registerStoreLabel.textContent = `Register - ${label}`;
  els.inventoryStoreLabel.textContent = `Inventory - ${label}`;
  els.salesStoreLabel.textContent = `Sales - ${label}`;
}

function renderCategories() {
  const categories = [...new Set(products.map((product) => product.category))];
  if (!categories.includes(activeCategory)) activeCategory = categories[0] || "All";
  const categoryProducts = activeCategory === "All" ? products : products.filter((product) => product.category === activeCategory);
  const subcategories = [...new Set(categoryProducts.map((product) => product.options || "General"))];
  if (!subcategories.includes(activeSubcategory)) activeSubcategory = subcategories[0] || "All";
  els.categoryTabs.innerHTML = categories
    .map(
      (category) => `
        <button class="category-tab ${category === activeCategory ? "active" : ""}" data-category="${category}" type="button">
          ${category}
        </button>
      `
    )
    .join("");
  els.subcategoryTabs.hidden = !categories.length;
  els.subcategoryTabs.innerHTML = subcategories
    .map(
      (subcategory) => `
        <button class="category-tab ${subcategory === activeSubcategory ? "active" : ""}" data-subcategory="${subcategory}" type="button">
          ${subcategory}
        </button>
      `
    )
    .join("");
}

function renderProducts() {
  const query = els.productSearch.value.trim().toLowerCase();
  const filtered = products.filter((product) => {
    const inCategory = activeCategory === "All" || product.category === activeCategory;
    const productSubcategory = product.options || "General";
    const inSubcategory = activeSubcategory === "All" || productSubcategory === activeSubcategory;
    const matches = `${product.name} ${product.sku} ${product.category} ${productSubcategory}`.toLowerCase().includes(query);
    return inCategory && inSubcategory && matches;
  });

  els.productGrid.innerHTML = filtered.length
    ? filtered
        .map((product) => {
          const stock = storeStock(product);
          const status = stockStatus(stock);
          return `
            <button class="product-card" data-product-id="${product.id}" type="button" ${stock <= 0 ? "disabled" : ""}>
              <span class="favorite-dot">o</span>
              <span class="product-photo ${categoryClass(product.category)}">
                <span>${productInitials(product.name)}</span>
              </span>
              <strong>${escapeHtml(product.name)}</strong>
              <span class="stock-badge ${status.level}">${status.label} / ${stock}</span>
            </button>
          `;
        })
        .join("")
    : `<div class="empty-state">No matching menu items.</div>`;
}

function renderRecentItems() {
  const recent = recentProductIds
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean)
    .slice(0, 6);
  els.recentItems.innerHTML = recent.length
    ? recent
        .map(
          (product) => `
            <button data-recent-product-id="${product.id}" type="button">
              ${escapeHtml(product.name)}
            </button>
          `
        )
        .join("")
    : "";
}

function rememberRecentProduct(productId) {
  recentProductIds = [productId, ...recentProductIds.filter((id) => id !== productId)].slice(0, 8);
}

function renderCart() {
  els.cartItems.innerHTML = cart.length
    ? cart
        .map(
          (item) => `
            <div class="cart-row">
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                ${item.variant ? `<small>${escapeHtml(item.variant)}</small>` : ""}
                <small>${money(item.price)} each</small>
              </div>
              <div class="qty-controls">
                <button data-cart-action="decrease" data-line-id="${item.lineId}" type="button">-</button>
                <strong>${item.qty}</strong>
                <button data-cart-action="increase" data-line-id="${item.lineId}" type="button">+</button>
              </div>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state">Ticket is empty.</div>`;

  const totals = getCartTotals();
  const isCash = els.paymentMethod.value === "Cash";
  const isSplit = els.paymentMethod.value === "Split";
  if (!cart.length) cartStage = "order";
  els.cartPanel.classList.toggle("checkout-mode", cartStage === "checkout");
  els.cartOrderStep.hidden = cartStage !== "order";
  els.cartCheckoutStep.hidden = cartStage !== "checkout";
  els.cashLabel.textContent = isSplit ? "Paid total" : isCash ? "Cash" : "Paid";
  els.cashInput.disabled = !isCash;
  els.cashInput.value = isSplit ? totals.cash.toFixed(2) : isCash ? els.cashInput.value : totals.total.toFixed(2);
  els.splitPaymentPanel.classList.toggle("show", isSplit);
  els.orderSubtotal.textContent = money(totals.subtotal);
  els.subtotal.textContent = money(totals.subtotal);
  els.taxRow.hidden = !appSettings.taxEnabled;
  els.taxLabel.textContent = appSettings.taxEnabled ? `Tax (${Number(appSettings.taxRate) || 0}%)` : "Tax";
  els.tax.textContent = money(totals.tax);
  els.serviceFeeRow.hidden = !appSettings.serviceFeeEnabled;
  els.serviceFeeLabel.textContent = appSettings.serviceFeeEnabled ? `Service fee (${Number(appSettings.serviceFeeRate) || 0}%)` : "Service fee";
  els.serviceFee.textContent = money(totals.serviceFee);
  els.total.textContent = money(totals.total);
  els.changeDue.textContent = money(totals.change);
  els.checkoutBtn.textContent = `Charge ${money(totals.total)}`;
  els.checkoutBtn.disabled = cart.length === 0 || ((isCash || isSplit) && totals.cash < totals.total) || !activeStoreId;
  els.goCheckoutBtn.textContent = cart.length ? `Checkout ${money(totals.total)}` : "Checkout";
  els.goCheckoutBtn.disabled = cart.length === 0 || !activeStoreId;
}

function setCartStage(stage) {
  cartStage = stage;
  renderCart();
}

function renderCartPromos() {
  const current = els.cartPromoSelect.value;
  els.cartPromoSelect.innerHTML = [
    `<option value="">No promo</option>`,
    ...promotions
      .filter((promo) => promo.active !== false && Number(promo.percent) > 0)
      .map((promo) => `<option value="${promo.id}">${escapeHtml(promo.name)} (${Number(promo.percent)}%)</option>`),
  ].join("");
  els.cartPromoSelect.value = promotions.some((promo) => promo.id === current) ? current : "";
}

function renderLowStockAlert() {
  const low = products.filter((product) => {
    const stock = storeStock(product);
    return stock > 0 && stock <= 10;
  }).length;
  const out = products.filter((product) => storeStock(product) <= 0).length;
  els.lowStockAlert.textContent = low + out;
  els.lowStockAlert.title = `${low} low stock / ${out} sold out`;
  els.lowStockAlert.classList.toggle("has-alert", low + out > 0);
}

function renderInventory() {
  els.inventoryTable.innerHTML = products
    .map((product) => {
      const stockSummary = stores.map((store) => `${store.code}: ${storeStock(product, store.id)}`).join(" / ");
      return `
        <tr>
          <td><strong>${escapeHtml(product.name)}</strong></td>
          <td>${escapeHtml(product.sku)}</td>
          <td>${escapeHtml(product.category)}</td>
          <td>${escapeHtml(product.options || "")}</td>
          <td>${escapeHtml(product.variant || "")}</td>
          <td>${money(product.price)}</td>
          <td>${money(product.cost || 0)}</td>
          <td>${storeStock(product)}</td>
          <td>${stockSummary}</td>
          <td>
            <button class="action-link" data-edit-id="${product.id}" type="button">Edit</button>
            <button class="action-link" data-delete-id="${product.id}" type="button">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderSales() {
  const storeSales = activeCompletedSales();
  const gross = storeSales.reduce((sum, sale) => sum + sale.total, 0);
  const cogs = storeSales.reduce((sum, sale) => sum + saleCost(sale), 0);
  const profit = gross - cogs;
  const shift = shiftSummary();
  const average = storeSales.length ? gross / storeSales.length : 0;
  els.grossSales.textContent = money(gross);
  els.transactionCount.textContent = storeSales.length;
  els.averageOrder.textContent = money(average);
  els.costOfGoods.textContent = money(cogs);
  els.grossProfit.textContent = money(profit);
  els.profitMargin.textContent = gross ? `${Math.round((profit / gross) * 100)}%` : "0%";
  els.shiftCashTotal.textContent = money(shift.cash);
  els.shiftDigitalTotal.textContent = money(shift.digital);
  els.shiftExceptionCount.textContent = shift.exceptions;

  els.salesList.innerHTML = storeSales.length
    ? [...storeSales]
        .reverse()
        .map(
          (sale) => `
            <article class="sale-row">
              <div>
                <strong>${sale.receipt}</strong>
                <div class="muted">${new Date(sale.createdAt).toLocaleString()}</div>
                <div class="muted">${escapeHtml(sale.orderType || "Dine-in")}${sale.customerName ? ` - ${escapeHtml(sale.customerName)}` : ""}</div>
              </div>
              <div class="muted">
                ${sale.items.map((item) => `${item.qty}x ${escapeHtml(item.name)}${item.variant ? ` (${escapeHtml(item.variant)})` : ""}`).join(", ")}
                ${sale.orderNote ? `<br>${escapeHtml(sale.orderNote)}` : ""}
              </div>
              <div class="sale-total-cell">
                <strong>${money(sale.total)}</strong>
                <div><button class="action-link" data-receipt-id="${sale.id}" type="button">Receipt</button></div>
              </div>
            </article>
          `
        )
        .join("")
    : `<div class="empty-state">No sales recorded for this store yet.</div>`;
}

function shiftSummary() {
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = activeStoreSales().filter((sale) => sale.createdAt?.slice(0, 10) === today);
  const completed = todaySales.filter((sale) => (sale.status || "Completed") === "Completed");
  const cash = completed.reduce((sum, sale) => {
    if (sale.splitPayments) return sum + (Number(sale.splitPayments.Cash) || 0);
    return sum + ((sale.paymentMethod || "Cash") === "Cash" ? sale.total : 0);
  }, 0);
  const digital = completed.reduce((sum, sale) => {
    if (sale.splitPayments) {
      return sum + (Number(sale.splitPayments.Card) || 0) + (Number(sale.splitPayments.GCash) || 0) + (Number(sale.splitPayments["Bank Transfer"]) || 0);
    }
    return sum + ((sale.paymentMethod || "Cash") === "Cash" ? 0 : sale.total);
  }, 0);
  const exceptions = todaySales.filter((sale) => ["Voided", "Refunded"].includes(sale.status)).length;
  return { cash, digital, exceptions };
}

function requireManagerApproval(actionName) {
  if (cashier?.role === "admin" || cashier?.role === "manager") return true;
  const pin = window.prompt(`Manager/Admin PIN required for ${actionName}.`);
  if (pin === null) return false;
  const approver = employees.find(
    (employee) =>
      ["admin", "manager"].includes(employee.role) &&
      employee.pin === pin.trim() &&
      (employee.status || "Active") === "Active"
  );
  if (!approver) {
    showToast("Approval denied.");
    return false;
  }
  showToast(`Approved by ${approver.name}.`);
  return true;
}

function confirmAction(message) {
  return window.confirm(message);
}

function saleCost(sale) {
  return sale.items.reduce((sum, item) => {
    const product = products.find((productItem) => productItem.id === item.productId);
    return sum + item.qty * (Number(item.cost ?? product?.cost) || 0);
  }, 0);
}

function renderOrders() {
  const allStoreSales = activeStoreSales();
  const storeSales = visibleOrderSales();
  els.dineInCount.textContent = allStoreSales.filter((sale) => (sale.orderType || "Dine-in") === "Dine-in").length;
  els.takeawayCount.textContent = allStoreSales.filter((sale) => sale.orderType === "Takeaway").length;
  els.deliveryCount.textContent = allStoreSales.filter((sale) => sale.orderType === "Delivery").length;

  els.ordersList.innerHTML = storeSales.length
    ? [...storeSales]
        .reverse()
        .map(
          (sale) => {
            const status = sale.status || "Completed";
            const locked = status !== "Completed";
            return `
            <article class="sale-row order-row ${(sale.status || "Completed").toLowerCase()}">
              <div>
                <strong>${escapeHtml(sale.receipt)}</strong>
                <div class="muted">${escapeHtml(sale.orderType || "Dine-in")}${sale.customerName ? ` - ${escapeHtml(sale.customerName)}` : ""}</div>
                <span class="table-status ${status.toLowerCase()}">${escapeHtml(status)}</span>
              </div>
              <div class="muted">${sale.items.map((item) => `${item.qty}x ${escapeHtml(item.name)}${item.variant ? ` (${escapeHtml(item.variant)})` : ""}`).join(", ")}</div>
              <div class="sale-total-cell">
                <strong>${money(sale.total)}</strong>
                <div class="order-row-actions">
                  <button class="action-link" data-receipt-id="${sale.id}" type="button">Receipt</button>
                  <button class="action-link" data-void-sale="${sale.id}" type="button" ${locked ? "disabled" : ""}>Void</button>
                  <button class="action-link" data-refund-sale="${sale.id}" type="button" ${locked ? "disabled" : ""}>Refund</button>
                </div>
              </div>
            </article>
          `;
          }
        )
        .join("")
    : `<div class="empty-state panel-empty">No orders recorded for this branch yet.</div>`;
}

function customerSummaries() {
  const customerMap = new Map();
  activeCompletedSales()
    .filter((sale) => sale.customerName)
    .forEach((sale) => {
      const key = sale.customerName.trim().toLowerCase();
      const existing = customerMap.get(key) || {
        name: sale.customerName.trim(),
        visits: 0,
        total: 0,
        lastVisit: sale.createdAt,
      };
      existing.visits += 1;
      existing.total += sale.total;
      if (new Date(sale.createdAt) > new Date(existing.lastVisit)) existing.lastVisit = sale.createdAt;
      customerMap.set(key, existing);
    });
  return customerMap;
}

function renderCustomers() {
  const salesSummaries = customerSummaries();
  const rows = customers.map((customer) => {
    const summary = salesSummaries.get(customer.name.trim().toLowerCase());
    if (summary) salesSummaries.delete(customer.name.trim().toLowerCase());
    return {
      ...customer,
      visits: summary?.visits || 0,
      total: summary?.total || 0,
      lastVisit: summary?.lastVisit || "",
      fromSalesOnly: false,
    };
  });
  salesSummaries.forEach((summary) => rows.push({ ...summary, phone: "", notes: "", fromSalesOnly: true }));
  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const customerSales = rows.reduce((sum, customer) => sum + customer.total, 0);
  els.customerCount.textContent = rows.length;
  els.repeatCustomerCount.textContent = rows.filter((customer) => customer.visits > 1).length;
  els.customerSalesTotal.textContent = money(customerSales);
  els.customersTable.innerHTML = rows.length
    ? rows
        .map(
          (customer) => `
            <tr>
              <td><strong>${escapeHtml(customer.name)}</strong></td>
              <td>${escapeHtml(customer.phone || "")}</td>
              <td>${customer.visits}</td>
              <td>${money(customer.total)}</td>
              <td>${customer.lastVisit ? new Date(customer.lastVisit).toLocaleString() : "No sale yet"}</td>
              <td>${escapeHtml(customer.notes || "")}</td>
              <td>
                ${
                  customer.fromSalesOnly
                    ? `<button class="action-link" data-customer-capture="${escapeHtml(customer.name)}" type="button">Save</button>`
                    : `
                      <button class="action-link" data-edit-customer="${customer.id}" type="button">Edit</button>
                      <button class="action-link" data-delete-customer="${customer.id}" type="button">Delete</button>
                    `
                }
              </td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="7">Add a customer here or enter a name on a sale to build customer history.</td></tr>`;
}

function renderEmployees() {
  const availableStores = cashier?.role === "admin" ? stores : stores.filter((store) => store.id === activeStoreId);
  els.employeeStore.innerHTML = availableStores
    .map((store) => `<option value="${store.id}">${escapeHtml(store.name)}</option>`)
    .join("");
  els.employeeStore.disabled = cashier?.role !== "admin";
  [...els.employeeRole.options].forEach((option) => {
    option.disabled = cashier?.role !== "admin" && option.value === "admin";
  });
  const activeEmployees = employees.filter((employee) => employee.status === "Active");
  const adminCount = activeEmployees.filter((employee) => employee.role === "admin").length;
  els.cashierCount.textContent = activeEmployees.filter((employee) => employee.role === "cashier").length;
  els.managerCount.textContent = activeEmployees.filter((employee) => employee.role === "manager").length + adminCount;
  els.employeeSignedIn.textContent = roleName(cashier?.role);
  const visibleEmployees = cashier?.role === "admin" ? employees : employees.filter((employee) => employee.storeId === activeStoreId);
  els.employeesTable.innerHTML = visibleEmployees.length
    ? visibleEmployees
        .map((employee) => {
          const access =
            employee.role === "admin"
              ? "Full system access"
              : employee.role === "manager"
                ? "Store operations"
                : "POS, Orders, Customers, Promotions";
          const status = employee.status || "Active";
          const store = stores.find((item) => item.id === employee.storeId) || stores[0];
          return `
            <tr>
              <td><strong>${escapeHtml(employee.name)}</strong></td>
              <td>${roleName(employee.role)}</td>
              <td>${escapeHtml(store?.name || "Any branch")}</td>
              <td>${escapeHtml(employee.pin)}</td>
              <td>${access}</td>
              <td><span class="table-status ${status.toLowerCase()}">${status}</span></td>
              <td>
                <button class="action-link" data-edit-employee="${employee.id}" type="button">Edit</button>
                <button class="action-link" data-delete-employee="${employee.id}" type="button">Delete</button>
              </td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="7">No employees saved yet.</td></tr>`;
}

function renderPromotions() {
  const activePromos = promotions.filter((promo) => promo.active !== false);
  els.promotionCards.innerHTML = activePromos.length
    ? activePromos
        .map(
          (promo) => `
            <button class="ops-card promo-card" data-apply-promo="${promo.id}" type="button">
              <span>${escapeHtml(promo.name)}</span>
              <strong>${Number(promo.percent) || 0}%</strong>
            </button>
          `
        )
        .join("")
    : `<div class="panel-empty promo-note"><strong>No active promos</strong><span>Add or activate a promo below.</span></div>`;

  els.promotionsTable.innerHTML = promotions.length
    ? promotions
        .map(
          (promo) => `
            <tr>
              <td><strong>${escapeHtml(promo.name)}</strong></td>
              <td>${Number(promo.percent) || 0}%</td>
              <td><span class="table-status ${promo.active !== false ? "active" : "inactive"}">${promo.active !== false ? "Active" : "Inactive"}</span></td>
              <td>
                <button class="action-link" data-edit-promo="${promo.id}" type="button">Edit</button>
                <button class="action-link" data-delete-promo="${promo.id}" type="button">Delete</button>
              </td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="4">No promotions saved yet.</td></tr>`;
}

function renderSettings() {
  const backupSize = JSON.stringify({ stores, products, sales, customers, employees, promotions, appSettings }).length;
  els.settingsTaxRateLabel.textContent = appSettings.taxEnabled ? `${Number(appSettings.taxRate) || 0}%` : "Off";
  els.settingsServiceFeeLabel.textContent = appSettings.serviceFeeEnabled ? `${Number(appSettings.serviceFeeRate) || 0}%` : "Off";
  els.taxEnabled.checked = Boolean(appSettings.taxEnabled);
  els.taxRateInput.value = Number(appSettings.taxRate) || 0;
  els.serviceFeeEnabled.checked = Boolean(appSettings.serviceFeeEnabled);
  els.serviceFeeRateInput.value = Number(appSettings.serviceFeeRate) || 0;
  els.receiptHeaderInput.value = appSettings.receiptHeader || "";
  els.receiptFooterInput.value = appSettings.receiptFooter || "";
  els.printerNameInput.value = appSettings.printerName || "";
  els.printerPaperWidth.value = String(appSettings.printerPaperWidth || "58");
  els.printerConnected.checked = Boolean(appSettings.printerConnected);
  els.autoPrintEnabled.checked = Boolean(appSettings.autoPrintEnabled);
  els.settingsStatus.innerHTML = `
    <strong>Local data</strong>
    <span>${stores.length} branches / ${products.length} menu items / ${sales.length} sales / ${customers.length} customers / ${employees.length} employees / ${Math.ceil(backupSize / 1024)} KB backup size / ${backendMode ? "API sync on" : "browser storage"} / ${appSettings.printerConnected ? `${escapeHtml(appSettings.printerName)} ${appSettings.printerPaperWidth}mm` : "printer not connected"}</span>
  `;
}

function saveFeeSettings(event) {
  event.preventDefault();
  appSettings = {
    ...appSettings,
    taxEnabled: els.taxEnabled.checked,
    taxRate: Math.max(0, Number(els.taxRateInput.value) || 0),
    serviceFeeEnabled: els.serviceFeeEnabled.checked,
    serviceFeeRate: Math.max(0, Number(els.serviceFeeRateInput.value) || 0),
  };
  render();
  showToast("Tax and service fee settings saved.");
}

function saveReceiptSettings(event) {
  event.preventDefault();
  appSettings = {
    ...appSettings,
    receiptHeader: els.receiptHeaderInput.value.trim(),
    receiptFooter: els.receiptFooterInput.value.trim(),
    printerName: els.printerNameInput.value.trim() || "Generic Bluetooth Thermal Printer",
    printerPaperWidth: els.printerPaperWidth.value,
    printerConnected: els.printerConnected.checked,
    autoPrintEnabled: els.autoPrintEnabled.checked,
  };
  render();
  showToast("Receipt and printer settings saved.");
}

async function connectPrinter() {
  if (window.AndroidPrinter?.selectPrinter) {
    window.AndroidPrinter.selectPrinter();
    return;
  }
  if (!navigator.bluetooth?.requestDevice) {
    showToast("Bluetooth printer pairing is handled by your device settings, then use Print.");
    return;
  }
  try {
    const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
    els.printerNameInput.value = device.name || "Bluetooth Thermal Printer";
    els.printerConnected.checked = true;
    saveReceiptSettings(new Event("submit"));
  } catch {
    showToast("Printer connection cancelled.");
  }
}

window.onAndroidPrinterSelected = (name, address) => {
  els.printerNameInput.value = name || "Bluetooth Thermal Printer";
  els.printerConnected.checked = true;
  appSettings = {
    ...appSettings,
    printerName: els.printerNameInput.value,
    printerPaperWidth: els.printerPaperWidth.value,
    printerConnected: true,
    printerAddress: address || "",
  };
  render();
  showToast("Bluetooth printer selected.");
};

function applyPromo(percent, name = "") {
  const subtotal = getCartTotals().subtotal;
  const discount = Math.round(subtotal * (percent / 100));
  els.discountInput.value = discount;
  els.activePromoLabel.textContent = percent ? `${name || percent + "% promo"} applied (${money(discount)})` : "No active promo";
  renderCart();
}

function applySelectedCartPromo() {
  const promo = promotions.find((item) => item.id === els.cartPromoSelect.value);
  if (!promo) {
    applyPromo(0);
    return;
  }
  if (!requireManagerApproval("promo discount")) {
    els.cartPromoSelect.value = "";
    return;
  }
  applyPromo(Number(promo.percent) || 0, promo.name);
}

function setAdjustmentTab(tabName) {
  els.adjustmentTabs.forEach((button) => button.classList.toggle("active", button.dataset.adjustmentTab === tabName));
  els.discountPanel.classList.toggle("active", tabName === "discount");
  els.promoPanel.classList.toggle("active", tabName === "promo");
}

function renderFooterMetrics() {
  const storeSales = activeCompletedSales();
  const gross = storeSales.reduce((sum, sale) => sum + sale.total, 0);
  const average = storeSales.length ? gross / storeSales.length : 0;
  els.footerSales.textContent = money(gross);
  els.footerOrders.textContent = storeSales.length;
  els.footerAverage.textContent = money(average);
}

function renderStores() {
  els.storeGrid.innerHTML = stores
    .map((store) => {
      const storeSales = sales.filter((sale) => sale.storeId === store.id && (sale.status || "Completed") === "Completed");
      const gross = storeSales.reduce((sum, sale) => sum + sale.total, 0);
      return `
        <article class="store-card">
          <div>
            <span class="eyebrow">${store.code}</span>
            <h2>${store.name}</h2>
            <p>${store.location}</p>
          </div>
          <div class="store-card-metrics">
            <strong>${money(gross)}</strong>
            <span>${storeSales.length} sales</span>
          </div>
          <div class="store-actions">
            <button class="secondary-button compact" data-use-store="${store.id}" type="button">Use</button>
            <button class="action-link" data-edit-store="${store.id}" type="button">Edit</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function branchStatus(store) {
  const storeSales = sales.filter((sale) => sale.storeId === store.id);
  const lowStockCount = products.filter((product) => {
    const stock = storeStock(product, store.id);
    return stock > 0 && stock <= 10;
  }).length;
  if (store.id === activeStoreId) return { label: "Open", level: "open" };
  if (lowStockCount > 0) return { label: "Busy", level: "busy" };
  if (storeSales.length === 0) return { label: "Closed", level: "closed" };
  return { label: "Open", level: "open" };
}

function renderBranchStatus() {
  els.branchStatusList.innerHTML = stores
    .map((store) => {
      const status = branchStatus(store);
      return `
        <div class="branch-status-row">
          <span class="status-dot ${status.level}"></span>
          <span>${escapeHtml(store.name)}</span>
          <strong class="${status.level}">${status.label}</strong>
        </div>
      `;
    })
    .join("");
}

function renderStockOverview() {
  const selectedStore = stores.find((store) => store.id === selectedStockStoreId) || activeStore();
  els.stockProductSelect.innerHTML = products
    .map((product) => `<option value="${product.id}">${escapeHtml(product.name)} (${escapeHtml(product.sku)})</option>`)
    .join("");
  if (!els.stockProductId.value && products[0]) {
    els.stockProductSelect.value = products[0].id;
    els.stockQuantityInput.value = storeStock(products[0], selectedStore?.id);
  }
  const rows = products.map((product) => {
    const stock = storeStock(product, selectedStore?.id);
    const status = stockStatus(stock);
    return { product, stock, status };
  });

  els.stockedItemCount.textContent = rows.filter((row) => row.stock > 0).length;
  els.lowStockItemCount.textContent = rows.filter((row) => row.stock > 0 && row.stock <= 10).length;
  els.soldOutItemCount.textContent = rows.filter((row) => row.stock <= 0).length;

  els.stockTable.innerHTML = rows
    .map(({ product, stock, status }) => {
      return `
        <tr>
          <td><strong>${escapeHtml(product.name)}</strong></td>
          <td>${escapeHtml(product.sku)}</td>
          <td>${escapeHtml(product.category)}</td>
          <td><span class="table-status ${status.level}">${status.label}</span></td>
          <td>${stock}</td>
          <td>
            <button class="action-link" data-stock-edit-id="${product.id}" type="button">Edit</button>
            <button class="action-link" data-stock-zero-id="${product.id}" type="button">Zero</button>
            <button class="action-link" data-stock-delete-id="${product.id}" type="button">Delete item</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function selectedStockStore() {
  return stores.find((store) => store.id === selectedStockStoreId) || activeStore();
}

function clearStockForm() {
  els.stockProductId.value = "";
  if (products[0]) {
    els.stockProductSelect.value = products[0].id;
    els.stockQuantityInput.value = storeStock(products[0], selectedStockStore()?.id);
  } else {
    els.stockQuantityInput.value = "";
  }
}

function loadStockForm(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;
  els.stockProductId.value = product.id;
  els.stockProductSelect.value = product.id;
  els.stockQuantityInput.value = storeStock(product, selectedStockStore()?.id);
  els.stockQuantityInput.focus();
}

function saveStock(event) {
  event.preventDefault();
  const productId = els.stockProductId.value || els.stockProductSelect.value;
  const store = selectedStockStore();
  const quantity = Number(els.stockQuantityInput.value) || 0;
  products = products.map((product) =>
    product.id === productId
      ? { ...product, stockByStore: { ...product.stockByStore, [store.id]: quantity } }
      : product
  );
  clearStockForm();
  render();
  showToast(`Stock saved for ${store.name}.`);
}

function addStockItem(event) {
  event.preventDefault();
  const store = selectedStockStore();
  const product = {
    id: crypto.randomUUID(),
    name: els.stockNewName.value.trim(),
    sku: els.stockNewSku.value.trim(),
    category: els.stockNewCategory.value.trim(),
    price: Number(els.stockNewPrice.value),
    stockByStore: Object.fromEntries(stores.map((branch) => [branch.id, branch.id === store.id ? Number(els.stockNewQty.value) || 0 : 0])),
  };
  products.push(product);
  els.stockNewItemForm.reset();
  els.stockProductId.value = product.id;
  render();
  showToast(`Item added to ${store.name} inventory.`);
}

function zeroBranchStock(productId) {
  if (!confirmAction("Set this branch stock to zero?")) return;
  const store = selectedStockStore();
  products = products.map((product) =>
    product.id === productId
      ? { ...product, stockByStore: { ...product.stockByStore, [store.id]: 0 } }
      : product
  );
  render();
  showToast(`Stock set to zero for ${store.name}.`);
}

function stockExportRows(includeAllBranches = false) {
  const selectedStore = selectedStockStore();
  const branches = includeAllBranches ? stores : [selectedStore];
  const headers = ["BRANCH", "CATEGORY", "SUBCATEGORY", "ITEM", "STOCK"];
  const rows = branches.flatMap((store) =>
    products.map((product) => [
      store.code,
      product.category,
      product.options || "",
      product.name,
      storeStock(product, store.id),
    ])
  );
  return [headers, ...rows];
}

function stockExportName(scope, extension) {
  const code = scope === "all" ? "all-branches" : selectedStockStore()?.code || "branch";
  return `cafecloud-stock-${code}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function exportStockCsv() {
  const csv = stockExportRows(false).map((row) => row.map(csvValue).join(",")).join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv" }), stockExportName("branch", "csv"));
}

function exportAllStockCsv() {
  const csv = stockExportRows(true).map((row) => row.map(csvValue).join(",")).join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv" }), stockExportName("all", "csv"));
}

function exportStockXlsx() {
  downloadBlob(createXlsxBlob(stockExportRows(false), "Stock"), stockExportName("branch", "xlsx"));
}

function importStockCsv(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const rows = parseCsv(String(reader.result || ""));
      const headers = rows.shift()?.map((header) => header.trim().toLowerCase()) || [];
      const branchIndex = headers.indexOf("branch");
      const categoryIndex = headers.indexOf("category");
      const subcategoryIndex = headers.indexOf("subcategory");
      const itemIndex = headers.indexOf("item");
      const stockIndex = headers.indexOf("stock");
      if ([branchIndex, categoryIndex, subcategoryIndex, itemIndex, stockIndex].some((index) => index < 0)) {
        showToast("CSV needs BRANCH, CATEGORY, SUBCATEGORY, ITEM, and STOCK columns.");
        return;
      }

      let imported = 0;
      rows.forEach((row) => {
        const branchValue = row[branchIndex]?.trim();
        const category = row[categoryIndex]?.trim();
        const subcategory = row[subcategoryIndex]?.trim() || "";
        const name = row[itemIndex]?.trim();
        const stock = Number(row[stockIndex]);
        if (!branchValue || !category || !name || Number.isNaN(stock)) return;

        const store = stores.find(
          (branch) =>
            branch.code.toLowerCase() === branchValue.toLowerCase() ||
            branch.name.toLowerCase() === branchValue.toLowerCase()
        );
        const product = products.find(
          (item) =>
            item.category.toLowerCase() === category.toLowerCase() &&
            item.name.toLowerCase() === name.toLowerCase() &&
            (item.options || "").toLowerCase() === subcategory.toLowerCase()
        );
        if (!store || !product) return;

        products = products.map((item) =>
          item.id === product.id
            ? { ...item, stockByStore: { ...item.stockByStore, [store.id]: Math.max(0, Math.round(stock)) } }
            : item
        );
        imported += 1;
      });

      clearStockForm();
      render();
      showToast(`${imported} stock rows imported.`);
    } catch {
      showToast("Could not import stock CSV.");
    } finally {
      els.importStockCsvInput.value = "";
    }
  });
  reader.readAsText(file);
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product || storeStock(product) <= 0) return;
  if (cartQtyForProduct(productId) >= storeStock(product)) {
    showToast("Not enough stock at this store.");
    return;
  }
  const lineId = productId;
  const existing = cart.find((item) => item.lineId === lineId);
  if (existing) existing.qty += 1;
  else cart.push({ lineId, productId: product.id, name: product.name, variant: product.variant || "", price: product.price, qty: 1 });
  cartStage = "order";
  rememberRecentProduct(productId);
  renderCart();
  renderRecentItems();
}

function updateCart(lineId, delta) {
  const item = cart.find((cartItem) => cartItem.lineId === lineId);
  const product = products.find((productItem) => productItem.id === item?.productId);
  if (!item || !product) return;
  item.qty += delta;
  if (cartQtyForProduct(product.id) > storeStock(product)) {
    item.qty -= delta;
    showToast("Store stock limit reached.");
  }
  cart = cart.filter((cartItem) => cartItem.qty > 0);
  renderCart();
}

function checkout() {
  const totals = getCartTotals();
  const store = activeStore();
  const ticketMeta = getTicketMeta();
  if (!cart.length || totals.cash < totals.total || !store) return;
  const sale = {
    id: crypto.randomUUID(),
    storeId: store.id,
    storeName: store.name,
    receipt: nextReceiptNumber(store),
    cashierName: cashier?.name || "Cashier",
    createdAt: new Date().toISOString(),
    status: "Completed",
    items: cart.map((item) => {
      const product = products.find((productItem) => productItem.id === item.productId);
      return { ...item, cost: Number(product?.cost) || 0, variant: product?.variant || "" };
    }),
    ...ticketMeta,
    ...totals,
  };

  products = products.map((product) => {
    const soldQty = cart.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.qty, 0);
    if (!soldQty) return product;
    return {
      ...product,
      stockByStore: {
        ...product.stockByStore,
        [store.id]: storeStock(product, store.id) - soldQty,
      },
    };
  });

  sales.push(sale);
  cart = [];
  cartStage = "order";
  els.cashInput.value = "";
  els.discountInput.value = 0;
  els.customerName.value = "";
  els.paymentReference.value = "";
  els.splitCashInput.value = 0;
  els.splitCardInput.value = 0;
  els.splitGcashInput.value = 0;
  els.splitBankInput.value = 0;
  els.cartPromoSelect.value = "";
  els.orderNote.value = "";
  els.orderType.value = "Dine-in";
  els.paymentMethod.value = "Cash";
  discountApprovalGranted = false;
  render();
  autoPrintAfterReceipt = Boolean(appSettings.autoPrintEnabled);
  showReceipt(sale);
  showToast(`Sale completed. ${sale.receipt}`);
}

function nextReceiptNumber(store) {
  const dateKey = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const prefix = `${store.code}-${dateKey}-`;
  const count = sales.filter((sale) => sale.storeId === store.id && sale.receipt?.startsWith(prefix)).length + 1;
  return `${prefix}${String(count).padStart(3, "0")}`;
}

function restoreSaleStock(sale) {
  products = products.map((product) => {
    const soldQty = sale.items.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.qty, 0);
    if (!soldQty) return product;
    return {
      ...product,
      stockByStore: {
        ...product.stockByStore,
        [sale.storeId]: storeStock(product, sale.storeId) + soldQty,
      },
    };
  });
}

function updateSaleStatus(saleId, status) {
  if (!requireManagerApproval(status.toLowerCase())) return;
  if (!confirmAction(`Mark this order as ${status.toLowerCase()}? Stock will be restored.`)) return;
  const sale = sales.find((item) => item.id === saleId);
  if (!sale) return;
  if ((sale.status || "Completed") !== "Completed") {
    showToast(`Order is already ${sale.status}.`);
    return;
  }
  restoreSaleStock(sale);
  sales = sales.map((item) =>
    item.id === saleId
      ? { ...item, status, statusAt: new Date().toISOString(), statusBy: cashier?.name || "Manager" }
      : item
  );
  render();
  showToast(`${sale.receipt} marked ${status.toLowerCase()}.`);
}

function saveProduct(event) {
  event.preventDefault();
  const id = document.querySelector("#productId").value || crypto.randomUUID();
  const existing = products.find((product) => product.id === id);
  const stockByStore = { ...(existing?.stockByStore || {}) };
  stockByStore[activeStoreId] = Number(document.querySelector("#productStock").value);
  const formData = {
    id,
    name: document.querySelector("#productName").value.trim(),
    sku: document.querySelector("#productSku").value.trim(),
    category: document.querySelector("#productCategory").value.trim(),
    options: document.querySelector("#productOptions").value.trim(),
    variant: els.productVariant.value.trim(),
    price: Number(document.querySelector("#productPrice").value),
    cost: Number(document.querySelector("#productCost").value) || 0,
    stockByStore,
  };
  products = existing ? products.map((product) => (product.id === id ? formData : product)) : [...products, formData];
  els.productForm.reset();
  document.querySelector("#productId").value = "";
  render();
  showToast("Cafe item saved for this store.");
}

function clearProductForm() {
  els.productForm.reset();
  document.querySelector("#productId").value = "";
}

function editProduct(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;
  document.querySelector("#productId").value = product.id;
  document.querySelector("#productName").value = product.name;
  document.querySelector("#productSku").value = product.sku;
  document.querySelector("#productCategory").value = product.category;
  document.querySelector("#productOptions").value = product.options || "";
  els.productVariant.value = product.variant || "";
  document.querySelector("#productPrice").value = product.price;
  document.querySelector("#productCost").value = product.cost || 0;
  document.querySelector("#productStock").value = storeStock(product);
  document.querySelector("#productName").focus();
}

function deleteProduct(productId) {
  if (!confirmAction("Delete this menu item from all branches?")) return;
  products = products.filter((product) => product.id !== productId);
  cart = cart.filter((item) => item.productId !== productId);
  recentProductIds = recentProductIds.filter((id) => id !== productId);
  render();
  showToast("Menu item deleted from all stores.");
}

function menuExportRows() {
  const headers = ["CATEGORY", "SUBCATEGORY", "ITEM", "PRICE", "COST"];
  const rows = products.map((product) => [
    product.category,
    product.options || "",
    product.name,
    product.price,
    product.cost || 0,
  ]);
  return [headers, ...rows];
}

function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportMenuCsv() {
  const csv = menuExportRows().map((row) => row.map(csvValue).join(",")).join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv" }), `cafecloud-menu-${new Date().toISOString().slice(0, 10)}.csv`);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function importMenuCsv(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const rows = parseCsv(String(reader.result || ""));
      const headers = rows.shift()?.map((header) => header.trim().toLowerCase()) || [];
      const categoryIndex = headers.indexOf("category");
      const subcategoryIndex = headers.indexOf("subcategory");
      const itemIndex = headers.indexOf("item");
      const priceIndex = headers.indexOf("price");
      const costIndex = headers.indexOf("cost");
      if ([categoryIndex, subcategoryIndex, itemIndex, priceIndex, costIndex].some((index) => index < 0)) {
        showToast("CSV needs CATEGORY, SUBCATEGORY, ITEM, PRICE, and COST columns.");
        return;
      }

      let imported = 0;
      rows.forEach((row) => {
        const category = row[categoryIndex]?.trim();
        const subcategory = row[subcategoryIndex]?.trim() || "";
        const name = row[itemIndex]?.trim();
        const price = Number(row[priceIndex]);
        const cost = Number(row[costIndex]) || 0;
        if (!name || !category || Number.isNaN(price)) return;

        const existing = products.find(
          (product) =>
            product.category.toLowerCase() === category.toLowerCase() &&
            product.name.toLowerCase() === name.toLowerCase() &&
            (product.options || "").toLowerCase() === subcategory.toLowerCase()
        );
        const stockByStore = { ...(existing?.stockByStore || Object.fromEntries(stores.map((store) => [store.id, 0]))) };
        const sku = existing?.sku || createSku(category, name, products.length + imported + 1);
        const product = { id: existing?.id || crypto.randomUUID(), name, sku, category, options: subcategory, variant: existing?.variant || "", price, cost, stockByStore };
        products = existing ? products.map((item) => (item.id === existing.id ? product : item)) : [...products, product];
        imported += 1;
      });

      render();
      showToast(`${imported} menu items imported.`);
    } catch {
      showToast("Could not import CSV.");
    } finally {
      els.importMenuCsvInput.value = "";
    }
  });
  reader.readAsText(file);
}

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index) {
  let name = "";
  let column = index + 1;
  while (column > 0) {
    const remainder = (column - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    column = Math.floor((column - remainder) / 26);
  }
  return name;
}

function sheetXml(rows) {
  const body = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, colIndex) => {
          const ref = `${columnName(colIndex)}${rowIndex + 1}`;
          if (typeof value === "number") return `<c r="${ref}"><v>${value}</v></c>`;
          return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function crc32(bytes) {
  let crc = -1;
  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}

function createZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  const write16 = (array, value) => {
    array.push(value & 255, (value >>> 8) & 255);
  };
  const write32 = (array, value) => {
    array.push(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255);
  };

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const checksum = crc32(dataBytes);
    const local = [];
    write32(local, 0x04034b50);
    write16(local, 20);
    write16(local, 0);
    write16(local, 0);
    write16(local, 0);
    write16(local, 0);
    write32(local, checksum);
    write32(local, dataBytes.length);
    write32(local, dataBytes.length);
    write16(local, nameBytes.length);
    write16(local, 0);
    localParts.push(new Uint8Array(local), nameBytes, dataBytes);

    const central = [];
    write32(central, 0x02014b50);
    write16(central, 20);
    write16(central, 20);
    write16(central, 0);
    write16(central, 0);
    write16(central, 0);
    write16(central, 0);
    write32(central, checksum);
    write32(central, dataBytes.length);
    write32(central, dataBytes.length);
    write16(central, nameBytes.length);
    write16(central, 0);
    write16(central, 0);
    write16(central, 0);
    write16(central, 0);
    write32(central, 0);
    write32(central, offset);
    centralParts.push(new Uint8Array(central), nameBytes);

    offset += local.length + nameBytes.length + dataBytes.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = [];
  write32(end, 0x06054b50);
  write16(end, 0);
  write16(end, 0);
  write16(end, files.length);
  write16(end, files.length);
  write32(end, centralSize);
  write32(end, offset);
  write16(end, 0);
  return new Blob([...localParts, ...centralParts, new Uint8Array(end)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function createXlsxBlob(rows, sheetName = "Sheet1") {
  const files = [
    {
      name: "[Content_Types].xml",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>',
    },
    {
      name: "_rels/.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>',
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    },
    { name: "xl/worksheets/sheet1.xml", content: sheetXml(rows) },
    {
      name: "docProps/core.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dcterms="http://purl.org/dc/terms/"><dcterms:created>${new Date().toISOString()}</dcterms:created></cp:coreProperties>`,
    },
    {
      name: "docProps/app.xml",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>CafeCloud POS</Application></Properties>',
    },
  ];
  return createZip(files);
}

function exportMenuXlsx() {
  downloadBlob(createXlsxBlob(menuExportRows(), "Menu"), `cafecloud-menu-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function clearCustomerForm() {
  els.customerForm.reset();
  els.customerRecordId.value = "";
}

function saveCustomer(event) {
  event.preventDefault();
  const id = els.customerRecordId.value || crypto.randomUUID();
  const record = {
    id,
    name: els.customerRecordName.value.trim(),
    phone: els.customerPhone.value.trim(),
    notes: els.customerNotes.value.trim(),
  };
  const exists = customers.some((customer) => customer.id === id);
  customers = exists ? customers.map((customer) => (customer.id === id ? record : customer)) : [...customers, record];
  clearCustomerForm();
  render();
  showToast("Customer saved.");
}

function editCustomer(customerId) {
  const customer = customers.find((item) => item.id === customerId);
  if (!customer) return;
  els.customerRecordId.value = customer.id;
  els.customerRecordName.value = customer.name;
  els.customerPhone.value = customer.phone || "";
  els.customerNotes.value = customer.notes || "";
  els.customerRecordName.focus();
}

function captureCustomer(name) {
  els.customerRecordId.value = "";
  els.customerRecordName.value = name;
  els.customerPhone.value = "";
  els.customerNotes.value = "";
  els.customerRecordName.focus();
}

function deleteCustomer(customerId) {
  if (!confirmAction("Delete this customer profile?")) return;
  customers = customers.filter((customer) => customer.id !== customerId);
  clearCustomerForm();
  render();
  showToast("Customer deleted.");
}

function clearPromoForm() {
  els.promoForm.reset();
  els.promoId.value = "";
  els.promoActive.checked = true;
}

function savePromotion(event) {
  event.preventDefault();
  const id = els.promoId.value || crypto.randomUUID();
  const promo = {
    id,
    name: els.promoName.value.trim(),
    percent: Number(els.promoPercent.value) || 0,
    active: els.promoActive.checked,
  };
  const exists = promotions.some((item) => item.id === id);
  promotions = exists ? promotions.map((item) => (item.id === id ? promo : item)) : [...promotions, promo];
  clearPromoForm();
  render();
  showToast("Promotion saved.");
}

function editPromotion(promoId) {
  const promo = promotions.find((item) => item.id === promoId);
  if (!promo) return;
  els.promoId.value = promo.id;
  els.promoName.value = promo.name;
  els.promoPercent.value = promo.percent;
  els.promoActive.checked = promo.active;
  els.promoName.focus();
}

function deletePromotion(promoId) {
  if (!confirmAction("Delete this promotion?")) return;
  promotions = promotions.filter((promo) => promo.id !== promoId);
  clearPromoForm();
  render();
  showToast("Promotion deleted.");
}

function clearEmployeeForm() {
  els.employeeForm.reset();
  els.employeeId.value = "";
  els.employeeStore.value = activeStoreId || stores[0]?.id;
  els.employeeStatus.value = "Active";
}

function saveEmployee(event) {
  event.preventDefault();
  const id = els.employeeId.value || crypto.randomUUID();
  if (cashier?.role !== "admin" && els.employeeRole.value === "admin") {
    showToast("Only Admin can create admin users.");
    return;
  }
  const employee = {
    id,
    name: els.employeeName.value.trim(),
    role: els.employeeRole.value,
    storeId: cashier?.role === "admin" ? els.employeeStore.value || activeStoreId : activeStoreId,
    pin: els.employeePin.value.trim(),
    status: els.employeeStatus.value,
  };
  const exists = employees.some((item) => item.id === id);
  employees = exists ? employees.map((item) => (item.id === id ? employee : item)) : [...employees, employee];
  if (cashier?.employeeId === id) cashier = { ...cashier, name: employee.name, role: employee.role };
  clearEmployeeForm();
  render();
  showToast("Employee saved.");
}

function editEmployee(employeeId) {
  const employee = employees.find((item) => item.id === employeeId);
  if (!employee) return;
  if (cashier?.role !== "admin" && employee.storeId !== activeStoreId) {
    showToast("You can only edit employees in your branch.");
    return;
  }
  els.employeeId.value = employee.id;
  els.employeeName.value = employee.name;
  els.employeeRole.value = employee.role;
  els.employeeStore.value = employee.storeId || stores[0]?.id;
  els.employeePin.value = employee.pin;
  els.employeeStatus.value = employee.status;
  els.employeeName.focus();
}

function deleteEmployee(employeeId) {
  if (cashier?.employeeId === employeeId) {
    showToast("You cannot delete the signed-in employee.");
    return;
  }
  const employee = employees.find((item) => item.id === employeeId);
  if (cashier?.role !== "admin" && (employee?.role === "admin" || employee?.storeId !== activeStoreId)) {
    showToast("You can only delete employees in your branch.");
    return;
  }
  if (!confirmAction(`Delete ${employee?.name || "this employee"}?`)) return;
  employees = employees.filter((employee) => employee.id !== employeeId);
  clearEmployeeForm();
  render();
  showToast("Employee deleted.");
}

function saveStore(event) {
  event.preventDefault();
  const id = document.querySelector("#storeId").value || crypto.randomUUID();
  const store = {
    id,
    name: document.querySelector("#storeName").value.trim(),
    code: document.querySelector("#storeCode").value.trim().toUpperCase(),
    location: document.querySelector("#storeLocation").value.trim(),
  };
  const exists = stores.some((item) => item.id === id);
  stores = exists ? stores.map((item) => (item.id === id ? store : item)) : [...stores, store];
  products = products.map((product) => ({
    ...product,
    stockByStore: { ...product.stockByStore, [store.id]: storeStock(product, store.id) },
  }));
  activeStoreId = store.id;
  selectedStockStoreId = store.id;
  cart = [];
  els.storeForm.reset();
  document.querySelector("#storeId").value = "";
  render();
  showToast("Store saved.");
}

function editStore(storeId) {
  const store = stores.find((item) => item.id === storeId);
  if (!store) return;
  document.querySelector("#storeId").value = store.id;
  document.querySelector("#storeName").value = store.name;
  document.querySelector("#storeCode").value = store.code;
  document.querySelector("#storeLocation").value = store.location;
  document.querySelector("#storeName").focus();
}

function switchStore(storeId) {
  if (cashier && cashier.role !== "admin" && storeId !== activeStoreId) {
    showToast(`${roleName(cashier.role)} is assigned to one branch.`);
    els.storeSelect.value = activeStoreId;
    return;
  }
  activeStoreId = storeId;
  if (!selectedStockStoreId) selectedStockStoreId = storeId;
  cart = [];
  cartStage = "order";
  els.cashInput.value = "";
  els.discountInput.value = 0;
  els.customerName.value = "";
  els.orderNote.value = "";
  render();
  showToast(`Now using ${activeStore().name}.`);
}

function login(event) {
  event.preventDefault();
  ensureDefaultEmployees();
  const pin = els.loginPin.value.trim();
  const role = els.loginRole.value;
  const activeEmployees = employees.filter((item) => (item.status || "Active") === "Active");
  const employee =
    activeEmployees.find((item) => item.role === role && item.pin === pin) ||
    activeEmployees.find((item) => item.pin === pin);
  if (!employee) {
    showToast("Invalid PIN.");
    els.loginPin.select();
    return;
  }
  cashier = {
    employeeId: employee.id,
    name: els.loginName.value.trim() || employee.name,
    role: employee.role,
    storeId: employee.storeId || activeStoreId,
    signedInAt: new Date().toISOString(),
  };
  if (employee.storeId && stores.some((store) => store.id === employee.storeId)) activeStoreId = employee.storeId;
  selectedStockStoreId = activeStoreId;
  els.loginForm.reset();
  render();
  if (!canAccessView([...els.tabs].find((tab) => tab.classList.contains("active"))?.dataset.view || "register", cashier.role)) {
    setActiveView("register");
  }
  showToast(`Welcome, ${cashier.name}.`);
}

function logout() {
  cashier = null;
  cart = [];
  cartStage = "order";
  els.cashInput.value = "";
  els.discountInput.value = 0;
  els.customerName.value = "";
  els.paymentReference.value = "";
  els.orderNote.value = "";
  render();
  showToast("Signed out.");
}

function restoreDemoProducts() {
  if (!confirmAction("Restore cafe demo and clear current sales/menu data?")) return;
  stores = demoStores.map((store) => ({ ...store }));
  products = demoMenu.map((product) => ({ ...product, id: crypto.randomUUID(), stockByStore: { ...product.stockByStore } }));
  sales = [];
  customers = [];
  employees = demoEmployees.map((employee) => ({ ...employee }));
  promotions = demoPromotions.map((promo) => ({ ...promo }));
  cart = [];
  recentProductIds = [];
  activeStoreId = stores[0].id;
  selectedStockStoreId = stores[0].id;
  render();
  showToast("Cafe demo restored for all stores.");
}

function exportSales() {
  const header = "Store,Receipt,Date,Order Type,Name or Table,Payment,Reference,Note,Items,Subtotal,Discount,Tax,Service Fee,Total,Cash,Change";
  const rows = activeCompletedSales().map((sale) => {
    const items = sale.items.map((item) => `${item.qty}x ${item.name}${item.variant ? ` (${item.variant})` : ""}`).join("; ");
    return [
      sale.storeName,
      sale.receipt,
      sale.createdAt,
      sale.orderType || "Dine-in",
      sale.customerName || "",
      sale.paymentMethod || "Cash",
      sale.paymentReference || "",
      sale.orderNote || "",
      items,
      sale.subtotal,
      sale.discount,
      sale.tax,
      sale.serviceFee || 0,
      sale.total,
      sale.cash,
      sale.change,
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",");
  });
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const code = activeStore()?.code || "store";
  link.href = url;
  link.download = `cafecloud-${code}-sales-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportBackup() {
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    stores,
    products,
    sales,
    customers,
    employees,
    promotions,
    appSettings,
    recentProductIds,
    activeStoreId,
    selectedStockStoreId,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cafecloud-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!confirmAction("Import this backup and replace current POS data?")) {
    els.importBackupInput.value = "";
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const backup = JSON.parse(reader.result);
      stores = backup.stores || stores;
      products = normalizeProducts(backup.products || products);
      sales = backup.sales || sales;
      customers = backup.customers || customers;
      employees = backup.employees || employees;
      ensureDefaultEmployees();
      promotions = backup.promotions || promotions;
      appSettings = { ...DEFAULT_APP_SETTINGS, ...(backup.appSettings || appSettings) };
      recentProductIds = backup.recentProductIds || recentProductIds;
      activeStoreId = backup.activeStoreId || stores[0]?.id;
      selectedStockStoreId = backup.selectedStockStoreId || activeStoreId;
      cart = [];
      render();
      showToast("Backup imported.");
    } catch {
      showToast("Could not import backup.");
    } finally {
      els.importBackupInput.value = "";
    }
  });
  reader.readAsText(file);
}

function showReceipt(sale) {
  const store = stores.find((item) => item.id === sale.storeId) || activeStore();
  const header = appSettings.receiptHeader || `${store.name}\n${store.location}`;
  const footer = appSettings.receiptFooter || "Thank you.";
  els.receiptPaper.classList.toggle("paper-80", String(appSettings.printerPaperWidth) === "80");
  els.receiptPaper.classList.toggle("paper-58", String(appSettings.printerPaperWidth) !== "80");
  els.receiptPaper.innerHTML = `
    <div class="receipt-custom-text receipt-center">${formatReceiptText(header)}</div>
    <p class="receipt-center">${escapeHtml(sale.receipt)}</p>
    <p class="receipt-center">${new Date(sale.createdAt).toLocaleString()}</p>
    <div class="receipt-line"><span>Cashier</span><strong>${escapeHtml(sale.cashierName || "Cashier")}</strong></div>
    <div class="receipt-line"><span>Status</span><strong>${escapeHtml(sale.status || "Completed")}</strong></div>
    <div class="receipt-line"><span>Order</span><strong>${escapeHtml(sale.orderType || "Dine-in")}</strong></div>
    ${
      sale.customerName
        ? `<div class="receipt-line"><span>Name/Table</span><strong>${escapeHtml(sale.customerName)}</strong></div>`
        : ""
    }
    <div class="receipt-line"><span>Payment</span><strong>${escapeHtml(sale.paymentMethod || "Cash")}</strong></div>
    ${sale.paymentReference ? `<div class="receipt-line"><span>Reference</span><strong>${escapeHtml(sale.paymentReference)}</strong></div>` : ""}
    ${
      sale.splitPayments
        ? Object.entries(sale.splitPayments)
            .filter(([, amount]) => Number(amount) > 0)
            .map(([method, amount]) => `<div class="receipt-line"><span>${escapeHtml(method)}</span><strong>${money(amount)}</strong></div>`)
            .join("")
        : ""
    }
    ${sale.items
      .map(
        (item) => `
          <div class="receipt-line">
            <span>${item.qty} x ${escapeHtml(item.name)}${item.variant ? ` (${escapeHtml(item.variant)})` : ""}</span>
            <strong>${money(item.qty * item.price)}</strong>
          </div>
        `
      )
      .join("")}
    ${sale.orderNote ? `<div class="receipt-line"><span>Note</span><strong>${escapeHtml(sale.orderNote)}</strong></div>` : ""}
    <div class="receipt-line"><span>Subtotal</span><strong>${money(sale.subtotal)}</strong></div>
    <div class="receipt-line"><span>Discount</span><strong>${money(sale.discount)}</strong></div>
    ${sale.tax ? `<div class="receipt-line"><span>Tax</span><strong>${money(sale.tax)}</strong></div>` : ""}
    ${sale.serviceFee ? `<div class="receipt-line"><span>Service fee</span><strong>${money(sale.serviceFee)}</strong></div>` : ""}
    <div class="receipt-line receipt-total"><span>Total</span><strong>${money(sale.total)}</strong></div>
    <div class="receipt-line"><span>Cash</span><strong>${money(sale.cash)}</strong></div>
    <div class="receipt-line"><span>Change</span><strong>${money(sale.change)}</strong></div>
    <div class="receipt-custom-text receipt-center receipt-footer-text">${formatReceiptText(footer)}</div>
  `;
  els.receiptModal.classList.add("show");
  els.receiptModal.setAttribute("aria-hidden", "false");
  if (autoPrintAfterReceipt) {
    autoPrintAfterReceipt = false;
    window.setTimeout(printCurrentReceipt, 250);
  }
}

function formatReceiptText(value) {
  return escapeHtml(value)
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => `<p>${line}</p>`)
    .join("");
}

function closeReceipt() {
  els.receiptModal.classList.remove("show");
  els.receiptModal.setAttribute("aria-hidden", "true");
}

function printCurrentReceipt() {
  if (window.AndroidPrinter?.printText) {
    window.AndroidPrinter.printText(els.receiptPaper.innerText, String(appSettings.printerPaperWidth || "58"));
    return;
  }
  window.print();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 2600);
}

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveView(tab.dataset.view);
  });
});

els.loginForm.addEventListener("submit", login);
els.logoutBtn.addEventListener("click", logout);
els.sidebarToggle.addEventListener("click", () => setSidebarOpen(!document.body.classList.contains("sidebar-open")));
els.sidebarBackdrop.addEventListener("click", closeSidebar);
els.searchToggle.addEventListener("click", () => {
  els.topbarSearch.classList.toggle("show");
  els.productSearch.focus();
});
els.storeSelect.addEventListener("change", (event) => switchStore(event.target.value));
els.stockBranchSelect.addEventListener("change", (event) => {
  selectedStockStoreId = event.target.value;
  clearStockForm();
  renderStockOverview();
});
els.stockProductSelect.addEventListener("change", (event) => loadStockForm(event.target.value));
els.stockForm.addEventListener("submit", saveStock);
els.stockNewItemForm.addEventListener("submit", addStockItem);
els.clearStockFormBtn.addEventListener("click", clearStockForm);
els.exportStockCsvBtn.addEventListener("click", exportStockCsv);
els.exportStockXlsxBtn.addEventListener("click", exportStockXlsx);
els.exportAllStockCsvBtn.addEventListener("click", exportAllStockCsv);
els.importStockCsvInput.addEventListener("change", importStockCsv);
els.stockTable.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-stock-edit-id]");
  const zeroButton = event.target.closest("[data-stock-zero-id]");
  const deleteButton = event.target.closest("[data-stock-delete-id]");
  if (editButton) loadStockForm(editButton.dataset.stockEditId);
  if (zeroButton) zeroBranchStock(zeroButton.dataset.stockZeroId);
  if (deleteButton) deleteProduct(deleteButton.dataset.stockDeleteId);
});
els.orderDateFilter.addEventListener("input", (event) => {
  orderFilters.date = event.target.value;
  renderOrders();
});
els.orderPaymentFilter.addEventListener("change", (event) => {
  orderFilters.payment = event.target.value;
  renderOrders();
});
els.orderStatusFilter.addEventListener("change", (event) => {
  orderFilters.status = event.target.value;
  renderOrders();
});
els.clearOrderFiltersBtn.addEventListener("click", () => {
  orderFilters = { date: "", payment: "All", status: "All" };
  els.orderDateFilter.value = "";
  els.orderPaymentFilter.value = "All";
  els.orderStatusFilter.value = "All";
  renderOrders();
});
els.categoryTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  const firstProduct = products.find((product) => product.category === activeCategory);
  activeSubcategory = firstProduct?.options || "General";
  render();
});
els.subcategoryTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-subcategory]");
  if (!button) return;
  activeSubcategory = button.dataset.subcategory;
  render();
});
els.productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-product-id]");
  if (button) addToCart(button.dataset.productId);
});
els.recentItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-recent-product-id]");
  if (button) addToCart(button.dataset.recentProductId);
});
els.cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart-action]");
  if (!button) return;
  updateCart(button.dataset.lineId, button.dataset.cartAction === "increase" ? 1 : -1);
});
els.inventoryTable.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-id]");
  const deleteButton = event.target.closest("[data-delete-id]");
  if (editButton) editProduct(editButton.dataset.editId);
  if (deleteButton) deleteProduct(deleteButton.dataset.deleteId);
});
els.clearProductFormBtn.addEventListener("click", clearProductForm);
els.customerForm.addEventListener("submit", saveCustomer);
els.clearCustomerFormBtn.addEventListener("click", clearCustomerForm);
els.customersTable.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-customer]");
  const deleteButton = event.target.closest("[data-delete-customer]");
  const captureButton = event.target.closest("[data-customer-capture]");
  if (editButton) editCustomer(editButton.dataset.editCustomer);
  if (deleteButton) deleteCustomer(deleteButton.dataset.deleteCustomer);
  if (captureButton) captureCustomer(captureButton.dataset.customerCapture);
});
els.promotionCards.addEventListener("click", (event) => {
  const button = event.target.closest("[data-apply-promo]");
  if (!button) return;
  const promo = promotions.find((item) => item.id === button.dataset.applyPromo);
  if (promo) applyPromo(Number(promo.percent) || 0, promo.name);
});
els.promoForm.addEventListener("submit", savePromotion);
els.clearPromoFormBtn.addEventListener("click", clearPromoForm);
els.promotionsTable.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-promo]");
  const deleteButton = event.target.closest("[data-delete-promo]");
  if (editButton) editPromotion(editButton.dataset.editPromo);
  if (deleteButton) deletePromotion(deleteButton.dataset.deletePromo);
});
els.employeeForm.addEventListener("submit", saveEmployee);
els.clearEmployeeFormBtn.addEventListener("click", clearEmployeeForm);
els.employeesTable.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-employee]");
  const deleteButton = event.target.closest("[data-delete-employee]");
  if (editButton) editEmployee(editButton.dataset.editEmployee);
  if (deleteButton) deleteEmployee(deleteButton.dataset.deleteEmployee);
});
function handleReceiptClick(event) {
  const receiptButton = event.target.closest("[data-receipt-id]");
  const voidButton = event.target.closest("[data-void-sale]");
  const refundButton = event.target.closest("[data-refund-sale]");
  if (receiptButton) {
    const sale = sales.find((item) => item.id === receiptButton.dataset.receiptId);
    if (sale) showReceipt(sale);
  }
  if (voidButton) updateSaleStatus(voidButton.dataset.voidSale, "Voided");
  if (refundButton) updateSaleStatus(refundButton.dataset.refundSale, "Refunded");
}

els.salesList.addEventListener("click", handleReceiptClick);
els.ordersList.addEventListener("click", handleReceiptClick);
els.storeGrid.addEventListener("click", (event) => {
  const useButton = event.target.closest("[data-use-store]");
  const editButton = event.target.closest("[data-edit-store]");
  if (useButton) switchStore(useButton.dataset.useStore);
  if (editButton) editStore(editButton.dataset.editStore);
});

els.productSearch.addEventListener("input", renderProducts);
els.discountInput.addEventListener("input", renderCart);
els.discountInput.addEventListener("change", () => {
  if ((Number(els.discountInput.value) || 0) > 0 && !discountApprovalGranted) {
    if (!requireManagerApproval("manual discount")) {
      els.discountInput.value = 0;
    } else {
      discountApprovalGranted = true;
    }
    renderCart();
  }
});
els.adjustmentTabs.forEach((button) => {
  button.addEventListener("click", () => setAdjustmentTab(button.dataset.adjustmentTab));
});
els.cashInput.addEventListener("input", renderCart);
[
  els.cashInput,
  els.splitCashInput,
  els.splitCardInput,
  els.splitGcashInput,
  els.splitBankInput,
].forEach((input) => {
  input.addEventListener("focus", () => {
    activeTenderInput = input;
  });
});
els.paymentMethod.addEventListener("change", renderCart);
els.paymentReference.addEventListener("input", renderCart);
els.cartPromoSelect.addEventListener("change", applySelectedCartPromo);
[els.splitCashInput, els.splitCardInput, els.splitGcashInput, els.splitBankInput].forEach((input) => {
  input.addEventListener("input", renderCart);
});
els.paymentKeypad.addEventListener("click", (event) => {
  const button = event.target.closest("[data-keypad]");
  if (!button) return;
  const input = activeTenderInput || els.cashInput;
  const value = button.dataset.keypad;
  input.value = value === "clear" ? "" : `${input.value || ""}${value}`;
  input.dispatchEvent(new Event("input"));
});
els.lowStockAlert.addEventListener("click", () => {
  if (canAccessView("stock")) setActiveView("stock");
  else showToast(els.lowStockAlert.title);
});
els.clearCartBtn.addEventListener("click", () => {
  if (!confirmAction("Clear the current order?")) return;
  cart = [];
  cartStage = "order";
  discountApprovalGranted = false;
  renderCart();
});
els.goCheckoutBtn.addEventListener("click", () => {
  if (!cart.length) return;
  setCartStage("checkout");
  activeTenderInput = els.paymentMethod.value === "Split" ? els.splitCashInput : els.cashInput;
});
els.backToOrderBtn.addEventListener("click", () => setCartStage("order"));
els.checkoutBtn.addEventListener("click", checkout);
els.closeReceiptBtn.addEventListener("click", closeReceipt);
els.printReceiptBtn.addEventListener("click", printCurrentReceipt);
els.receiptModal.addEventListener("click", (event) => {
  if (event.target === els.receiptModal) closeReceipt();
});
els.productForm.addEventListener("submit", saveProduct);
els.exportMenuCsvBtn.addEventListener("click", exportMenuCsv);
els.exportMenuXlsxBtn.addEventListener("click", exportMenuXlsx);
els.importMenuCsvInput.addEventListener("change", importMenuCsv);
els.storeForm.addEventListener("submit", saveStore);
els.seedBtn.addEventListener("click", restoreDemoProducts);
els.exportBtn.addEventListener("click", exportSales);
els.feeSettingsForm.addEventListener("submit", saveFeeSettings);
els.receiptSettingsForm.addEventListener("submit", saveReceiptSettings);
els.connectPrinterBtn.addEventListener("click", connectPrinter);
els.exportBackupBtn.addEventListener("click", exportBackup);
els.importBackupInput.addEventListener("change", importBackup);

render();
loadBackendState();
renderClock();
window.setInterval(renderClock, 30000);

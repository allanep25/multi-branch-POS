# CafeCloud POS

A starter multi-store cafe point-of-sale system built as a dependency-free browser app.

## Run

Open `index.html` in a browser.

Use demo PIN `1234` for Cashier, `9999` for Manager, or `0000` for Admin.

For shared JSON storage while prototyping, run:

```bash
node server.js
```

Then open `http://localhost:4173`.

## Android Wrapper

An Android WebView wrapper with a Bluetooth ESC/POS print bridge is in `android-wrapper`.

Open `android-wrapper` in Android Studio, sync Gradle, then run it on an Android tablet or phone. The build copies `index.html`, `styles.css`, and `app.js` into Android assets automatically.

## Current Features

- Multi-store branch switcher
- Demo cashier login and logout flow
- Admin, Manager, and Cashier role modes
- Functional sidebar workspaces for POS, Orders, Customers, Menu, Inventory, Promotions, Reports, Branches, Employees, and Settings
- Cafe menu catalog with category filters and search
- Menu CSV/XLSX export and CSV import with `CATEGORY, SUBCATEGORY, ITEM, PRICE, COST`
- Richer menu tiles with subcategory labels
- Optional item variants such as sizes or portions
- Ticket details for dine-in, takeaway, delivery, name/table, payment method, and order notes
- Payment reference field and exact cash shortcuts
- Split payments across cash, card, GCash, and bank transfer
- Promo selector directly in the checkout panel
- Cart quantity controls
- Discount, tax, cash tendered, and change calculation
- Editable tax and service fee settings with on/off toggles
- Checkout flow that reduces inventory stock only for the active store
- Printable receipt modal after checkout and from transaction history
- Custom receipt header/footer text
- Thermal printer profile settings for generic Bluetooth 58mm or 80mm printers
- Order filters by date, payment, and status
- Order actions for receipt, void, and refund
- Daily receipt numbering by branch
- Product create, edit, delete, and cafe demo inventory reset
- Per-branch inventory quantities with an Inventory branch selector
- Inventory stock add, edit, zero, and item delete controls per branch
- Inventory stock CSV/XLSX export and stock CSV import
- Per-store sales history with gross sales, transaction count, average order, and CSV export
- Profit reporting with cost of goods, gross profit, and margin
- Store management for adding and editing branches
- Customer add, edit, delete, and summaries derived from named/table sales
- Promotion add, edit, delete, and quick ticket discounts
- Employee add, edit, delete, PINs, active/inactive status, and role-based access
- Employee branch assignment for manager and cashier logins
- Backup export/import for moving local data between devices during prototyping
- Browser `localStorage` persistence with optional `server.js` JSON backend sync

## Notes

This is still an MVP. It is suitable for prototyping workflows, but a production cafe POS should add hardened authentication, a real database, payment integration, audit logs, kitchen tickets, barcode scanning, inter-store transfers, and server-side validation.

# Local Inventory POS – Backend Plan

## Context
- **Product:** Inventory management and POS system for store owners in Liberia.
- **Current Phase:** Backend scaffold is created. Next phase is the owner-facing React frontend in `localinventorypos/frontend` and connecting it to the backend.
- **Backend Project Root:** `localinventorypos/backend`.
- **Frontend Project Root:** `localinventorypos/frontend`.
- **Admin Project Root:** `localinventorypos/admin`.
- **Primary Reference Backend:** `realmencigars/backend` because it already implements a similar inventory/POS flow.
- **Database Reference Backend:** `localinventory/backend` because this project must use Firebase Firestore instead of MongoDB.
- **Implementation Language:** JavaScript only. No TypeScript.

## Stack
- Node.js + Express.
- Firebase Admin SDK with Firestore as the database.
- CommonJS modules.
- `cors`, `dotenv`, `express-session`, `express-async-handler`.
- `multer` is available for upload handling if product images/files are needed.
- React frontend is the next implementation phase and should connect directly to this backend.

## Guiding Differences From `realmencigars/backend`
- Do **not** use MongoDB or Mongoose.
- Use Firestore data-access modules like `localinventory/backend/models/*Model.js`.
- Do **not** include multiple store staff roles such as cashier, manager, employee, etc.
- Store-owner accounts get access to all owner modules for their assigned store.
- Include a `superadmin` account type for platform administration.
- `superadmin` creates store-owner accounts and assigns each account to a store.
- Backend middleware validation should be intentionally lax for now.
- Authorization can be simple and frontend-trusting, similar to the relaxed model used in `localinventory/backend`.
- Start with only these modules:
  - Inventory.
  - Cashier / POS checkout.
  - Simple sales.
  - Credit.
  - Reports.

## Architecture Conventions
- `server.js` – Express bootstrap, CORS, sessions, JSON body limits, route mounting, health check, error middleware.
- `config.js` – Firebase Admin initialization and `db` export.
- `models/` – thin Firestore collection wrappers. Each model should expose functions such as `findAll`, `findById`, `create`, `update`, `remove`, and module-specific queries.
- `controllers/` – request handlers, business logic, stock adjustments, totals, and response shaping.
- `routes/` – Express routers for each module.
- `middleware/` – minimal auth/role helpers and centralized error handling.
- `utils/` – shared helpers for currency, dates, IDs, totals, and password hashing.
- `seeds/` – optional script for creating the first `superadmin` account.

## Auth and Account Model

### Account Types
- `superadmin` – platform operator. Can create and manage store-owner accounts and stores.
- `owner` – store owner. Has access to all app modules for their assigned store.

There should be no separate cashier, manager, or employee roles in this project.

### Auth Approach
- Keep middleware lax at this stage.
- Prefer simple session/header-based identity support following `localinventory/backend` patterns.
- Frontend can later send trusted headers such as `x-user-id` and `x-user-role` if needed.
- Backend should still consistently scope owner data by `ownerId` and/or `storeId`.

### Users Collection: `users`
- `username` or `email` – unique login identifier.
- `password` – hashed password.
- `role` – `superadmin` or `owner`.
- `displayName`.
- `phone`.
- `isActive`.
- `storeId` – required for owner accounts, omitted or empty for superadmin.
- `baseCurrency` – `LRD` or `USD`, default `LRD`.
- `exchangeRateUsdToLrd` – default exchange rate for the store/account.
- `createdAt`, `updatedAt`.

## Store Model

### Stores Collection: `stores`
- `ownerId` – user ID for the store owner account.
- `name`.
- `location`.
- `description`.
- `phone`.
- `isActive`.
- `baseCurrency`.
- `exchangeRateUsdToLrd`.
- `createdAt`, `updatedAt`.

Initial assumption: one owner account is assigned to one store. The model can support more later, but the first implementation should keep the store-owner mapping simple.

## Initial Modules

## 1. Inventory
Reference: `realmencigars/backend/models/Product.js`, adapted to Firestore.

### Products Collection: `products`
- `storeId`.
- `ownerId`.
- `itemID` – store-scoped item code/SKU.
- `productName`.
- `category`.
- `brand`.
- `quantityInStock`.
- `unitCost`.
- `sellingPriceLRD`.
- `sellingPriceUSD`.
- `restockLevel`.
- `supplier`.
- `notes`.
- `barcode`.
- `image`.
- `createdAt`, `updatedAt`.

### Inventory API: `/api/products`
- `GET /` – list products for current store.
- `POST /` – create product.
- `GET /:id` – get product detail.
- `PUT /:id` – update product.
- `DELETE /:id` – delete product.
- Optional later: `POST /:id/restock` for stock increases.

### Inventory Rules
- Products are unique by `storeId + itemID` or `storeId + barcode` where available.
- Stock changes should be performed through sale/restock logic where possible.
- Low stock reports should use `quantityInStock <= restockLevel`.

## 2. Cashier / POS Checkout
Reference: `realmencigars/backend/models/Transaction.js`, simplified.

### Transactions Collection: `transactions`
- `storeId`.
- `ownerId`.
- `date` or `occurredAt`.
- `type` – `sale`, `restock`, `return` if needed.
- `currency` – `LRD`, `USD`, `BOTH`, or `CREDIT`.
- `paymentMethod` – `Cash`, `POS`, `Mobile Money`, or other simple string.
- `customerName`.
- `creditId` – when sale is on credit.
- `productsSold` array:
  - `productId`.
  - `productName`.
  - `quantity`.
  - `priceAtSale.USD`.
  - `priceAtSale.LRD`.
  - `unitCostAtSale` if needed for profit reporting.
- `discountType` – `percentage`, `fixed_lrd`, `fixed_usd`, `none`.
- `discountValue`.
- `discountAmount`.
- `subtotalLRD`.
- `subtotalUSD`.
- `amountReceivedLRD`.
- `amountReceivedUSD`.
- `change`.
- `changeCurrency`.
- `totalLRD`.
- `totalUSD`.
- `createdAt`, `updatedAt`.

### Cashier API: `/api/transactions`
- `GET /` – list transactions by store/date filters.
- `POST /` – create checkout transaction and reduce inventory.
- `GET /:id` – get transaction detail.
- Optional later: `POST /:id/return` for returns.

### Cashier Rules
- Sale creation should snapshot prices at sale time.
- Sale creation should reduce `products.quantityInStock`.
- Reject or warn on insufficient stock depending on chosen lax behavior; default should protect against negative stock.
- Support LRD, USD, and mixed payment behavior because Liberian stores commonly use both currencies.

## 3. Simple Sales
Simple sales are the reporting-friendly sale records generated by cashier transactions.

### Sales Behavior
- A normal POS checkout creates a `transactions` document with `type = sale`.
- Reports can aggregate directly from `transactions`.
- If a separate `sales` collection is later needed, it should be derived from transactions and not duplicate business logic prematurely.

### Sales API
- Prefer using `/api/transactions` for initial implementation.
- Add `/api/sales` only if the frontend needs a simplified sales-only route.

## 4. Credit
Reference: `realmencigars/backend/models/Credit.js`, adapted to Firestore.

### Credits Collection: `credits`
- `storeId`.
- `ownerId`.
- `date` or `occurredAt`.
- `customerName`.
- `status` – `pending` or `paid`.
- `preferredCurrency` – `LRD` or `USD`.
- `productsSold` array with product snapshots.
- `totalLRD`.
- `totalUSD`.
- `paidAt`.
- `transactionId` – original credit sale transaction.
- `paymentTransactionId` – payment transaction when credit is paid.
- `createdAt`, `updatedAt`.

### Credit API: `/api/credits`
- `GET /` – list credits by store/status/customer/date.
- `POST /` – create credit sale and reduce inventory.
- `GET /:id` – get credit detail.
- `PUT /:id` – update credit metadata/status if needed.
- `POST /:id/pay` – mark credit paid and create payment transaction.

### Credit Rules
- Creating a credit should also create a transaction with `currency = CREDIT`.
- Paying a credit should preserve the original sale details and record payment separately.
- Credit balances should be included in reports.

## 5. Reports
Reports should be built from Firestore queries over products, transactions, and credits.

### Reports API: `/api/reports`
- `GET /overview` – sales totals, inventory value, credit totals, profit estimate.
- `GET /sales` – sales by date range.
- `GET /inventory` – inventory value and low-stock products.
- `GET /credits` – pending vs paid credit totals.
- `GET /cashier` – payment method/currency summaries.

### Report Query Params
- `storeId` for superadmin views.
- `from` and `to` ISO date filters.
- `year`, `month`, `day` convenience filters.
- `currency` display preference: `LRD` or `USD`.

## Superadmin Module

### Admin API: `/api/admin`
- `POST /stores` – create store.
- `GET /stores` – list stores.
- `GET /stores/:id` – get store detail.
- `PUT /stores/:id` – update store.
- `POST /owners` – create store-owner account and assign store.
- `GET /owners` – list owner accounts.
- `GET /owners/:id` – get owner account detail.
- `PUT /owners/:id` – update account, active status, password, or assigned store.
- `GET /overview` – platform-level overview.

### Store Owner Account Creation Flow
1. Superadmin creates a store.
2. Superadmin creates an owner account.
3. Owner account receives `storeId` and role `owner`.
4. Owner logs in and can access inventory, cashier, simple sales, credit, and reports for that store.

## Currency Handling
- Support `LRD` and `USD` from the beginning.
- Store transaction totals in both currencies when possible.
- Store native entered amounts without unnecessary rewrites.
- Use `exchangeRateUsdToLrd` from the store or owner account for conversions.
- Add `utils/currency.js` with conversion helpers similar to `localinventory/backend`.

## Date Handling
- Store `createdAt` and `updatedAt` as ISO strings.
- Transactional records should also store `occurredAt` or `date` for business reporting.
- Add date range helper utilities for `from`, `to`, `year`, `month`, and `day` query filters.

## Firestore Implementation Notes
- Avoid Mongoose-style schemas; use default objects in model modules.
- Firestore models should return plain objects with `{ id, ...data }`.
- Use Firestore increments for stock adjustments where possible.
- Use transactions/batches for checkout flows that update product quantities and create transaction/credit records together.
- Keep document arrays reasonable; transaction line items are acceptable for normal receipts.

## Initial Backend File Plan
```text
backend/
  config.js
  server.js
  middleware/
    auth.js
    errorMiddleware.js
  models/
    userModel.js
    storeModel.js
    productModel.js
    transactionModel.js
    creditModel.js
  controllers/
    userController.js
    adminController.js
    productController.js
    transactionController.js
    creditController.js
    reportController.js
  routes/
    userRoutes.js
    adminRoutes.js
    productRoutes.js
    transactionRoutes.js
    creditRoutes.js
    reportRoutes.js
  utils/
    encryption.js
    currency.js
    dateRange.js
  seeds/
    seedSuperadmin.js
```

## Frontend Plan – Owner App (`localinventorypos/frontend`)

### Frontend Context
- The frontend project already exists at `localinventorypos/frontend`.
- It is a Create React App style React project.
- Use React and JavaScript only. No TypeScript.
- Use `realmencigars/frontend` as the primary owner-app structure reference.
- Use `localinventory/admin` as an additional reference for clean React routing, API helpers, contexts, layout, and styled-components organization.
- Build only the store-owner frontend for now.
- Do not build the superadmin/admin panel in this frontend. A separate admin project will be created later.

### Frontend Dependencies Already Available
- `react`
- `react-dom`
- `react-router-dom`
- `styled-components`
- `react-icons`
- `react-datepicker`
- `react-to-print`
- `xlsx`
- `react-scripts`

### Frontend Theme
- Use a clean white and purple color scheme.
- Suggested palette:
  - Primary purple: `#6D28D9`.
  - Dark purple: `#4C1D95`.
  - Soft purple: `#F3E8FF`.
  - Border lavender: `#DDD6FE`.
  - Background: `#F8FAFC`.
  - Surface: `#FFFFFF`.
  - Text: `#111827`.
- UI should feel modern, clean, and business-focused.
- Do not reuse the exact `realmencigars` color scheme.

### Frontend Architecture
```text
frontend/src/
  App.js
  index.js
  config.js
  contexts/
    AuthContext.js
  layouts/
    AppLayout.js
    AppLayout.styles.js
  components/
    LoadingSpinner.js
    StatCard.js
    DataTable.js
    Modal.js
    FormField.js
    Money.js
  pages/
    Login.js
    Dashboard.js
    Inventory.js
    ProductForm.js
    Cashier.js
    Sales.js
    Credits.js
    Reports.js
  styles/
    GlobalStyles.js
    Theme.js
  utils/
    api.js
    money.js
    dates.js
```

### Frontend Auth Flow
- `Login.js` posts to `POST /api/users/login`.
- Auth state is stored in `AuthContext`.
- Persist logged-in owner in `localStorage`.
- Reject or redirect `superadmin` users from this owner app because admin will be separate.
- API requests should include credentials for session cookies.
- API helper should also send trusted headers from the persisted user:
  - `x-user-id`
  - `x-user-role`
  - `x-store-id`
- On logout, call `POST /api/users/logout`, clear local state, and redirect to login.

### Frontend Routes
- `/login` – owner login.
- `/` – dashboard overview.
- `/inventory` – product list, low-stock indicators, search/filter.
- `/inventory/new` – create product.
- `/inventory/:id` – edit product and restock.
- `/cashier` – POS checkout screen.
- `/sales` – transaction/sales history.
- `/credits` – pending/paid credits, create credit sale, mark paid.
- `/reports` – overview, sales, inventory, credit, and cashier summaries.

### Backend API Connections
- Auth:
  - `POST /api/users/login`
  - `POST /api/users/logout`
  - `GET /api/users/me`
  - `GET /api/users/me/store`
- Inventory:
  - `GET /api/products`
  - `POST /api/products`
  - `GET /api/products/:id`
  - `PUT /api/products/:id`
  - `DELETE /api/products/:id`
  - `POST /api/products/:id/restock`
- Cashier / Sales:
  - `GET /api/transactions`
  - `POST /api/transactions`
  - `GET /api/transactions/:id`
- Credit:
  - `GET /api/credits`
  - `POST /api/credits`
  - `GET /api/credits/:id`
  - `PUT /api/credits/:id`
  - `POST /api/credits/:id/pay`
- Reports:
  - `GET /api/reports/overview`
  - `GET /api/reports/sales`
  - `GET /api/reports/inventory`
  - `GET /api/reports/credits`
  - `GET /api/reports/cashier`

### Owner App Modules

#### Dashboard
- Show report overview cards for sales, inventory value, low stock, pending credits, and daily activity.
- Use `/api/reports/overview`.

#### Inventory
- Product table/list with item ID, product name, category, stock, LRD price, USD price, restock level, and actions.
- Product form should support item ID, product name, category, brand, quantity, unit cost, LRD price, USD price, restock level, supplier, barcode, notes, and image field if needed.
- Restock action should call `POST /api/products/:id/restock`.

#### Cashier / POS
- Product search and cart.
- Quantity controls.
- Support LRD, USD, BOTH, and CREDIT sale paths.
- Payment method choices: Cash, POS, Mobile Money.
- Submit normal sale to `POST /api/transactions`.
- Submit credit sale through `POST /api/credits`.

#### Simple Sales
- Sales history using `/api/transactions?type=sale`.
- Date filters with `react-datepicker`.
- Show line item details, totals, payment method, currency, and customer name.
- Export sales to Excel later using `xlsx`.

#### Credits
- List pending and paid credits.
- Filter by customer/status/date.
- Mark credit as paid through `POST /api/credits/:id/pay`.
- Show original products sold and totals.

#### Reports
- Reports page should group:
  - Overview.
  - Sales.
  - Inventory.
  - Credits.
  - Cashier/payment summaries.
- Use date filters and currency display where applicable.
- Printable report support can use `react-to-print`.

### Frontend Out of Scope For This Phase
- Superadmin/admin dashboard.
- Store owner account creation.
- Multi-role cashier/manager permissions.
- Employee management.
- VIP membership.
- Expense management.
- Advanced offline sync.
- TypeScript.

## Admin Frontend Plan – Superadmin Panel (`localinventorypos/admin`)

### Admin Context
- The admin frontend project already exists at `localinventorypos/admin`.
- It is currently a default Create React App project.
- Use React and JavaScript only. No TypeScript.
- This is a separate project from the owner app in `localinventorypos/frontend`.
- Use `localinventory/admin` as the primary structure reference for admin routing, auth context, layout, pages, styles, and API helpers.
- The superadmin panel is where platform administration happens.
- Owner/store users should not use this panel.

### Admin Dependency Notes
- Current admin package includes React and `react-scripts`.
- Before implementation, add the same admin UI dependencies used by the owner/admin references as needed:
  - `react-router-dom`
  - `styled-components`
  - `react-icons`
- Keep the implementation JavaScript-only.

### Admin Theme
- Use the same white and purple family as the owner app for brand consistency.
- Admin UI can be slightly more data-dense and dashboard-oriented.
- Suggested palette:
  - Primary purple: `#6D28D9`.
  - Dark purple: `#4C1D95`.
  - Soft purple: `#F3E8FF`.
  - Border lavender: `#DDD6FE`.
  - Background: `#F8FAFC`.
  - Surface: `#FFFFFF`.
  - Text: `#111827`.

### Admin Architecture
```text
admin/src/
  App.js
  index.js
  config.js
  contexts/
    AuthContext.js
  layouts/
    AdminLayout.js
    AdminLayout.styles.js
  components/
    LoadingSpinner.js
    StatCard.js
    DataTable.js
    FormField.js
    StatusBadge.js
  pages/
    Admin/
      Login.js
      Dashboard.js
      Stores.js
      StoreDetail.js
      Owners.js
      OwnerDetail.js
      CreateOwner.js
      SystemSettings.js
  styles/
    Theme.js
    GlobalStyles.js
  utils/
    api.js
    money.js
    dates.js
```

### Admin Auth Flow
- Admin login posts to `POST /api/users/login`.
- Only allow users with `role = superadmin`.
- Reject owner users from the admin panel and tell them to use the owner app.
- Persist superadmin user in `localStorage`.
- Send `credentials: include` for session cookies.
- Send trusted headers on API requests:
  - `x-user-id`
  - `x-user-role`
  - `x-store-id` if present.
- Logout calls `POST /api/users/logout` and clears local auth state.

### Admin Routes
- `/admin/login` – superadmin login.
- `/admin` – platform dashboard.
- `/admin/stores` – list and create stores.
- `/admin/stores/:id` – store detail, edit store, view owner and summary metrics.
- `/admin/owners` – list store-owner accounts.
- `/admin/owners/new` – create owner account and assign/create store.
- `/admin/owners/:id` – owner detail, edit status/profile/password/store assignment.
- `/admin/settings` – common platform settings placeholder for future shared admin tasks.

### Admin Backend API Connections
- Auth:
  - `POST /api/users/login`
  - `POST /api/users/logout`
  - `GET /api/users/me`
- Platform overview:
  - `GET /api/admin/overview`
- Stores:
  - `GET /api/admin/stores`
  - `POST /api/admin/stores`
  - `GET /api/admin/stores/:id`
  - `PUT /api/admin/stores/:id`
- Owners:
  - `GET /api/admin/owners`
  - `POST /api/admin/owners`
  - `GET /api/admin/owners/:id`
  - `PUT /api/admin/owners/:id`

### Admin Modules

#### Dashboard
- Show platform totals:
  - total stores.
  - total owner accounts.
  - total products.
  - total transactions.
  - pending credits.
  - total sales in LRD and USD.
- Use `GET /api/admin/overview`.

#### Store Management
- List all stores.
- Create a store.
- Edit store name, location, description, phone, active status, base currency, and exchange rate.
- View store detail and related owner account.
- Later: add store-scoped metrics/drilldowns if backend endpoints are expanded.

#### Owner Account Management
- List owner accounts.
- Create owner account with username/email, password, display name, phone, active status, base currency, exchange rate, and store assignment.
- Support create-owner flow that can create a store in the same request using backend `POST /api/admin/owners` with `storeName` fields.
- Edit owner profile.
- Activate/deactivate owner.
- Reset/change owner password.
- Reassign owner to another store if needed.

#### Common Admin Tasks
- Monitor platform health and basic totals.
- Manage stores and owner accounts.
- Prepare placeholder area for settings and future admin-only modules.
- Keep admin tasks separate from owner POS operations.

### Admin Out of Scope For First Admin Pass
- Admin-side cashier/POS operations.
- Admin editing product inventory directly unless a later need is defined.
- Advanced analytics beyond backend overview.
- Employee/staff role management.
- Subscription/billing.
- Audit logs.
- TypeScript.

### Admin Immediate Next Steps
1. Add needed dependencies to `localinventorypos/admin`.
2. Clean default CRA files not needed.
3. Add theme/global styles using white/purple branding.
4. Add admin API helper and superadmin auth context.
5. Add protected `AdminLayout`.
6. Add `/admin/login`.
7. Add platform dashboard connected to `/api/admin/overview`.
8. Add store list/create/detail/edit screens.
9. Add owner list/create/detail/edit screens.
10. Add settings placeholder.
11. Build admin app and fix integration issues.

### Frontend Immediate Next Steps
1. Clean default CRA files that are not needed.
2. Add theme/global styles with white and purple branding.
3. Add API helper and auth context.
4. Add app routing and protected owner layout.
5. Add login page.
6. Add dashboard connected to reports overview.
7. Add inventory list/create/edit/restock screens.
8. Add cashier checkout screen.
9. Add sales history screen.
10. Add credits screen.
11. Add reports screen.
12. Build and fix frontend/backend integration issues.

## Out of Scope for Initial Backend
- Employee management.
- VIP membership.
- Expense management.
- Advanced sync module.
- Multiple staff roles and route permissions.
- Strict backend validation middleware.
- TypeScript.
- Admin frontend implementation.

## Backend Immediate Next Steps Completed
1. Add Firebase config and Firestore connection setup.
2. Add Express `server.js` with health check and route mounting.
3. Add user/store models and superadmin seed script.
4. Add auth/user/admin routes for login and owner creation.
5. Add product inventory CRUD.
6. Add transaction checkout with inventory quantity updates.
7. Add credit sale/payment flows.
8. Add reports endpoints.

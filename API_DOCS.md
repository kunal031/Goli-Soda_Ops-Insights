# GoliOps API Documentation

**Version:** 1.0.0  
**Base URL:** `https://your-deployment.vercel.app/api` (production) or `http://localhost:3001/api` (local)  
**Database:** PostgreSQL  
**Auth:** JWT Bearer Token

> This document is for **Group 60** (Analytics Dashboard) to consume GoliOps data.

---

## Authentication

All endpoints except `/api/auth/login` and `/api/health` require a JWT token in the `Authorization` header.

### Login

```
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Uday Kumar",
    "role": "Admin"
  }
}
```

### Using the Token

Add the token to all subsequent requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Get Current User

```
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Uday Kumar",
    "role": "Admin"
  }
}
```

---

## Inventory Endpoints

### Get All Products

```
GET /api/inventory/products
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": "SKU-001",
    "name": "Orange Goli Soda",
    "variant": "Classic 200ml",
    "batch": "BATCH-1042",
    "stock": 1240,
    "costPerUnit": 8.50,
    "sellingPrice": 15.00
  }
]
```

### Add New Product

```
POST /api/inventory/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "id": "SKU-009",
  "name": "Pineapple Goli Soda",
  "variant": "Classic 200ml",
  "batch": "BATCH-1050",
  "stock": 500,
  "costPerUnit": 10.00,
  "sellingPrice": 18.00
}
```

**Response (201):** Returns the created product object.

### Get Low-Stock Products

Returns products with stock below 50 units.

```
GET /api/inventory/low-stock
Authorization: Bearer <token>
```

**Response (200):** Array of product objects (same schema as above).

### Get All Transactions

```
GET /api/inventory/transactions
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": "TXN-001",
    "productId": "SKU-001",
    "type": "IN",
    "quantity": 500,
    "date": "2026-06-01",
    "note": "Production run #42"
  }
]
```

### Log a Stock Transaction

```
POST /api/inventory/transaction
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "SKU-001",
  "type": "IN",
  "quantity": 200,
  "note": "Production run #46"
}
```

- `type`: `"IN"` (production/purchase) or `"OUT"` (dispatch/sale)
- Stock is automatically updated
- OUT transactions are rejected if insufficient stock

**Response (200):**
```json
{
  "transaction": {
    "id": "TXN-009",
    "productId": "SKU-001",
    "type": "IN",
    "quantity": 200,
    "date": "2026-06-20",
    "note": "Production run #46"
  },
  "updatedProduct": {
    "id": "SKU-001",
    "name": "Orange Goli Soda",
    "stock": 1440
  }
}
```

---

## Expenses Endpoints

### Get All Expenses

```
GET /api/expenses
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": "EXP-001",
    "category": "Raw Materials",
    "amount": 45000,
    "date": "2026-06-01",
    "description": "Sugar, citric acid, and flavoring"
  }
]
```

### Get Expense Categories

```
GET /api/expenses/categories
Authorization: Bearer <token>
```

**Response (200):**
```json
["Raw Materials", "Packaging", "Logistics", "Overheads"]
```

### Get Total Expenses

```
GET /api/expenses/total
Authorization: Bearer <token>
```

**Response (200):**
```json
{ "total": 153000 }
```

### Add an Expense

```
POST /api/expenses
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "Raw Materials",
  "amount": 15000,
  "date": "2026-06-18",
  "description": "Citric acid refill from supplier"
}
```

**Valid categories:** `Raw Materials`, `Packaging`, `Logistics`, `Overheads`

**Response (201):** Returns the created expense object.

---

## Sales Endpoints

### Get All Sales

```
GET /api/sales
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": "SAL-001",
    "productId": "SKU-001",
    "productName": "Orange Goli Soda",
    "quantity": 200,
    "buyer": "Krishna Distributors",
    "buyerType": "Distributor",
    "date": "2026-06-03",
    "amount": 3000
  }
]
```

### Get Total Sales Revenue

```
GET /api/sales/total
Authorization: Bearer <token>
```

**Response (200):**
```json
{ "total": 27170 }
```

### Record a Sale

```
POST /api/sales
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "SKU-001",
  "quantity": 100,
  "buyer": "New Mart Chennai",
  "buyerType": "Retailer",
  "date": "2026-06-20",
  "amount": 1500
}
```

- `buyerType`: `"Retailer"` or `"Distributor"`
- Automatically creates an OUT stock transaction
- Automatically reduces product stock
- Rejected if insufficient stock

**Response (201):** Returns the created sale object with `productName`.

---

## Reports Endpoints

### Profit & Loss Report

Returns P&L data for the **current month**.

```
GET /api/reports/pnl
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "period": "June 2026",
  "revenue": 27170,
  "cogs": 14350,
  "grossProfit": 12820,
  "operatingExpenses": 153000,
  "netProfit": -140180,
  "margin": "-515.9",
  "expenseBreakdown": {
    "Raw Materials": 67000,
    "Packaging": 26000,
    "Logistics": 13000,
    "Overheads": 47000
  },
  "revenueByProduct": {
    "Orange Goli Soda": 10500,
    "Lemon Goli Soda": 8250,
    "Paneer Soda": 3300,
    "Mango Goli Soda": 1440,
    "Blue Lagoon Soda": 2000,
    "Jeera Soda": 1680
  },
  "revenueByDay": {
    "2026-06-03": 3000,
    "2026-06-05": 3300,
    "2026-06-06": 4500
  },
  "revenueByWeek": {
    "Week 22": 10800,
    "Week 23": 12690,
    "Week 24": 3750
  }
}
```

**P&L Formula:** `Net Profit = Revenue - COGS - Operating Expenses`

### Dashboard Summary

Returns KPI summary data for the **current month**.

```
GET /api/reports/dashboard
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "totalStock": 3830,
  "totalProducts": 8,
  "lowStockCount": 4,
  "revenueThisMonth": 27170,
  "expensesThisMonth": 153000
}
```

---

## Health Check

No authentication required.

```
GET /api/health
```

**Response (200):**
```json
{
  "status": "ok",
  "service": "GoliOps API",
  "version": "1.0.0",
  "database": "PostgreSQL"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable error message"
}
```

| Status Code | Meaning |
|---|---|
| 400 | Bad Request — missing or invalid fields |
| 401 | Unauthorized — no token provided |
| 403 | Forbidden — token expired or invalid |
| 404 | Not Found — resource doesn't exist |
| 409 | Conflict — duplicate ID (e.g., SKU already exists) |
| 500 | Internal Server Error |

---

## Data Model

```
┌─────────────┐      ┌─────────────────┐      ┌──────────────┐
│   products   │◄────│  transactions    │      │   expenses   │
├─────────────┤      ├─────────────────┤      ├──────────────┤
│ id (PK)     │      │ id (PK)         │      │ id (PK)      │
│ name        │      │ productId (FK)  │      │ category     │
│ variant     │      │ type (IN/OUT)   │      │ amount       │
│ batch       │      │ quantity        │      │ date         │
│ stock       │      │ date            │      │ description  │
│ costPerUnit │      │ note            │      └──────────────┘
│ sellingPrice│      └─────────────────┘
└─────────────┘
       ▲
       │
┌──────┴───────┐
│    sales     │
├──────────────┤
│ id (PK)      │
│ productId(FK)│
│ quantity     │
│ buyer        │
│ buyerType    │
│ date         │
│ amount       │
└──────────────┘
```

---

*GoliOps — Inventory & Finance Management System*  
*Uday Food & Beverages · Group 34 · Aurora Institute of Technology*

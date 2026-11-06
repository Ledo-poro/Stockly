# CLAUDE.md — Stockly Project Guide

> **Stockly** — Full-Stack Inventory & Warehouse Management System  
> Modern multi-page web application built with Next.js 14, TypeScript, Prisma & SQLite.

This file provides comprehensive context for AI assistants (Claude, Cursor, etc.) working on this codebase. Always follow the architecture, conventions, and patterns described here.

---

## 1. Project Overview

**Stockly** is a production-ready full-stack inventory and warehouse management system designed for small-to-medium businesses. It enables:

- Product tracking with SKU, barcode, QR codes, batches & expiry dates
- Multi-warehouse inventory management
- Full stock movement history (In / Out / Adjustment / Transfer)
- Role-based access control (Admin, Manager, Staff, Viewer)
- Real-time alerts (low stock + expiry)
- Complete audit logging
- Inventory valuation
- Light / Dark mode + primary color customization

**Core Philosophy**: Clean multi-page architecture (not a SPA), type safety, excellent UX, and maintainable production-quality code.

---

## 2. Technology Stack

| Layer              | Technology                                      |
|--------------------|-------------------------------------------------|
| Frontend           | Next.js 14+ (App Router), TypeScript, shadcn/ui, Lucide Icons |
| Backend            | Next.js API Routes                              |
| Database           | SQLite                                          |
| ORM                | Prisma                                          |
| Authentication     | NextAuth.js (Credentials + optional Google)     |
| State Management   | TanStack Query (React Query) + Zustand          |
| Forms & Validation | React Hook Form + Zod                           |
| Charts             | Recharts                                        |
| Theming            | next-themes (Light + Dark mode)                 |
| File Upload        | Cloudinary or local storage                     |

---

## 3. Application Structure (Multi-Page Design)

This is a **true multi-page application**. Each major module has its own dedicated routes.

### Main Routes

| Page               | Route                     | Description                          |
|--------------------|---------------------------|--------------------------------------|
| Login              | `/login`                  | User authentication                  |
| Register           | `/register`               | New user registration                |
| Dashboard          | `/`                       | Overview cards, charts, recent activity |
| Products List      | `/products`               | Browse, search & filter products     |
| Create Product     | `/products/new`           | Add new product                      |
| Product Details    | `/products/[id]`          | View full product information        |
| Edit Product       | `/products/[id]/edit`     | Update product data                  |
| Categories         | `/categories`             | Manage product categories            |
| Suppliers          | `/suppliers`              | Manage suppliers                     |
| Warehouses         | `/warehouses`             | Multi-warehouse management           |
| Stock Movements    | `/movements`              | History of all stock transactions    |
| New Movement       | `/movements/new`          | Record In / Out / Adjustment / Transfer |
| Audit Log          | `/audit-log`              | Who did what and when                |
| Notifications      | `/notifications`          | Alerts center                        |
| Settings           | `/settings`               | Theme, primary color & preferences   |
| Profile            | `/profile`                | User profile management              |

### Layout Components
- Persistent **Sidebar** navigation
- **Top Navbar** with global search, notifications, theme toggle, and user menu
- Mobile-first responsive design

---

## 4. Core Features & Domain Logic

### 4.1 Products
- Full CRUD with dedicated pages
- Fields: name, SKU, description, category, price, cost, quantity, min stock level
- Product image upload
- Auto-generated Barcode + QR Code
- Unit of measure (piece, box, kg, etc.)
- Batch / Lot number + expiry date tracking
- Stock status: `In Stock` | `Low Stock` | `Out of Stock`
- Soft delete + restore

### 4.2 Categories & Suppliers
- Dedicated CRUD pages
- Products can belong to one or more categories
- Products can be linked to suppliers

### 4.3 Multi-Warehouse
- Full CRUD for warehouses
- Quantity tracked **per product per warehouse**
- Stock transfers between warehouses

### 4.4 Stock Movements
Every inventory change must create a `StockMovement` record:
- **Stock In** — purchases / restocking
- **Stock Out** — sales / usage
- **Adjustment** — physical count corrections
- **Transfer** — between warehouses

Always log: timestamp, user, optional notes.

### 4.5 Dashboard
- Summary cards: Total products, Inventory value, Low stock, Out of stock, Expiring soon
- Recent movements list
- Charts (Recharts): inventory value trends, top categories, movement overview

### 4.6 Advanced Features
- Barcode & QR generation + camera/USB scanner support + printable labels
- Low stock alerts + expiry alerts
- In-app notification center (+ optional email)
- Role-based permissions (Admin / Manager / Staff / Viewer)
- Full Audit Log
- Inventory valuation (Average Cost + Last Purchase Price)
- Activity feed / timeline
- Keyboard shortcuts (`N` = new product, `/` = search)
- Soft delete + restore
- Light / Dark mode + primary color customization

---

## 5. Database Models (Prisma)

Core models to respect:

```
User (with role)
Product
Category
Supplier
Warehouse
Stock (quantity per product per warehouse)
StockMovement
Batch / Lot
AuditLog
Notification
Setting
```

**Important rules:**
- Always use soft delete where applicable (`deletedAt`)
- Every significant action must create an `AuditLog` entry
- Stock quantities live in the `Stock` model (not directly on Product)
- Movements are the source of truth for quantity changes

---

## 6. Code Architecture & Conventions

### Folder Structure (expected)
```
src/
├── app/                    # Next.js App Router pages
├── components/             # Reusable UI components
│   ├── ui/                 # shadcn/ui components
│   ├── forms/
│   ├── layout/             # Sidebar, Navbar, etc.
│   └── ...
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities, Prisma client, auth, etc.
├── services/               # Business logic / API services
├── stores/                 # Zustand stores
├── types/                  # TypeScript types
├── schemas/                # Zod schemas
└── utils/
```

### Coding Standards
- **Fully typed** with TypeScript — no `any` unless absolutely necessary
- Use **React Hook Form + Zod** for all forms
- Use **TanStack Query** for server state
- Use **Zustand** only for client UI state
- Prefer server components where possible; use client components only when needed
- Clear loading / empty / error states on every data-fetching page
- Consistent naming: `camelCase` for variables, `PascalCase` for components
- Soft delete pattern preferred over hard delete
- Always validate input with Zod on both client and server
- Keep components small and composable

### Authentication & Authorization
- NextAuth.js with Credentials provider (+ optional Google)
- Protect routes according to role:
  - **Admin**: Full access
  - **Manager**: Inventory + user management
  - **Staff**: Create/edit products & movements
  - **Viewer**: Read-only

### Theming
- Use `next-themes`
- Support Light + Dark mode
- Primary color is customizable from Settings and must persist

---

## 7. Key Implementation Guidelines for AI Assistants

When working on this project, always:

1. **Respect the multi-page design** — create dedicated pages/routes, not modals for major CRUD operations.
2. **Never bypass the StockMovement system** — every quantity change must go through a movement record.
3. **Create AuditLog entries** for all significant actions.
4. **Use soft deletes** for Products, Categories, and Suppliers.
5. **Keep UI consistent** with shadcn/ui + existing design system.
6. **Handle loading, empty, and error states** properly.
7. **Maintain type safety** — update Prisma types and Zod schemas together.
8. **Prefer composition** over large monolithic components.
9. **Support both light and dark mode** in all new UI.
10. **Write production-quality, readable code** with clear comments when logic is non-obvious.

---

## 8. Deliverables Checklist (from Proposal)

When implementing features, ensure the following are covered:

- [ ] Complete multi-page project structure
- [ ] Full Prisma schema with all models
- [ ] Authentication + role-based access control
- [ ] All CRUD modules with polished UI/UX
- [ ] Multi-warehouse support + stock transfers
- [ ] Barcode & QR code generation + scanning
- [ ] Alerts system (low stock + expiry)
- [ ] Audit Log page
- [ ] Inventory valuation
- [ ] Activity feed + keyboard shortcuts
- [ ] Light & Dark mode + primary color customization
- [ ] Soft delete + restore
- [ ] Clear README with setup instructions

---

## 9. Quick Reference — Domain Rules

| Action                    | Required Side Effects                          |
|---------------------------|------------------------------------------------|
| Create / Update Product   | Generate barcode/QR if missing, create AuditLog |
| Change stock quantity     | Create StockMovement + update Stock record     |
| Soft delete entity        | Set `deletedAt`, create AuditLog               |
| Transfer between warehouses | Create two movements (Out + In) or one Transfer type |
| Low stock / Expiry        | Create Notification                            |

---

**End of CLAUDE.md**

This document should be kept up to date as the project evolves. When adding major features, update the relevant sections.
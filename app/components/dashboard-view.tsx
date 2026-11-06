"use client";

import {
  Boxes,
  CircleAlert,
  PackageCheck,
  Plus,
  ScanLine,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useAppPreferences } from "./app-shell";

export function DashboardView() {
  const { language } = useAppPreferences();
  const arabic = language === "ar";

  return (
    <div className="dashboard-view">
      <div className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">{arabic ? "نظرة عامة على المخزون" : "INVENTORY OVERVIEW"}</p>
          <h1>{arabic ? "نظرة عامة على المخزون" : "Inventory overview"}</h1>
          <p className="heading-subtitle">{arabic ? "ملخص عمليات المستودع." : "A summary of your warehouse operations."}</p>
        </div>
        <div className="heading-actions">
          <button type="button" className="button button-secondary"><ScanLine size={16} />{arabic ? "مسح عنصر" : "Scan item"}</button>
          <Link href="/Projects" className="button button-primary"><Plus size={16} />{arabic ? "مشروع جديد" : "New project"}</Link>
        </div>
      </div>

      <section className="metric-grid" aria-label={arabic ? "ملخص المخزون" : "Inventory summary"}>
        <article className="metric-card metric-primary">
          <div className="metric-top"><span>{arabic ? "إجمالي العناصر" : "Total items"}</span><span className="metric-icon"><Boxes size={18} /></span></div>
          <div className="metric-value">0</div>
          <div className="metric-foot"><span>{arabic ? "لا توجد عناصر بعد" : "No items yet"}</span></div>
        </article>
        <article className="metric-card">
          <div className="metric-top"><span>{arabic ? "قيمة المخزون" : "Inventory value"}</span><span className="metric-icon soft"><TrendingUp size={18} /></span></div>
          <div className="metric-value">$0</div>
          <div className="metric-foot"><span>{arabic ? "لا توجد قيمة مسجلة" : "No value recorded"}</span></div>
        </article>
        <article className="metric-card">
          <div className="metric-top"><span>{arabic ? "مخزون منخفض" : "Low stock"}</span><span className="metric-icon warning"><CircleAlert size={18} /></span></div>
          <div className="metric-value">0</div>
          <div className="metric-foot"><span>{arabic ? "لا توجد عناصر بعد" : "No items yet"}</span></div>
        </article>
        <article className="metric-card">
          <div className="metric-top"><span>{arabic ? "طلبات اليوم" : "Orders today"}</span><span className="metric-icon soft"><PackageCheck size={18} /></span></div>
          <div className="metric-value">0</div>
          <div className="metric-foot"><span>{arabic ? "لا توجد طلبات بعد" : "No orders yet"}</span></div>
        </article>
      </section>

      <section className="dashboard-panels">
        <article className="panel stock-panel">
          <div className="panel-heading">
            <div><h2>{arabic ? "حركة المخزون" : "Inventory movement"}</h2><p>{arabic ? "العناصر المستلمة مقابل المصروفة" : "Items received versus dispatched"}</p></div>
          </div>
          <div className="empty-results">{arabic ? "ستظهر حركة المخزون هنا عند تسجيلها." : "Inventory movement will appear here when recorded."}</div>
        </article>

        <article className="panel warehouse-panel">
          <div className="panel-heading"><div><h2>{arabic ? "المستودعات" : "Warehouses"}</h2><p>{arabic ? "مواقع التخزين" : "Storage locations"}</p></div></div>
          <div className="warehouse-summary"><strong>0</strong><span>{arabic ? "مستودعات" : "warehouses"}</span></div>
          <div className="empty-results">{arabic ? "لم تتم إضافة مستودعات بعد." : "No warehouses added yet."}</div>
        </article>
      </section>

      <section className="panel activity-panel">
        <div className="panel-heading activity-heading">
          <div><h2>{arabic ? "أحدث الحركات" : "Recent movements"}</h2><p>{arabic ? "تحديثات المخزون" : "Stock updates"}</p></div>
        </div>
        <div className="movement-list">
          <div className="empty-results">{arabic ? "لا توجد حركات مسجلة بعد." : "No stock movements recorded yet."}</div>
        </div>
      </section>
    </div>
  );
}
"use client";

import {
  Boxes,
  PackageCheck,
  Plus,
  ScanLine,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppPreferences } from "./app-shell";

type InventoryMovement = {
  id: string;
  name: string;
  code: string;
  itemCount: number;
  received: number;
  dispatched: number;
  adjusted: number;
};

type LatestMovement = {
  id: string;
  type: "IN" | "OUT" | "SALE" | "ADJUSTMENT";
  quantityDelta: number;
  note: string | null;
  createdAt: string;
  project: { id: string; name: string; code: string };
};

type DashboardData = {
  range: "7d" | "30d" | "12m";
  summary: {
    inventoryCount: number;
    unitsOnHand: number;
    inProgressCount: number;
    completedCount: number;
    receivedUnits: number;
    issuedUnits: number;
    adjustedUnits: number;
    lowStockCount: number;
  };
  inventoryValue: { available: boolean; amount: number | null; currency: string | null };
  lowStock: { id: string; name: string; code: string; itemCount: number; lowStockLimit: number }[];
  sources: { name: string; count: number }[];
  inventoryMovement: InventoryMovement[];
  latestMovements: LatestMovement[];
};

export function DashboardView() {
  const { language } = useAppPreferences();
  const arabic = language === "ar";
  const [data, setData] = useState<DashboardData | null>(null);
  const [range, setRange] = useState<DashboardData["range"]>("7d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/dashboard?range=${range}`)
      .then(async (response) => {
        if (!response.ok) {
          const result = await response.json() as { error?: string };
          throw new Error(result.error ?? "Could not load dashboard data.");
        }
        return response.json() as Promise<DashboardData>;
      })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load dashboard data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [range]);

  const numberFormat = new Intl.NumberFormat(arabic ? "ar" : "en-US");
  const latestMovements = data?.latestMovements ?? [];
  const largestMovement = Math.max(1, ...latestMovements.map((movement) => Math.abs(movement.quantityDelta)));
  const formatDate = (date: string) => new Intl.DateTimeFormat(arabic ? "ar" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));

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
          <Link href="/Inventory" className="button button-primary"><Plus size={16} />{arabic ? "مخزون جديد" : "New inventory"}</Link>
        </div>
      </div>

      <section className="metric-grid" aria-label={arabic ? "ملخص المخزون" : "Inventory summary"}>
        <Link href="/Inventory" className="metric-card metric-primary metric-link">
          <div className="metric-top"><span>{arabic ? "سجلات المخزون" : "Inventory records"}</span><span className="metric-icon"><Boxes size={18} /></span></div>
          <div className="metric-value">{loading ? "—" : numberFormat.format(data?.summary.inventoryCount ?? 0)}</div>
          <div className="metric-foot"><span>{arabic ? "إجمالي السجلات" : "Total inventories"}</span></div>
        </Link>
        <Link href="/Inventory" className="metric-card metric-link">
          <div className="metric-top"><span>{arabic ? "الوحدات المتاحة" : "Units on hand"}</span><span className="metric-icon soft"><TrendingUp size={18} /></span></div>
          <div className="metric-value">{loading ? "—" : numberFormat.format(data?.summary.unitsOnHand ?? 0)}</div>
          <div className="metric-foot"><span>{arabic ? "مجموع كميات المخزون" : "Sum of inventory quantities"}</span></div>
        </Link>
        <Link href="/Inventory?stock=low" className="metric-card metric-link">
          <div className="metric-top"><span>{arabic ? "تنبيهات انخفاض المخزون" : "Low-stock alerts"}</span><span className="metric-icon warning"><PackageCheck size={18} /></span></div>
          <div className="metric-value">{loading ? "—" : numberFormat.format(data?.summary.lowStockCount ?? 0)}</div>
          <div className="metric-foot"><span>{arabic ? "عناصر عند حدها الأدنى أو أقل" : "Items at or below their limit"}</span></div>
        </Link>
        <Link href="/Inventory?cost=valued" className="metric-card metric-link">
          <div className="metric-top"><span>{arabic ? "قيمة المخزون" : "Inventory value"}</span><span className="metric-icon soft"><TrendingUp size={18} /></span></div>
          <div className="metric-value metric-value-compact">{loading ? "—" : data?.inventoryValue.available && data.inventoryValue.currency ? new Intl.NumberFormat(arabic ? "ar" : "en-US", { style: "currency", currency: data.inventoryValue.currency, maximumFractionDigits: 2 }).format(data.inventoryValue.amount ?? 0) : (arabic ? "غير متاحة" : "Not available")}</div>
          <div className="metric-foot"><span>{data?.inventoryValue.available ? (arabic ? "التكلفة المسجلة" : "Based on recorded unit costs") : (arabic ? "أكمل التكاليف والعملة" : "Complete costs in one currency")}</span></div>
        </Link>
      </section>

      {error && <div className="database-message" role="alert">{error}</div>}

      <section className="dashboard-panels">
        <article className="panel stock-panel inventory-movement-panel">
          <div className="panel-heading">
            <div><h2>{arabic ? "حركة كل مخزون" : "Inventory movement"}</h2><p>{arabic ? "الوارد والصادر والتعديلات لكل سجل" : "Received, dispatched, and adjusted units by inventory"}</p></div>
          </div>
          <div className="dashboard-table-scroll">
            <table className="dashboard-movement-table">
              <thead><tr><th>{arabic ? "المخزون" : "Inventory"}</th><th>{arabic ? "وارد" : "Received"}</th><th>{arabic ? "صادر" : "Dispatched"}</th><th>{arabic ? "تعديل" : "Adjusted"}</th><th>{arabic ? "متاح" : "On hand"}</th></tr></thead>
              <tbody>{data?.inventoryMovement.map((movement) => <tr key={movement.id}>
                <td><Link href={`/Inventory?project=${encodeURIComponent(movement.id)}`} className="dashboard-item-link"><strong>{movement.name}</strong><small>{movement.code}</small></Link></td>
                <td className="movement-positive">{numberFormat.format(movement.received)}</td>
                <td className="movement-negative">{numberFormat.format(movement.dispatched)}</td>
                <td>{movement.adjusted > 0 ? "+" : ""}{numberFormat.format(movement.adjusted)}</td>
                <td><strong>{numberFormat.format(movement.itemCount)}</strong></td>
              </tr>)}</tbody>
            </table>
            {!loading && data?.inventoryMovement.length === 0 && <div className="empty-results">{arabic ? "أضف مخزونًا لعرض الحركة." : "Add inventory to see movement by item."}</div>}
            {loading && <div className="empty-results">{arabic ? "جارٍ تحميل الحركة..." : "Loading inventory movement..."}</div>}
          </div>
        </article>

        <article className="panel warehouse-panel">
          <div className="panel-heading"><div><h2>{arabic ? "مصادر المخزون" : "Inventory sources"}</h2><p>{arabic ? "السجلات حسب المصدر" : "Inventory records by source"}</p></div></div>
          <div className="warehouse-summary"><strong>{loading ? "—" : numberFormat.format(data?.sources.length ?? 0)}</strong><span>{arabic ? "مصادر" : "sources"}</span></div>
          <div className="warehouse-list source-list">
            {data?.sources.map((source, index) => <div className="warehouse-row" key={source.name}>
              <span className={`location-pin pin-${["green", "orange", "blue"][index % 3]}`} />
              <span className="warehouse-name"><strong>{source.name}</strong><small>{arabic ? "سجلات المخزون" : "Inventory records"}</small></span>
              <span className="warehouse-usage">{numberFormat.format(source.count)}</span>
            </div>)}
            {!loading && data?.sources.length === 0 && <div className="empty-results">{arabic ? "لا توجد مصادر مسجلة." : "No inventory sources recorded."}</div>}
          </div>
        </article>
      </section>

      <section className="panel low-stock-panel">
        <div className="panel-heading"><div><h2>{arabic ? "تنبيهات انخفاض المخزون" : "Low-stock alerts"}</h2><p>{arabic ? "العناصر عند الحد الأدنى أو أقل" : "Items at or below their minimum quantity"}</p></div><Link href="/Inventory?stock=low" className="text-link">{arabic ? "عرض المخزون" : "View inventory"}</Link></div>
        <div className="low-stock-list">
          {data?.lowStock.map((item) => <Link href={`/Inventory?project=${encodeURIComponent(item.id)}`} className="low-stock-row" key={item.id}>
            <span className="low-stock-name"><strong>{item.name}</strong><small>{item.code}</small></span>
            <span className="low-stock-level"><strong>{numberFormat.format(item.itemCount)}</strong><small>{arabic ? `الحد ${numberFormat.format(item.lowStockLimit)}` : `min ${numberFormat.format(item.lowStockLimit)}`}</small></span>
          </Link>)}
          {!loading && data?.lowStock.length === 0 && <div className="empty-results">{arabic ? "لا توجد تنبيهات مخزون منخفض." : "No low-stock items."}</div>}
          {loading && <div className="empty-results">{arabic ? "جارٍ تحميل التنبيهات..." : "Loading alerts..."}</div>}
        </div>
      </section>

      <section className="panel activity-panel">
        <div className="panel-heading activity-heading">
          <div><h2>{arabic ? "حركات المخزون" : "Inventory movements"}</h2><p>{arabic ? "الحركات المسجلة خلال الفترة المحددة" : "Transactions recorded in the selected period"}</p></div>
          <div className="range-controls" role="group" aria-label={arabic ? "الفترة الزمنية" : "Movement date range"}>
            <button type="button" className={range === "7d" ? "active" : ""} aria-pressed={range === "7d"} onClick={() => setRange("7d")}>{arabic ? "٧ أيام" : "7 days"}</button>
            <button type="button" className={range === "30d" ? "active" : ""} aria-pressed={range === "30d"} onClick={() => setRange("30d")}>{arabic ? "٣٠ يومًا" : "30 days"}</button>
            <button type="button" className={range === "12m" ? "active" : ""} aria-pressed={range === "12m"} onClick={() => setRange("12m")}>{arabic ? "١٢ شهرًا" : "12 months"}</button>
          </div>
        </div>
        <div className="movement-summary-strip">
          <div><span>{arabic ? "وارد" : "Received"}</span><strong className="movement-positive">{numberFormat.format(data?.summary.receivedUnits ?? 0)}</strong></div>
          <div><span>{arabic ? "صادر" : "Issued"}</span><strong className="movement-negative">{numberFormat.format(data?.summary.issuedUnits ?? 0)}</strong></div>
          <div><span>{arabic ? "صافي التسويات" : "Net adjustments"}</span><strong>{data?.summary.adjustedUnits && data.summary.adjustedUnits > 0 ? "+" : ""}{numberFormat.format(data?.summary.adjustedUnits ?? 0)}</strong></div>
        </div>
        <div className="latest-movement-chart" aria-label={arabic ? "مخطط أحدث الحركات" : "Chart of latest inventory movements"}>
          {latestMovements.map((movement) => {
            const amount = Math.abs(movement.quantityDelta);
            const movementClass = movement.type === "IN" ? "in" : movement.type === "OUT" || movement.type === "SALE" ? "out" : "adjust";
            return <Link href={`/Inventory?project=${encodeURIComponent(movement.project.id)}`} className="latest-movement-row" key={movement.id} aria-label={`${movement.project.name}, ${movement.type}, ${amount}`}>
              <div className="latest-movement-label"><strong>{movement.project.name}</strong><small>{movement.type === "IN" ? (arabic ? "وارد" : "Received") : movement.type === "SALE" ? (arabic ? "مباع" : "Sold") : movement.type === "OUT" ? (arabic ? "صادر" : "Dispatched") : (arabic ? "تعديل" : "Adjustment")}</small></div>
              <div className="latest-movement-track"><span className={movementClass} style={{ width: `${Math.max(3, (amount / largestMovement) * 100)}%` }} /></div>
              <strong className={`latest-movement-amount ${movementClass}`}>{movement.quantityDelta > 0 ? "+" : "−"}{numberFormat.format(amount)}</strong>
              <time dateTime={movement.createdAt}>{formatDate(movement.createdAt)}</time>
            </Link>;
          })}
          {!loading && latestMovements.length === 0 && <div className="empty-results">{arabic ? "لا توجد حركات مسجلة بعد." : "No stock movements recorded yet."}</div>}
          {loading && <div className="empty-results">{arabic ? "جارٍ تحميل الحركات..." : "Loading latest movements..."}</div>}
        </div>
      </section>
    </div>
  );
}
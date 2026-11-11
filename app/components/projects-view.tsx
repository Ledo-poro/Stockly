"use client";

import { ArrowDownUp, ArrowLeftRight, MoreHorizontal, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { useAppPreferences } from "./app-shell";

type Project = {
  id: string;
  name: string;
  code: string;
  itemCount: number;
  lowStockLimit: number;
  unitCost: number | string | null;
  currency: string | null;
  source: string | null;
  arrivalDate: string | null;
  createdAt: string;
  location: string;
  owner: string;
  progress: number;
  dueDate: string | null;
};

function normalizeProject(project: Project): Project {
  return {
    ...project,
    itemCount: Number.isFinite(project.itemCount) ? project.itemCount : 0,
    lowStockLimit: Number.isFinite(project.lowStockLimit) ? project.lowStockLimit : 0,
    unitCost: project.unitCost === null ? null : Number(project.unitCost),
    currency: project.currency ?? null,
    source: project.source ?? null,
    arrivalDate: project.arrivalDate ?? null,
    createdAt: project.createdAt ?? new Date(0).toISOString(),
  };
}

export function ProjectsView() {
  const { language } = useAppPreferences();
  const arabic = language === "ar";
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [minimumCount, setMinimumCount] = useState("");
  const [maximumCount, setMaximumCount] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [costedOnly, setCostedOnly] = useState(false);
  const [arrivalFrom, setArrivalFrom] = useState("");
  const [arrivalTo, setArrivalTo] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [showForm, setShowForm] = useState(false);
  const [menuProjectId, setMenuProjectId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [movementProjectId, setMovementProjectId] = useState<string | null>(null);
  const [movementAction, setMovementAction] = useState("receive");
  const [movementQuantity, setMovementQuantity] = useState("1");
  const [movementDate, setMovementDate] = useState("");
  const [movementNote, setMovementNote] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftItemCount, setDraftItemCount] = useState("0");
  const [draftLowStockLimit, setDraftLowStockLimit] = useState("0");
  const [draftUnitCost, setDraftUnitCost] = useState("");
  const [draftCurrency, setDraftCurrency] = useState("");
  const [draftSource, setDraftSource] = useState("");
  const [draftArrivalDate, setDraftArrivalDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const sourceOptions = [...new Set(projects.map((project) => project.source).filter((source): source is string => Boolean(source)))].sort((a, b) => a.localeCompare(b));
  const activeFilterCount = [sourceFilter !== "all", minimumCount !== "", maximumCount !== "", arrivalFrom !== "", arrivalTo !== "", selectedProjectId !== "", lowStockOnly, costedOnly].filter(Boolean).length;
  const filteredProjects = projects
    .filter((project) => {
      const searchable = `${project.name} ${project.code} ${project.itemCount} ${project.source ?? ""} ${project.location} ${project.owner} ${project.arrivalDate ?? ""}`.toLowerCase();
      const arrivalDay = project.arrivalDate?.slice(0, 10) ?? "";
      return searchable.includes(query.trim().toLowerCase())
        && (!selectedProjectId || project.id === selectedProjectId)
        && (!lowStockOnly || (project.lowStockLimit > 0 && project.itemCount <= project.lowStockLimit))
        && (!costedOnly || (project.unitCost !== null && Boolean(project.currency)))
        && (sourceFilter === "all" || project.source === sourceFilter)
        && (minimumCount === "" || project.itemCount >= Number(minimumCount))
        && (maximumCount === "" || project.itemCount <= Number(maximumCount))
        && (arrivalFrom === "" || (arrivalDay !== "" && arrivalDay >= arrivalFrom))
        && (arrivalTo === "" || (arrivalDay !== "" && arrivalDay <= arrivalTo));
    })
    .sort((left, right) => {
      let comparison = 0;
      if (sortBy === "itemCount") comparison = left.itemCount - right.itemCount;
      else if (sortBy === "arrivalDate") comparison = (left.arrivalDate ?? "").localeCompare(right.arrivalDate ?? "");
      else if (sortBy === "createdAt") comparison = left.createdAt.localeCompare(right.createdAt);
      else if (sortBy === "source") comparison = (left.source ?? "").localeCompare(right.source ?? "");
      else comparison = left.name.localeCompare(right.name);
      return sortDirection === "asc" ? comparison : -comparison;
    });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSelectedProjectId(params.get("project") ?? "");
    setLowStockOnly(params.get("stock") === "low");
    setCostedOnly(params.get("cost") === "valued");
  }, []);

  useEffect(() => {
    if (!menuProjectId) return;

    const closeMenu = () => setMenuProjectId(null);
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !menuRef.current?.contains(target) && !menuTriggerRef.current?.contains(target)) {
        closeMenu();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [menuProjectId]);

  useEffect(() => {
    let active = true;
    fetch("/api/projects")
      .then(async (response) => {
        if (!response.ok) {
          const result = await response.json() as { error?: string };
          throw new Error(result.error ?? "Could not load projects.");
        }
        return response.json() as Promise<{ projects: Project[] }>;
      })
      .then(({ projects: loadedProjects }) => {
        if (active) setProjects(loadedProjects.map(normalizeProject));
      })
      .catch((error: unknown) => {
        if (active) setDatabaseError(error instanceof Error ? error.message : "Could not connect to PostgreSQL.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  async function addProject(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const itemCount = editingProjectId ? undefined : Number(formData.get("itemCount"));
    const lowStockLimit = Number(formData.get("lowStockLimit"));
    const unitCostValue = String(formData.get("unitCost") ?? "").trim();
    const unitCost = unitCostValue === "" ? null : Number(unitCostValue);
    const currency = String(formData.get("currency") ?? "").trim().toUpperCase();
    const source = String(formData.get("source") ?? "").trim();
    const arrivalDate = String(formData.get("arrivalDate") ?? "");
    if (!name) return;
    setSaving(true);
    setDatabaseError(null);
    try {
      if (editingProjectId) {
        const response = await fetch(`/api/projects/${editingProjectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, lowStockLimit, unitCost, currency, source, arrivalDate }),
        });
        if (!response.ok) {
          const result = await response.json() as { error?: string };
          throw new Error(result.error ?? "Project could not be updated.");
        }
        const { project: responseProject } = await response.json() as { project: Project };
        const project = normalizeProject(responseProject);
        setProjects((current) => current.map((item) => item.id === project.id ? project : item));
        setShowForm(false);
        setEditingProjectId(null);
        setDraftName("");
        setDraftItemCount("0");
        setDraftLowStockLimit("0");
        setDraftUnitCost("");
        setDraftCurrency("");
        setDraftSource("");
        setDraftArrivalDate("");
        return;
      }

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, itemCount, lowStockLimit, unitCost, currency, source, arrivalDate }),
      });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error ?? "Project could not be saved.");
      }
      const { project: responseProject } = await response.json() as { project: Project };
      const project = normalizeProject(responseProject);
      setProjects((current) => [project, ...current]);
      setShowForm(false);
      setDraftName("");
      setDraftItemCount("0");
      setDraftLowStockLimit("0");
      setDraftUnitCost("");
      setDraftCurrency("");
      setDraftSource("");
      setDraftArrivalDate("");
    } catch (error: unknown) {
      setDatabaseError(error instanceof Error ? error.message : "Could not connect to PostgreSQL.");
    } finally {
      setSaving(false);
    }
  }

  function openCreateForm() {
    setMenuProjectId(null);
    setEditingProjectId(null);
    setDraftName("");
    setDraftItemCount("0");
    setDraftLowStockLimit("0");
    setDraftUnitCost("");
    setDraftCurrency("");
    setDraftSource("");
    setDraftArrivalDate("");
    setShowForm(true);
  }

  function openUpdateForm(project: Project) {
    setMenuProjectId(null);
    setEditingProjectId(project.id);
    setDraftName(project.name);
    setDraftItemCount(String(project.itemCount));
    setDraftLowStockLimit(String(project.lowStockLimit));
    setDraftUnitCost(project.unitCost === null ? "" : String(project.unitCost));
    setDraftCurrency(project.currency ?? "");
    setDraftSource(project.source ?? "");
    setDraftArrivalDate(project.arrivalDate?.slice(0, 10) ?? "");
    setShowForm(true);
  }

  function openMovementForm(project: Project) {
    setMenuProjectId(null);
    setMovementProjectId(project.id);
    setMovementAction("receive");
    setMovementQuantity("1");
    setMovementDate(new Date().toISOString().slice(0, 10));
    setMovementNote("");
  }

  function clearFilters() {
    setSourceFilter("all");
    setMinimumCount("");
    setMaximumCount("");
    setArrivalFrom("");
    setArrivalTo("");
    setSelectedProjectId("");
    setLowStockOnly(false);
    setCostedOnly(false);
  }

  function toggleRowMenu(event: MouseEvent<HTMLButtonElement>, project: Project) {
    if (menuProjectId === project.id) {
      setMenuProjectId(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const menuWidth = Math.min(232, window.innerWidth - 24);
    const menuHeight = 210;
    menuTriggerRef.current = event.currentTarget;
    setMenuPosition({
      left: Math.max(12, Math.min(bounds.right - menuWidth, window.innerWidth - menuWidth - 12)),
      top: bounds.bottom + menuHeight + 12 > window.innerHeight
        ? Math.max(12, bounds.top - menuHeight - 8)
        : bounds.bottom + 8,
    });
    setMenuProjectId(project.id);
  }

  async function deleteProject(projectId: string) {
    setMenuProjectId(null);
    setDatabaseError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error ?? "Project could not be deleted.");
      }
      setProjects((current) => current.filter((project) => project.id !== projectId));
    } catch (error: unknown) {
      setDatabaseError(error instanceof Error ? error.message : "Could not connect to PostgreSQL.");
    }
  }

  async function recordMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!movementProjectId) return;
    setSaving(true);
    setDatabaseError(null);
    try {
      const response = await fetch(`/api/projects/${movementProjectId}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: movementAction, quantity: Number(movementQuantity), date: movementDate, note: movementNote }),
      });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error ?? "Movement could not be recorded.");
      }
      const result = await response.json() as { project: Project };
      const project = normalizeProject(result.project);
      setProjects((current) => current.map((item) => item.id === project.id ? project : item));
      setMovementProjectId(null);
      setMovementQuantity("1");
      setMovementNote("");
    } catch (error: unknown) {
      setDatabaseError(error instanceof Error ? error.message : "Could not record this movement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="projects-view">
      <div className="page-heading">
        <div><p className="eyebrow">{arabic ? "مراقبة المخزون" : "INVENTORY CONTROL"}</p><h1>{arabic ? "المخزون" : "Inventory"}</h1><p className="heading-subtitle">{arabic ? "تابع مستويات المخزون وحركات المستودع." : "Track stock levels and warehouse activity."}</p></div>
        <button type="button" className="button button-primary" onClick={openCreateForm}><Plus size={16} />{arabic ? "مخزون جديد" : "New inventory"}</button>
      </div>

      <div className="project-summary-row">
        <div><strong>{projects.reduce((total, project) => total + project.itemCount, 0).toLocaleString(language === "ar" ? "ar" : "en-US")}</strong><span>{arabic ? "إجمالي القطع" : "Total units"}</span></div>
        <div><strong>{projects.length.toString().padStart(2, "0")}</strong><span>{arabic ? "سجلات المخزون" : "Inventory records"}</span></div>
      </div>

      {databaseError && <div className="database-message" role="alert">{databaseError}</div>}

      <section className="panel projects-table-panel">
        <div className="project-toolbar">
          <div className="project-tabs"><button className="project-tab active" type="button">{arabic ? "كل المخزون" : "All inventory"}<span>{projects.length}</span></button></div>
          <div className="table-actions">
            <label className="table-search"><Search size={15} /><input aria-label={arabic ? "ابحث في المخزون" : "Search inventory"} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={arabic ? "ابحث في المخزون" : "Search inventory"} /></label>
            <div className="toolbar-control">
              <button className="filter-button" type="button" aria-expanded={showFilters} onClick={() => { setShowFilters((visible) => !visible); setShowSort(false); }}><SlidersHorizontal size={15} />{arabic ? "تصفية" : "Filter"}{activeFilterCount > 0 && <span className="control-count">{activeFilterCount}</span>}</button>
              {showFilters && <div className="toolbar-popover filter-popover" role="region" aria-label={arabic ? "خيارات التصفية" : "Filter options"}>
                <div className="popover-heading"><strong>{arabic ? "تصفية المخزون" : "Filter inventory"}<button type="button" onClick={clearFilters}>{arabic ? "مسح الكل" : "Clear all"}</button></strong></div>
                <label>{arabic ? "المصدر" : "Source"}<select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option value="all">{arabic ? "كل المصادر" : "All sources"}</option>{sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}</select></label>
                <div className="filter-range"><label>{arabic ? "الحد الأدنى للقطع" : "Minimum items"}<input type="number" min="0" value={minimumCount} onChange={(event) => setMinimumCount(event.target.value)} /></label><label>{arabic ? "الحد الأعلى للقطع" : "Maximum items"}<input type="number" min="0" value={maximumCount} onChange={(event) => setMaximumCount(event.target.value)} /></label></div>
                <div className="filter-range"><label>{arabic ? "الوصول من" : "Arrival from"}<input type="date" value={arrivalFrom} onChange={(event) => setArrivalFrom(event.target.value)} /></label><label>{arabic ? "الوصول إلى" : "Arrival to"}<input type="date" value={arrivalTo} onChange={(event) => setArrivalTo(event.target.value)} /></label></div>
              </div>}
            </div>
            <div className="toolbar-control">
              <button className="filter-button sort-button" type="button" aria-expanded={showSort} onClick={() => { setShowSort((visible) => !visible); setShowFilters(false); }}><ArrowDownUp size={15} />{arabic ? "ترتيب" : "Sort"}</button>
              {showSort && <div className="toolbar-popover sort-popover" role="region" aria-label={arabic ? "خيارات الترتيب" : "Sort options"}>
                <label>{arabic ? "ترتيب حسب" : "Sort by"}<select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="createdAt">{arabic ? "تاريخ الإضافة" : "Date added"}</option><option value="name">{arabic ? "اسم المخزون" : "Inventory name"}</option><option value="itemCount">{arabic ? "عدد القطع" : "Number of items"}</option><option value="source">{arabic ? "المصدر" : "Source"}</option><option value="arrivalDate">{arabic ? "تاريخ الوصول" : "Arrival date"}</option></select></label>
                <label>{arabic ? "الاتجاه" : "Direction"}<select value={sortDirection} onChange={(event) => setSortDirection(event.target.value)}><option value="asc">{arabic ? "تصاعدي" : "Ascending"}</option><option value="desc">{arabic ? "تنازلي" : "Descending"}</option></select></label>
              </div>}
            </div>
          </div>
        </div>
        <div className="table-scroll">
          <table className="projects-table">
            <thead><tr><th>{arabic ? "اسم المخزون" : "Inventory name"}</th><th>{arabic ? "عدد القطع" : "On hand"}</th><th>{arabic ? "حد التنبيه" : "Low-stock limit"}</th><th>{arabic ? "المصدر" : "Source"}</th><th>{arabic ? "تاريخ الوصول" : "Arrival date"}</th><th style={{ width: 54 }}><span className="visually-hidden">{arabic ? "خيارات" : "Options"}</span></th></tr></thead>
            <tbody>{filteredProjects.map((project) => <tr key={project.id}>
              <td><div className="project-title-cell"><span className="project-glyph"><span /></span><span><strong>{project.name}</strong><small>{project.code}</small></span></div></td>
              <td>{project.itemCount.toLocaleString(language === "ar" ? "ar" : "en-US")}</td>
              <td>{project.lowStockLimit > 0 ? project.lowStockLimit.toLocaleString(language === "ar" ? "ar" : "en-US") : "—"}{project.lowStockLimit > 0 && project.itemCount <= project.lowStockLimit && <small className="stock-alert-label">{arabic ? "مخزون منخفض" : "Low stock"}</small>}</td>
              <td>{project.source || (arabic ? "غير محدد" : "Not specified")}</td>
              <td>{project.arrivalDate ? new Intl.DateTimeFormat(language === "ar" ? "ar" : "en-US", { dateStyle: "medium" }).format(new Date(project.arrivalDate)) : (arabic ? "غير محدد" : "Not scheduled")}</td>
              <td style={{ position: "relative" }}>
                <button
                  className="row-more"
                  type="button"
                  aria-label={arabic ? `خيارات ${project.name}` : `More options for ${project.name}`}
                  aria-expanded={menuProjectId === project.id}
                  aria-controls={`inventory-actions-${project.id}`}
                  onClick={(event) => toggleRowMenu(event, project)}
                >
                  <MoreHorizontal size={18} />
                </button>
              </td>
            </tr>)}</tbody>
          </table>
          {filteredProjects.length === 0 && <div className="empty-results">{loading ? (arabic ? "جارٍ تحميل المخزون..." : "Loading inventory...") : projects.length === 0 ? (arabic ? "لم تتم إضافة عناصر بعد." : "No inventory yet. Create your first item.") : (arabic ? "لا توجد عناصر تطابق بحثك." : "No inventory matches your search.")}</div>}
        </div>
        <div className="table-footer"><span>{loading ? (arabic ? "جارٍ الاتصال بقاعدة البيانات..." : "Connecting to database...") : (arabic ? `عرض ${filteredProjects.length} من ${projects.length} عناصر` : `Showing ${filteredProjects.length} of ${projects.length} items`)}</span><div><button type="button" disabled>{arabic ? "السابق" : "Previous"}</button><button type="button">{arabic ? "التالي" : "Next"}</button></div></div>
      </section>

      {menuProjectId && menuPosition && (() => {
        const project = projects.find((item) => item.id === menuProjectId);
        if (!project) return null;

        return createPortal(
          <div
            id={`inventory-actions-${project.id}`}
            className="inventory-row-menu"
            aria-label={arabic ? `إجراءات ${project.name}` : `Actions for ${project.name}`}
            ref={menuRef}
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            <div className="inventory-row-menu-heading">
              <span>{arabic ? "إجراءات المخزون" : "Inventory actions"}</span>
              <strong>{project.name}</strong>
              <small>{project.code}</small>
            </div>
            <button type="button" onClick={() => openMovementForm(project)}><ArrowLeftRight size={16} />{arabic ? "تسجيل حركة" : "Record movement"}</button>
            <button type="button" onClick={() => openUpdateForm(project)}><Pencil size={16} />{arabic ? "تحديث المخزون" : "Update inventory"}</button>
            <button className="inventory-row-menu-danger" type="button" onClick={() => deleteProject(project.id)}><Trash2 size={16} />{arabic ? "حذف المخزون" : "Delete inventory"}</button>
          </div>,
          document.body,
        );
      })()}

      {showForm && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setShowForm(false); setEditingProjectId(null); setDraftName(""); } }}>
        <form className="project-modal inventory-modal" action={addProject}>
          <div className="modal-heading"><div><p className="eyebrow">{arabic ? "إضافة إلى مساحة العمل" : "ADD TO WORKSPACE"}</p><h2>{editingProjectId ? (arabic ? "تحديث المخزون" : "Update inventory") : (arabic ? "إنشاء مخزون" : "Create inventory")}</h2></div><button className="modal-close" type="button" onClick={() => { setShowForm(false); setEditingProjectId(null); setDraftName(""); }} aria-label={arabic ? "إغلاق" : "Close"}>×</button></div>
          <label className="form-label">{arabic ? "اسم العنصر" : "Inventory name"}<input name="name" autoFocus value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder={arabic ? "مثال: جرد نهاية العام" : "e.g. Year-end stocktake"} required /></label>
          <div className="inventory-form-grid">
            {!editingProjectId && <label className="form-label">{arabic ? "الكمية الافتتاحية" : "Opening quantity"}<input name="itemCount" type="number" min="0" step="1" value={draftItemCount} onChange={(event) => setDraftItemCount(event.target.value)} required /></label>}
            <label className="form-label">{arabic ? "حد المخزون المنخفض" : "Low-stock limit"}<input name="lowStockLimit" type="number" min="0" step="1" value={draftLowStockLimit} onChange={(event) => setDraftLowStockLimit(event.target.value)} required /></label>
            <label className="form-label">{arabic ? "تكلفة الوحدة" : "Unit cost"}<input name="unitCost" type="number" min="0" step="0.01" value={draftUnitCost} onChange={(event) => setDraftUnitCost(event.target.value)} placeholder={arabic ? "اختياري" : "Optional"} /></label>
            <label className="form-label">{arabic ? "العملة" : "Currency"}<input name="currency" value={draftCurrency} onChange={(event) => setDraftCurrency(event.target.value.toUpperCase())} maxLength={3} minLength={draftUnitCost ? 3 : undefined} required={draftUnitCost !== ""} placeholder="USD" /></label>
            <label className="form-label">{arabic ? "مصدر المخزون" : "Inventory source"}<input name="source" value={draftSource} onChange={(event) => setDraftSource(event.target.value)} maxLength={120} placeholder={arabic ? "مثال: مورد أو مستودع" : "e.g. Supplier or warehouse"} /></label>
            <label className="form-label">{arabic ? "تاريخ وصول المخزون" : "Inventory arrival date"}<input name="arrivalDate" type="date" value={draftArrivalDate} onChange={(event) => setDraftArrivalDate(event.target.value)} /></label>
          </div>
          <p className="form-hint">{editingProjectId ? (arabic ? "لتغيير الكمية، سجّل حركة استلام أو بيع أو تسوية من صف المخزون." : "Use Record movement to receive, sell, or adjust stock quantities.") : (arabic ? "أدخل تفاصيل المخزون لحفظها." : "Enter the inventory details to save this record.")}</p>
          <div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => { setShowForm(false); setEditingProjectId(null); setDraftName(""); }} disabled={saving}>{arabic ? "إلغاء" : "Cancel"}</button><button className="button button-primary" type="submit" disabled={saving}><Plus size={16} />{saving ? (arabic ? "جارٍ الحفظ..." : "Saving...") : editingProjectId ? (arabic ? "تحديث المخزون" : "Update inventory") : (arabic ? "إنشاء مخزون" : "Create inventory")}</button></div>
        </form>
      </div>}

      {movementProjectId && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMovementProjectId(null); }}>
        <form className="project-modal movement-modal" onSubmit={recordMovement}>
          <div className="modal-heading"><div><p className="eyebrow">{arabic ? "معاملة مخزون" : "INVENTORY TRANSACTION"}</p><h2>{projects.find((project) => project.id === movementProjectId)?.name}</h2></div><button className="modal-close" type="button" onClick={() => setMovementProjectId(null)} aria-label={arabic ? "إغلاق" : "Close"}>×</button></div>
          <label className="form-label">{arabic ? "الإجراء" : "Action"}<select value={movementAction} onChange={(event) => { const action = event.target.value; setMovementAction(action); if (action === "adjust") { const selectedProject = projects.find((project) => project.id === movementProjectId); if (selectedProject) setMovementQuantity(String(selectedProject.itemCount)); } }}><option value="receive">{arabic ? "استلام" : "Receive"}</option><option value="sell">{arabic ? "بيع" : "Sell"}</option><option value="adjust">{arabic ? "تسوية" : "Adjust"}</option></select></label>
          <label className="form-label">{movementAction === "adjust" ? (arabic ? "الكمية الفعلية الجديدة" : "Counted on-hand quantity") : (arabic ? "الكمية" : "Quantity")}<input type="number" min={movementAction === "adjust" ? 0 : 1} step="1" value={movementQuantity} onChange={(event) => setMovementQuantity(event.target.value)} required /></label>
          <label className="form-label">{arabic ? "تاريخ الحركة" : "Movement date"}<input type="date" value={movementDate} onChange={(event) => setMovementDate(event.target.value)} required /></label>
          <label className="form-label">{arabic ? "ملاحظات" : "Notes"}<textarea value={movementNote} onChange={(event) => setMovementNote(event.target.value)} maxLength={500} rows={3} placeholder={arabic ? "اختياري" : "Optional transaction note"} /></label>
          <div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => setMovementProjectId(null)} disabled={saving}>{arabic ? "إلغاء" : "Cancel"}</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? (arabic ? "جارٍ الحفظ..." : "Saving...") : movementAction === "sell" ? (arabic ? "تسجيل البيع" : "Record sale") : (arabic ? "حفظ الحركة" : "Save movement")}</button></div>
        </form>
      </div>}
    </div>
  );
}
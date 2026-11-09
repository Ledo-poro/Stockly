"use client";

import { ArrowDownUp, MoreHorizontal, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppPreferences } from "./app-shell";

type Project = {
  id: string;
  name: string;
  code: string;
  itemCount: number;
  source: string | null;
  arrivalDate: string | null;
  createdAt: string;
  location: string;
  owner: string;
  status: "IN_PROGRESS" | "PLANNING" | "COMPLETED";
  progress: number;
  dueDate: string | null;
};

function normalizeProject(project: Project): Project {
  return {
    ...project,
    itemCount: Number.isFinite(project.itemCount) ? project.itemCount : 0,
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [minimumCount, setMinimumCount] = useState("");
  const [maximumCount, setMaximumCount] = useState("");
  const [arrivalFrom, setArrivalFrom] = useState("");
  const [arrivalTo, setArrivalTo] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [showForm, setShowForm] = useState(false);
  const [menuProjectId, setMenuProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftItemCount, setDraftItemCount] = useState("0");
  const [draftSource, setDraftSource] = useState("");
  const [draftArrivalDate, setDraftArrivalDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const sourceOptions = [...new Set(projects.map((project) => project.source).filter((source): source is string => Boolean(source)))].sort((a, b) => a.localeCompare(b));
  const activeFilterCount = [statusFilter !== "all", sourceFilter !== "all", minimumCount !== "", maximumCount !== "", arrivalFrom !== "", arrivalTo !== ""].filter(Boolean).length;
  const filteredProjects = projects
    .filter((project) => {
      const searchable = `${project.name} ${project.code} ${project.itemCount} ${project.source ?? ""} ${project.location} ${project.owner} ${project.status} ${project.arrivalDate ?? ""}`.toLowerCase();
      const arrivalDay = project.arrivalDate?.slice(0, 10) ?? "";
      return searchable.includes(query.trim().toLowerCase())
        && (statusFilter === "all" || project.status === statusFilter)
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
      else if (sortBy === "status") comparison = left.status.localeCompare(right.status);
      else if (sortBy === "source") comparison = (left.source ?? "").localeCompare(right.source ?? "");
      else comparison = left.name.localeCompare(right.name);
      return sortDirection === "asc" ? comparison : -comparison;
    });

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
    const itemCount = Number(formData.get("itemCount"));
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
          body: JSON.stringify({ name, itemCount, source, arrivalDate }),
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
        setDraftSource("");
        setDraftArrivalDate("");
        return;
      }

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, itemCount, source, arrivalDate }),
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
    setDraftSource("");
    setDraftArrivalDate("");
    setShowForm(true);
  }

  function openUpdateForm(project: Project) {
    setMenuProjectId(null);
    setEditingProjectId(project.id);
    setDraftName(project.name);
    setDraftItemCount(String(project.itemCount));
    setDraftSource(project.source ?? "");
    setDraftArrivalDate(project.arrivalDate?.slice(0, 10) ?? "");
    setShowForm(true);
  }

  function clearFilters() {
    setStatusFilter("all");
    setSourceFilter("all");
    setMinimumCount("");
    setMaximumCount("");
    setArrivalFrom("");
    setArrivalTo("");
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

  return (
    <div className="projects-view">
      <div className="page-heading">
        <div><p className="eyebrow">{arabic ? "مراقبة المخزون" : "INVENTORY CONTROL"}</p><h1>{arabic ? "المخزون" : "Inventory"}</h1><p className="heading-subtitle">{arabic ? "تابع مستويات المخزون وحركات المستودع." : "Track stock levels and warehouse activity."}</p></div>
        <button type="button" className="button button-primary" onClick={openCreateForm}><Plus size={16} />{arabic ? "مخزون جديد" : "New inventory"}</button>
      </div>

      <div className="project-summary-row">
        <div><strong>{projects.reduce((total, project) => total + project.itemCount, 0).toLocaleString(language === "ar" ? "ar" : "en-US")}</strong><span>{arabic ? "إجمالي القطع" : "Total units"}</span></div>
        <div><strong>{projects.filter((project) => project.status === "IN_PROGRESS").length.toString().padStart(2, "0")}</strong><span>{arabic ? "قيد التنفيذ" : "In progress"}</span></div>
        <div><strong>{projects.filter((project) => project.status === "COMPLETED").length.toString().padStart(2, "0")}</strong><span>{arabic ? "مكتمل" : "Completed"}</span></div>
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
                <label>{arabic ? "الحالة" : "Status"}<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{arabic ? "كل الحالات" : "All statuses"}</option><option value="PLANNING">{arabic ? "مخطط" : "Planning"}</option><option value="IN_PROGRESS">{arabic ? "قيد التنفيذ" : "In progress"}</option><option value="COMPLETED">{arabic ? "مكتمل" : "Completed"}</option></select></label>
                <label>{arabic ? "المصدر" : "Source"}<select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option value="all">{arabic ? "كل المصادر" : "All sources"}</option>{sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}</select></label>
                <div className="filter-range"><label>{arabic ? "الحد الأدنى للقطع" : "Minimum items"}<input type="number" min="0" value={minimumCount} onChange={(event) => setMinimumCount(event.target.value)} /></label><label>{arabic ? "الحد الأعلى للقطع" : "Maximum items"}<input type="number" min="0" value={maximumCount} onChange={(event) => setMaximumCount(event.target.value)} /></label></div>
                <div className="filter-range"><label>{arabic ? "الوصول من" : "Arrival from"}<input type="date" value={arrivalFrom} onChange={(event) => setArrivalFrom(event.target.value)} /></label><label>{arabic ? "الوصول إلى" : "Arrival to"}<input type="date" value={arrivalTo} onChange={(event) => setArrivalTo(event.target.value)} /></label></div>
              </div>}
            </div>
            <div className="toolbar-control">
              <button className="filter-button sort-button" type="button" aria-expanded={showSort} onClick={() => { setShowSort((visible) => !visible); setShowFilters(false); }}><ArrowDownUp size={15} />{arabic ? "ترتيب" : "Sort"}</button>
              {showSort && <div className="toolbar-popover sort-popover" role="region" aria-label={arabic ? "خيارات الترتيب" : "Sort options"}>
                <label>{arabic ? "ترتيب حسب" : "Sort by"}<select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="createdAt">{arabic ? "تاريخ الإضافة" : "Date added"}</option><option value="name">{arabic ? "اسم المخزون" : "Inventory name"}</option><option value="itemCount">{arabic ? "عدد القطع" : "Number of items"}</option><option value="source">{arabic ? "المصدر" : "Source"}</option><option value="arrivalDate">{arabic ? "تاريخ الوصول" : "Arrival date"}</option><option value="status">{arabic ? "الحالة" : "Status"}</option></select></label>
                <label>{arabic ? "الاتجاه" : "Direction"}<select value={sortDirection} onChange={(event) => setSortDirection(event.target.value)}><option value="asc">{arabic ? "تصاعدي" : "Ascending"}</option><option value="desc">{arabic ? "تنازلي" : "Descending"}</option></select></label>
              </div>}
            </div>
          </div>
        </div>
        <div className="table-scroll">
          <table className="projects-table">
            <thead><tr><th>{arabic ? "اسم المخزون" : "Inventory name"}</th><th>{arabic ? "عدد القطع" : "Number of items"}</th><th>{arabic ? "المصدر" : "Source"}</th><th>{arabic ? "تاريخ الوصول" : "Arrival date"}</th><th>{arabic ? "الحالة" : "Status"}</th><th style={{ width: 54 }}><span className="visually-hidden">{arabic ? "خيارات" : "Options"}</span></th></tr></thead>
            <tbody>{filteredProjects.map((project) => <tr key={project.id}>
              <td><div className="project-title-cell"><span className="project-glyph"><span /></span><span><strong>{project.name}</strong><small>{project.code}</small></span></div></td>
              <td>{project.itemCount.toLocaleString(language === "ar" ? "ar" : "en-US")}</td>
              <td>{project.source || (arabic ? "غير محدد" : "Not specified")}</td>
              <td>{project.arrivalDate ? new Intl.DateTimeFormat(language === "ar" ? "ar" : "en-US", { dateStyle: "medium" }).format(new Date(project.arrivalDate)) : (arabic ? "غير محدد" : "Not scheduled")}</td>
              <td><span className={`status-pill ${project.status.toLowerCase().replace("_", "-")}`}><i />{project.status === "IN_PROGRESS" ? (arabic ? "قيد التنفيذ" : "In progress") : project.status === "COMPLETED" ? (arabic ? "مكتمل" : "Completed") : (arabic ? "مخطط" : "Planning")}</span></td>
              <td style={{ position: "relative" }}>
                <button
                  className="row-more"
                  type="button"
                  aria-label={`More options for ${project.name}`}
                  onClick={() => setMenuProjectId((current) => current === project.id ? null : project.id)}
                >
                  <MoreHorizontal size={18} />
                </button>
                {menuProjectId === project.id && (
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 20, background: "#1f2d26", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: 6, minWidth: 120, boxShadow: "0 12px 24px rgba(0,0,0,0.22)" }}>
                    <button type="button" onClick={() => openUpdateForm(project)} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: 0, borderRadius: 8, background: "transparent", color: "#edf7f1", cursor: "pointer" }}>{arabic ? "تحديث" : "Update"}</button>
                    <button type="button" onClick={() => deleteProject(project.id)} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: 0, borderRadius: 8, background: "transparent", color: "#ffb4b4", cursor: "pointer" }}>{arabic ? "حذف" : "Delete"}</button>
                  </div>
                )}
              </td>
            </tr>)}</tbody>
          </table>
          {filteredProjects.length === 0 && <div className="empty-results">{loading ? (arabic ? "جارٍ تحميل المخزون..." : "Loading inventory...") : projects.length === 0 ? (arabic ? "لم تتم إضافة عناصر بعد." : "No inventory yet. Create your first item.") : (arabic ? "لا توجد عناصر تطابق بحثك." : "No inventory matches your search.")}</div>}
        </div>
        <div className="table-footer"><span>{loading ? (arabic ? "جارٍ الاتصال بقاعدة البيانات..." : "Connecting to database...") : (arabic ? `عرض ${filteredProjects.length} من ${projects.length} عناصر` : `Showing ${filteredProjects.length} of ${projects.length} items`)}</span><div><button type="button" disabled>{arabic ? "السابق" : "Previous"}</button><button type="button">{arabic ? "التالي" : "Next"}</button></div></div>
      </section>

      {showForm && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setShowForm(false); setEditingProjectId(null); setDraftName(""); } }}>
        <form className="project-modal" action={addProject}>
          <div className="modal-heading"><div><p className="eyebrow">{arabic ? "إضافة إلى مساحة العمل" : "ADD TO WORKSPACE"}</p><h2>{editingProjectId ? (arabic ? "تحديث المخزون" : "Update inventory") : (arabic ? "إنشاء مخزون" : "Create inventory")}</h2></div><button className="modal-close" type="button" onClick={() => { setShowForm(false); setEditingProjectId(null); setDraftName(""); }} aria-label={arabic ? "إغلاق" : "Close"}>×</button></div>
          <label className="form-label">{arabic ? "اسم العنصر" : "Inventory name"}<input name="name" autoFocus value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder={arabic ? "مثال: جرد نهاية العام" : "e.g. Year-end stocktake"} required /></label>
          <div className="inventory-form-grid">
            <label className="form-label">{arabic ? "عدد القطع في هذا المخزون" : "Number of items in this inventory"}<input name="itemCount" type="number" min="0" step="1" value={draftItemCount} onChange={(event) => setDraftItemCount(event.target.value)} required /></label>
            <label className="form-label">{arabic ? "مصدر المخزون" : "Inventory source"}<input name="source" value={draftSource} onChange={(event) => setDraftSource(event.target.value)} maxLength={120} placeholder={arabic ? "مثال: مورد أو مستودع" : "e.g. Supplier or warehouse"} /></label>
            <label className="form-label">{arabic ? "تاريخ وصول المخزون" : "Inventory arrival date"}<input name="arrivalDate" type="date" value={draftArrivalDate} onChange={(event) => setDraftArrivalDate(event.target.value)} /></label>
          </div>
          <p className="form-hint">{editingProjectId ? (arabic ? "قم بتحديث تفاصيل المخزون." : "Update the inventory details.") : (arabic ? "سيتم إنشاء المخزون بحالة التخطيط." : "The inventory will be created with planning status.")}</p>
          <div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => { setShowForm(false); setEditingProjectId(null); setDraftName(""); }} disabled={saving}>{arabic ? "إلغاء" : "Cancel"}</button><button className="button button-primary" type="submit" disabled={saving}><Plus size={16} />{saving ? (arabic ? "جارٍ الحفظ..." : "Saving...") : editingProjectId ? (arabic ? "تحديث المخزون" : "Update inventory") : (arabic ? "إنشاء مخزون" : "Create inventory")}</button></div>
        </form>
      </div>}
    </div>
  );
}

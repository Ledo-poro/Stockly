"use client";

import { ArrowDownUp, MoreHorizontal, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppPreferences } from "./app-shell";

type Project = {
  id: string;
  name: string;
  code: string;
  location: string;
  owner: string;
  status: "IN_PROGRESS" | "PLANNING" | "COMPLETED";
  progress: number;
  dueDate: string | null;
};

export function ProjectsView() {
  const { language } = useAppPreferences();
  const arabic = language === "ar";
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [menuProjectId, setMenuProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const filteredProjects = projects.filter((project) => `${project.name} ${project.location} ${project.owner}`.toLowerCase().includes(query.toLowerCase()));

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
        if (active) setProjects(loadedProjects);
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
    if (!name) return;
    setSaving(true);
    setDatabaseError(null);
    try {
      if (editingProjectId) {
        const response = await fetch(`/api/projects/${editingProjectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!response.ok) {
          const result = await response.json() as { error?: string };
          throw new Error(result.error ?? "Project could not be updated.");
        }
        const { project } = await response.json() as { project: Project };
        setProjects((current) => current.map((item) => item.id === project.id ? project : item));
        setShowForm(false);
        setEditingProjectId(null);
        setDraftName("");
        return;
      }

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error ?? "Project could not be saved.");
      }
      const { project } = await response.json() as { project: Project };
      setProjects((current) => [project, ...current]);
      setShowForm(false);
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
    setShowForm(true);
  }

  function openUpdateForm(project: Project) {
    setMenuProjectId(null);
    setEditingProjectId(project.id);
    setDraftName(project.name);
    setShowForm(true);
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
        <div><strong>{projects.length.toString().padStart(2, "0")}</strong><span>{arabic ? "إجمالي العناصر" : "Total items"}</span></div>
        <div><strong>{projects.filter((project) => project.status === "IN_PROGRESS").length.toString().padStart(2, "0")}</strong><span>{arabic ? "قيد التنفيذ" : "In progress"}</span></div>
        <div><strong>{projects.filter((project) => project.status === "COMPLETED").length.toString().padStart(2, "0")}</strong><span>{arabic ? "مكتمل" : "Completed"}</span></div>
      </div>

      {databaseError && <div className="database-message" role="alert">{databaseError}</div>}

      <section className="panel projects-table-panel">
        <div className="project-toolbar">
          <div className="project-tabs"><button className="project-tab active" type="button">{arabic ? "كل المخزون" : "All inventory"}<span>{projects.length}</span></button></div>
          <div className="table-actions"><label className="table-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={arabic ? "ابحث في المخزون" : "Search inventory"} /></label><button className="filter-button" type="button"><SlidersHorizontal size={15} />{arabic ? "تصفية" : "Filter"}</button><button className="filter-button sort-button" type="button"><ArrowDownUp size={15} />{arabic ? "ترتيب" : "Sort"}</button></div>
        </div>
        <div className="table-scroll">
          <table className="projects-table">
            <thead><tr><th>{arabic ? "اسم العنصر" : "Inventory name"}</th><th>{arabic ? "الموقع" : "Location"}</th><th>{arabic ? "المسؤول" : "Owner"}</th><th>{arabic ? "تاريخ الاستحقاق" : "Due date"}</th><th style={{ width: 54 }}><span className="visually-hidden">{arabic ? "خيارات" : "Options"}</span></th></tr></thead>
            <tbody>{filteredProjects.map((project) => <tr key={project.id}>
              <td><div className="project-title-cell"><span className="project-glyph"><span /></span><span><strong>{project.name}</strong><small>{project.code}</small></span></div></td>
              <td>{project.location}</td>
              <td><span className="owner-cell"><span className="owner-avatar">{project.owner.split(" ").map((part) => part[0]).join("")}</span>{project.owner}</span></td>
              <td>{project.dueDate ? new Intl.DateTimeFormat(language === "ar" ? "ar" : "en-US", { dateStyle: "medium" }).format(new Date(project.dueDate)) : (arabic ? "غير محدد" : "Not scheduled")}</td>
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
          <p className="form-hint">{editingProjectId ? (arabic ? "قم بتحديث اسم المخزون." : "Update the inventory name.") : (arabic ? "سيتم إنشاء العنصر بحالة التخطيط." : "The inventory item will be created with planning status.")}</p>
          <div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => { setShowForm(false); setEditingProjectId(null); setDraftName(""); }} disabled={saving}>{arabic ? "إلغاء" : "Cancel"}</button><button className="button button-primary" type="submit" disabled={saving}><Plus size={16} />{saving ? (arabic ? "جارٍ الحفظ..." : "Saving...") : editingProjectId ? (arabic ? "تحديث المخزون" : "Update inventory") : (arabic ? "إنشاء مخزون" : "Create inventory")}</button></div>
        </form>
      </div>}
    </div>
  );
}
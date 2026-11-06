"use client";

import { ArrowDownUp, MoreHorizontal, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useAppPreferences } from "./app-shell";

type Project = { name: string; code: string; location: string; owner: string; status: "In progress" | "Planning" | "Completed"; progress: number; due: string };

const initialProjects: Project[] = [];

export function ProjectsView() {
  const { language } = useAppPreferences();
  const arabic = language === "ar";
  const [projects, setProjects] = useState(initialProjects);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const filteredProjects = projects.filter((project) => `${project.name} ${project.location} ${project.owner}`.toLowerCase().includes(query.toLowerCase()));

  function addProject(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    setProjects((current) => [{
      name,
      code: `PRJ-${String(current.length + 1).padStart(4, "0")}`,
      location: "Unassigned",
      owner: "Unassigned",
      status: "Planning",
      progress: 0,
      due: "Not scheduled",
    }, ...current]);
    setShowForm(false);
  }

  return (
    <div className="projects-view">
      <div className="page-heading">
        <div><p className="eyebrow">{arabic ? "التخطيط والتنسيق" : "PLANNING & COORDINATION"}</p><h1>{arabic ? "المشاريع" : "Projects"}</h1><p className="heading-subtitle">{arabic ? "تابع مبادرات المستودع والمهام التشغيلية." : "Track warehouse initiatives and operational work."}</p></div>
        <button type="button" className="button button-primary" onClick={() => setShowForm(true)}><Plus size={16} />{arabic ? "مشروع جديد" : "New project"}</button>
      </div>

      <div className="project-summary-row">
        <div><strong>{projects.length.toString().padStart(2, "0")}</strong><span>{arabic ? "إجمالي المشاريع" : "Total projects"}</span></div>
        <div><strong>{projects.filter((project) => project.status === "In progress").length.toString().padStart(2, "0")}</strong><span>{arabic ? "قيد التنفيذ" : "In progress"}</span></div>
        <div><strong>{projects.filter((project) => project.status === "Completed").length.toString().padStart(2, "0")}</strong><span>{arabic ? "مكتمل" : "Completed"}</span></div>
      </div>

      <section className="panel projects-table-panel">
        <div className="project-toolbar">
          <div className="project-tabs"><button className="project-tab active" type="button">{arabic ? "كل المشاريع" : "All projects"}<span>{projects.length}</span></button></div>
          <div className="table-actions"><label className="table-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={arabic ? "ابحث عن مشروع" : "Search projects"} /></label><button className="filter-button" type="button"><SlidersHorizontal size={15} />{arabic ? "تصفية" : "Filter"}</button><button className="filter-button sort-button" type="button"><ArrowDownUp size={15} />{arabic ? "ترتيب" : "Sort"}</button></div>
        </div>
        <div className="table-scroll">
          <table className="projects-table">
            <thead><tr><th>{arabic ? "اسم المشروع" : "Project name"}</th><th>{arabic ? "الموقع" : "Location"}</th><th>{arabic ? "المسؤول" : "Owner"}</th><th>{arabic ? "الحالة" : "Status"}</th><th>{arabic ? "التقدم" : "Progress"}</th><th>{arabic ? "تاريخ الاستحقاق" : "Due date"}</th><th><span className="visually-hidden">{arabic ? "خيارات" : "Options"}</span></th></tr></thead>
            <tbody>{filteredProjects.map((project) => <tr key={project.code}>
              <td><div className="project-title-cell"><span className="project-glyph"><span /></span><span><strong>{project.name}</strong><small>{project.code}</small></span></div></td>
              <td>{project.location}</td>
              <td><span className="owner-cell"><span className="owner-avatar">{project.owner.split(" ").map((part) => part[0]).join("")}</span>{project.owner}</span></td>
              <td><span className={`status-pill ${project.status.toLowerCase().replace(" ", "-")}`}><i />{arabic ? ({ "In progress": "قيد التنفيذ", Planning: "التخطيط", Completed: "مكتمل" } as const)[project.status] : project.status}</span></td>
              <td><div className="progress-cell"><div className="progress-track"><span style={{ width: `${project.progress}%` }} /></div><small>{project.progress}%</small></div></td>
              <td>{project.due}</td>
              <td><button className="row-more" type="button" aria-label={`More options for ${project.name}`}><MoreHorizontal size={18} /></button></td>
            </tr>)}</tbody>
          </table>
          {filteredProjects.length === 0 && <div className="empty-results">{projects.length === 0 ? (arabic ? "لم تتم إضافة مشاريع بعد." : "No projects yet. Create your first project.") : (arabic ? "لا توجد مشاريع تطابق بحثك." : "No projects match your search.")}</div>}
        </div>
        <div className="table-footer"><span>{arabic ? `عرض ${filteredProjects.length} من ${projects.length} مشاريع` : `Showing ${filteredProjects.length} of ${projects.length} projects`}</span><div><button type="button" disabled>{arabic ? "السابق" : "Previous"}</button><button type="button">{arabic ? "التالي" : "Next"}</button></div></div>
      </section>

      {showForm && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
        <form className="project-modal" action={addProject}>
          <div className="modal-heading"><div><p className="eyebrow">{arabic ? "إضافة إلى مساحة العمل" : "ADD TO WORKSPACE"}</p><h2>{arabic ? "إنشاء مشروع" : "Create a project"}</h2></div><button className="modal-close" type="button" onClick={() => setShowForm(false)} aria-label={arabic ? "إغلاق" : "Close"}>×</button></div>
          <label className="form-label">{arabic ? "اسم المشروع" : "Project name"}<input name="name" autoFocus placeholder={arabic ? "مثال: جرد نهاية العام" : "e.g. Year-end stocktake"} required /></label>
          <p className="form-hint">{arabic ? "سيتم إنشاء المشروع بحالة التخطيط." : "The project will be created with planning status."}</p>
          <div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => setShowForm(false)}>{arabic ? "إلغاء" : "Cancel"}</button><button className="button button-primary" type="submit"><Plus size={16} />{arabic ? "إنشاء مشروع" : "Create project"}</button></div>
        </form>
      </div>}
    </div>
  );
}
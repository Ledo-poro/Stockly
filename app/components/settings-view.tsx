"use client";

import { Check, Globe2, Moon, Sun } from "lucide-react";
import { useAppPreferences } from "./app-shell";

export function SettingsView() {
  const { theme, setTheme, language, setLanguage } = useAppPreferences();
  const arabic = language === "ar";

  return (
    <div className="settings-view">
      <div className="page-heading"><div><p className="eyebrow">{arabic ? "مساحة العمل" : "WORKSPACE"}</p><h1>{arabic ? "الإعدادات" : "Settings"}</h1><p className="heading-subtitle">{arabic ? "خصص طريقة عرض Stockly." : "Make Stockly work the way you do."}</p></div></div>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label={arabic ? "أقسام الإعدادات" : "Settings sections"}><a className="settings-nav-link active" href="#preferences">{arabic ? "التفضيلات" : "Preferences"}</a><a className="settings-nav-link" href="#workspace">{arabic ? "مساحة العمل" : "Workspace"}</a></nav>
        <div className="settings-sections">
          <section className="panel settings-panel" id="preferences">
            <div className="settings-section-heading"><span className="settings-section-icon"><Sun size={18} /></span><div><h2>{arabic ? "المظهر" : "Appearance"}</h2><p>{arabic ? "اختر المظهر المناسب لبيئة عملك." : "Choose the look that suits your workspace."}</p></div></div>
            <div className="setting-control-row"><div><strong>{arabic ? "السمة" : "Theme"}</strong><span>{arabic ? "يمكنك تغييرها في أي وقت." : "Change this any time."}</span></div><div className="segmented-control" role="group" aria-label={arabic ? "اختيار السمة" : "Choose a theme"}>
              <button type="button" className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")} aria-pressed={theme === "light"}><Sun size={16} />{arabic ? "فاتح" : "Light"}{theme === "light" && <Check size={14} />}</button>
              <button type="button" className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")} aria-pressed={theme === "dark"}><Moon size={16} />{arabic ? "داكن" : "Dark"}{theme === "dark" && <Check size={14} />}</button>
            </div></div>
          </section>
          <section className="panel settings-panel" id="workspace">
            <div className="settings-section-heading"><span className="settings-section-icon language-icon"><Globe2 size={18} /></span><div><h2>{arabic ? "اللغة" : "Language"}</h2><p>{arabic ? "اختر لغة واجهة التطبيق." : "Choose the language used across Stockly."}</p></div></div>
            <div className="setting-control-row"><div><strong>{arabic ? "لغة العرض" : "Display language"}</strong><span>{arabic ? "يتم تطبيق اختيارك فورًا." : "Your choice is applied immediately."}</span></div><div className="segmented-control language-control" role="group" aria-label={arabic ? "اختيار اللغة" : "Choose a language"}>
              <button type="button" className={language === "en" ? "selected" : ""} onClick={() => setLanguage("en")} aria-pressed={language === "en"}>English{language === "en" && <Check size={14} />}</button>
              <button type="button" className={language === "ar" ? "selected" : ""} onClick={() => setLanguage("ar")} aria-pressed={language === "ar"}>العربية{language === "ar" && <Check size={14} />}</button>
            </div></div>
          </section>
          <div className="settings-note"><span className="note-mark">i</span><span>{arabic ? "يتم حفظ تفضيلات المظهر واللغة على هذا الجهاز." : "Your appearance and language preferences are saved on this device."}</span></div>
        </div>
      </div>
    </div>
  );
}
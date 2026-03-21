document.addEventListener("DOMContentLoaded", () => {
  const roleSelect = document.querySelector("[data-role-select]");
  const adminSection = document.querySelector("[data-admin-section]");
  const doctorSection = document.querySelector("[data-doctor-section]");

  if (!roleSelect || !adminSection || !doctorSection) {
    return;
  }

  const setSectionState = (section, shouldShow) => {
    section.classList.toggle("d-none", !shouldShow);
    section.querySelectorAll("input, select, textarea").forEach((field) => {
      field.disabled = !shouldShow;
      if (!shouldShow) {
        if (field.type === "checkbox" || field.type === "radio") {
          field.checked = false;
        } else if (field.tagName === "SELECT") {
          field.selectedIndex = 0;
        } else {
          field.value = "";
        }
      }
    });
  };

  const syncSections = () => {
    const role = roleSelect.value;
    setSectionState(adminSection, role === "admin");
    setSectionState(doctorSection, role === "doctor");
  };

  roleSelect.addEventListener("change", syncSections);
  syncSections();
});

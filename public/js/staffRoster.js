(function () {
  "use strict";

  const form = document.querySelector("[data-staff-roster-form]");
  if (!form) return;

  const doctorSelect = form.querySelector("[data-staff-doctor-select]");
  const statusBadge = document.querySelector("[data-staff-status-badge]");
  const namePreview = document.querySelector("[data-staff-name-preview]");
  const rolePreview = document.querySelector("[data-staff-role-preview]");
  const departmentPreview = document.querySelector("[data-staff-department-preview]");
  const specializationPreview = document.querySelector("[data-staff-specialization-preview]");
  const hoursPreview = document.querySelector("[data-staff-hours-preview]");
  const daysPreview = document.querySelector("[data-staff-days-preview]");
  const bioPreview = document.querySelector("[data-staff-bio-preview]");

  const departmentField = form.querySelector('[name="department"]');
  const startField = form.querySelector('[name="hospital_start_time"]');
  const endField = form.querySelector('[name="hospital_end_time"]');
  const bioField = form.querySelector('[name="doctor_bio"]');
  const activeField = form.querySelector('[name="active"]');

  const setText = (node, value) => {
    if (node) {
      node.textContent = value || "-";
    }
  };

  const labelize = (value) => {
    const text = String(value || "").trim();
    if (!text) return "Waiting";
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const syncPreview = () => {
    const option = doctorSelect?.selectedOptions?.[0];
    const hasSelection = Boolean(option && option.value);

    if (statusBadge) {
      statusBadge.textContent = hasSelection ? labelize(option.dataset.status) : "Waiting";
    }

    if (!hasSelection) {
      setText(namePreview, "-");
      setText(rolePreview, "-");
      setText(departmentPreview, "-");
      setText(specializationPreview, "-");
      setText(hoursPreview, "-");
      setText(daysPreview, "-");
      setText(bioPreview, "-");
      return;
    }

    const data = option.dataset || {};
    setText(namePreview, data.staffName);
    setText(rolePreview, data.staffRole);
    setText(departmentPreview, data.department);
    setText(specializationPreview, data.specialization);
    setText(hoursPreview, [data.startTime, data.endTime].filter(Boolean).join(" to "));
    setText(daysPreview, data.days);
    setText(bioPreview, data.bio);

    if (departmentField && !String(departmentField.value || "").trim() && data.department) {
      departmentField.value = data.department;
    }

    if (startField && !String(startField.value || "").trim() && data.startTime) {
      startField.value = data.startTime;
    }

    if (endField && !String(endField.value || "").trim() && data.endTime) {
      endField.value = data.endTime;
    }

    if (bioField && !String(bioField.value || "").trim() && data.bio) {
      bioField.value = data.bio;
    }

    if (activeField && !String(activeField.value || "").trim() && data.status) {
      activeField.value = data.status === "active" ? "true" : "false";
    }
  };

  if (doctorSelect) {
    doctorSelect.addEventListener("change", syncPreview);
  }

  syncPreview();
})();

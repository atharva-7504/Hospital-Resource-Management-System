(function () {
  "use strict";

  const form = document.querySelector("[data-appointment-form]");
  if (!form) return;

  const progressRing = document.querySelector("[data-progress-ring]");
  const progressValue = document.querySelector("[data-progress-value]");
  const browseDoctorsButton = document.querySelector("[data-browse-doctors]");

  const fields = Array.from(form.querySelectorAll("input, select, textarea")).filter((field) => {
    const type = (field.type || "").toLowerCase();
    return !["hidden", "submit", "button", "reset"].includes(type) && !field.disabled;
  });

  const isFilled = (field) => {
    const type = (field.type || "").toLowerCase();
    if (type === "checkbox" || type === "radio") {
      return field.checked;
    }
    return String(field.value || "").trim() !== "";
  };

  const countGroups = () => {
    const groups = new Map();
    fields.forEach((field) => {
      const group = field.dataset.progressGroup;
      if (group) {
        if (!groups.has(group)) {
          groups.set(group, []);
        }
        groups.get(group).push(field);
      }
    });

    const groupedFields = new Set();
    let filledCount = 0;
    let totalCount = 0;

    groups.forEach((groupFields, groupName) => {
      totalCount += 1;
      groupedFields.add(groupName);
      if (groupFields.some(isFilled)) {
        filledCount += 1;
      }
    });

    fields.forEach((field) => {
      const group = field.dataset.progressGroup;
      if (group) return;
      totalCount += 1;
      if (isFilled(field)) {
        filledCount += 1;
      }
    });

    return totalCount ? Math.round((filledCount / totalCount) * 100) : 0;
  };

  const updateProgress = () => {
    const pct = countGroups();
    if (progressRing) {
      progressRing.style.setProperty("--pct", pct);
    }
    if (progressValue) {
      progressValue.textContent = `${pct}%`;
    }
  };

  const serializeFormValues = () => {
    const params = new URLSearchParams();
    Array.from(form.elements).forEach((field) => {
      const type = (field.type || "").toLowerCase();
      if (["submit", "button", "reset"].includes(type)) return;
      if (!field.name) return;
      if (type === "checkbox") {
        params.set(field.name, field.checked ? "on" : "");
        return;
      }
      params.set(field.name, field.value);
    });
    return params;
  };

  fields.forEach((field) => {
    field.addEventListener("input", updateProgress);
    field.addEventListener("change", updateProgress);
  });

  if (browseDoctorsButton) {
    browseDoctorsButton.addEventListener("click", () => {
      const params = serializeFormValues();
      window.location.href = `/doctors${params.toString() ? `?${params.toString()}` : ""}`;
    });
  }

  const appointmentDateField = form.querySelector('[name="appointment_date"]');
  if (appointmentDateField) {
    appointmentDateField.addEventListener("change", () => {
      const doctorId = form.querySelector('[name="doctor_id"]')?.value || "";
      if (!doctorId) {
        return;
      }

      const params = serializeFormValues();
      params.delete("time_slot");
      window.location.href = `/appointment?${params.toString()}`;
    });
  }

  form.addEventListener("submit", (event) => {
    if (!form.checkValidity()) {
      event.preventDefault();
      event.stopPropagation();
    }
    form.classList.add("was-validated");
    updateProgress();
  });

  updateProgress();
})();

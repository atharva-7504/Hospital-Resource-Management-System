(function () {
  "use strict";

  const form = document.querySelector("[data-bed-request-form]");
  if (!form) return;

  const appointmentSelect = form.querySelector("[data-bed-request-appointment]");
  const statusBadge = document.querySelector("[data-bed-request-status]");
  const previewName = document.querySelector("[data-bed-request-patient-name]");
  const previewEmail = document.querySelector("[data-bed-request-patient-email]");
  const previewPhone = document.querySelector("[data-bed-request-patient-phone]");
  const previewDoctor = document.querySelector("[data-bed-request-doctor]");
  const previewAppointment = document.querySelector("[data-bed-request-appointment-label]");
  const previewSymptoms = document.querySelector("[data-bed-request-symptoms]");
  const previewUrgency = document.querySelector("[data-bed-request-urgency]");

  const departmentField = form.querySelector('[name="department"]');
  const urgencyField = form.querySelector('[name="urgency_level"]');
  const notesField = form.querySelector('[name="notes"]');

  const setText = (node, value) => {
    if (node) {
      node.textContent = value || "-";
    }
  };

  const labelize = (value) => {
    const text = String(value || "").trim();
    if (!text) return "Medium";
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const syncPreview = () => {
    const option = appointmentSelect?.selectedOptions?.[0];
    const hasSelection = Boolean(option && option.value);

    if (statusBadge) {
      statusBadge.textContent = hasSelection ? "Ready" : "Waiting";
    }

    if (!hasSelection) {
      setText(previewName, "-");
      setText(previewEmail, "-");
      setText(previewPhone, "-");
      setText(previewDoctor, "-");
      setText(previewAppointment, "-");
      setText(previewSymptoms, "-");
      setText(previewUrgency, "medium");
      return;
    }

    const data = option.dataset || {};
    setText(previewName, data.patientName);
    setText(previewEmail, data.patientEmail);
    setText(previewPhone, data.patientPhone);
    setText(previewDoctor, data.doctorName);
    setText(previewAppointment, [data.appointmentDate, data.timeSlot].filter(Boolean).join(" | "));
    setText(previewSymptoms, data.symptoms);
    setText(previewUrgency, labelize(data.urgency));

    if (departmentField && !String(departmentField.value || "").trim() && data.department) {
      departmentField.value = data.department;
    }

    if (urgencyField && !String(urgencyField.value || "").trim() && data.urgency) {
      urgencyField.value = data.urgency;
    }

    if (notesField && !String(notesField.value || "").trim() && data.symptoms) {
      notesField.value = data.symptoms;
    }
  };

  if (appointmentSelect) {
    appointmentSelect.addEventListener("change", syncPreview);
  }

  syncPreview();
})();

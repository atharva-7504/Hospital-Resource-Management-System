const mongoose = require("mongoose");

const bedRequestSchema = new mongoose.Schema(
  {
    appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AppointmentDetail",
      required: true
    },
    patient_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    patient_name: {
      type: String,
      required: true,
      trim: true
    },
    patient_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "")),
        message: "Please provide a valid patient email address."
      }
    },
    patient_phone: {
      type: String,
      required: true,
      trim: true,
      match: /^[0-9]{10}$/
    },
    doctor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true
    },
    doctor_name: {
      type: String,
      required: true,
      trim: true
    },
    bed_category: {
      type: String,
      enum: ["normal", "critical", "icu"],
      required: true
    },
    urgency_level: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
      default: "medium"
    },
    department: {
      type: String,
      trim: true,
      maxlength: 120
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    requested_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    resolved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    resolved_at: {
      type: Date
    }
  },
  {
    timestamps: true,
    collection: "bed_requests"
  }
);

bedRequestSchema.index({ status: 1, bed_category: 1, createdAt: -1 });
bedRequestSchema.index({ appointment_id: 1 });
bedRequestSchema.index({ requested_by: 1, createdAt: -1 });

module.exports = mongoose.model("BedRequest", bedRequestSchema);

const mongoose = require("mongoose");

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const staffRecordSchema = new mongoose.Schema(
  {
    staff_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    staff_name: {
      type: String,
      required: true,
      trim: true
    },
    staff_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value) => emailPattern.test(String(value || "")),
        message: "Please provide a valid staff email address."
      }
    },
    staff_role: {
      type: String,
      enum: ["admin", "doctor", "nurse", "technician", "support"],
      required: true
    },
    department: {
      type: String,
      required: true,
      trim: true
    },
    shift: {
      type: String,
      enum: ["morning", "afternoon", "night", "rotational"],
      required: true
    },
    action_type: {
      type: String,
      enum: ["added", "removed", "left", "on_leave", "recommended", "updated"],
      required: true
    },
    status: {
      type: String,
      enum: ["active", "inactive", "recommended", "pending"],
      default: "active"
    },
    total_staff: {
      type: Number,
      required: true,
      min: 0
    },
    active_staff: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(value) {
          return value <= this.total_staff;
        },
        message: "Active staff cannot exceed total staff."
      }
    },
    added_staff: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    left_staff: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    required_staff: {
      type: Number,
      required: true,
      min: 0
    },
    effective_date: {
      type: String,
      required: true,
      match: datePattern
    },
    recommendation: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    recorded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true,
    collection: "staff_records"
  }
);

staffRecordSchema.index({ effective_date: -1 });
staffRecordSchema.index({ staff_user_id: 1, effective_date: -1 });

module.exports = mongoose.model("StaffRecord", staffRecordSchema);

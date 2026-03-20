const mongoose = require("mongoose");

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const phonePattern = /^[0-9]{10}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const bedAdmissionSchema = new mongoose.Schema(
  {
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
        validator: (value) => emailPattern.test(String(value || "")),
        message: "Please provide a valid patient email address."
      }
    },
    patient_phone: {
      type: String,
      required: true,
      trim: true,
      match: phonePattern
    },
    bed_category: {
      type: String,
      enum: ["normal", "critical", "icu"],
      required: true
    },
    bed_required: {
      type: Number,
      required: true,
      min: 1,
      max: 50
    },
    bed_assigned: {
      type: String,
      trim: true
    },
    total_beds: {
      type: Number,
      required: true,
      min: 0
    },
    occupied_beds: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(value) {
          return value <= this.total_beds;
        },
        message: "Occupied beds cannot exceed total beds."
      }
    },
    admissions_today: {
      type: Number,
      required: true,
      min: 0,
      default: 1
    },
    discharges_today: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    expected_discharges_next_days: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    admission_date: {
      type: String,
      required: true,
      match: datePattern
    },
    discharge_date: {
      type: String,
      match: datePattern
    },
    status: {
      type: String,
      enum: ["admitted", "discharged", "transferred", "waiting"],
      default: "admitted"
    },
    urgency_level: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },
    department: {
      type: String,
      trim: true
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
    collection: "bed_admissions"
  }
);

bedAdmissionSchema.index({ admission_date: -1 });
bedAdmissionSchema.index({ patient_user_id: 1, admission_date: -1 });

bedAdmissionSchema.virtual("free_beds").get(function freeBedsGetter() {
  if (typeof this.total_beds !== "number" || typeof this.occupied_beds !== "number") {
    return null;
  }
  return Math.max(this.total_beds - this.occupied_beds, 0);
});

module.exports = mongoose.model("BedAdmission", bedAdmissionSchema);

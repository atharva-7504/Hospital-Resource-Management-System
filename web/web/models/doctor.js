const mongoose = require("mongoose");

const weekdayEnum = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const slotPattern = /^\d{2}:\d{2}\s(?:AM|PM)$/;

const parseTimeToMinutes = (value) => {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
};

const doctorSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    specialization: {
      type: String,
      enum: ["cardiology", "orthopedic", "general_physician"],
      required: true
    },
    department: {
      type: String,
      required: true,
      trim: true
    },
    availability_days: {
      type: [
        {
          type: String,
          enum: weekdayEnum
        }
      ],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one availability day is required."
      }
    },
    hospital_start_time: {
      type: String,
      required: true,
      match: /^\d{2}:\d{2}$/
    },
    hospital_end_time: {
      type: String,
      required: true,
      match: /^\d{2}:\d{2}$/,
      validate: {
        validator(value) {
          const start = parseTimeToMinutes(this.hospital_start_time);
          const end = parseTimeToMinutes(value);
          return start !== null && end !== null && end > start;
        },
        message: "Hospital end time must be after the start time."
      }
    },
    slot_duration_minutes: {
      type: Number,
      min: 15,
      max: 120,
      default: 30
    },
    time_slots: {
      type: [
        {
          type: String,
          match: slotPattern
        }
      ],
      default: []
    },
    doctor_bio: {
      type: String,
      trim: true,
      maxlength: 500
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: "doctors"
  }
);

module.exports = mongoose.model("Doctor", doctorSchema);

const mongoose = require("mongoose");

const appointmentNotificationSchema = new mongoose.Schema(
  {
    recipient_role: {
      type: String,
      enum: ["admin", "doctor", "user"],
      required: true
    },
    recipient_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AppointmentDetail",
      required: true
    },
    kind: {
      type: String,
      enum: ["request_submitted", "request_approved", "request_rejected"],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    link: {
      type: String,
      required: true,
      trim: true
    },
    read_at: {
      type: Date
    }
  },
  {
    timestamps: true,
    collection: "appointment_notifications"
  }
);

appointmentNotificationSchema.index({ recipient_role: 1, recipient_user_id: 1, createdAt: -1 });
appointmentNotificationSchema.index({ appointment_id: 1, kind: 1 });

module.exports = mongoose.model("AppointmentNotification", appointmentNotificationSchema);

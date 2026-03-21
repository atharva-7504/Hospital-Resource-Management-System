require("dotenv").config();

const express = require("express");
const ejsMate = require("ejs-mate");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");

const User = require("./models/users");
const Doctor = require("./models/doctor");
const AppointmentDetail = require("./models/appointmentDetail");
const BedAdmission = require("./models/bedAdmission");
const StaffRecord = require("./models/staffRecord");
const initializePassport = require("./config/passport");
const { seedStaffRecords } = require("./init/staff_index");
const {
  objectIdPattern,
  signupSchema,
  loginSchema,
  appointmentSchema,
  bedAdmissionSchema,
  staffRecordSchema
} = require("./utils/validation");

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cortex-connect";

const authRoleOptions = [
  { value: "admin", label: "Admin" },
  { value: "doctor", label: "Doctor" },
  { value: "user", label: "Patient" }
];

const specializationOptions = [
  { value: "cardiology", label: "Cardiology" },
  { value: "orthopedic", label: "Orthopedic" },
  { value: "general_physician", label: "General Physician" }
];

const weekdayOptions = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" }
];

const patientTypeOptions = [
  { value: "new", label: "New Patient" },
  { value: "existing", label: "Existing Patient" }
];

const urgencyOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" }
];

const contactMethodOptions = [
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" }
];

const specializationLabels = {
  cardiology: "Cardiology",
  orthopedic: "Orthopedic",
  general_physician: "General Physician"
};

const roleLabels = {
  admin: "Admin",
  doctor: "Doctor",
  user: "Patient"
};

const flashTypes = new Set(["success", "danger", "warning", "info"]);

const adminSignupCode = String(process.env.ADMIN_SIGNUP_CODE || "").trim();

const defaultDoctors = [
  {
    name: "Dr. Meera Shah",
    specialization: "cardiology",
    department: "Cardiology",
    hospital_start_time: "09:00",
    hospital_end_time: "13:00",
    slot_duration_minutes: 30,
    availability_days: ["Monday", "Wednesday", "Friday"],
    time_slots: ["09:00 AM", "10:00 AM", "11:30 AM", "03:00 PM"]
  },
  {
    name: "Dr. Arjun Patel",
    specialization: "orthopedic",
    department: "Orthopedic",
    hospital_start_time: "10:00",
    hospital_end_time: "16:00",
    slot_duration_minutes: 30,
    availability_days: ["Tuesday", "Thursday", "Saturday"],
    time_slots: ["10:00 AM", "11:00 AM", "01:00 PM", "04:00 PM"]
  },
  {
    name: "Dr. Sana Khan",
    specialization: "general_physician",
    department: "General Medicine",
    hospital_start_time: "09:30",
    hospital_end_time: "17:30",
    slot_duration_minutes: 30,
    availability_days: ["Monday", "Tuesday", "Thursday", "Friday"],
    time_slots: ["09:30 AM", "12:00 PM", "02:30 PM", "05:00 PM"]
  }
];

const doctorFallbackConfigBySpecialization = {
  cardiology: {
    department: "Cardiology",
    hospital_start_time: "09:00",
    hospital_end_time: "13:00",
    availability_days: ["Monday", "Wednesday", "Friday"]
  },
  orthopedic: {
    department: "Orthopedic",
    hospital_start_time: "10:00",
    hospital_end_time: "16:00",
    availability_days: ["Tuesday", "Thursday", "Saturday"]
  },
  general_physician: {
    department: "General Medicine",
    hospital_start_time: "09:30",
    hospital_end_time: "17:30",
    availability_days: ["Monday", "Tuesday", "Thursday", "Friday"]
  }
};

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  return redirectWithFlash(req, res, "/login", "warning", "Please log in to continue.");
};

const ensureRole = (...roles) => (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated() && roles.includes(req.user?.role)) {
    return next();
  }

  return redirectWithFlash(req, res, "/", "warning", "You do not have access to that page.");
};

const getUserFullName = (user) => {
  if (!user) return "";
  const firstName = String(user.first_name || "").trim();
  const lastName = String(user.last_name || "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  return String(user.username || "").trim();
};

const normalizeRole = (role) => {
  const normalized = String(role || "").trim().toLowerCase();
  return roleLabels[normalized] ? normalized : "user";
};

const normalizeFlashType = (type) => {
  const normalized = String(type || "").trim().toLowerCase();
  return flashTypes.has(normalized) ? normalized : "info";
};

const addFlash = (req, type, message) => {
  if (!req?.session) return;

  const text = String(message || "").trim();
  if (!text) return;

  const flashType = normalizeFlashType(type);
  req.session.flashMessages = req.session.flashMessages || {};
  req.session.flashMessages[flashType] = req.session.flashMessages[flashType] || [];
  req.session.flashMessages[flashType].push(text);
};

const flashError = (req, message) => addFlash(req, "danger", message);
const flashSuccess = (req, message) => addFlash(req, "success", message);
const flashWarning = (req, message) => addFlash(req, "warning", message);

const redirectWithFlash = (req, res, url, type, message) => {
  addFlash(req, type, message);
  return res.redirect(url);
};

const getMongooseErrorMessage = (err, fallback) => {
  if (!err) return fallback;

  if (err.name === "ValidationError") {
    const firstError = Object.values(err.errors || {})[0];
    return firstError?.message || fallback;
  }

  if (err.code === 11000) {
    const keyName = Object.keys(err.keyPattern || {})[0];
    if (keyName === "email" || keyName === "username") {
      return "Username or email already exists.";
    }
    return "Duplicate record found.";
  }

  return err.message || fallback;
};

const getValidationMessage = (error, fallback) => {
  if (error?.details?.length) {
    return error.details[0].message;
  }

  return fallback;
};

const toSafeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const getTodayDateString = () => new Date().toISOString().slice(0, 10);

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

const formatMinutesToTimeLabel = (minutes) => {
  const totalMinutes = ((minutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const displayHours = hours24 % 12 || 12;

  return `${String(displayHours).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${period}`;
};

const buildTimeSlots = (startTime, endTime, intervalMinutes = 30) => {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);

  if (start === null || end === null || end <= start) {
    return [];
  }

  const slots = [];
  for (let current = start; current < end; current += intervalMinutes) {
    slots.push(formatMinutesToTimeLabel(current));
  }

  return slots;
};

const computeProjection = (records, fieldName, horizonDays = 3) => {
  if (!records || records.length < 2) {
    return null;
  }

  const sorted = [...records].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const deltas = [];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = Number(sorted[index]?.[fieldName] || 0);
    const previous = Number(sorted[index - 1]?.[fieldName] || 0);
    deltas.push(current - previous);
  }

  if (!deltas.length) {
    return null;
  }

  const averageDelta = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
  const latestValue = Number(sorted[sorted.length - 1]?.[fieldName] || 0);
  const projected = Math.max(0, Math.round(latestValue + averageDelta * horizonDays));

  return {
    latestValue,
    averageDelta: Math.round(averageDelta * 100) / 100,
    projected,
    horizonDays
  };
};

const buildBedSummary = (records) => {
  if (!records || !records.length) {
    return null;
  }

  const latest = records[0];
  const totalBeds = toSafeNumber(latest.total_beds);
  const occupiedBeds = toSafeNumber(latest.occupied_beds);
  const freeBeds = Math.max(totalBeds - occupiedBeds, 0);
  const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const criticalBeds = records.reduce((sum, record) => sum + toSafeNumber(record.bed_category === "critical" ? record.bed_required : 0), 0);
  const icuBeds = records.reduce((sum, record) => sum + toSafeNumber(record.bed_category === "icu" ? record.bed_required : 0), 0);
  const normalBeds = records.reduce((sum, record) => sum + toSafeNumber(record.bed_category === "normal" ? record.bed_required : 0), 0);

  return {
    totalBeds,
    occupiedBeds,
    freeBeds,
    occupancyPct,
    criticalBeds,
    icuBeds,
    normalBeds,
    admissionsToday: toSafeNumber(latest.admissions_today),
    dischargesToday: toSafeNumber(latest.discharges_today),
    expectedDischarges: toSafeNumber(latest.expected_discharges_next_days),
    latestDate: latest.admission_date
  };
};

const buildStaffSummary = (records) => {
  if (!records || !records.length) {
    return null;
  }

  const latest = records[0];
  const totalStaff = toSafeNumber(latest.total_staff);
  const activeStaff = toSafeNumber(latest.active_staff);
  const requiredStaff = toSafeNumber(latest.required_staff);
  const coveragePct = requiredStaff > 0 ? Math.round((activeStaff / requiredStaff) * 100) : 0;

  return {
    totalStaff,
    activeStaff,
    requiredStaff,
    coveragePct,
    addedStaff: toSafeNumber(latest.added_staff),
    leftStaff: toSafeNumber(latest.left_staff),
    shift: latest.shift,
    latestDate: latest.effective_date
  };
};

const findUserById = async (userId) => {
  if (!mongoose.isValidObjectId(userId)) {
    return null;
  }

  return User.findById(userId).lean();
};

const findDoctorByUserId = async (userId) => {
  if (!mongoose.isValidObjectId(userId)) {
    return null;
  }

  return Doctor.findOne({ user_id: userId }).lean();
};

const buildBedAdmissionFormData = ({ selectedPatient, latestAdmission, patientPhone = "" }) => ({
  patient_user_id: selectedPatient?._id ? String(selectedPatient._id) : "",
  patient_name: selectedPatient ? getUserFullName(selectedPatient) : String(latestAdmission?.patient_name || ""),
  patient_email: selectedPatient ? String(selectedPatient.email || "") : String(latestAdmission?.patient_email || ""),
  patient_phone: String(patientPhone || latestAdmission?.patient_phone || ""),
  bed_category: String(latestAdmission?.bed_category || "normal"),
  bed_required: String(latestAdmission?.bed_required || 1),
  bed_assigned: String(latestAdmission?.bed_assigned || ""),
  total_beds: String(latestAdmission?.total_beds || 50),
  occupied_beds: String(latestAdmission?.occupied_beds || 0),
  admissions_today: String(latestAdmission?.admissions_today || 1),
  discharges_today: String(latestAdmission?.discharges_today || 0),
  expected_discharges_next_days: String(latestAdmission?.expected_discharges_next_days || 0),
  admission_date: String(latestAdmission?.admission_date || getTodayDateString()),
  discharge_date: String(latestAdmission?.discharge_date || ""),
  status: String(latestAdmission?.status || "admitted"),
  urgency_level: String(latestAdmission?.urgency_level || "medium"),
  department: String(latestAdmission?.department || ""),
  notes: String(latestAdmission?.notes || "")
});

const buildStaffRecordFormData = ({ selectedStaff, latestRecord }) => ({
  staff_user_id: selectedStaff?._id ? String(selectedStaff._id) : "",
  staff_name: selectedStaff ? getUserFullName(selectedStaff) : String(latestRecord?.staff_name || ""),
  staff_email: selectedStaff ? String(selectedStaff.email || "") : String(latestRecord?.staff_email || ""),
  staff_role: String(latestRecord?.staff_role || selectedStaff?.role || "doctor"),
  department: String(latestRecord?.department || ""),
  shift: String(latestRecord?.shift || "morning"),
  action_type: String(latestRecord?.action_type || "added"),
  status: String(latestRecord?.status || "active"),
  total_staff: String(latestRecord?.total_staff || 0),
  active_staff: String(latestRecord?.active_staff || 0),
  added_staff: String(latestRecord?.added_staff || 0),
  left_staff: String(latestRecord?.left_staff || 0),
  required_staff: String(latestRecord?.required_staff || 0),
  effective_date: String(latestRecord?.effective_date || getTodayDateString()),
  recommendation: String(latestRecord?.recommendation || ""),
  notes: String(latestRecord?.notes || "")
});

const getWeekdayName = (dateString) => {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { weekday: "long" });
};

const getAvailableSlots = async (doctorId, appointmentDate) => {
  const doctor = await Doctor.findById(doctorId).lean();
  if (!doctor) return [];

  if (!appointmentDate) {
    return doctor.time_slots || [];
  }

  const weekday = getWeekdayName(appointmentDate);
  if (doctor.availability_days?.length && !doctor.availability_days.includes(weekday)) {
    return [];
  }

  const bookedAppointments = await AppointmentDetail.find({
    doctor_id: String(doctorId),
    appointment_date: appointmentDate
  }).select("time_slot").lean();

  const bookedSlots = new Set(bookedAppointments.map((record) => record.time_slot));
  return (doctor.time_slots || []).filter((slot) => !bookedSlots.has(slot));
};

const seedDoctors = async () => {
  const count = await Doctor.countDocuments();
  if (count > 0) return;
  await Doctor.insertMany(defaultDoctors);
};

const migrateDoctorProfiles = async () => {
  const doctors = await Doctor.find({});

  for (const doctor of doctors) {
    const fallback = doctorFallbackConfigBySpecialization[doctor.specialization] || doctorFallbackConfigBySpecialization.general_physician;
    let changed = false;

    if (!doctor.department && fallback.department) {
      doctor.department = fallback.department;
      changed = true;
    }

    if (!doctor.hospital_start_time && fallback.hospital_start_time) {
      doctor.hospital_start_time = fallback.hospital_start_time;
      changed = true;
    }

    if (!doctor.hospital_end_time && fallback.hospital_end_time) {
      doctor.hospital_end_time = fallback.hospital_end_time;
      changed = true;
    }

    if (!doctor.availability_days || doctor.availability_days.length === 0) {
      doctor.availability_days = fallback.availability_days || [];
      changed = true;
    }

    if ((!doctor.time_slots || doctor.time_slots.length === 0) && doctor.hospital_start_time && doctor.hospital_end_time) {
      doctor.time_slots = buildTimeSlots(doctor.hospital_start_time, doctor.hospital_end_time, doctor.slot_duration_minutes || 30);
      changed = true;
    }

    if (!doctor.slot_duration_minutes) {
      doctor.slot_duration_minutes = 30;
      changed = true;
    }

    if (changed) {
      await doctor.save();
    }
  }
};

const migrateAppointmentReferences = async () => {
  const appointments = await AppointmentDetail.find({});

  let changed = false;
  for (const appointment of appointments) {
    if (typeof appointment.user_id === "string" && mongoose.isValidObjectId(appointment.user_id)) {
      appointment.user_id = new mongoose.Types.ObjectId(appointment.user_id);
      changed = true;
    }

    if (typeof appointment.doctor_id === "string" && mongoose.isValidObjectId(appointment.doctor_id)) {
      appointment.doctor_id = new mongoose.Types.ObjectId(appointment.doctor_id);
      changed = true;
    }

    if (changed) {
      await appointment.save();
      changed = false;
    }
  }
};

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "cortexconnect-session",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  res.locals.flashMessages = req.session?.flashMessages || {};
  if (req.session) {
    req.session.flashMessages = {};
  }
  next();
});

const { googleConfigured } = initializePassport(passport, User);

const renderAuthPage = (res, viewName, title, formData = {}, message = "") => {
  res.render(viewName, {
    title,
    authRoleOptions,
    specializationOptions,
    weekdayOptions,
    adminSignupCodeConfigured: Boolean(adminSignupCode),
    formData,
    message
  });
};

app.get("/", async (req, res, next) => {
  try {
    const doctorProfile = req.user?.role === "doctor"
      ? await findDoctorByUserId(req.user._id)
      : null;

    res.render("main/index", {
      title: "Home",
      message: String(req.query.message || ""),
      profile: req.user
        ? {
            id: String(req.user._id),
            fullName: getUserFullName(req.user),
            username: String(req.user.username || ""),
            firstName: String(req.user.first_name || ""),
            lastName: String(req.user.last_name || ""),
            email: String(req.user.email || ""),
            role: String(req.user.role || "user"),
            roleLabel: roleLabels[req.user.role] || "Patient",
            provider: String(req.user.provider || "local")
          }
        : null,
      doctorProfile
    });
  } catch (err) {
    next(err);
  }
});

app.get("/profile", ensureAuthenticated, async (req, res, next) => {
  try {
    const doctorProfile = req.user.role === "doctor"
      ? await findDoctorByUserId(req.user._id)
      : null;
    const recentAppointments = req.user.role === "doctor" && doctorProfile
      ? await AppointmentDetail.find({ doctor_id: doctorProfile._id, status: "Accepted" })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user_id doctor_id")
        .lean()
      : req.user.role === "admin"
        ? await AppointmentDetail.find({})
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("user_id doctor_id")
          .lean()
        : await AppointmentDetail.find({ user_id: req.user._id })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("doctor_id")
          .lean();

    const profile = {
      id: String(req.user._id),
      fullName: getUserFullName(req.user),
      firstName: String(req.user.first_name || ""),
      lastName: String(req.user.last_name || ""),
      username: String(req.user.username || ""),
      email: String(req.user.email || ""),
      role: String(req.user.role || "user"),
      roleLabel: roleLabels[req.user.role] || "Patient",
      provider: String(req.user.provider || "local"),
      createdAt: req.user.createdAt ? new Date(req.user.createdAt).toLocaleString() : "-"
    };

    res.render("main/profile", {
      title: "Profile",
      profile,
      doctorProfile,
      recentAppointments
    });
  } catch (err) {
    next(err);
  }
});

app.get("/login", (req, res) => {
  renderAuthPage(res, "auth/login", "Login", {}, String(req.query.message || ""));
});

app.post("/login", (req, res, next) => {
  const formData = {
    username: String(req.body.username || "").trim(),
    password: String(req.body.password || "")
  };

  const validation = loginSchema.validate(formData, { abortEarly: true, stripUnknown: true });
  if (validation.error) {
    return res.status(400).render("auth/login", {
      title: "Login",
      authRoleOptions,
      formData,
      message: getValidationMessage(validation.error, "Please enter a valid username and password.")
    });
  }

  passport.authenticate("local", async (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).render("auth/login", {
        title: "Login",
        authRoleOptions,
        formData,
        message: info?.message || "No matching user found."
      });
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }

      flashSuccess(req, `Welcome back, ${getUserFullName(user)}.`);
      res.redirect("/");
    });
  })(req, res, next);
});

app.get("/signup", (req, res) => {
  renderAuthPage(res, "auth/signup", "Signup", {}, String(req.query.message || ""));
});

app.post("/signup", async (req, res, next) => {
  const requestedRole = normalizeRole(String(req.body.role || "user"));
  const rawAvailabilityDays = req.body.availability_days;
  const formData = {
    first_name: String(req.body.first_name || "").trim(),
    last_name: String(req.body.last_name || "").trim(),
    username: String(req.body.username || "").trim(),
    email: String(req.body.email || "").trim(),
    password: String(req.body.password || ""),
    role: requestedRole,
    admin_code: requestedRole === "admin" ? String(req.body.admin_code || "").trim() : "",
    doctor_specialization: requestedRole === "doctor" ? String(req.body.doctor_specialization || "").trim() : "",
    doctor_department: requestedRole === "doctor" ? String(req.body.doctor_department || "").trim() : "",
    hospital_start_time: requestedRole === "doctor" ? String(req.body.hospital_start_time || "").trim() : "",
    hospital_end_time: requestedRole === "doctor" ? String(req.body.hospital_end_time || "").trim() : "",
    availability_days: requestedRole === "doctor"
      ? Array.isArray(rawAvailabilityDays)
        ? rawAvailabilityDays.map((day) => String(day).trim()).filter(Boolean)
        : rawAvailabilityDays
          ? [String(rawAvailabilityDays).trim()].filter(Boolean)
          : []
      : [],
    doctor_bio: requestedRole === "doctor" ? String(req.body.doctor_bio || "").trim() : ""
  };

  try {
    const validationPayload = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      username: formData.username,
      email: formData.email,
      password: formData.password,
      role: formData.role
    };

    if (formData.role === "admin") {
      validationPayload.admin_code = formData.admin_code;
    }

    if (formData.role === "doctor") {
      validationPayload.doctor_specialization = formData.doctor_specialization;
      validationPayload.doctor_department = formData.doctor_department;
      validationPayload.hospital_start_time = formData.hospital_start_time;
      validationPayload.hospital_end_time = formData.hospital_end_time;
      validationPayload.availability_days = formData.availability_days;
      validationPayload.doctor_bio = formData.doctor_bio;
    }

    const validation = signupSchema.validate(validationPayload, { abortEarly: true, stripUnknown: true });
    if (validation.error) {
      return res.status(400).render("auth/signup", {
        title: "Signup",
        authRoleOptions,
        specializationOptions,
        weekdayOptions,
        adminSignupCodeConfigured: Boolean(adminSignupCode),
        formData,
        message: getValidationMessage(validation.error, "Please fill in all required fields.")
      });
    }

    const sanitized = validation.value;
    sanitized.role = normalizeRole(sanitized.role);

    if (sanitized.role === "admin") {
      if (!adminSignupCode) {
        return res.status(400).render("auth/signup", {
          title: "Signup",
          authRoleOptions,
          specializationOptions,
          weekdayOptions,
          adminSignupCodeConfigured: Boolean(adminSignupCode),
          formData: sanitized,
          message: "Admin signup code is not configured."
        });
      }

      if (sanitized.admin_code !== adminSignupCode) {
        return res.status(400).render("auth/signup", {
          title: "Signup",
          authRoleOptions,
          specializationOptions,
          weekdayOptions,
          adminSignupCodeConfigured: Boolean(adminSignupCode),
          formData: sanitized,
          message: "Invalid admin code."
        });
      }
    }

    const existingUser = await User.findOne({
      $or: [
        { email: sanitized.email },
        { username: sanitized.username }
      ]
    }).lean();

    if (existingUser) {
      return res.status(400).render("auth/signup", {
        title: "Signup",
        authRoleOptions,
        specializationOptions,
        weekdayOptions,
        adminSignupCodeConfigured: Boolean(adminSignupCode),
        formData: sanitized,
        message: "Username or email already exists."
      });
    }

    const newUser = new User({
      first_name: sanitized.first_name,
      last_name: sanitized.last_name,
      username: sanitized.username,
      email: sanitized.email,
      role: sanitized.role,
      provider: "local"
    });
    const registeredUser = await User.register(newUser, sanitized.password);

    if (sanitized.role === "doctor") {
      const generatedTimeSlots = buildTimeSlots(sanitized.hospital_start_time, sanitized.hospital_end_time);
      if (!generatedTimeSlots.length) {
        await User.findByIdAndDelete(registeredUser._id);
        return res.status(400).render("auth/signup", {
          title: "Signup",
          authRoleOptions,
          specializationOptions,
          weekdayOptions,
          adminSignupCodeConfigured: Boolean(adminSignupCode),
          formData: sanitized,
          message: "Doctor hospital end time must be after the start time."
        });
      }

      try {
        await Doctor.create({
          user_id: registeredUser._id,
          name: getUserFullName(registeredUser),
          specialization: sanitized.doctor_specialization,
          department: sanitized.doctor_department,
          availability_days: sanitized.availability_days,
          hospital_start_time: sanitized.hospital_start_time,
          hospital_end_time: sanitized.hospital_end_time,
          slot_duration_minutes: 30,
          time_slots: generatedTimeSlots,
          doctor_bio: sanitized.doctor_bio || undefined,
          active: true
        });
      } catch (doctorErr) {
        await User.findByIdAndDelete(registeredUser._id);
        return res.status(400).render("auth/signup", {
          title: "Signup",
          authRoleOptions,
          specializationOptions,
          weekdayOptions,
          adminSignupCodeConfigured: Boolean(adminSignupCode),
          formData: sanitized,
          message: getMongooseErrorMessage(doctorErr, "Unable to save doctor profile.")
        });
      }
    }

    req.logIn(registeredUser, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }

      flashSuccess(req, "Your account has been created successfully.");
      res.redirect("/");
    });
  } catch (err) {
    if (err?.name === "UserExistsError" || err?.code === 11000) {
      return res.status(400).render("auth/signup", {
        title: "Signup",
        authRoleOptions,
        specializationOptions,
        weekdayOptions,
        adminSignupCodeConfigured: Boolean(adminSignupCode),
        formData,
        message: "Username or email already exists."
      });
    }
    if (err?.name === "ValidationError") {
      return res.status(400).render("auth/signup", {
        title: "Signup",
        authRoleOptions,
        specializationOptions,
        weekdayOptions,
        adminSignupCodeConfigured: Boolean(adminSignupCode),
        formData,
        message: getMongooseErrorMessage(err, "Please check the signup details.")
      });
    }
    next(err);
  }
});

app.get("/doctors", ensureRole("user"), async (req, res, next) => {
  try {
    const specialization = String(req.query.specialization || "").trim();
    const appointmentDate = String(req.query.appointment_date || "").trim();
    const query = { active: true };
    const preservedQuery = new URLSearchParams();

    Object.entries(req.query).forEach(([key, value]) => {
      if (["doctor_id", "doctor_name", "specialization", "appointment_date"].includes(key)) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((entry) => preservedQuery.append(key, String(entry)));
      } else if (value !== undefined && value !== null) {
        preservedQuery.set(key, String(value));
      }
    });

    if (specialization && specializationLabels[specialization]) {
      query.specialization = specialization;
    }

    const doctors = await Doctor.find(query).sort({ name: 1 }).lean();
    const doctorsWithAvailability = [];

    for (const doctor of doctors) {
      const availableSlots = appointmentDate
        ? await getAvailableSlots(doctor._id.toString(), appointmentDate)
        : doctor.time_slots || [];
      const weekday = getWeekdayName(appointmentDate);
      const isOpen = appointmentDate
        ? Boolean(weekday && doctor.availability_days.includes(weekday) && availableSlots.length)
        : Boolean(availableSlots.length);

      doctorsWithAvailability.push({
        ...doctor,
        availableSlots,
        isOpen
      });
    }

    res.render("appointment/doctors", {
      title: "Choose Doctor",
      doctors: doctorsWithAvailability,
      specialization,
      appointmentDate,
      specializationOptions,
      queryString: preservedQuery.toString()
    });
  } catch (err) {
    next(err);
  }
});

app.get("/appointment", ensureRole("user"), async (req, res, next) => {
  try {
    const userId = req.user._id;
    const latestAppointment = await AppointmentDetail.findOne({ user_id: userId }).sort({ createdAt: -1 }).lean();
    const doctorId = String(req.query.doctor_id || latestAppointment?.doctor_id || "");
    const appointmentDate = String(req.query.appointment_date || latestAppointment?.appointment_date || "");
    const selectedDoctor = doctorId ? await Doctor.findById(doctorId).lean() : null;
    const availableSlots = selectedDoctor ? await getAvailableSlots(doctorId, appointmentDate) : [];
    const patientType = latestAppointment ? "existing" : "new";
    const fullName = getUserFullName(req.user);

    res.render("appointment/form", {
      title: "Appointment",
      formData: {
        user_id: String(userId),
        full_name: String(req.query.full_name || fullName || ""),
        email: String(req.query.email || req.user.email || ""),
        age: String(req.query.age || latestAppointment?.age || ""),
        date_of_birth: String(req.query.date_of_birth || latestAppointment?.date_of_birth || ""),
        gender: String(req.query.gender || latestAppointment?.gender || ""),
        patient_type: req.query.patient_type || patientType,
        phone: String(req.query.phone || latestAppointment?.phone || ""),
        doctor_id: selectedDoctor?._id?.toString() || latestAppointment?.doctor_id || "",
        doctor_name: selectedDoctor?.name || latestAppointment?.doctor_name || "",
        specialization: selectedDoctor?.specialization || latestAppointment?.specialization || String(req.query.specialization || ""),
        appointment_date: appointmentDate,
        time_slot: String(req.query.time_slot || latestAppointment?.time_slot || ""),
        symptoms: String(req.query.symptoms || latestAppointment?.symptoms || ""),
        department: String(req.query.department || latestAppointment?.department || ""),
        previous_visit: String(req.query.previous_visit || (latestAppointment ? "true" : "false")),
        urgency_level: String(req.query.urgency_level || latestAppointment?.urgency_level || "low"),
        preferred_contact_method: String(req.query.preferred_contact_method || latestAppointment?.preferred_contact_method || "phone"),
        consent: req.query.consent === "on"
      },
      selectedDoctor,
      availableSlots,
      specializationOptions,
      genderOptions,
      patientTypeOptions,
      urgencyOptions,
      contactMethodOptions,
        message: String(req.query.message || "")
      });
  } catch (err) {
    next(err);
  }
});

app.post("/appointment", ensureRole("user"), async (req, res, next) => {
  const userId = req.user._id;
  const rawSubmission = {
    user_id: userId,
    full_name: String(req.body.full_name || getUserFullName(req.user) || "").trim(),
    email: String(req.body.email || req.user.email || "").trim(),
    phone: String(req.body.phone || "").trim(),
    patient_type: String(req.body.patient_type || "existing").trim(),
    age: String(req.body.age || "").trim() || null,
    date_of_birth: String(req.body.date_of_birth || "").trim(),
    gender: String(req.body.gender || "").trim(),
    doctor_id: String(req.body.doctor_id || "").trim(),
    doctor_name: String(req.body.doctor_name || "").trim(),
    specialization: String(req.body.specialization || "").trim(),
    appointment_date: String(req.body.appointment_date || "").trim(),
    time_slot: String(req.body.time_slot || "").trim(),
    symptoms: String(req.body.symptoms || "").trim(),
    department: String(req.body.department || "").trim(),
    previous_visit: String(req.body.previous_visit || "false"),
    urgency_level: String(req.body.urgency_level || "low").trim(),
    preferred_contact_method: String(req.body.preferred_contact_method || "phone").trim(),
    consent: req.body.consent
  };

  try {
    if (!rawSubmission.doctor_id) {
      const selectedDoctor = null;
      return res.status(400).render("appointment/form", {
        title: "Appointment",
        formData: req.body,
        selectedDoctor,
        availableSlots: [],
        specializationOptions,
        genderOptions,
        patientTypeOptions,
        urgencyOptions,
        contactMethodOptions,
        message: "Please select a doctor first."
      });
    }

    const validation = appointmentSchema.validate(rawSubmission, {
      abortEarly: true,
      stripUnknown: true
    });

    const selectedDoctor = objectIdPattern.test(rawSubmission.doctor_id)
      ? await Doctor.findById(rawSubmission.doctor_id).lean()
      : null;

    if (validation.error) {
      return res.status(400).render("appointment/form", {
        title: "Appointment",
        formData: req.body,
        selectedDoctor,
        availableSlots: selectedDoctor ? await getAvailableSlots(rawSubmission.doctor_id, rawSubmission.appointment_date) : [],
        specializationOptions,
        genderOptions,
        patientTypeOptions,
        urgencyOptions,
        contactMethodOptions,
        message: getValidationMessage(validation.error, "Please check the appointment details.")
      });
    }

    const submission = validation.value;
    const age = submission.age ?? null;
    const dateOfBirth = String(submission.date_of_birth || "").trim();
    const fullName = getUserFullName(req.user);
    const email = String(req.user.email || submission.email || "").trim();

    if (!selectedDoctor) {
      return res.status(400).render("appointment/form", {
        title: "Appointment",
        formData: submission,
        selectedDoctor: null,
        availableSlots: [],
        specializationOptions,
        genderOptions,
        patientTypeOptions,
        urgencyOptions,
        contactMethodOptions,
        message: "Please select a doctor first."
      });
    }

    const availableSlots = await getAvailableSlots(submission.doctor_id, submission.appointment_date);

    if (age === null && !dateOfBirth) {
      return res.status(400).render("appointment/form", {
        title: "Appointment",
        formData: submission,
        selectedDoctor,
        availableSlots,
        specializationOptions,
        genderOptions,
        patientTypeOptions,
        urgencyOptions,
        contactMethodOptions,
        message: "Please enter either age or date of birth."
      });
    }

    if (selectedDoctor.specialization !== submission.specialization) {
      return res.status(400).render("appointment/form", {
        title: "Appointment",
        formData: submission,
        selectedDoctor,
        availableSlots,
        specializationOptions,
        genderOptions,
        patientTypeOptions,
        urgencyOptions,
        contactMethodOptions,
        message: "Doctor specialization does not match your selection."
      });
    }

    const weekday = getWeekdayName(submission.appointment_date);
    if (selectedDoctor.availability_days?.length && !selectedDoctor.availability_days.includes(weekday)) {
      return res.status(400).render("appointment/form", {
        title: "Appointment",
        formData: submission,
        selectedDoctor,
        availableSlots,
        specializationOptions,
        genderOptions,
        patientTypeOptions,
        urgencyOptions,
        contactMethodOptions,
        message: "The selected doctor is not available on that date."
      });
    }

    if (!availableSlots.includes(submission.time_slot)) {
      return res.status(400).render("appointment/form", {
        title: "Appointment",
        formData: submission,
        selectedDoctor,
        availableSlots,
        specializationOptions,
        genderOptions,
        patientTypeOptions,
        urgencyOptions,
        contactMethodOptions,
        message: "That time slot is already booked."
      });
    }

    await AppointmentDetail.create({
      user_id: userId,
      patient_type: submission.patient_type,
      full_name: fullName,
      age: age ?? undefined,
      date_of_birth: dateOfBirth || undefined,
      gender: submission.gender,
      email,
      phone: submission.phone,
      doctor_id: selectedDoctor._id,
      doctor_name: selectedDoctor.name,
      specialization: submission.specialization,
      appointment_date: submission.appointment_date,
      time_slot: submission.time_slot,
      symptoms: submission.symptoms,
      department: submission.department || specializationLabels[submission.specialization] || "",
      previous_visit: submission.previous_visit,
      urgency_level: submission.urgency_level,
      preferred_contact_method: submission.preferred_contact_method,
      consent: submission.consent
    });

    flashSuccess(req, "Appointment booked successfully.");
    res.redirect("/check-status");
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(400).render("appointment/form", {
        title: "Appointment",
        formData: req.body,
        selectedDoctor: objectIdPattern.test(String(req.body.doctor_id || "").trim())
          ? await Doctor.findById(String(req.body.doctor_id || "").trim()).lean()
          : null,
        availableSlots: objectIdPattern.test(String(req.body.doctor_id || "").trim())
          ? await getAvailableSlots(String(req.body.doctor_id || "").trim(), String(req.body.appointment_date || "").trim())
          : [],
        specializationOptions,
        genderOptions,
        patientTypeOptions,
        urgencyOptions,
        contactMethodOptions,
        message: "That doctor and time slot combination is already booked."
      });
    }
    if (err?.name === "ValidationError") {
      return res.status(400).render("appointment/form", {
        title: "Appointment",
        formData: req.body,
        selectedDoctor: objectIdPattern.test(String(req.body.doctor_id || "").trim())
          ? await Doctor.findById(String(req.body.doctor_id || "").trim()).lean()
          : null,
        availableSlots: objectIdPattern.test(String(req.body.doctor_id || "").trim())
          ? await getAvailableSlots(String(req.body.doctor_id || "").trim(), String(req.body.appointment_date || "").trim())
          : [],
        specializationOptions,
        genderOptions,
        patientTypeOptions,
        urgencyOptions,
        contactMethodOptions,
        message: getMongooseErrorMessage(err, "Please check the appointment details.")
      });
    }
    next(err);
  }
});

app.get("/check-status", ensureRole("user"), async (req, res, next) => {
  try {
    const records = await AppointmentDetail.find({ user_id: req.user._id })
      .sort({ createdAt: -1 })
      .populate("doctor_id")
      .lean();
    res.render("appointment/status", {
      title: "Check Status",
      records,
      viewerMode: "patient"
    });
  } catch (err) {
    next(err);
  }
});

app.get("/check-appointments", ensureRole("admin", "doctor"), async (req, res, next) => {
  try {
    const isAdmin = req.user?.role === "admin";
    const doctorProfile = isAdmin ? null : await findDoctorByUserId(req.user._id);
    const records = isAdmin
      ? await AppointmentDetail.find({})
        .sort({ createdAt: -1 })
        .populate("user_id doctor_id")
        .lean()
      : doctorProfile
        ? await AppointmentDetail.find({ doctor_id: doctorProfile._id, status: "Accepted" })
          .sort({ createdAt: -1 })
          .populate("user_id doctor_id")
          .lean()
        : [];

    res.render("appointment/status", {
      title: isAdmin ? "Check Appointments" : "Accepted Patients",
      records,
      adminMode: isAdmin,
      viewerMode: isAdmin ? "admin" : "doctor",
      doctorProfile
    });
  } catch (err) {
    next(err);
  }
});

app.post("/check-appointments/:id/accept", ensureRole("admin"), async (req, res, next) => {
  try {
    const updatedAppointment = await AppointmentDetail.findByIdAndUpdate(
      req.params.id,
      {
        status: "Accepted"
      },
      {
        runValidators: true,
        new: true
      }
    );

    if (!updatedAppointment) {
      return redirectWithFlash(req, res, "/check-appointments", "warning", "Appointment not found.");
    }

    flashSuccess(req, "Appointment accepted.");
    res.redirect("/check-appointments");
  } catch (err) {
    next(err);
  }
});

app.post("/check-appointments/:id/reject", ensureRole("admin"), async (req, res, next) => {
  try {
    const updatedAppointment = await AppointmentDetail.findByIdAndUpdate(
      req.params.id,
      {
        status: "Rejected"
      },
      {
        runValidators: true,
        new: true
      }
    );

    if (!updatedAppointment) {
      return redirectWithFlash(req, res, "/check-appointments", "warning", "Appointment not found.");
    }

    flashSuccess(req, "Appointment rejected.");
    res.redirect("/check-appointments");
  } catch (err) {
    next(err);
  }
});

app.get("/status", (req, res) => {
  res.redirect(req.user?.role === "admin" || req.user?.role === "doctor" ? "/check-appointments" : "/check-status");
});

app.get("/appointments", (req, res) => {
  res.redirect(req.user?.role === "admin" || req.user?.role === "doctor" ? "/check-appointments" : "/check-status");
});

app.get("/features", (req, res) => {
  res.render("main/features", {
    title: "Features"
  });
});

app.get("/about", (req, res) => {
  res.render("main/about", {
    title: "About Us"
  });
});

app.get("/bed-admissions", ensureRole("admin"), async (req, res, next) => {
  try {
    const patientUserId = String(req.query.patient_user_id || "").trim();
    const patients = await User.find({ role: "user" }).sort({ first_name: 1, last_name: 1 }).lean();
    const selectedPatient = await findUserById(patientUserId);
    const latestBedAdmission = selectedPatient
      ? await BedAdmission.findOne({ patient_user_id: selectedPatient._id }).sort({ createdAt: -1 }).lean()
      : await BedAdmission.findOne().sort({ createdAt: -1 }).lean();
    const latestPatientAppointment = selectedPatient
      ? await AppointmentDetail.findOne({ user_id: selectedPatient._id }).sort({ createdAt: -1 }).lean()
      : null;
    const recentAdmissions = await BedAdmission.find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .populate("patient_user_id recorded_by")
      .lean();

    const bedSummary = buildBedSummary(recentAdmissions);
    const bedProjection = computeProjection(recentAdmissions, "occupied_beds", 3);
    const freeBeds = bedSummary ? bedSummary.freeBeds : 0;
    const occupancyPct = bedSummary ? bedSummary.occupancyPct : 0;

    let bedAlert = "";
    let bedAlertClass = "info";
    if (bedSummary) {
      if (occupancyPct >= 90 || freeBeds <= 5) {
        bedAlert = "Limited beds available. Add capacity or speed up discharges to avoid disruption.";
        bedAlertClass = "danger";
      } else if (occupancyPct >= 80) {
        bedAlert = "Bed usage is rising. Keep an eye on ICU and critical bed availability.";
        bedAlertClass = "warning";
      } else {
        bedAlert = "Bed capacity is currently under control.";
        bedAlertClass = "success";
      }
    }

    const formData = buildBedAdmissionFormData({
      selectedPatient,
      latestAdmission: latestBedAdmission,
      patientPhone: latestPatientAppointment?.phone || ""
    });

    res.render("main/bedAdmissions", {
      title: "Bed Admissions",
      patients,
      selectedPatient,
      formData,
      recentAdmissions,
      bedSummary,
      bedProjection,
      bedAlert,
      bedAlertClass,
      message: String(req.query.message || "")
    });
  } catch (err) {
    next(err);
  }
});

app.post("/bed-admissions", ensureRole("admin"), async (req, res, next) => {
  const rawSubmission = {
    patient_user_id: String(req.body.patient_user_id || "").trim(),
    patient_name: String(req.body.patient_name || "").trim(),
    patient_email: String(req.body.patient_email || "").trim(),
    patient_phone: String(req.body.patient_phone || "").trim(),
    bed_category: String(req.body.bed_category || "").trim(),
    bed_required: String(req.body.bed_required || "").trim(),
    bed_assigned: String(req.body.bed_assigned || "").trim(),
    total_beds: String(req.body.total_beds || "").trim(),
    occupied_beds: String(req.body.occupied_beds || "").trim(),
    admissions_today: String(req.body.admissions_today || "").trim(),
    discharges_today: String(req.body.discharges_today || "").trim(),
    expected_discharges_next_days: String(req.body.expected_discharges_next_days || "").trim(),
    admission_date: String(req.body.admission_date || "").trim(),
    discharge_date: String(req.body.discharge_date || "").trim(),
    status: String(req.body.status || "admitted").trim(),
    urgency_level: String(req.body.urgency_level || "medium").trim(),
    department: String(req.body.department || "").trim(),
    notes: String(req.body.notes || "").trim(),
    recorded_by: String(req.user._id)
  };

  try {
    const validation = bedAdmissionSchema.validate(rawSubmission, {
      abortEarly: true,
      stripUnknown: true
    });

    const selectedPatient = await findUserById(rawSubmission.patient_user_id);
    const patients = await User.find({ role: "user" }).sort({ first_name: 1, last_name: 1 }).lean();
    const recentAdmissions = await BedAdmission.find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .populate("patient_user_id recorded_by")
      .lean();
    const bedSummary = buildBedSummary(recentAdmissions);
    const bedProjection = computeProjection(recentAdmissions, "occupied_beds", 3);

    if (validation.error) {
      return res.status(400).render("main/bedAdmissions", {
        title: "Bed Admissions",
        patients,
        selectedPatient,
        formData: rawSubmission,
        recentAdmissions,
        bedSummary,
        bedProjection,
        bedAlert: "Please correct the highlighted bed admission details.",
        bedAlertClass: "danger",
        message: getValidationMessage(validation.error, "Please check the bed admission details.")
      });
    }

    if (!selectedPatient || selectedPatient.role !== "user") {
      return res.status(400).render("main/bedAdmissions", {
        title: "Bed Admissions",
        patients,
        selectedPatient: null,
        formData: rawSubmission,
        recentAdmissions,
        bedSummary,
        bedProjection,
        bedAlert: "Please choose a valid patient account.",
        bedAlertClass: "danger",
        message: "Please choose a valid patient account."
      });
    }

    const submission = validation.value;

    await BedAdmission.create({
      patient_user_id: selectedPatient._id,
      patient_name: submission.patient_name,
      patient_email: submission.patient_email,
      patient_phone: submission.patient_phone,
      bed_category: submission.bed_category,
      bed_required: submission.bed_required,
      bed_assigned: submission.bed_assigned || undefined,
      total_beds: submission.total_beds,
      occupied_beds: submission.occupied_beds,
      admissions_today: submission.admissions_today,
      discharges_today: submission.discharges_today,
      expected_discharges_next_days: submission.expected_discharges_next_days,
      admission_date: submission.admission_date,
      discharge_date: submission.discharge_date || undefined,
      status: submission.status,
      urgency_level: submission.urgency_level,
      department: submission.department || undefined,
      notes: submission.notes || undefined,
      recorded_by: req.user._id
    });

    flashSuccess(req, "Bed admission saved.");
    res.redirect(`/bed-admissions?patient_user_id=${selectedPatient._id.toString()}`);
  } catch (err) {
    if (err?.name === "ValidationError" || err?.code === 11000) {
      return res.status(400).render("main/bedAdmissions", {
        title: "Bed Admissions",
        patients,
        selectedPatient,
        formData: rawSubmission,
        recentAdmissions,
        bedSummary,
        bedProjection,
        bedAlert: "Please correct the highlighted bed admission details.",
        bedAlertClass: "danger",
        message: getMongooseErrorMessage(err, "Please check the bed admission details.")
      });
    }
    next(err);
  }
});

app.get("/staff-records", ensureRole("admin"), async (req, res, next) => {
  try {
    const staffUserId = String(req.query.staff_user_id || "").trim();
    const staffUsers = await User.find({ role: { $in: ["admin", "doctor"] } }).sort({ first_name: 1, last_name: 1 }).lean();
    const selectedStaff = await findUserById(staffUserId);
    const latestStaffRecord = selectedStaff
      ? await StaffRecord.findOne({ staff_user_id: selectedStaff._id }).sort({ createdAt: -1 }).lean()
      : await StaffRecord.findOne().sort({ createdAt: -1 }).lean();
    const recentStaffRecords = await StaffRecord.find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .populate("staff_user_id recorded_by")
      .lean();

    const staffSummary = buildStaffSummary(recentStaffRecords);
    const staffProjection = computeProjection(recentStaffRecords, "active_staff", 3);

    let staffAlert = "";
    let staffAlertClass = "info";
    if (staffSummary) {
      if (staffSummary.coveragePct < 85) {
        staffAlert = "Staff coverage is below target. Consider shifting or adding staff soon.";
        staffAlertClass = "danger";
      } else if (staffSummary.coveragePct < 100) {
        staffAlert = "Staff coverage is close to the required level.";
        staffAlertClass = "warning";
      } else {
        staffAlert = "Staff coverage is within target.";
        staffAlertClass = "success";
      }
    }

    const formData = buildStaffRecordFormData({
      selectedStaff,
      latestRecord: latestStaffRecord
    });

    res.render("main/staffRecords", {
      title: "Staff Records",
      staffUsers,
      selectedStaff,
      formData,
      recentStaffRecords,
      staffSummary,
      staffProjection,
      staffAlert,
      staffAlertClass,
      message: String(req.query.message || "")
    });
  } catch (err) {
    next(err);
  }
});

app.post("/staff-records", ensureRole("admin"), async (req, res, next) => {
  const rawSubmission = {
    staff_user_id: String(req.body.staff_user_id || "").trim(),
    staff_name: String(req.body.staff_name || "").trim(),
    staff_email: String(req.body.staff_email || "").trim(),
    staff_role: String(req.body.staff_role || "").trim(),
    department: String(req.body.department || "").trim(),
    shift: String(req.body.shift || "").trim(),
    action_type: String(req.body.action_type || "").trim(),
    status: String(req.body.status || "active").trim(),
    total_staff: String(req.body.total_staff || "").trim(),
    active_staff: String(req.body.active_staff || "").trim(),
    added_staff: String(req.body.added_staff || "").trim(),
    left_staff: String(req.body.left_staff || "").trim(),
    required_staff: String(req.body.required_staff || "").trim(),
    effective_date: String(req.body.effective_date || "").trim(),
    recommendation: String(req.body.recommendation || "").trim(),
    notes: String(req.body.notes || "").trim(),
    recorded_by: String(req.user._id)
  };

  try {
    const validation = staffRecordSchema.validate(rawSubmission, {
      abortEarly: true,
      stripUnknown: true
    });

    const selectedStaff = await findUserById(rawSubmission.staff_user_id);
    const staffUsers = await User.find({ role: { $in: ["admin", "doctor"] } }).sort({ first_name: 1, last_name: 1 }).lean();
    const recentStaffRecords = await StaffRecord.find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .populate("staff_user_id recorded_by")
      .lean();
    const staffSummary = buildStaffSummary(recentStaffRecords);
    const staffProjection = computeProjection(recentStaffRecords, "active_staff", 3);

    if (validation.error) {
      return res.status(400).render("main/staffRecords", {
        title: "Staff Records",
        staffUsers,
        selectedStaff,
        formData: rawSubmission,
        recentStaffRecords,
        staffSummary,
        staffProjection,
        staffAlert: "Please correct the highlighted staff record details.",
        staffAlertClass: "danger",
        message: getValidationMessage(validation.error, "Please check the staff record details.")
      });
    }

    if (!selectedStaff || selectedStaff.role === "user") {
      return res.status(400).render("main/staffRecords", {
        title: "Staff Records",
        staffUsers,
        selectedStaff: null,
        formData: rawSubmission,
        recentStaffRecords,
        staffSummary,
        staffProjection,
        staffAlert: "Please choose a valid staff account.",
        staffAlertClass: "danger",
        message: "Please choose a valid staff account."
      });
    }

    const submission = validation.value;

    await StaffRecord.create({
      staff_user_id: selectedStaff._id,
      staff_name: submission.staff_name,
      staff_email: submission.staff_email,
      staff_role: submission.staff_role,
      department: submission.department,
      shift: submission.shift,
      action_type: submission.action_type,
      status: submission.status,
      total_staff: submission.total_staff,
      active_staff: submission.active_staff,
      added_staff: submission.added_staff,
      left_staff: submission.left_staff,
      required_staff: submission.required_staff,
      effective_date: submission.effective_date,
      recommendation: submission.recommendation || undefined,
      notes: submission.notes || undefined,
      recorded_by: req.user._id
    });

    flashSuccess(req, "Staff record saved.");
    res.redirect(`/staff-records?staff_user_id=${selectedStaff._id.toString()}`);
  } catch (err) {
    if (err?.name === "ValidationError" || err?.code === 11000) {
      return res.status(400).render("main/staffRecords", {
        title: "Staff Records",
        staffUsers,
        selectedStaff,
        formData: rawSubmission,
        recentStaffRecords,
        staffSummary,
        staffProjection,
        staffAlert: "Please correct the highlighted staff record details.",
        staffAlertClass: "danger",
        message: getMongooseErrorMessage(err, "Please check the staff record details.")
      });
    }
    next(err);
  }
});

app.get("/dashboard", ensureRole("admin", "doctor"), async (req, res, next) => {
  try {
    if (req.user.role === "doctor") {
      const doctorProfile = await findDoctorByUserId(req.user._id);
      const acceptedAppointments = doctorProfile
        ? await AppointmentDetail.find({ doctor_id: doctorProfile._id, status: "Accepted" })
          .sort({ createdAt: -1 })
          .limit(8)
          .populate("user_id doctor_id")
          .lean()
        : [];

      return res.render("main/doctorDashboard", {
        title: "Dashboard",
        profile: {
          fullName: getUserFullName(req.user),
          email: req.user.email,
          role: req.user.role,
          roleLabel: roleLabels[req.user.role] || "Doctor"
        },
        doctorProfile,
        acceptedAppointments,
        acceptedCount: acceptedAppointments.length
      });
    }

    const [records, userCount, pendingCount, acceptedCount, rejectedCount, bedRecords, staffRecords] = await Promise.all([
      AppointmentDetail.find({}).sort({ createdAt: -1 }).limit(8).populate("user_id doctor_id").lean(),
      User.countDocuments(),
      AppointmentDetail.countDocuments({ status: "Pending" }),
      AppointmentDetail.countDocuments({ status: "Accepted" }),
      AppointmentDetail.countDocuments({ status: "Rejected" }),
      BedAdmission.find({}).sort({ createdAt: -1 }).limit(6).lean(),
      StaffRecord.find({}).sort({ createdAt: -1 }).limit(6).lean()
    ]);

    const bedSummary = buildBedSummary(bedRecords);
    const staffSummary = buildStaffSummary(staffRecords);
    const bedProjection = computeProjection(bedRecords, "occupied_beds", 3);
    const staffProjection = computeProjection(staffRecords, "active_staff", 3);

    res.render("main/adminDashboard", {
      title: "Dashboard",
      records,
      userCount,
      pendingCount,
      acceptedCount,
      rejectedCount,
      bedRecords,
      staffRecords,
      bedSummary,
      staffSummary,
      bedProjection,
      staffProjection,
      profile: {
        fullName: getUserFullName(req.user),
        email: req.user.email,
        role: req.user.role,
        roleLabel: roleLabels[req.user.role] || "Admin"
      }
    });
  } catch (err) {
    next(err);
  }
});

app.get("/predict", ensureRole("admin", "doctor"), (req, res) => {
  res.render("main/predict", {
    title: "Predict"
  });
});

app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }

    flashSuccess(req, "You have been logged out.");
    res.redirect("/");
  });
});

app.get("/auth/google", (req, res, next) => {
  if (!googleConfigured) {
    return redirectWithFlash(req, res, "/login", "warning", "Google authentication is not configured.");
  }

  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

app.get("/auth/google/callback", (req, res, next) => {
  if (!googleConfigured) {
    return redirectWithFlash(req, res, "/login", "warning", "Google authentication is not configured.");
  }

  passport.authenticate("google", (err, user) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return redirectWithFlash(req, res, "/login", "danger", "Google sign-in failed.");
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }

      flashSuccess(req, "Signed in with Google.");
      res.redirect("/");
    });
  })(req, res, next);
});

app.get("/reset", async (req, res, next) => {
  try {
    await Promise.all([
      User.deleteMany({}),
      AppointmentDetail.deleteMany({}),
      BedAdmission.deleteMany({}),
      StaffRecord.deleteMany({}),
      Doctor.deleteMany({})
    ]);
    await seedDoctors();
    await migrateDoctorProfiles();
    await seedStaffRecords({ force: true });
    res.redirect("/");
  } catch (err) {
    next(err);
  }
});

app.use((req, res) => {
  res.status(404).render("includes/pagenotfound");
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Something went wrong.");
});

async function startServer() {
  try {
    await mongoose.connect(mongoUri);
    await seedDoctors();
    await migrateDoctorProfiles();
    await seedStaffRecords();
    await migrateAppointmentReferences();
    console.log("Connected to MongoDB database cortex-connect.");
    app.listen(port, () => {
      console.log(`CortexConnect server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("MongoDB connection failed.");
    console.error(err);
    process.exit(1);
  }
}

startServer();

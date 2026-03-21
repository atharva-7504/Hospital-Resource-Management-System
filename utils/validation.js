const Joi = require("joi");

const objectIdPattern = /^[a-fA-F0-9]{24}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;
const weekdayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const signupSchema = Joi.object({
  first_name: Joi.string().trim().min(1).max(50).required(),
  last_name: Joi.string().trim().min(1).max(50).required(),
  username: Joi.string().trim().min(3).max(50).required(),
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required(),
  password: Joi.string().required(),
  role: Joi.string().valid("admin", "doctor", "user").default("user"),
  admin_code: Joi.string().trim().min(4).max(100).when("role", {
    is: "admin",
    then: Joi.required(),
    otherwise: Joi.strip()
  }),
  doctor_specialization: Joi.string().valid("cardiology", "orthopedic", "general_physician").when("role", {
    is: "doctor",
    then: Joi.required(),
    otherwise: Joi.strip()
  }),
  doctor_department: Joi.string().trim().min(2).max(120).when("role", {
    is: "doctor",
    then: Joi.required(),
    otherwise: Joi.strip()
  }),
  hospital_start_time: Joi.string().pattern(timePattern).when("role", {
    is: "doctor",
    then: Joi.required(),
    otherwise: Joi.strip()
  }),
  hospital_end_time: Joi.string().pattern(timePattern).when("role", {
    is: "doctor",
    then: Joi.required(),
    otherwise: Joi.strip()
  }),
  availability_days: Joi.array().items(Joi.string().valid(...weekdayOptions)).single().min(1).when("role", {
    is: "doctor",
    then: Joi.required(),
    otherwise: Joi.strip()
  }),
  doctor_bio: Joi.string().trim().max(500).allow("").optional().when("role", {
    is: "doctor",
    otherwise: Joi.strip()
  })
}).required();

const loginSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).required(),
  password: Joi.string().min(1).max(128).required()
}).required();

const appointmentSchema = Joi.object({
  user_id: Joi.string().pattern(objectIdPattern).required(),
  full_name: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  patient_type: Joi.string().valid("new", "existing").required(),
  age: Joi.number().integer().min(0).max(120).allow(null).optional(),
  date_of_birth: Joi.string().pattern(datePattern).allow("", null).optional(),
  gender: Joi.string().valid("male", "female", "other", "prefer_not_to_say").required(),
  doctor_id: Joi.string().pattern(objectIdPattern).required(),
  doctor_name: Joi.string().trim().min(2).max(120).required(),
  specialization: Joi.string().valid("cardiology", "orthopedic", "general_physician").required(),
  appointment_date: Joi.string().pattern(datePattern).required(),
  time_slot: Joi.string().trim().min(3).max(20).required(),
  symptoms: Joi.string().trim().min(3).max(1000).required(),
  department: Joi.string().trim().max(120).allow("").optional(),
  previous_visit: Joi.boolean().truthy("true").falsy("false", "", null).default(false),
  urgency_level: Joi.string().valid("low", "medium", "high").default("low"),
  preferred_contact_method: Joi.string().valid("phone", "email").required(),
  consent: Joi.boolean().truthy("on", true).valid(true).required()
}).required();

const bedAdmissionSchema = Joi.object({
  patient_user_id: Joi.string().pattern(objectIdPattern).required(),
  patient_name: Joi.string().trim().min(2).max(120).required(),
  patient_email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required(),
  patient_phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  bed_category: Joi.string().valid("normal", "critical", "icu").required(),
  bed_required: Joi.number().integer().min(1).max(50).required(),
  bed_assigned: Joi.string().trim().max(50).allow("").optional(),
  total_beds: Joi.number().integer().min(0).required(),
  occupied_beds: Joi.number().integer().min(0).max(Joi.ref("total_beds")).required(),
  admissions_today: Joi.number().integer().min(0).required(),
  discharges_today: Joi.number().integer().min(0).required(),
  expected_discharges_next_days: Joi.number().integer().min(0).required(),
  admission_date: Joi.string().pattern(datePattern).required(),
  discharge_date: Joi.string().pattern(datePattern).allow("", null).optional(),
  status: Joi.string().valid("admitted", "discharged", "transferred", "waiting").required(),
  urgency_level: Joi.string().valid("low", "medium", "high").required(),
  department: Joi.string().trim().max(120).allow("").optional(),
  notes: Joi.string().trim().max(1000).allow("").optional(),
  recorded_by: Joi.string().pattern(objectIdPattern).required()
}).required();

const staffRecordSchema = Joi.object({
  staff_user_id: Joi.string().pattern(objectIdPattern).required(),
  staff_name: Joi.string().trim().min(2).max(120).required(),
  staff_email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required(),
  staff_role: Joi.string().valid("admin", "doctor", "nurse", "technician", "support").required(),
  department: Joi.string().trim().min(2).max(120).required(),
  shift: Joi.string().valid("morning", "afternoon", "night", "rotational").required(),
  action_type: Joi.string().valid("added", "removed", "left", "on_leave", "recommended", "updated").required(),
  status: Joi.string().valid("active", "inactive", "recommended", "pending").required(),
  total_staff: Joi.number().integer().min(0).required(),
  active_staff: Joi.number().integer().min(0).max(Joi.ref("total_staff")).required(),
  added_staff: Joi.number().integer().min(0).required(),
  left_staff: Joi.number().integer().min(0).required(),
  required_staff: Joi.number().integer().min(0).required(),
  effective_date: Joi.string().pattern(datePattern).required(),
  recommendation: Joi.string().trim().max(1000).allow("").optional(),
  notes: Joi.string().trim().max(1000).allow("").optional(),
  recorded_by: Joi.string().pattern(objectIdPattern).required()
}).required();

module.exports = {
  objectIdPattern,
  signupSchema,
  loginSchema,
  appointmentSchema,
  bedAdmissionSchema,
  staffRecordSchema,
  weekdayOptions
};

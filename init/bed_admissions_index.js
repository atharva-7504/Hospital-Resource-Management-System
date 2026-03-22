const mongoose = require("mongoose");
const BedAdmission = require("../models/bedAdmission");
const bedAdmissions = require("./bed_admissions_records.json");

const resolveObjectId = (value) => {
  if (value && mongoose.isValidObjectId(value)) {
    return new mongoose.Types.ObjectId(value);
  }

  return new mongoose.Types.ObjectId();
};

const buildCreatedAt = (record, index) => {
  const createdAt = new Date(`${record.admission_date}T08:00:00.000Z`);

  if (Number.isNaN(createdAt.getTime())) {
    const fallback = new Date();
    fallback.setSeconds(fallback.getSeconds() + index);
    return fallback;
  }

  createdAt.setSeconds(createdAt.getSeconds() + index);
  return createdAt;
};

const seedBedAdmissions = async (options = {}) => {
  const {
    force = false,
    patientUserId = null,
    recordedByUserId = null
  } = options;

  const count = await BedAdmission.countDocuments();
  if (count > 0 && !force) {
    return;
  }

  if (force) {
    await BedAdmission.deleteMany({});
  }

  const resolvedPatientUserId = resolveObjectId(patientUserId);
  const resolvedRecordedByUserId = resolveObjectId(recordedByUserId);

  const documents = bedAdmissions.map((record, index) => ({
    ...record,
    patient_user_id: resolvedPatientUserId,
    recorded_by: resolvedRecordedByUserId,
    createdAt: buildCreatedAt(record, index)
  }));

  await BedAdmission.insertMany(documents);
};

module.exports = {
  seedBedAdmissions,
  bedAdmissions
};

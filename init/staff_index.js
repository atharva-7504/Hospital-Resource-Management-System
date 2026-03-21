const mongoose = require("mongoose");
const StaffRecord = require("../models/staffRecord");
const staffRecords = require("./staff_records.json");

const resolveObjectId = (value) => {
  if (value && mongoose.isValidObjectId(value)) {
    return new mongoose.Types.ObjectId(value);
  }

  return new mongoose.Types.ObjectId();
};

const seedStaffRecords = async (options = {}) => {
  const {
    force = false,
    staffUserId = null,
    recordedByUserId = null
  } = options;

  const count = await StaffRecord.countDocuments();
  if (count > 0 && !force) {
    return;
  }

  if (force) {
    await StaffRecord.deleteMany({});
  }

  const resolvedStaffUserId = resolveObjectId(staffUserId);
  const resolvedRecordedByUserId = resolveObjectId(recordedByUserId);

  const documents = staffRecords.map((record) => ({
    ...record,
    staff_user_id: resolvedStaffUserId,
    recorded_by: resolvedRecordedByUserId
  }));

  await StaffRecord.insertMany(documents);
};

module.exports = {
  seedStaffRecords,
  staffRecords
};

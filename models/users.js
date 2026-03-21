const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose").default;

const namePattern = /^[A-Za-z][A-Za-z\s'-]*$/;

const userSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
      match: namePattern
    },
    last_name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
      match: namePattern
    },
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      validate: {
        validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "")),
        message: "Please provide a valid email address."
      }
    },
    role: {
      type: String,
      enum: ["admin", "doctor", "user"],
      default: "user"
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    provider: {
      type: String,
      default: "local"
    }
  },
  {
    timestamps: true,
    collection: "users"
  }
);

userSchema.virtual("full_name").get(function fullNameGetter() {
  const parts = [this.first_name, this.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : this.username;
});

userSchema.plugin(passportLocalMongoose, {
  usernameField: "username"
});

module.exports = mongoose.model("User", userSchema);

const mongoose = require("mongoose");

const categorySchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      required: false,
    },
    quantity: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

exports.Category = mongoose.model("Category", categorySchema);

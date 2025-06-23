// backend/models/FoodRequest.js
const mongoose = require('mongoose');

const foodRequestSchema = mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      required: true
    },
    subdomain: {
      type: String,
      required: [true, 'Company name is missing']
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department not found']
    },
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner'],
      required: [true, 'Meal type is required'],
      default: 'lunch'
    },
    date: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['fulfilled', 'cancelled'],
      default: 'fulfilled'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('FoodRequest', foodRequestSchema);
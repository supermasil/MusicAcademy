const mongoose = require('mongoose');
const RecipientSchema = require('../recipient');

const shippingOptionsSchema = mongoose.Schema({
  payAtDestination: {type: Boolean, default: false},
  receiveAtDestination: {type: Boolean, default: false},
}, {_id: false});

// This is only used at sub-document
const GeneralInfoSchema = mongoose.Schema({
  sender: {type: String, required: true, unique: true}, // Unique index
  recipient: RecipientSchema,
  organizationId: {type: mongoose.Types.ObjectId, ref: "organization"},
  content: {type: String, default: ''}, // Note
  status: {type: String, required: true},
  active: {type: Boolean, required: true}, // This should be false to prevent edit after certain stage
  weight: {type: Number, default: 0}, // Can be updated later on
  finalCost: {type: Number, defaul: 0}, // The money to charge customer

  currentLocation: {type: String, required: true}, //Unknown, Oregon, HN, SG....
  origin: {type: String, required: true},
  destination: {type: String, required: true},
  shippingOptions: shippingOptionsSchema,

  creatorId: {type: mongoose.Types.ObjectId, ref: "user"}, // Google id, has to be string
  creatorName: {type: String, required: true},

  filePaths: [{type: String}],
  comments: [{type: mongoose.Types.ObjectId, ref: "comment"}]
}, { _id: false });

module.exports = GeneralInfoSchema;

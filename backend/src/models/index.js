import mongoose from 'mongoose';
import { TYPES, STATUSES } from '../utils/helpers.js';
const { Schema } = mongoose;
const J = { toJSON: { virtuals: true, versionKey: false, transform: (d, r) => { delete r.password; delete r.phone; return r; } } };

export const Organization = mongoose.model('Organization', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true },
  serviceTypes: [{ type: String, enum: TYPES }],
  assignedAreas: [String],
}, { timestamps: { createdAt: true, updatedAt: false }, ...J }));

export const User = mongoose.model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'organization', 'admin'], default: 'user' },
  blocked: { type: Boolean, default: false },
  organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
}, { timestamps: { createdAt: true, updatedAt: false }, ...J }));

const outageS = new Schema({
  type: { type: String, enum: TYPES, required: true },
  title: { type: String, default: '' },
  description: { type: String, required: true, maxlength: 1000 },
  address: { type: String, maxlength: 250, default: '' },
  district: { type: String, default: 'Юнусабадский' },
  mahalla: { type: String, default: '' },
  location: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], required: true } }, // [lng, lat]
  status: { type: String, enum: STATUSES, default: 'pending' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  processStage: { type: String, default: '' },
  isPlanned: { type: Boolean, default: false },
  plannedStart: { type: String, default: '' },
  estimatedResolution: { type: String, default: '' },
  affectedHouses: { type: Number, default: 1 },
  affectedResidents: { type: Number, default: 100 },
  confirmations: { type: Number, default: 0 },
  phone: { type: String, default: '' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
}, { timestamps: true, ...J });
outageS.index({ location: '2dsphere' });
outageS.virtual('lat').get(function () { return this.location.coordinates[1]; });
outageS.virtual('lng').get(function () { return this.location.coordinates[0]; });
export const Outage = mongoose.model('Outage', outageS);

const confS = new Schema({
  outage: { type: Schema.Types.ObjectId, ref: 'Outage', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  ip: { type: String, default: '' },
}, { timestamps: true });
confS.index({ outage: 1, user: 1 }, { unique: true, sparse: true });
export const Confirmation = mongoose.model('Confirmation', confS);

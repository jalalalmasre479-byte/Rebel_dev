
const mongoose = require('mongoose');
const landSchema = new mongoose.Schema({
  landId: String,
  level: { type: Number, default: 1 },
  lastCollected: { type: Date, default: Date.now }
});
const carSchema = new mongoose.Schema({
  carId: String,
  count: { type: Number, default: 1 },
  damage: { type: Number, default: 0 }
});
const ticketSchema = new mongoose.Schema({
  ticketId: String,
  amount: Number,
  issuedAt: { type: Date, default: Date.now },
  paid: { type: Boolean, default: false },
  paidAt: Date
});
const bankUserSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  balance: { type: Number, default: 10000 },
  bank: { type: Number, default: 0 },
  materials: {
    wood: { type: Number, default: 0 },
    brick: { type: Number, default: 0 },
    stone: { type: Number, default: 0 },
    steel: { type: Number, default: 0 },
    iron: { type: Number, default: 0 },
    gold: { type: Number, default: 0 }
  },
  lands: [landSchema],
  cars: [carSchema],
  tickets: [ticketSchema],
  loan: {
    amount: { type: Number, default: 0 },
    takenAt: Date
  },
  marriage: {
    partnerId: String,
    marriedAt: Date
  },
  protection: {
    active: { type: Boolean, default: false },
    expiresAt: Date
  },
  stats: {
    highestEarned: { type: Number, default: 0 },
    highestLost: { type: Number, default: 0 },
    totalStolen: { type: Number, default: 0 },
    totalRobbed: { type: Number, default: 0 },
    totalInvested: { type: Number, default: 0 }
  },
  cooldowns: {
    dice: Date,
    luck: Date,
    fruits: Date,
    gamble: Date,
    trade: Date,
    tip: Date,
    rob: Date,
    salary: Date,
    loan: Date
  },
  visaNumber: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  level: { type: Number, default: 1 },
  experience: { type: Number, default: 0 },
  job: { type: String, default: 'Unemployed' }
});
bankUserSchema.index({ userId: 1, guildId: 1 }, { unique: true });
bankUserSchema.pre('save', async function() {
  if (!this.visaNumber) {
    this.visaNumber = Math.floor(1000000000000000 + Math.random() * 9000000000000000).toString();
  }
  this.updatedAt = Date.now();
});
module.exports = mongoose.model('BankUser', bankUserSchema);
    

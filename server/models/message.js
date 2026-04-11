import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
  },
  text: {
    type: String
  },
  image: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }]
});

messageSchema.pre('validate', function (next) {
  if (!this.receiver && !this.group) {
    return next(new Error('Message requires a receiver or a group.'));
  }

  if (this.receiver && this.group) {
    return next(new Error('Message cannot have both receiver and group.'));
  }

  next();
});

export default mongoose.model('Message', messageSchema);
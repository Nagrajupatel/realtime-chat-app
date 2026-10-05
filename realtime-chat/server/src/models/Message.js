import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '', maxlength: 2000 },
    file: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
  },
  { timestamps: true }
);

export const populateMessage = (msg) =>
  msg.populate([
    { path: 'sender', select: 'username' },
    { path: 'file', select: 'originalName size mimeType sha256' },
  ]);

export default mongoose.model('Message', messageSchema);

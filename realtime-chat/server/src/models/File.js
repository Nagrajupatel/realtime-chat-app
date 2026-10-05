import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    mimeType: String,
    size: Number,
    s3Key: { type: String, required: true },
    sha256: { type: String, required: true },
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('File', fileSchema);

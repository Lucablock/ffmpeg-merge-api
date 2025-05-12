const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ dest: 'uploads/' });

const ensureFolderExists = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

ensureFolderExists('uploads');
ensureFolderExists('output');

app.post('/merge', upload.fields([{ name: 'video' }, { name: 'audio' }]), (req, res) => {
  const video = req.files['video']?.[0];
  const audio = req.files['audio']?.[0];

  if (!video || !audio) {
    return res.status(400).send('Missing video or audio file.');
  }

  const outputFileName = `${uuidv4()}.mp4`;
  const outputPath = path.join('output', outputFileName);

  // ✅ ตรวจสอบว่า video มี stream จริง
  ffmpeg.ffprobe(video.path, (err, metadata) => {
    if (err) {
      console.error('ffprobe error:', err.message);
      return res.status(500).send('Error probing video file.');
    }

    const hasVideoStream = metadata.streams.some(stream => stream.codec_type === 'video');
    if (!hasVideoStream) {
      return res.status(400).send('The uploaded file does not contain a video stream.');
    }

    // ⚙️ ดำเนินการ merge
    ffmpeg()
      .input(video.path)
      .input(audio.path)
      .outputOptions([
        '-c:v copy',
        '-c:a aac',
        '-shortest'
      ])
      .on('error', (err) => {
        console.error('FFmpeg error:', err.message);
        res.status(500).send('Error during merging.');
      })
      .on('end', () => {
        res.setHeader('Content-Type', 'video/mp4');
        res.sendFile(path.resolve(outputPath), () => {
          // 🧹 ล้างไฟล์หลังส่ง
          fs.unlinkSync(video.path);
          fs.unlinkSync(audio.path);
          fs.unlinkSync(outputPath);
        });
      })
      .save(outputPath);
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

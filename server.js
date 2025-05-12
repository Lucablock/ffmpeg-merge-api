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

  ffmpeg()
    .input(video.path)
    .input(audio.path)
    .outputOptions([
      '-map 0:v:0',         // ใช้วิดีโอจาก input 0
      '-map 1:a:0',         // ใช้เสียงจาก input 1
      '-c:v copy',          // ใช้วิดีโอดั้งเดิม ไม่ re-encode
      '-c:a aac',           // แปลงเสียงเป็น AAC (รองรับ universal)
      '-shortest'           // จบเมื่อวิดีโอหรือเสียงจบก่อน
    ])
    .on('error', (err) => {
      console.error('FFmpeg error:', err.message);
      res.status(500).send('Error during merging.');
    })
    .on('end', () => {
      res.setHeader('Content-Type', 'video/mp4');
      res.sendFile(path.resolve(outputPath), () => {
        fs.unlinkSync(video.path);
        fs.unlinkSync(audio.path);
        fs.unlinkSync(outputPath);
      });
    })
    .save(outputPath);
});

app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
});

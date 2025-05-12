const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ dest: 'uploads/' });

// ตรวจสอบว่าโฟลเดอร์ exists หรือยัง
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
      '-c:v copy',         // ใช้วิดีโอเดิม ไม่เข้ารหัสใหม่
      '-c:a aac',          // แปลงเสียงเป็น AAC (รองรับบนทุกแพลตฟอร์ม)
      '-shortest'          // ตัดให้จบตามความยาวไฟล์ที่สั้นที่สุด (ป้องกันเสียง/ภาพล้น)
    ])
    .on('error', (err) => {
      console.error('FFmpeg error:', err.message);
      res.status(500).send('Error during merging.');
    })
    .on('end', () => {
      res.setHeader('Content-Type', 'video/mp4');
      res.sendFile(path.resolve(outputPath), () => {
        // ลบไฟล์หลังส่งเสร็จ
        fs.unlinkSync(video.path);
        fs.unlinkSync(audio.path);
        fs.unlinkSync(outputPath);
      });
    })
    .save(outputPath);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() }); // ใช้ memory storage

const ensureFolderExists = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

app.post('/merge', upload.fields([{ name: 'audio' }, { name: 'video' }]), (req, res) => {
  try {
    const audioFile = req.files?.['audio']?.[0];
    const videoFile = req.files?.['video']?.[0];

    if (!audioFile || !videoFile) {
      return res.status(400).send('❌ Missing audio or video file');
    }

    const audioBuffer = audioFile.buffer;
    const videoBuffer = videoFile.buffer;

    ensureFolderExists('inputs');
    ensureFolderExists('outputs');

    const timestamp = Date.now();
    const audioPath = `inputs/audio-${timestamp}.mp3`;
    const videoPath = `inputs/video-${timestamp}.mp4`;
    const outputPath = `outputs/merged-${timestamp}.mp4`;

    fs.writeFileSync(audioPath, audioBuffer);
    fs.writeFileSync(videoPath, videoBuffer);

    // ตรวจสอบ metadata ด้วย ffprobe ก่อน merge
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        console.error('❌ FFprobe Error:', err.message);
        return res.status(500).send('Failed to analyze video file');
      }

      const hasVideoStream = metadata.streams.some(s => s.codec_type === 'video');
      const hasAudioStream = metadata.streams.some(s => s.codec_type === 'audio');

      console.log('🎥 Video has stream:', hasVideoStream);
      console.log('🎧 Video has audio:', hasAudioStream);

      if (!hasVideoStream) {
        return res.status(400).send('❌ No video stream found in the uploaded file');
      }

      ffmpeg()
        .input(videoPath) // วิดีโอต้องมาก่อน
        .input(audioPath)
        .outputOptions([
          '-map', '0:v:0',
          '-map', '1:a:0',
          '-c:v', 'copy',
          '-shortest'
        ])
        .on('start', (cmd) => {
          console.log('🚀 FFmpeg command:', cmd);
        })
        .on('end', () => {
          console.log('✅ Merge complete. Sending file...');
          res.download(outputPath, () => {
            fs.unlinkSync(audioPath);
            fs.unlinkSync(videoPath);
            fs.unlinkSync(outputPath);
          });
        })
        .on('error', (err) => {
          console.error('❌ FFmpeg Error:', err.message);
          res.status(500).send('Merge failed: ' + err.message);
        })
        .save(outputPath);
    });

  } catch (err) {
    console.error('❌ Server Error:', err.message);
    res.status(500).send('Unexpected error: ' + err.message);
  }
});

app.get('/', (req, res) => {
  res.send('✅ FFmpeg Merge API is running.');
});

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});

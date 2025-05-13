const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const app = express();
const port = process.env.PORT || 8080;
const upload = multer({ dest: 'uploads/' });

// Ensure folders exist
const ensureFolderExists = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};
ensureFolderExists('uploads');
ensureFolderExists('output');

app.post('/merge', upload.fields([{ name: 'video' }, { name: 'audio' }]), (req, res) => {
  console.log('🔥 MERGE ENDPOINT CALLED');

  const video = req.files['video']?.[0];
  const audio = req.files['audio']?.[0];

  if (!video || !audio) {
    console.log('❌ Missing video or audio file.');
    return res.status(400).send('Missing video or audio file.');
  }

  const outputFileName = `${uuidv4()}.mp4`;
  const outputPath = path.join('output', outputFileName);

  console.log('📁 VIDEO RECEIVED:', video.originalname, video.path);
  console.log('📁 AUDIO RECEIVED:', audio.originalname, audio.path);
  console.log('📦 Output path will be:', outputPath);

  ffmpeg.ffprobe(video.path, (err, metadata) => {
    if (err) {
      console.error('❌ FFprobe error:', err);
      return res.status(500).send('Cannot analyze video file.');
    }

    const hasVideoStream = metadata.streams.some(s => s.codec_type === 'video');
    if (!hasVideoStream) {
      console.log('❌ Uploaded video has no video stream.');
      return res.status(400).send('Uploaded file does not contain a video stream.');
    }

    console.log('✅ FFmpeg inputs ready...');

    ffmpeg()
      .input(video.path)
      .noAudio() // ลบเสียงเดิมออกจากวิดีโอ
      .input(audio.path)
      .outputOptions([
        '-map 0:v',
        '-map 1:a',
        '-c:v copy',
        '-c:a aac',
        '-b:a 192k',
        '-movflags +faststart',
        '-shortest'
      ])
      .on('start', (cmd) => {
        console.log('▶️ FFmpeg started with command:', cmd);
      })
      .on('stderr', (line) => {
        console.log('📢 FFmpeg stderr:', line);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('❌ FFmpeg ERROR:', err.message);
        console.log('❗ STDOUT:', stdout);
        console.log('❗ STDERR:', stderr);
        return res.status(500).send('FFmpeg error');
      })
      .on('end', () => {
        console.log('✅ FFmpeg MERGE DONE. Sending file:', outputPath);

        res.setHeader('Content-Type', 'video/mp4');
        res.sendFile(path.resolve(outputPath), (err) => {
          if (err) {
            console.error('❌ Error sending merged file:', err);
          } else {
            console.log('📤 File sent successfully!');
            fs.unlinkSync(video.path);
            fs.unlinkSync(audio.path);
            fs.unlinkSync(outputPath);
            console.log('🧹 Cleaned up temporary files.');
          }
        });
      })
      .save(outputPath);

    console.log('💾 Saving with FFmpeg...');
  });
});

app.listen(port, () => {
  console.log(`🚀 FFmpeg merge server is running on port ${port}`);
});

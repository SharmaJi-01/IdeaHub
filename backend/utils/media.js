const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolve(stderr);
      const error = new Error(`FFmpeg failed with code ${code}`);
      error.details = stderr;
      reject(error);
    });
  });
}

async function probeDuration(filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ['-hide_banner', '-i', filePath], { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', () => {
      const match = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
      if (!match) return reject(new Error('Could not read the video duration.'));
      const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
      resolve(seconds);
    });
  });
}

async function trimVideo(input, output, startTime, endTime) {
  const duration = Number(endTime) - Number(startTime);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || duration <= 0) {
    throw new Error('Invalid trim range.');
  }

  await runFfmpeg([
    '-y',
    '-ss', String(startTime),
    '-i', input,
    '-t', String(duration),
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    output,
  ]);
}

async function createThumbnail(videoPath, thumbnailPath, atSecond = 1) {
  await runFfmpeg([
    '-y',
    '-ss', String(Math.max(0, atSecond)),
    '-i', videoPath,
    '-frames:v', '1',
    '-q:v', '2',
    thumbnailPath,
  ]);
}

function publicUrl(req, filename) {
  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base.replace(/\/$/, '')}/uploads/${encodeURIComponent(filename)}`;
}

function safeRemove(filePath) {
  if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

module.exports = { probeDuration, trimVideo, createThumbnail, publicUrl, safeRemove };

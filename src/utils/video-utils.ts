import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import logger from './logger.js';

export interface ThumbnailOptions {
  videoPath: string;
  outputPath?: string;
  timeSeconds?: number;
  width?: number;
  height?: number;
}

export async function extractThumbnail(options: ThumbnailOptions): Promise<string | undefined> {
  const {
    videoPath,
    outputPath,
    timeSeconds = 1,
    width = 640,
    height = 360
  } = options;

  const hasFFmpeg = await checkFFmpegAvailable();
  
  if (!hasFFmpeg) {
    logger.warn('ffmpeg not found in PATH - thumbnail extraction skipped');
    return undefined;
  }

  const thumbnailPath = outputPath ||
    videoPath.replace(/\.(mp4|webm)$/, '-thumbnail.jpg');

  return new Promise((resolve, reject) => {
    const ffmpegArgs = [
      '-i', videoPath,
      '-ss', timeSeconds.toString(),
      '-vframes', '1',
      '-vf', `scale=${width}:${height}`,
      '-y',
      thumbnailPath
    ];

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(thumbnailPath);
      } else {
        logger.warn('ffmpeg thumbnail extraction failed', { stderr });
        resolve(undefined);
      }
    });

    ffmpeg.on('error', (error) => {
      logger.warn('ffmpeg spawn error', { error: error.message });
      resolve(undefined);
    });
  });
}

async function checkFFmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    
    ffmpeg.on('close', (code) => {
      resolve(code === 0);
    });

    ffmpeg.on('error', () => {
      resolve(false);
    });
  });
}

export function generateVideoPlayerHTML(
  videoPath: string,
  thumbnailPath?: string,
  metadata?: {
    prompt?: string;
    duration?: number;
    resolution?: string;
    aspectRatio?: string;
  }
): string {
  const videoName = path.basename(videoPath);
  const videoUrl = `file:///${videoPath.replace(/\\/g, '/')}`;
  const thumbnailUrl = thumbnailPath 
    ? `file:///${thumbnailPath.replace(/\\/g, '/')}`
    : undefined;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Veo 3.1 Video - ${videoName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      width: 100%;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 2.5em;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 10px;
    }

    .header p {
      color: #a0a0a0;
      font-size: 1.1em;
    }

    .video-wrapper {
      background: #2a2a3e;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      margin-bottom: 20px;
    }

    video {
      width: 100%;
      height: auto;
      display: block;
    }

    ${metadata ? `.metadata {
      background: #2a2a3e;
      border-radius: 16px;
      padding: 30px;
      margin-bottom: 20px;
    }

    .metadata h2 {
      color: #667eea;
      font-size: 1.3em;
      margin-bottom: 15px;
    }

    .metadata-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .metadata-item {
      background: #1a1a2e;
      padding: 15px;
      border-radius: 8px;
      border-left: 3px solid #667eea;
    }

    .metadata-label {
      color: #a0a0a0;
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 5px;
    }

    .metadata-value {
      color: #e0e0e0;
      font-size: 1.1em;
      font-weight: 600;
    }

    .prompt-box {
      background: #1a1a2e;
      padding: 20px;
      border-radius: 8px;
      border-left: 3px solid #764ba2;
      margin-top: 20px;
    }

    .prompt-box .metadata-label {
      border-left-color: #764ba2;
    }

    .prompt-text {
      color: #e0e0e0;
      font-size: 1em;
      line-height: 1.6;
      font-style: italic;
    }` : ''}

    .controls {
      background: #2a2a3e;
      border-radius: 16px;
      padding: 20px;
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 1em;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      text-decoration: none;
      display: inline-block;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
    }

    .btn:active {
      transform: translateY(0);
    }

    .footer {
      text-align: center;
      margin-top: 30px;
      color: #a0a0a0;
      font-size: 0.9em;
    }

    @media (max-width: 768px) {
      .header h1 {
        font-size: 2em;
      }

      .metadata-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎬 Veo 3.1 Video Generation</h1>
      <p>Google's latest AI video generation model</p>
    </div>

    <div class="video-wrapper">
      <video controls ${thumbnailUrl ? `poster="${thumbnailUrl}"` : ''} preload="metadata">
        <source src="${videoUrl}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    </div>

    ${metadata ? `<div class="metadata">
      <h2>Generation Details</h2>
      
      ${metadata.prompt ? `<div class="prompt-box">
        <div class="metadata-label">Prompt</div>
        <div class="prompt-text">"${metadata.prompt}"</div>
      </div>` : ''}

      <div class="metadata-grid">
        ${metadata.duration ? `<div class="metadata-item">
          <div class="metadata-label">Duration</div>
          <div class="metadata-value">${metadata.duration} seconds</div>
        </div>` : ''}
        
        ${metadata.resolution ? `<div class="metadata-item">
          <div class="metadata-label">Resolution</div>
          <div class="metadata-value">${metadata.resolution}</div>
        </div>` : ''}
        
        ${metadata.aspectRatio ? `<div class="metadata-item">
          <div class="metadata-label">Aspect Ratio</div>
          <div class="metadata-value">${metadata.aspectRatio}</div>
        </div>` : ''}
        
        <div class="metadata-item">
          <div class="metadata-label">Model</div>
          <div class="metadata-value">Veo 3.1</div>
        </div>
      </div>
    </div>` : ''}

    <div class="controls">
      <a href="${videoUrl}" class="btn" download="${videoName}">📥 Download Video</a>
      ${thumbnailUrl ? `<a href="${thumbnailUrl}" class="btn" download="${path.basename(thumbnailPath!)}">🖼️ Download Thumbnail</a>` : ''}
    </div>

    <div class="footer">
      <p>Generated with Google Gemini MCP · Veo 3.1 Preview</p>
      <p>Video saved to: ${videoPath}</p>
    </div>
  </div>

  <script>
    const video = document.querySelector('video');
    
    video.addEventListener('loadedmetadata', () => {
      console.log('Video metadata loaded:', {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
      }
    });
  </script>
</body>
</html>`;
}

export async function saveVideoPlayerHTML(
  htmlContent: string,
  outputPath?: string
): Promise<string> {
  const filePath = outputPath || `video-player-${Date.now()}.html`;
  await fs.writeFile(filePath, htmlContent, 'utf-8');
  return path.resolve(filePath);
}

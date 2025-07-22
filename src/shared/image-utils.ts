// 画像処理のユーティリティ関数

import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import type { CaptureResult, ComparisonResult } from "./types";

export class ImageUtils {
  // データURLから ImageData を作成
  static async dataUrlToImageData(dataUrl: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve(imageData);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = dataUrl;
    });
  }

  // 2つの画像を比較
  static async compareImages(
    beforeImage: CaptureResult,
    afterImage: CaptureResult,
    options: {
      threshold?: number;
      diffColor?: string;
    } = {},
  ): Promise<ComparisonResult> {
    const threshold = options.threshold ?? 0.1;
    const diffColor = options.diffColor ?? "#ff0000";

    // 画像データを取得
    const beforeData = await this.dataUrlToImageData(beforeImage.dataUrl);
    const afterData = await this.dataUrlToImageData(afterImage.dataUrl);

    // サイズを合わせる（メモリ節約のため制限あり）
    const maxWidth = 2000; // 最大幅制限
    const maxHeight = 10000; // 最大高さ制限
    
    let width = Math.max(beforeData.width, afterData.width);
    let height = Math.max(beforeData.height, afterData.height);
    
    // メモリ使用量を制限
    if (width > maxWidth || height > maxHeight) {
      const scale = Math.min(maxWidth / width, maxHeight / height);
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
      console.log(`画像サイズを縮小: ${Math.floor(width / scale)} x ${Math.floor(height / scale)} -> ${width} x ${height}`);
    }

    // 画像のリサイズ（必要な場合）
    const normalizedBefore = this.normalizeImageData(beforeData, width, height);
    const normalizedAfter = this.normalizeImageData(afterData, width, height);

    // 差分画像を作成
    const diffData = new Uint8ClampedArray(width * height * 4);

    // pixelmatch を使用して比較
    const diffPixels = pixelmatch(
      normalizedBefore.data,
      normalizedAfter.data,
      diffData,
      width,
      height,
      { threshold },
    );

    // 差分画像をcanvasに描画
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    const diffImageData = new ImageData(diffData, width, height);
    ctx.putImageData(diffImageData, 0, 0);

    const totalPixels = width * height;
    const diffPercentage = ((diffPixels / totalPixels) * 100).toFixed(2);

    return {
      diffPixels,
      diffPercentage,
      totalPixels,
      diffImageUrl: canvas.toDataURL(),
      beforeUrl: beforeImage.url,
      afterUrl: afterImage.url,
      timestamp: Date.now(),
    };
  }

  // 画像データを指定サイズに正規化（メモリ効率化版）
  private static normalizeImageData(
    imageData: ImageData,
    targetWidth: number,
    targetHeight: number,
  ): ImageData {
    if (imageData.width === targetWidth && imageData.height === targetHeight) {
      return imageData;
    }
    
    // 元画像が大きすぎる場合はスケールダウン
    let sourceWidth = imageData.width;
    let sourceHeight = imageData.height;
    let sourceImageData = imageData;
    
    const maxDimension = 2000;
    if (sourceWidth > maxDimension || sourceHeight > maxDimension) {
      const scale = Math.min(maxDimension / sourceWidth, maxDimension / sourceHeight);
      const scaledWidth = Math.floor(sourceWidth * scale);
      const scaledHeight = Math.floor(sourceHeight * scale);
      
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = scaledWidth;
      scaledCanvas.height = scaledHeight;
      const scaledCtx = scaledCanvas.getContext('2d')!;
      
      const originalCanvas = document.createElement('canvas');
      originalCanvas.width = sourceWidth;
      originalCanvas.height = sourceHeight;
      const originalCtx = originalCanvas.getContext('2d')!;
      originalCtx.putImageData(imageData, 0, 0);
      
      scaledCtx.drawImage(originalCanvas, 0, 0, scaledWidth, scaledHeight);
      sourceImageData = scaledCtx.getImageData(0, 0, scaledWidth, scaledHeight);
      sourceWidth = scaledWidth;
      sourceHeight = scaledHeight;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    // 元の画像をcanvasに描画
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    ctx.putImageData(sourceImageData, 0, 0);

    // リサイズ用の新しいcanvasを作成
    const resizeCanvas = document.createElement("canvas");
    const resizeCtx = resizeCanvas.getContext("2d")!;
    resizeCanvas.width = targetWidth;
    resizeCanvas.height = targetHeight;

    // 白い背景で埋める（透明部分の対応）
    resizeCtx.fillStyle = "#ffffff";
    resizeCtx.fillRect(0, 0, targetWidth, targetHeight);

    // 元の画像を中央配置で描画
    const offsetX = Math.max(0, (targetWidth - sourceWidth) / 2);
    const offsetY = Math.max(0, (targetHeight - sourceHeight) / 2);

    resizeCtx.drawImage(canvas, offsetX, offsetY);

    return resizeCtx.getImageData(0, 0, targetWidth, targetHeight);
  }

  // カスタム比較（より高度な比較オプション付き）
  static async compareImagesAdvanced(
    beforeImage: CaptureResult,
    afterImage: CaptureResult,
    options: {
      threshold?: number;
      diffColor?: string;
      includeAA?: boolean;
      alpha?: number;
    } = {},
  ): Promise<ComparisonResult> {
    const {
      threshold = 0.1,
      diffColor = "#ff0000",
      includeAA = false,
      alpha = 0.1,
    } = options;

    const beforeData = await this.dataUrlToImageData(beforeImage.dataUrl);
    const afterData = await this.dataUrlToImageData(afterImage.dataUrl);

    const width = Math.max(beforeData.width, afterData.width);
    const height = Math.max(beforeData.height, afterData.height);

    const normalizedBefore = this.normalizeImageData(beforeData, width, height);
    const normalizedAfter = this.normalizeImageData(afterData, width, height);

    const diffData = new Uint8ClampedArray(width * height * 4);

    const diffPixels = pixelmatch(
      normalizedBefore.data,
      normalizedAfter.data,
      diffData,
      width,
      height,
      {
        threshold,
        includeAA,
        alpha,
        diffColor: this.hexToRgb(diffColor),
        diffColorAlt: null,
      },
    );

    // より詳細な差分画像を生成
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    const diffImageData = new ImageData(diffData, width, height);
    ctx.putImageData(diffImageData, 0, 0);

    const totalPixels = width * height;
    const diffPercentage = ((diffPixels / totalPixels) * 100).toFixed(2);

    return {
      diffPixels,
      diffPercentage,
      totalPixels,
      diffImageUrl: canvas.toDataURL(),
      beforeUrl: beforeImage.url,
      afterUrl: afterImage.url,
      timestamp: Date.now(),
    };
  }

  // Hex色をRGB配列に変換
  private static hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
      : [255, 0, 0];
  }

  // HTMLレポートの生成
  static generateReportHtml(
    result: ComparisonResult,
    beforeImage: CaptureResult,
    afterImage: CaptureResult,
  ): string {
    const timestamp = new Date(result.timestamp).toLocaleString();

    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data: blob:;">
    <title>VRT Report - ${timestamp}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 20px; 
            background: #f5f7fa; 
            color: #2c3e50;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .actions {
            text-align: center;
            margin-bottom: 30px;
        }
        .btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin: 0 10px;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background: #2980b9;
        }
        .btn.success {
            background: #27ae60;
        }
        .btn.success:hover {
            background: #219a52;
        }
        .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .stat { 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            margin-top: 8px;
        }
        .view-tabs {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
            background: white;
            padding: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .tab-btn {
            background: #ecf0f1;
            border: none;
            padding: 10px 20px;
            margin: 0 5px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        .tab-btn.active {
            background: #3498db;
            color: white;
        }
        .view-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 20px;
            margin-bottom: 30px;
        }
        .side-by-side {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
        }
        .image-section { 
            text-align: center;
        }
        .image-section h3 { 
            margin-bottom: 10px; 
            color: #2c3e50;
        }
        .image-section img { 
            width: 100%; 
            max-width: 100%;
            border-radius: 4px;
            border: 1px solid #ddd;
        }
        .url-info {
            font-size: 12px;
            color: #7f8c8d;
            word-break: break-all;
            margin-bottom: 10px;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .slider-container {
            position: relative;
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            overflow: hidden;
            border-radius: 8px;
            border: 1px solid #ddd;
        }
        .slider-images {
            position: relative;
            width: 100%;
            height: 600px;
        }
        .slider-image {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            background: #f8f9fa;
        }
        .slider-control {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 80%;
            max-width: 400px;
        }
        .slider-input {
            width: 100%;
            height: 6px;
            border-radius: 3px;
            background: #ddd;
            outline: none;
            appearance: none;
        }
        .slider-input::-webkit-slider-thumb {
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #3498db;
            cursor: pointer;
        }
        .slider-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            font-size: 14px;
            font-weight: bold;
        }
        .diff-view {
            position: relative;
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
        }
        .diff-view img {
            width: 100%;
            max-width: 100%;
            border-radius: 8px;
            border: 1px solid #ddd;
        }
        @media (max-width: 1024px) {
            .side-by-side {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📸 Visual Regression Test Report</h1>
        <p>Generated on ${timestamp}</p>
    </div>
    
    <div class="actions">
        <button id="capture-btn" class="btn">📸 レポートをPNG保存</button>
        <button id="download-btn" class="btn success">💾 HTMLダウンロード</button>
    </div>
    
    <div class="stats">
        <div class="stat">
            <h3>差分率</h3>
            <div class="stat-value" style="color: ${
      parseFloat(result.diffPercentage) > 5 ? "#e74c3c" : "#27ae60"
    }">${result.diffPercentage}%</div>
        </div>
        <div class="stat">
            <h3>変更ピクセル数</h3>
            <div class="stat-value">${result.diffPixels.toLocaleString()}</div>
        </div>
        <div class="stat">
            <h3>総ピクセル数</h3>
            <div class="stat-value">${result.totalPixels.toLocaleString()}</div>
        </div>
    </div>
    
    <div class="view-tabs">
        <button class="tab-btn active" data-view="side-by-side">並べて表示</button>
        <button class="tab-btn" data-view="slider">スライダー比較</button>
        <button class="tab-btn" data-view="diff">差分表示</button>
    </div>
    
    <div class="view-container">
        <!-- 並べて表示 -->
        <div id="side-by-side-view" class="view-content">
            <div class="side-by-side">
                <div class="image-section">
                    <h3>🔵 Before</h3>
                    <div class="url-info">${result.beforeUrl}</div>
                    <img src="${beforeImage.dataUrl}" alt="Before screenshot">
                </div>
                <div class="image-section">
                    <h3>🟠 After</h3>
                    <div class="url-info">${result.afterUrl}</div>
                    <img src="${afterImage.dataUrl}" alt="After screenshot">
                </div>
                <div class="image-section">
                    <h3>🔴 Diff</h3>
                    <div class="url-info">差分をハイライト表示</div>
                    <img src="${result.diffImageUrl}" alt="Diff visualization">
                </div>
            </div>
        </div>
        
        <!-- スライダー比較 -->
        <div id="slider-view" class="view-content" style="display: none;">
            <div class="slider-container">
                <div class="slider-images">
                    <img id="before-image" class="slider-image" src="${beforeImage.dataUrl}" alt="Before" style="opacity: 1;">
                    <img id="after-image" class="slider-image" src="${afterImage.dataUrl}" alt="After" style="opacity: 0;">
                </div>
                <div class="slider-control">
                    <input type="range" class="slider-input" id="comparison-slider" min="0" max="100" value="0">
                    <div class="slider-labels">
                        <span>Before</span>
                        <span>After</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 差分表示 -->
        <div id="diff-view" class="view-content" style="display: none;">
            <div class="diff-view">
                <h3>🔴 差分ハイライト</h3>
                <img src="${result.diffImageUrl}" alt="Difference visualization">
                <p style="margin-top: 15px; color: #7f8c8d;">赤色の部分が変更された箇所です</p>
            </div>
        </div>
    </div>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // タブ切り替え
            function showView(viewName) {
                // すべてのタブボタンをリセット
                document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.view-content').forEach(view => view.style.display = 'none');
                
                // 選択されたタブを活性化
                event.target.classList.add('active');
                document.getElementById(viewName + '-view').style.display = 'block';
            }
            
            // タブボタンのイベントリスナー
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const viewName = this.getAttribute('data-view');
                    
                    // すべてのタブボタンをリセット
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.view-content').forEach(view => view.style.display = 'none');
                    
                    // 選択されたタブを活性化
                    this.classList.add('active');
                    document.getElementById(viewName + '-view').style.display = 'block';
                });
            });
            
            // スライダー制御
            const slider = document.getElementById('comparison-slider');
            if (slider) {
                slider.addEventListener('input', function() {
                    const value = this.value;
                    const beforeImage = document.getElementById('before-image');
                    const afterImage = document.getElementById('after-image');
                    
                    if (beforeImage && afterImage) {
                        beforeImage.style.opacity = (100 - value) / 100;
                        afterImage.style.opacity = value / 100;
                    }
                });
            }
            
            // PNGダウンロードボタン
            const captureBtn = document.getElementById('capture-btn');
            if (captureBtn) {
                captureBtn.addEventListener('click', function() {
                    try {
                        this.disabled = true;
                        this.textContent = '🔄 生成中...';
                        
                        // ページ全体をCanvasでキャプチャ
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        if (!ctx) {
                            throw new Error('Canvasコンテキストが取得できません');
                        }
                        
                        // ページのサイズを取得
                        const body = document.body;
                        const html = document.documentElement;
                        const width = Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth);
                        const height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
                        
                        canvas.width = Math.min(width, 2000); // 最大幅を制限
                        canvas.height = Math.min(height, 3000); // 最大高さを制限
                        
                        // 背景色を白に設定
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        
                        // Before/After/Diff画像を収集
                        const beforeImg = document.querySelector('#side-by-side-view .image-section:first-child img');
                        const afterImg = document.querySelector('#side-by-side-view .image-section:nth-child(2) img');
                        const diffImg = document.querySelector('#side-by-side-view .image-section:nth-child(3) img');
                        
                        // URL情報を取得
                        const beforeUrlElement = document.querySelector('#side-by-side-view .image-section:first-child .url-info');
                        const afterUrlElement = document.querySelector('#side-by-side-view .image-section:nth-child(2) .url-info');
                        
                        const beforeUrl = beforeUrlElement ? beforeUrlElement.textContent : 'Before URL';
                        const afterUrl = afterUrlElement ? afterUrlElement.textContent : 'After URL';
                        
                        // Canvasサイズを調整（3枚横並びレイアウト）
                        const maxImageWidth = 400; // 3枚並べるため幅を縮小
                        const imageSpacing = 30;
                        const headerHeight = 80;
                        
                        canvas.width = maxImageWidth * 3 + imageSpacing * 4; // 3枚 + 4つのスペーシング
                        canvas.height = headerHeight + maxImageWidth * 0.8 + 100; // ヘッダー + 画像 + マージン
                        
                        // 背景色を白に設定
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        
                        let imagesLoaded = 0;
                        const totalImagesToLoad = 3; // Before, After, Diff
                        
                        function checkAllImagesLoaded() {
                            imagesLoaded++;
                            if (imagesLoaded === totalImagesToLoad) {
                                // すべての画像が読み込まれたらPNGダウンロード
                                canvas.toBlob(function(blob) {
                                    if (blob) {
                                        const url = URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.download = 'vrt-comparison-' + new Date().toISOString().slice(0,19).replace(/:/g, '-') + '.png';
                                        link.href = url;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        URL.revokeObjectURL(url);
                                        
                                        captureBtn.textContent = '✅ ダウンロード完了';
                                        captureBtn.style.background = '#27ae60';
                                        
                                        setTimeout(() => {
                                            captureBtn.textContent = '📸 レポートをPNG保存';
                                            captureBtn.style.background = '#3498db';
                                            captureBtn.disabled = false;
                                        }, 2000);
                                    }
                                }, 'image/png');
                            }
                        }
                        
                        // Before画像を描画
                        if (beforeImg && beforeImg.complete) {
                            const beforeX = imageSpacing;
                            const beforeY = headerHeight;
                            
                            // Beforeラベルを描画
                            ctx.fillStyle = '#3498db';
                            ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, sans-serif';
                            ctx.textAlign = 'left';
                            ctx.fillText('🔵 Before', beforeX, beforeY - 40);
                            
                            // Before URLを描画
                            ctx.fillStyle = '#7f8c8d';
                            ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
                            const truncatedBeforeUrl = beforeUrl.length > 40 ? beforeUrl.substring(0, 37) + '...' : beforeUrl;
                            ctx.fillText(truncatedBeforeUrl, beforeX, beforeY - 15);
                            
                            // Before画像を描画
                            const beforeAspectRatio = beforeImg.naturalWidth / beforeImg.naturalHeight;
                            const beforeHeight = maxImageWidth / beforeAspectRatio;
                            ctx.drawImage(beforeImg, beforeX, beforeY, maxImageWidth, beforeHeight);
                            
                            checkAllImagesLoaded();
                        } else {
                            checkAllImagesLoaded();
                        }
                        
                        // After画像を描画
                        if (afterImg && afterImg.complete) {
                            const afterX = maxImageWidth + imageSpacing * 2;
                            const afterY = headerHeight;
                            
                            // Afterラベルを描画
                            ctx.fillStyle = '#e67e22';
                            ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, sans-serif';
                            ctx.textAlign = 'left';
                            ctx.fillText('🟠 After', afterX, afterY - 40);
                            
                            // After URLを描画
                            ctx.fillStyle = '#7f8c8d';
                            ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
                            const truncatedAfterUrl = afterUrl.length > 40 ? afterUrl.substring(0, 37) + '...' : afterUrl;
                            ctx.fillText(truncatedAfterUrl, afterX, afterY - 15);
                            
                            // After画像を描画
                            const afterAspectRatio = afterImg.naturalWidth / afterImg.naturalHeight;
                            const afterHeight = maxImageWidth / afterAspectRatio;
                            ctx.drawImage(afterImg, afterX, afterY, maxImageWidth, afterHeight);
                            
                            checkAllImagesLoaded();
                        } else {
                            checkAllImagesLoaded();
                        }
                        
                        // Diff画像を描画
                        if (diffImg && diffImg.complete) {
                            const diffX = maxImageWidth * 2 + imageSpacing * 3;
                            const diffY = headerHeight;
                            
                            // Diffラベルを描画
                            ctx.fillStyle = '#e74c3c';
                            ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, sans-serif';
                            ctx.textAlign = 'left';
                            ctx.fillText('🔴 Diff', diffX, diffY - 40);
                            
                            // Diff説明を描画
                            ctx.fillStyle = '#7f8c8d';
                            ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
                            ctx.fillText('変更箇所をハイライト表示', diffX, diffY - 15);
                            
                            // Diff画像を描画
                            const diffAspectRatio = diffImg.naturalWidth / diffImg.naturalHeight;
                            const diffHeight = maxImageWidth / diffAspectRatio;
                            ctx.drawImage(diffImg, diffX, diffY, maxImageWidth, diffHeight);
                            
                            checkAllImagesLoaded();
                        } else {
                            checkAllImagesLoaded();
                        }
                        
                    } catch (error) {
                        console.error('PNG生成エラー:', error);
                        alert('PNGの生成に失敗しました: ' + error.message);
                        this.textContent = '📸 レポートをPNG保存';
                        this.disabled = false;
                    }
                });
            }
            
            // HTMLダウンロードボタン
            const downloadBtn = document.getElementById('download-btn');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', function() {
                    try {
                        const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.download = 'vrt-report-' + new Date().toISOString().slice(0,19).replace(/:/g, '-') + '.html';
                        link.href = url;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    } catch (error) {
                        console.error('HTMLダウンロードエラー:', error);
                        alert('HTMLダウンロードに失敗しました: ' + error.message);
                    }
                });
            }
        });
    </script>
</body>
</html>`;
  }

  // PNGレポートの生成
  static async generateReportPng(
    result: ComparisonResult,
    beforeImage: CaptureResult,
    afterImage: CaptureResult,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        // キャンバスサイズを設定（横並び用）
        const maxWidth = Math.max(
          beforeImage.dimensions?.width || 1200,
          afterImage.dimensions?.width || 1200,
        );
        const maxHeight = Math.max(
          beforeImage.dimensions?.height || 800,
          afterImage.dimensions?.height || 800,
        );

        canvas.width = maxWidth * 3 + 60; // 3枚並べる + マージン
        canvas.height = maxHeight + 200; // 画像 + ヘッダー領域

        // 背景を白で塗りつぶし
        ctx.fillStyle = "#f5f7fa";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // ヘッダー描画
        ctx.fillStyle = "#2c3e50";
        ctx.font = "bold 24px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("📸 Visual Regression Test Report", canvas.width / 2, 40);

        ctx.font = "16px Arial, sans-serif";
        ctx.fillText(
          new Date(result.timestamp).toLocaleString(),
          canvas.width / 2,
          70,
        );

        // 統計情報描画
        ctx.font = "bold 18px Arial, sans-serif";
        ctx.fillStyle = parseFloat(result.diffPercentage) > 5
          ? "#e74c3c"
          : "#27ae60";
        ctx.fillText(
          `差分率: ${result.diffPercentage}%`,
          canvas.width / 2,
          100,
        );

        ctx.fillStyle = "#2c3e50";
        ctx.font = "14px Arial, sans-serif";
        ctx.fillText(
          `変更ピクセル数: ${result.diffPixels.toLocaleString()}`,
          canvas.width / 2,
          125,
        );

        let loadedImages = 0;
        const totalImages = 3;

        const onImageLoad = () => {
          loadedImages++;
          if (loadedImages === totalImages) {
            resolve(canvas.toDataURL("image/png"));
          }
        };

        // Before画像
        const beforeImg = new Image();
        beforeImg.onload = () => {
          const x = 10;
          const y = 150;

          // タイトル
          ctx.fillStyle = "#2c3e50";
          ctx.font = "bold 16px Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("🔵 Before", x + maxWidth / 2, y - 10);

          // 画像描画（アスペクト比維持）
          const scale = Math.min(
            maxWidth / beforeImg.width,
            (maxHeight - 30) / beforeImg.height,
          );
          const scaledWidth = beforeImg.width * scale;
          const scaledHeight = beforeImg.height * scale;
          const centerX = x + (maxWidth - scaledWidth) / 2;
          const centerY = y + (maxHeight - scaledHeight) / 2;

          ctx.drawImage(beforeImg, centerX, centerY, scaledWidth, scaledHeight);
          onImageLoad();
        };
        beforeImg.onerror = () => onImageLoad();
        beforeImg.src = beforeImage.dataUrl;

        // After画像
        const afterImg = new Image();
        afterImg.onload = () => {
          const x = maxWidth + 20;
          const y = 150;

          // タイトル
          ctx.fillStyle = "#2c3e50";
          ctx.font = "bold 16px Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("🟠 After", x + maxWidth / 2, y - 10);

          // 画像描画（アスペクト比維持）
          const scale = Math.min(
            maxWidth / afterImg.width,
            (maxHeight - 30) / afterImg.height,
          );
          const scaledWidth = afterImg.width * scale;
          const scaledHeight = afterImg.height * scale;
          const centerX = x + (maxWidth - scaledWidth) / 2;
          const centerY = y + (maxHeight - scaledHeight) / 2;

          ctx.drawImage(afterImg, centerX, centerY, scaledWidth, scaledHeight);
          onImageLoad();
        };
        afterImg.onerror = () => onImageLoad();
        afterImg.src = afterImage.dataUrl;

        // Diff画像
        const diffImg = new Image();
        diffImg.onload = () => {
          const x = maxWidth * 2 + 30;
          const y = 150;

          // タイトル
          ctx.fillStyle = "#2c3e50";
          ctx.font = "bold 16px Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("🔴 Diff", x + maxWidth / 2, y - 10);

          // 画像描画（アスペクト比維持）
          const scale = Math.min(
            maxWidth / diffImg.width,
            (maxHeight - 30) / diffImg.height,
          );
          const scaledWidth = diffImg.width * scale;
          const scaledHeight = diffImg.height * scale;
          const centerX = x + (maxWidth - scaledWidth) / 2;
          const centerY = y + (maxHeight - scaledHeight) / 2;

          ctx.drawImage(diffImg, centerX, centerY, scaledWidth, scaledHeight);
          onImageLoad();
        };
        diffImg.onerror = () => onImageLoad();
        diffImg.src = result.diffImageUrl;
      } catch (error) {
        reject(error);
      }
    });
  }
}


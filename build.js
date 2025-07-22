#!/usr/bin/env bun
// カスタムビルドスクリプト

import { $ } from "bun";
import fs from "fs/promises";

async function build() {
  console.log("🚀 Building Quick VRT Extension...");
  
  // distディレクトリをクリーン
  await $`rm -rf dist`;
  await $`mkdir -p dist`;
  
  // 各ファイルを個別にビルド
  console.log("📦 Building popup...");
  await Bun.build({
    entrypoints: ['src/popup/index.tsx'],
    outdir: 'dist',
    target: 'browser',
    minify: true,
    sourcemap: 'external',
    naming: 'popup.js'
  });
  
  console.log("📦 Building background...");
  await Bun.build({
    entrypoints: ['src/background/index.ts'],
    outdir: 'dist',
    target: 'browser',
    minify: true,
    sourcemap: 'external',
    naming: 'background.js'
  });
  
  console.log("📦 Building content...");
  await Bun.build({
    entrypoints: ['src/content/index.ts'],
    outdir: 'dist',
    target: 'browser',
    minify: true,
    sourcemap: 'external',
    naming: 'content.js'
  });
  
  // 静的ファイルをコピー
  console.log("📁 Copying static files...");
  await $`cp manifest.json dist/`;
  await $`cp -r icons dist/`;
  await $`cp src/popup/popup.html dist/`;
  await $`cp src/popup/styles.css dist/`;
  
  console.log("✅ Build completed!");
}

build().catch(console.error);
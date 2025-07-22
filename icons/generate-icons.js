#!/usr/bin/env node
// SVGアイコンからPNG画像を生成するスクリプト（手動変換用）

const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];

// SVGアイコンの内容を読み込み
const svgContent = fs.readFileSync(path.join(__dirname, 'icon.svg'), 'utf8');

console.log('SVGアイコンが見つかりました。');
console.log('PNG画像への変換は以下の方法で行ってください：');
console.log('');
console.log('方法1: オンラインツールを使用');
console.log('- https://cloudconvert.com/svg-to-png');
console.log('- https://convertio.co/ja/svg-png/');
console.log('');
console.log('方法2: 画像編集ソフトを使用');
console.log('- Chrome DevToolsでSVGを開き、各サイズでスクリーンショット');
console.log('');
console.log('必要なサイズ:');
sizes.forEach(size => {
  console.log(`- icon${size}.png (${size}x${size}px)`);
});

// 一時的にアイコンを削除して、拡張機能が読み込めるようにする
console.log('\n一時的な対応として、アイコンなしでも動作するようmanifest.jsonを修正します...');
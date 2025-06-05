/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // 開発環境では画像の最適化を無効化
  },
};

module.exports = nextConfig; 
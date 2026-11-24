import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/theme.css';

const el = document.getElementById('root');
if (!el) throw new Error('未找到 #root 挂载点');

createRoot(el).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// PWA：注册 Service Worker（仅生产环境，离线可玩）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // scope 显式指向 base 路径：部署在 GitHub Pages 子目录时 SW 只接管游戏目录
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    }).catch(() => {
      // 注册失败不影响在线游玩
    });
  });
}

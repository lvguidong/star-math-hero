export function Starfield() {
  // 用 CSS 动画绘制两层静态星空，纯装饰、不占据交互
  return (
    <div className="starfield" aria-hidden="true">
      <div className="stars-layer stars-1" />
      <div className="stars-layer stars-2" />
      <div className="nebulous nebulous-1" />
      <div className="nebulous nebulous-2" />
    </div>
  );
}

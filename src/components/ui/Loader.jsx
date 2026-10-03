// Loader: the voice bars from the logo, breathing (animation in globals.css
// under `.landing-bar`). Pass `className` to resize or recolor the box.

const HEIGHTS = ["40%", "75%", "100%", "70%", "40%"];

export function Loader({ className = "", label = "Loading" }) {
  return (
    <div role="status" aria-label={label} className={`flex h-8 items-center gap-1.5 ${className}`}>
      {HEIGHTS.map((h, i) => (
        <span
          key={i}
          className="landing-bar w-1.5 rounded-full bg-primary-400"
          style={{ height: h, animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

// Centered, full-viewport loader for page-level loading states.
export function FullPageLoader({ label = "Loading", className = "" }) {
  return (
    <div className={`flex min-h-screen w-full items-center justify-center bg-background ${className}`}>
      <Loader label={label} />
    </div>
  );
}

export default Loader;

// Reusable "Genome" (DNA) loader. CSS-only animation lives in globals.css under
// `.ld-dna`; it paints with the `--ink` token, defaulting to currentColor — so
// the colour is controlled by this element's text colour (brand orange by
// default). Pass `className` to recolour (e.g. "text-foreground") or resize.

export function Loader({ className = "", label = "Loading" }) {
  return (
    <div
      className={`ld-dna text-primary-500 ${className}`}
      role="status"
      aria-label={label}
    >
      <i />
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}

// Centered, full-viewport loader for page-level loading states.
export function FullPageLoader({ label = "Loading", className = "" }) {
  return (
    <div
      className={`flex min-h-screen w-full items-center justify-center bg-background ${className}`}
    >
      <Loader label={label} />
    </div>
  );
}

export default Loader;

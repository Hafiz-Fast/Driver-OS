/**
 * Driver-OS brand logo — a stylised steering wheel.
 *
 * Pure SVG so it scales crisply at any size and inherits its colour from
 * the surrounding container. Used in the sidebar, auth pages, and favicon.
 */
function Logo({ size = 28, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer rim */}
      <circle cx="16" cy="16" r="13.5" stroke="currentColor" strokeWidth="2.6" />
      {/* Inner hub */}
      <circle cx="16" cy="16" r="3.1" fill="currentColor" />
      {/* Three spokes (top, lower-left, lower-right) */}
      <path
        d="M16 12.9V3.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M18.68 17.55L26.4 22"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M13.32 17.55L5.6 22"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default Logo;

export default function VelsyLogo({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 66"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left arm of V */}
      <path d="M2,2 L18,2 L34,63 L30,63 Z" fill="#111111" />
      {/* Right arm of V */}
      <path d="M62,2 L46,2 L30,63 L34,63 Z" fill="#111111" />
      {/* Left serif */}
      <rect x="0" y="0" width="20" height="6" fill="#111111" />
      {/* Right serif */}
      <rect x="44" y="0" width="20" height="6" fill="#111111" />
      {/* Gold head (circle) */}
      <circle cx="44" cy="13" r="5" fill="#c9a227" />
      {/* Gold body swoosh */}
      <path
        d="M20,28 C22,42 29,56 32,62 C33,56 38,44 44,21"
        stroke="#c9a227"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

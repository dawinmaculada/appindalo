import { useId } from 'react';

export default function MirviaLogo({ size = 36, className = '' }) {
  const uid = useId().replace(/:/g, '');
  const gid = `mg${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="60" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7C3AED" />
          <stop offset="35%"  stopColor="#A855F7" />
          <stop offset="65%"  stopColor="#EC4899" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <path
        d="M6,44 C6,16 11,8 20,8 C25,8 28,24 30,28 C32,32 35,8 40,8 C49,8 54,28 54,44"
        stroke={`url(#${gid})`}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M41,0 L42.3,3.5 L45.8,4.5 L42.3,5.5 L41,9 L39.7,5.5 L36.2,4.5 L39.7,3.5 Z"
        fill="#7C3AED"
      />
    </svg>
  );
}

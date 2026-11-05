//carvault mark, a vault door whose dial is a speedometer with an orange needle
//redrawn as svg from the figma concept so it stays sharp at favicon size
function Logo({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      {/*vault door and its two hinges*/}
      <rect x="5" y="4" width="23" height="24" fill="#fff" stroke="#111110" strokeWidth="2.6" />
      <rect x="1.5" y="9" width="3" height="4.5" fill="#111110" />
      <rect x="1.5" y="18.5" width="3" height="4.5" fill="#111110" />
      {/*dial with tick marks along the top*/}
      <circle cx="16.5" cy="16" r="7.4" fill="none" stroke="#111110" strokeWidth="2.2" />
      <path
        d="M 11.5 18.3 L 12.7 17.8 M 11.4 13.4 L 12.6 14 M 14.4 10.4 L 14.9 11.6 M 18.6 10.4 L 18.1 11.6 M 21.6 13.4 L 20.4 14"
        stroke="#111110"
        strokeWidth="1.3"
      />
      {/*needle pointing up and right*/}
      <path d="M 16.5 16 L 20.6 12.4" stroke="#f26522" strokeWidth="2.2" />
      <circle cx="16.5" cy="16" r="1.7" fill="#111110" />
    </svg>
  )
}

export default Logo

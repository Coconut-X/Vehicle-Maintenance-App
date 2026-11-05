//side view of a small sedan drawn with plain svg shapes, facing right
//it is drawn in a 480 wide box, the wheels touch the ground at y 180
//wheels are outside the body group so the body can bounce on its springs while the tyres stay on the road

//the body outline, the two arcs cut the wheel arches out of it
const BODY =
  'M 56 160 L 95.4 160 A 36 36 0 1 1 164.6 160 L 315.4 160 A 36 36 0 1 1 384.6 160 L 432 160 ' +
  'Q 446 160 446 148 L 446 130 Q 446 118 434 114 L 364 98 L 316 62 Q 306 52 290 52 L 204 52 ' +
  'Q 186 52 176 61 L 126 96 L 66 104 Q 50 108 48 122 L 47 148 Q 47 160 56 160 Z'

const BODY_COLOR = '#1b1b19'

function Wheel({ cx, spin }) {
  //five spokes from the hub out to the rim
  const spokes = [0, 72, 144, 216, 288].map((deg) => {
    const rad = (deg * Math.PI) / 180
    return {
      x1: cx + Math.cos(rad) * 6,
      y1: 150 + Math.sin(rad) * 6,
      x2: cx + Math.cos(rad) * 17,
      y2: 150 + Math.sin(rad) * 17,
    }
  })

  return (
    <g>
      {/*tyre*/}
      <circle cx={cx} cy="150" r="30" fill="#0c0c0b" />
      <circle cx={cx} cy="150" r="25.5" fill="none" stroke="#2e2e2b" strokeWidth="1.5" />
      {/*rim, only this part turns*/}
      <g className={spin ? 'wheel-spin' : ''}>
        <circle cx={cx} cy="150" r="19" fill="#d4d4cd" />
        <circle cx={cx} cy="150" r="16" fill="#77776f" />
        {spokes.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#d4d4cd" strokeWidth="4.5" />
        ))}
        <circle cx={cx} cy="150" r="6" fill="#d4d4cd" />
        <circle cx={cx} cy="150" r="2.5" className="fill-accent" />
      </g>
    </g>
  )
}

function CarSide({ powertrain = 'petrol', spin = false, bounce = false }) {
  const hasEngine = powertrain !== 'electric'
  const hasPlug = powertrain === 'phev' || powertrain === 'electric'

  return (
    <g>
      <g className={bounce ? 'car-bob' : ''}>
        <path d={BODY} fill={BODY_COLOR} />
        {/*dark wheel wells inside the arches, cut flat at the bottom of the body*/}
        <path d="M 94.9 160 A 36.5 36.5 0 1 1 165.1 160 Z" fill="#0a0a09" />
        <path d="M 314.9 160 A 36.5 36.5 0 1 1 385.1 160 Z" fill="#0a0a09" />

        {/*glass, the gap between the two windows is the b pillar*/}
        <path d="M 248 59 L 290 59 Q 300 59 307 66 L 341 95 L 248 95 Z" className="fill-line" />
        <path d="M 236 59 L 204 59 Q 192 59 184 66 L 142 95 L 236 95 Z" className="fill-line" />
        {/*light reflection on the glass*/}
        <path d="M 262 59 L 276 59 L 262 95 L 248 95 Z" className="fill-paper" opacity="0.55" />
        <path d="M 214 59 L 224 59 L 206 95 L 196 95 Z" className="fill-paper" opacity="0.45" />

        {/*shoulder line and door seams*/}
        <path d="M 58 120 L 436 124" className="stroke-paper" strokeWidth="1.2" opacity="0.14" fill="none" />
        <path d="M 242 96 L 242 156 M 336 100 L 322 152 M 154 98 L 168 150" className="stroke-paper" strokeWidth="1.5" opacity="0.18" fill="none" />
        <rect x="256" y="109" width="16" height="3" className="fill-paper" opacity="0.4" />
        <rect x="174" y="109" width="16" height="3" className="fill-paper" opacity="0.4" />

        {/*side mirror*/}
        <path d="M 330 93 L 343 91 Q 348 91 348 95 L 348 101 L 333 101 Z" fill="#2a2a27" />

        {/*lights*/}
        <path d="M 432 116 L 445 122 L 445 129 L 428 126 Z" className="fill-paper" />
        <rect x="419" y="125" width="9" height="3" className="fill-accent" />
        <path d="M 48 114 L 63 110 L 63 120 L 48 124 Z" className="fill-bad" />

        {/*engine cars get a grille slot, an ev has a closed nose*/}
        {hasEngine && <path d="M 437 136 L 446 136 M 437 141 L 446 141 M 437 146 L 446 146" stroke="#3a3a36" strokeWidth="2" />}

        {/*charge port flap on the front wing*/}
        {hasPlug && <rect x="394" y="104" width="12" height="9" fill="none" className="stroke-accent" strokeWidth="2" />}
      </g>

      {/*exhaust pipe, not on an ev*/}
      {hasEngine && <rect x="58" y="158" width="15" height="5" fill="#3a3a36" />}

      <Wheel cx={130} spin={spin} />
      <Wheel cx={350} spin={spin} />
    </g>
  )
}

export default CarSide

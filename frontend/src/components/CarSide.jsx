//side view of a car drawn with svg, facing right, in a 480 wide box with the ground at y 180
//each powertrain gets the body style that is typical for it in real life
//petrol is a sedan, hybrid a low liftback like the new prius, plug in hybrid a crossover suv, electric a teardrop fastback
//wheels are outside the body group so the body can bounce on its springs while the tyres stay on the road

const GROUND = 180

//makes a colour lighter (amount above 0) or darker (below 0), used for the paint shading
const shade = (hex, amount) => {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c) => Math.round(amount > 0 ? c + (255 - c) * amount : c * (1 + amount))
  const r = mix((n >> 16) & 255)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

//the bottom of the body with the two wheel arches cut out of it
//it starts at the back bumper and runs forward, each arch goes up and over its wheel
const archCut = (wheels, radius, bottom) => {
  return wheels
    .map(([cx, cy]) => {
      const dx = Math.sqrt(radius * radius - (bottom - cy) * (bottom - cy))
      return 'L ' + (cx - dx).toFixed(2) + ' ' + bottom + ' A ' + radius + ' ' + radius + ' 0 1 1 ' + (cx + dx).toFixed(2) + ' ' + bottom
    })
    .join(' ')
}

const models = {
  //petrol, a mid size sedan with a short boot, like a corolla or camry
  petrol: {
    paint: '#2e3136',
    tyre: 30,
    wheels: [[118, 150], [338, 150]],
    arch: 35,
    bottom: 156,
    top:
      'M 432 156 C 440 155 443 148 443 140 L 443 130 C 443 121 439 116 430 114 C 408 110 380 105 356 101 ' +
      'C 338 92 318 75 300 67 C 282 59 238 57 212 61 C 188 65 166 80 152 92 C 138 97 100 99 72 100 ' +
      'C 54 101 46 106 44 114 L 43 138 C 43 150 47 156 58 156',
    dlo: 'M 350 103 C 334 93 316 78 300 71 C 284 63 240 61 214 65 C 194 69 174 82 160 95 L 160 97 Z',
    glass: [
      'M 258 101 L 258 69 C 276 67 292 69 299 73 C 314 81 330 91 343 101 Z',
      'M 250 100 L 250 68 C 236 66.5 222 67 214 69 C 198 73 182 84 170 96 L 170 98 Z',
    ],
    shine: ['M 272 69 L 282 69.5 L 270 101 L 262 101 Z', 'M 226 67 L 234 67.5 L 220 99.5 L 212 99.5 Z'],
    shoulder: 'M 60 112 C 150 106 300 104 428 116 L 428 119 C 300 108 150 110 60 116 Z',
    cuts: 'M 352 104 C 354 120 352 138 346 152 M 254 101 L 254 154 M 162 98 C 166 112 168 128 165 150',
    handles: [[298, 110, 16, 3.5], [204, 109, 16, 3.5]],
    mirror: 'M 346 101 C 349 94 356 91 363 92 L 364 100 C 357 102 351 102 346 101 Z',
    head: 'M 442 118 C 432 116 418 117 404 121 C 416 123 430 124 443 124 Z',
    tail: 'M 44 110 C 54 107 66 106 78 106 C 68 110 56 113 44 115 Z',
    indicator: [411, 125],
    lower: [
      'M 420 147 L 443 145 C 443 151 439 156 432 156 L 420 156 Z',
      'M 44 147 L 76 150 L 76 156 L 58 156 C 50 156 45 152 44 147 Z',
    ],
    exhaust: [64, 154],
  },

  //hybrid, a low liftback with one long roof arc and a full width light bar, like the 2023 prius
  hybrid: {
    paint: '#e9e7e2',
    tyre: 30,
    wheels: [[120, 150], [342, 150]],
    arch: 35,
    bottom: 156,
    outline: true,
    top:
      'M 434 156 C 441 155 444 149 444 142 L 444 133 C 444 126 440 122 432 120 C 410 116 384 111 362 105 ' +
      'C 338 93 312 73 290 64 C 266 56 224 56 198 62 C 168 69 124 86 88 96 C 66 101 52 103 46 106 ' +
      'L 44 112 C 43 124 43 138 44 146 C 45 152 50 156 58 156',
    dlo: 'M 356 106 C 336 94 312 76 292 69 C 270 61 226 60 200 66 C 176 72 140 85 112 97 L 112 99 Z',
    glass: [
      'M 264 105 L 264 64 C 278 63 286 65 292 68 C 310 77 330 91 346 104 Z',
      'M 256 104 L 256 62 C 236 60 214 62 202 66 C 180 72 150 84 124 97 L 124 99.5 Z',
    ],
    shine: ['M 276 63.5 L 286 65 L 274 104.5 L 266 104.5 Z', 'M 230 61 L 238 61 L 224 102 L 216 102 Z'],
    shoulder: 'M 60 112 C 150 107 300 107 430 122 L 430 125 C 300 111 150 111 60 116 Z',
    cuts: 'M 354 108 C 356 122 354 140 348 152 M 260 105 L 260 154 M 140 99 C 150 112 158 128 157 150',
    handles: [[300, 113, 16, 3.5], [206, 111, 16, 3.5]],
    mirror: 'M 352 105 C 355 98 362 95 369 96 L 370 104 C 363 106 357 106 352 105 Z',
    //thin day running light at the front and a light bar across the back
    bars: [
      { d: 'M 444 127 C 432 125 418 123 405 123', colour: 'light', width: 2.5 },
      { d: 'M 44 111 C 58 109 74 106 88 101', colour: 'red', width: 3 },
    ],
    indicator: [412, 127],
    //black plastic along the bottom
    cladding: ['M 154.5 156 L 307.5 156 L 307.5 147 C 260 149 200 149 154.5 147 Z'],
    lower: [
      'M 420 149 L 444 147 C 443 152 440 156 434 156 L 420 156 Z',
      'M 44 146 L 74 149 L 74 156 L 58 156 C 50 156 45 152 44 146 Z',
    ],
  },

  //plug in hybrid, a crossover suv like a rav4 prime or outlander, most plug ins are sold as suvs
  //it sits higher than the others so more tyre shows under the body
  phev: {
    paint: '#5d6b64',
    tyre: 33,
    wheels: [[114, 147], [344, 147]],
    arch: 40,
    bottom: 150,
    top:
      'M 436 150 C 443 149 446 143 446 135 L 446 112 C 446 104 442 99 434 98 C 414 95 392 92 374 90 ' +
      'C 360 79 342 60 330 50 C 322 45 306 43 290 43 L 140 44 C 124 44 112 48 104 54 C 92 66 78 84 66 96 ' +
      'C 56 102 50 108 49 116 L 48 138 C 48 146 51 150 58 150',
    dlo: 'M 364 91 C 352 79 338 62 328 54 C 320 48 304 47 290 47 L 140 48 C 128 48 120 52 114 58 L 110 92 Z',
    //three side windows with black pillars between them, a thick body coloured pillar at the back
    glass: [
      'M 266 92 L 266 51 L 292 51 C 304 51 316 53 322 57 C 332 65 346 79 356 91 Z',
      'M 258 92 L 258 51 L 166 52 L 166 92 Z',
      'M 156 92 L 156 52 L 140 52 C 130 52 124 55 120 60 L 117 92 Z',
    ],
    shine: ['M 282 51 L 292 51 L 278 92 L 270 92 Z', 'M 216 52 L 224 52 L 210 92 L 202 92 Z', 'M 142 52 L 148 52 L 138 92 L 132 92 Z'],
    shoulder: 'M 58 102 C 150 98 300 97 438 101 L 438 104 C 300 100 150 101 58 105 Z',
    cuts: 'M 366 94 C 368 110 367 126 362 138 M 262 94 L 262 140 M 162 94 C 164 108 164 122 160 136',
    handles: [[298, 103, 16, 3.5], [200, 103, 16, 3.5]],
    mirror: 'M 360 91 C 363 84 370 81 378 82 L 379 91 C 372 93 365 93 360 91 Z',
    head: 'M 446 103 C 436 102 422 101 408 102 C 420 106 434 108 446 108 Z',
    tail: 'M 64 98 C 58 101 53 106 51 110 L 51 114 C 58 113 64 112 70 111 L 70 98 Z',
    indicator: [414, 109],
    rails: true,
    spoiler: 'M 114 46 L 96 52 L 102 56 L 116 51 Z',
    //black wheel arch flares and lower body, typical for an suv
    cladding: [
      'M 70.1 150 A 44 44 0 1 1 157.9 150 L 153.89 150 A 40 40 0 1 0 74.11 150 Z',
      'M 300.1 150 A 44 44 0 1 1 387.9 150 L 383.89 150 A 40 40 0 1 0 304.11 150 Z',
      'M 157.9 150 L 300.1 150 L 300.1 140 C 250 142 200 142 157.9 140 Z',
      'M 387.9 150 L 436 150 C 442 149 445 145 446 140 L 388 140 Z',
      'M 48 140 C 49 146 52 150 58 150 L 70.1 150 L 70 140 Z',
    ],
    exhaust: [62, 148],
    //the charge flap sits on the rear wing, the fuel cap is on the other side
    port: [82, 100],
  },

  //electric, a low teardrop fastback like an ioniq 6 or model 3, no grille and no exhaust
  electric: {
    paint: '#8e9aa6',
    tyre: 31,
    wheels: [[114, 149], [350, 149]],
    arch: 36,
    bottom: 155,
    aero: true,
    top:
      'M 434 155 C 441 154 444 148 444 141 L 444 135 C 444 128 440 124 432 122 C 408 118 380 112 360 106 ' +
      'C 340 94 316 76 298 68 C 276 60 236 59 210 63 C 180 69 136 86 102 97 C 84 102 66 104 54 104 ' +
      'C 48 104 45 107 44 112 L 43 141 C 43 150 47 155 56 155',
    dlo: 'M 352 107 C 336 95 316 79 300 72 C 280 64 238 63 212 67 C 186 72 152 85 124 97 L 124 99 Z',
    glass: [
      'M 266 106 L 266 67 C 282 65 292 67 300 71 C 316 80 332 92 344 103 L 344 106 Z',
      'M 258 106 L 258 66 C 238 65 220 66 212 68 C 190 72 160 84 134 97 L 134 100 Z',
    ],
    shine: ['M 278 66 L 288 67 L 276 106 L 268 106 Z', 'M 232 66 L 240 66 L 226 103 L 218 103 Z'],
    shoulder: 'M 58 112 C 150 108 300 108 430 124 L 430 127 C 300 112 150 112 58 116 Z',
    cuts: 'M 352 108 C 354 124 352 140 346 152 M 262 107 L 262 154 M 138 99 C 148 112 156 128 154 150',
    //flush handles sit level with the door
    handles: [[300, 115, 18, 2.5], [206, 114, 18, 2.5]],
    mirror: 'M 350 105 C 353 99 359 97 365 98 L 366 105 C 360 107 354 107 350 105 Z',
    //pixel light bars at both ends instead of lamp units
    bars: [
      { d: 'M 444 129 C 430 127 414 125 398 124', colour: 'light', width: 2.5 },
      { d: 'M 44 109 C 62 108 80 105 98 99', colour: 'red', width: 2.5 },
    ],
    lower: [
      'M 418 150 L 443 147 C 442 152 438 155 432 155 L 418 155 Z',
      'M 44 146 L 70 148 L 70 155 L 56 155 C 49 155 45 151 44 146 Z',
    ],
    //charge port on the rear quarter like most electric saloons
    port: [80, 110],
  },
}

//point on a circle, angle in degrees with 0 pointing right
const polar = (cx, cy, r, deg) => {
  const rad = (deg * Math.PI) / 180
  return [cx + Math.cos(rad) * r, cy + Math.sin(rad) * r]
}

function Wheel({ cx, cy, r, spin, aero }) {
  const rim = r * 0.68

  //five pairs of thin spokes, each spoke gets narrower towards the rim
  const spokes = []
  if (!aero) {
    for (let i = 0; i < 5; i++) {
      for (const offset of [-7, 7]) {
        const a = i * 72 + offset
        const p1 = polar(cx, cy, rim * 0.3, a - 5)
        const p2 = polar(cx, cy, rim * 0.95, a - 2)
        const p3 = polar(cx, cy, rim * 0.95, a + 2)
        const p4 = polar(cx, cy, rim * 0.3, a + 5)
        spokes.push('M ' + p1.join(' ') + ' L ' + p2.join(' ') + ' L ' + p3.join(' ') + ' L ' + p4.join(' ') + ' Z')
      }
    }
  }

  //brake caliper sits at the top rear of the disc and does not turn with the wheel
  const c1 = polar(cx, cy, rim * 0.92, 200)
  const c2 = polar(cx, cy, rim * 0.92, 245)
  const c3 = polar(cx, cy, rim * 0.62, 245)
  const c4 = polar(cx, cy, rim * 0.62, 200)
  const caliper =
    'M ' + c1.join(' ') + ' A ' + rim * 0.92 + ' ' + rim * 0.92 + ' 0 0 1 ' + c2.join(' ') +
    ' L ' + c3.join(' ') + ' A ' + rim * 0.62 + ' ' + rim * 0.62 + ' 0 0 0 ' + c4.join(' ') + ' Z'

  return (
    <g>
      {/*tyre and sidewall*/}
      <circle cx={cx} cy={cy} r={r} fill="#141516" />
      <circle cx={cx} cy={cy} r={r * 0.86} fill="none" stroke="#26282a" strokeWidth={r * 0.06} />
      {/*brake disc behind the spokes*/}
      <circle cx={cx} cy={cy} r={rim} fill="#2a2c2f" />
      <circle cx={cx} cy={cy} r={rim * 0.8} fill="none" stroke="#3b3e42" strokeWidth="1" />
      {!aero && <path d={caliper} className="fill-accent" />}

      {/*only this group turns*/}
      <g className={spin ? 'wheel-spin' : ''}>
        {aero ? (
          <>
            {/*flat aero cover with curved slots, common on electric cars*/}
            <circle cx={cx} cy={cy} r={rim} fill="#c3c8cd" />
            {[0, 72, 144, 216, 288].map((a) => {
              const s1 = polar(cx, cy, rim * 0.42, a)
              const s2 = polar(cx, cy, rim * 0.86, a + 28)
              return (
                <path
                  key={a}
                  d={'M ' + s1.join(' ') + ' Q ' + polar(cx, cy, rim * 0.75, a + 4).join(' ') + ' ' + s2.join(' ')}
                  stroke="#5d6369"
                  strokeWidth="1.6"
                  fill="none"
                />
              )
            })}
            <circle cx={cx} cy={cy} r={rim} fill="none" stroke="#9aa0a6" strokeWidth="1" />
          </>
        ) : (
          <>
            {spokes.map((d) => (
              <path key={d} d={d} fill="#cfd2d5" />
            ))}
            <circle cx={cx} cy={cy} r={rim} fill="none" stroke="#b5b9bd" strokeWidth={r * 0.06} />
          </>
        )}
        <circle cx={cx} cy={cy} r={rim * 0.3} fill={aero ? '#aeb4ba' : '#cfd2d5'} />
        <circle cx={cx} cy={cy} r={rim * 0.13} fill="#2a2c2f" />
      </g>
    </g>
  )
}

function CarSide({ powertrain = 'petrol', spin = false, bounce = false, night = false }) {
  const m = models[powertrain] || models.petrol
  //at night the car is pearl white so it shows up on the dark road
  const paint = night ? '#e9e7e2' : m.paint
  const lightPaint = night || m.outline
  const id = 'cv-' + powertrain + '-' + paint.slice(1)

  const body = m.top + ' ' + archCut(m.wheels, m.arch, m.bottom) + ' Z'
  const wells = m.wheels
    .map(([cx, cy]) => {
      const r = m.arch + 1
      const dx = Math.sqrt(r * r - (m.bottom - cy) * (m.bottom - cy))
      return 'M ' + (cx - dx) + ' ' + m.bottom + ' A ' + r + ' ' + r + ' 0 1 1 ' + (cx + dx) + ' ' + m.bottom + ' Z'
    })
    .join(' ')
  const barColour = { light: '#ffffff', red: '#c62f24' }

  return (
    <g>
      <defs>
        {/*paint is lighter on top and darker towards the sills, that gives the body its shape*/}
        <linearGradient id={id + '-paint'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(paint, 0.28)} />
          <stop offset="0.42" stopColor={paint} />
          <stop offset="0.78" stopColor={shade(paint, -0.18)} />
          <stop offset="1" stopColor={shade(paint, -0.4)} />
        </linearGradient>
        <linearGradient id={id + '-glass'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5f6c78" />
          <stop offset="0.55" stopColor="#2b323a" />
          <stop offset="1" stopColor="#1a1e23" />
        </linearGradient>
      </defs>

      {/*shadow on the ground, darker right under the tyres*/}
      <ellipse cx="243" cy={GROUND} rx="205" ry="5" fill="#000" opacity="0.16" />
      {m.wheels.map(([cx]) => (
        <ellipse key={cx} cx={cx} cy={GROUND} rx={m.tyre * 1.15} ry="3" fill="#000" opacity="0.35" />
      ))}

      <g className={bounce ? 'car-bob' : ''}>
        <path d={wells} fill="#0b0c0d" />
        <path d={body} fill={'url(#' + id + '-paint)'} stroke={lightPaint ? '#000' : 'none'} strokeOpacity="0.18" strokeWidth="1" />

        {/*soft highlight along the shoulder line*/}
        <path d={m.shoulder} fill="#fff" opacity={lightPaint ? 0.5 : 0.14} />

        {/*darker band along the sills*/}
        <path
          d={'M ' + (m.wheels[0][0] + 34) + ' ' + m.bottom + ' L ' + (m.wheels[1][0] - 34) + ' ' + m.bottom + ' L ' + (m.wheels[1][0] - 34) + ' ' + (m.bottom - 9) + ' C 260 ' + (m.bottom - 7) + ' 200 ' + (m.bottom - 7) + ' ' + (m.wheels[0][0] + 34) + ' ' + (m.bottom - 9) + ' Z'}
          fill="#000"
          opacity="0.18"
        />
        {(m.cladding || []).map((d) => (
          <path key={d} d={d} fill="#1f2123" />
        ))}

        {/*window surround in black, then the glass and its reflections*/}
        <path d={m.dlo} fill="#111214" />
        {m.glass.map((d) => (
          <path key={d} d={d} fill={'url(#' + id + '-glass)'} />
        ))}
        {m.shine.map((d) => (
          <path key={d} d={d} fill="#fff" opacity="0.13" />
        ))}

        {m.rails && (
          <g fill="#1f2123">
            <rect x="142" y="38.5" width="160" height="2.5" />
            <rect x="148" y="39.5" width="8" height="4" />
            <rect x="288" y="39.5" width="8" height="4" />
          </g>
        )}
        {m.spoiler && <path d={m.spoiler} fill="#1f2123" />}

        {/*door shut lines and handles*/}
        <path d={m.cuts} stroke="#000" strokeOpacity={lightPaint ? 0.22 : 0.45} strokeWidth="1" fill="none" />
        {m.handles.map(([x, y, w, h]) => (
          <rect key={x} x={x} y={y} width={w} height={h} rx={h / 2} fill={lightPaint ? '#9a9892' : shade(paint, 0.35)} />
        ))}
        <path d={m.mirror} fill={shade(paint, -0.25)} />

        {/*lights*/}
        {m.head && <path d={m.head} fill="#f4f5f2" stroke="#000" strokeOpacity="0.25" strokeWidth="0.8" />}
        {m.tail && <path d={m.tail} fill="#b3261e" />}
        {(m.bars || []).map((b) => (
          <path key={b.d} d={b.d} stroke={barColour[b.colour]} strokeWidth={b.width} strokeLinecap="round" fill="none" />
        ))}
        {m.indicator && <rect x={m.indicator[0]} y={m.indicator[1]} width="8" height="2.5" rx="1" className="fill-accent" />}

        {/*bumper intakes and diffuser*/}
        {(m.lower || []).map((d) => (
          <path key={d} d={d} fill="#1a1b1d" />
        ))}
        {m.exhaust && <ellipse cx={m.exhaust[0]} cy={m.exhaust[1]} rx="5" ry="2" fill="#6b6e72" />}
        {m.port && <rect x={m.port[0]} y={m.port[1]} width="12" height="8" rx="1" fill="none" className="stroke-accent" strokeWidth="1.5" />}
      </g>

      {m.wheels.map(([cx, cy]) => (
        <Wheel key={cx} cx={cx} cy={cy} r={m.tyre} spin={spin} aero={m.aero} />
      ))}
    </g>
  )
}

export default CarSide

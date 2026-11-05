//the night drive, an orange supercar on a city waterfront, used on the landing page and the login pages
//the scene is 480 x 200 units, the background photo is 1536 px wide so 1 px = 0.3125 units
//it is split into three strips that scroll at different speeds, far things move slower
//each strip file is the photo strip followed by its mirror image so it loops without a seam
const K = 480 / 1536
const layers = [
  { name: 'sky', top: 0, height: 488, className: 'scroll-sky' },
  { name: 'barrier', top: 488, height: 57, className: 'scroll-barrier' },
  { name: 'road', top: 545, height: 319, className: 'scroll-road' },
]
//moves the photo up so its bottom edge sits at the bottom of the scene
const BG_Y = 200 - 864 * K

//where the supercar photo goes, it is 1422 x 374 and scaled to 330 units wide
//its tyres touch the bottom of the photo, that lands on the near lane at y 161
const CAR = { scale: 330 / 1422, x: 75 }
CAR.y = 161 - 371 * CAR.scale
//wheel centres in the photo, the tyre radius there is 117 pixels
const wheels = [
  { name: 'rear', cx: 249, cy: 254 },
  { name: 'front', cx: 1088, cy: 257 },
]
//time for one turn so the tyres match the road speed of 120 units a second
const WHEEL_TURN = ((2 * Math.PI * 117 * CAR.scale) / 120).toFixed(2)

function NightDrive({ className = '' }) {
  return (
    <svg viewBox="0 0 480 200" className={'block w-full ' + className} role="img" aria-label="An orange supercar driving along a city waterfront at night">
      {layers.map((l) => (
        <g key={l.name} className={l.className}>
          {[0, 960].map((offset) => (
            <image
              key={offset}
              href={'/cars/scene-' + l.name + '.webp'}
              x={offset}
              y={BG_Y + l.top * K}
              width="960"
              height={l.height * K}
              preserveAspectRatio="none"
            />
          ))}
        </g>
      ))}

      {/*headlight beam on the road ahead*/}
      <path d="M 378 128 L 480 146 L 480 172 L 378 134 Z" fill="#fff6d8" opacity="0.10" />
      {/*shadow under the car*/}
      <ellipse cx="242" cy="161" rx="158" ry="4" fill="#000" opacity="0.75" />

      {/*the car is a photo made with figma, keyed out so it sits on the road*/}
      <g className="car-bob">
        <image href="/cars/supercar.webp" x={CAR.x} y={CAR.y} width={1422 * CAR.scale} height={374 * CAR.scale} />
      </g>
      {/*the real wheels are cut out of the photo and laid on top so they can turn*/}
      {wheels.map((wh) => (
        <image
          key={wh.name}
          href={'/cars/supercar-wheel-' + wh.name + '.webp'}
          x={CAR.x + (wh.cx - 119) * CAR.scale}
          y={CAR.y + (wh.cy - 119) * CAR.scale}
          width={238 * CAR.scale}
          height={238 * CAR.scale}
          className="wheel-spin"
          style={{ animationDuration: WHEEL_TURN + 's' }}
        />
      ))}
    </svg>
  )
}

export default NightDrive

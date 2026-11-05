import CarSide from './CarSide'

//still picture of the car, shown when a vehicle has no photo
//the tag in the corner shows the powertrain, the drawing also changes a little for it
function CarArt({ powertrain = 'petrol', className = '' }) {
  const code = { petrol: 'ICE', hybrid: 'HEV', phev: 'PHEV', electric: 'EV' }[powertrain] || 'ICE'

  return (
    <div className={'relative flex h-full w-full items-end justify-center overflow-hidden bg-paper ' + className}>
      <svg viewBox="0 30 480 170" className="w-[88%] max-w-sm" aria-hidden="true">
        <rect x="0" y="180" width="480" height="20" fill="#e9e9e3" />
        <ellipse cx="240" cy="181" rx="190" ry="3.5" fill="#000" opacity="0.18" />
        <g transform="translate(-6 0)">
          <CarSide powertrain={powertrain} />
        </g>
      </svg>
      <span className="absolute right-2 top-2 border border-ink bg-card px-1.5 py-0.5 font-mono text-[10px] tracking-wide">{code}</span>
    </div>
  )
}

export default CarArt

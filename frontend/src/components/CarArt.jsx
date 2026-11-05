//picture of the car, shown when a vehicle has no photo of its own
//one studio photo per powertrain, made with figma and saved in public/cars
//the photos have a pure white background, multiply blending makes that white take the colour of the card
const photos = {
  petrol: { src: '/cars/petrol.webp', alt: 'Petrol sedan' },
  hybrid: { src: '/cars/hybrid.webp', alt: 'Hybrid liftback' },
  phev: { src: '/cars/phev.webp', alt: 'Plug-in hybrid SUV' },
  electric: { src: '/cars/electric.webp', alt: 'Electric sedan' },
}

function CarArt({ powertrain = 'petrol', className = '' }) {
  const code = { petrol: 'ICE', hybrid: 'HEV', phev: 'PHEV', electric: 'EV' }[powertrain] || 'ICE'
  const photo = photos[powertrain] || photos.petrol

  return (
    <div className={'relative flex h-full w-full items-center justify-center overflow-hidden bg-paper ' + className}>
      <img src={photo.src} alt={photo.alt} loading="lazy" className="w-[92%] max-w-md object-contain mix-blend-multiply" />
      <span className="absolute right-2 top-2 border border-ink bg-card px-1.5 py-0.5 font-mono text-[10px] tracking-wide">{code}</span>
    </div>
  )
}

export default CarArt

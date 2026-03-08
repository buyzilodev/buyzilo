'use client'

import { useMemo, useState } from 'react'
import ProductThumb from '@/components/ProductThumb'

type ProductGalleryProps = {
  name: string
  images: string[]
}

export default function ProductGallery({ name, images }: ProductGalleryProps) {
  const [currentImage, setCurrentImage] = useState(0)
  const [zoomActive, setZoomActive] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 })
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const safeImages = useMemo(() => (images.length > 0 ? images : ['']), [images])
  const activeImage = safeImages[currentImage] ?? safeImages[0]

  function handleZoomMove(event: React.MouseEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width) * 100
    const y = ((event.clientY - bounds.top) / bounds.height) * 100
    setZoomPosition({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    })
  }

  function goToImage(index: number) {
    setCurrentImage(index)
    setZoomActive(false)
  }

  function goPrev() {
    goToImage((currentImage - 1 + safeImages.length) % safeImages.length)
  }

  function goNext() {
    goToImage((currentImage + 1) % safeImages.length)
  }

  return (
    <div>
      <div className="mb-4 space-y-3">
        <button
          type="button"
          onMouseEnter={() => setZoomActive(true)}
          onMouseLeave={() => setZoomActive(false)}
          onMouseMove={handleZoomMove}
          onClick={() => setLightboxOpen(true)}
          className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <ProductThumb
            src={activeImage}
            alt={name}
            className="h-full w-full rounded-xl object-contain transition duration-200 group-hover:scale-[1.02]"
          />
          {activeImage && zoomActive && (
            <div className="pointer-events-none absolute inset-0 hidden md:block">
              <div className="absolute inset-0 bg-white/10" />
              <div
                className="absolute right-4 top-4 h-32 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
              >
                <div
                  className="h-full w-full bg-contain bg-no-repeat"
                  style={{
                    backgroundImage: `url("${activeImage}")`,
                    backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    backgroundSize: '220%',
                  }}
                />
              </div>
            </div>
          )}
          <div className="absolute bottom-4 left-4 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white">
            Click to zoom
          </div>
        </button>

        {safeImages.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Prev
            </button>
            <div className="flex flex-1 flex-wrap gap-2">
              {safeImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => goToImage(index)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border p-1 ${
                    currentImage === index ? 'border-blue-500' : 'border-slate-200'
                  }`}
                >
                  <ProductThumb src={image} alt={`${name} ${index + 1}`} className="h-full w-full rounded object-cover" />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={goNext}
              className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 p-4">
          <div className="mx-auto flex h-full max-w-6xl flex-col">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{name}</p>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Close
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center gap-4">
              {safeImages.length > 1 && (
                <button
                  type="button"
                  onClick={goPrev}
                  className="rounded-full border border-white/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Prev
                </button>
              )}
              <div className="flex h-full flex-1 items-center justify-center rounded-2xl bg-white/5 p-4">
                <ProductThumb src={activeImage} alt={name} className="h-full max-h-[80vh] w-full object-contain" />
              </div>
              {safeImages.length > 1 && (
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded-full border border-white/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Next
                </button>
              )}
            </div>
            {safeImages.length > 1 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {safeImages.map((image, index) => (
                  <button
                    key={`lightbox-${image}-${index}`}
                    type="button"
                    onClick={() => goToImage(index)}
                    className={`h-16 w-16 overflow-hidden rounded-lg border p-1 ${
                      currentImage === index ? 'border-blue-400' : 'border-white/20'
                    }`}
                  >
                    <ProductThumb src={image} alt={`${name} zoom ${index + 1}`} className="h-full w-full rounded object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

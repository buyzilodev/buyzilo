import Image from 'next/image'

type ProductThumbProps = {
  src?: string | null
  alt?: string
  fallback?: string
  className?: string
}

function isImageLike(value: string) {
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/') ||
    value.startsWith('data:image/')
  )
}

function normalizeImageSrc(value: string) {
  const src = value.trim()
  if (!src) return src
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:image/')) return src
  if (src.startsWith('/')) return src
  if (src.startsWith('uploads/')) return `/${src}`
  const uploadsIndex = src.indexOf('/uploads/')
  if (uploadsIndex >= 0) return src.slice(uploadsIndex)
  return src
}

export default function ProductThumb({
  src,
  alt = 'Product image',
  fallback = 'PKG',
  className = '',
}: ProductThumbProps) {
  const normalized = normalizeImageSrc(src ?? '')
  if (normalized && isImageLike(normalized)) {
    return (
      <Image
        src={normalized}
        alt={alt}
        width={400}
        height={400}
        unoptimized
        className={className}
      />
    )
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <span className="text-xs font-semibold uppercase text-slate-400">{normalized || fallback}</span>
    </div>
  )
}

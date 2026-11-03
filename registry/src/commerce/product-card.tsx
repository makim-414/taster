import * as React from 'react'
import { cn } from '../blocks/_cn'
import { safeHref } from '../blocks/_url'

// Product card: one product tile for a grid or a row. A photo at one ratio (a second photo shows on
// hover and on keyboard focus where supplied), the name, one descriptor line, the price and, when there is
// one, a real previous price struck through with its wording for screen readers. A short status line such
// as "Only 3 left" or "Back in May" is plain text, not a tinted pill (AC-04).
// The whole tile is one link; the image is not a separate tab stop. No hover lift, no quick-add overlay
// that hides the photo on touch, no star row unless the caller passes a real rating with its count.
// Follows patterns/editorial-storefront-home and patterns/media-tile-card. Use ProductGrid for a set: it
// keeps one ratio and lets the text set each row's height.
// Original code, MIT.

export interface Product {
  id: string
  href: string
  name: string
  /** One line, for example the size, the material or the variant count. */
  descriptor?: string
  /** Formatted price, for example "$48". */
  price: string
  /** A real previous price, formatted. */
  was?: string
  image: { src: string; alt: string }
  /** Second photo for hover and focus. */
  hoverImage?: { src: string; alt?: string }
  status?: string
  /** A real rating, for example { value: 4.6, count: 128 }. */
  rating?: { value: number; count: number }
  /** Language of the name and descriptor when it differs from the page, for example "ko". */
  lang?: string
}

export interface ProductCardProps extends React.HTMLAttributes<HTMLElement> {
  product: Product
  ratio?: '4/5' | '1/1' | '3/4'
  wasLabel?: string
  nowLabel?: string
}

const KEEP = 'break-keep [overflow-wrap:break-word]'
const RATIO = { '4/5': 'aspect-[4/5]', '1/1': 'aspect-square', '3/4': 'aspect-[3/4]' } as const

export function ProductCard({ product: p, ratio = '4/5', wasLabel = 'Was', nowLabel = 'Now', className, ...props }: ProductCardProps) {
  return (
    <article lang={p.lang} className={cn('min-w-0', className)} {...props}>
      <a href={safeHref(p.href)} className="group block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--bg)]">
        <div className={cn('relative overflow-hidden rounded-md bg-bg-sunken', RATIO[ratio])}>
          <img src={p.image.src} alt={p.image.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          {p.hoverImage ? (
            <img
              src={p.hoverImage.src}
              alt=""
              aria-hidden
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-dropdown ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
            />
          ) : null}
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={cn('text-body font-medium text-text', KEEP)}>{p.name}</h3>
            {p.descriptor ? <p className={cn('mt-0.5 text-label text-text-muted', KEEP)}>{p.descriptor}</p> : null}
          </div>
          <p className="shrink-0 text-right text-body tabular-nums text-text">
            {p.was ? (
              <>
                <span className="sr-only">{nowLabel} </span>
                {p.price}
                <span className="block text-label text-text-subtle line-through">
                  <span className="sr-only">{wasLabel} </span>
                  {p.was}
                </span>
              </>
            ) : (
              p.price
            )}
          </p>
        </div>
        {p.rating || p.status ? (
          <p className="mt-1 flex flex-wrap gap-x-3 text-label tabular-nums text-text-muted">
            {p.rating ? (
              <span>
                {p.rating.value.toFixed(1)} out of 5, {p.rating.count.toLocaleString('en-US')} reviews
              </span>
            ) : null}
            {p.status ? <span className="text-text">{p.status}</span> : null}
          </p>
        ) : null}
      </a>
    </article>
  )
}

export interface ProductGridProps extends React.HTMLAttributes<HTMLDivElement> {
  products: Product[]
  ratio?: ProductCardProps['ratio']
  columns?: 2 | 3 | 4
}

export function ProductGrid({ products, ratio, columns = 4, className, ...props }: ProductGridProps) {
  return (
    <div
      className={cn('grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6', columns >= 3 && 'lg:grid-cols-3', columns === 4 && 'xl:grid-cols-4', className)}
      {...props}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} ratio={ratio} />
      ))}
    </div>
  )
}

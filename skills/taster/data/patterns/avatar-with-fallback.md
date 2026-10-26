---
id: avatar-with-fallback
name: Avatar with fallback
category: icon
uses: [set-the-visual-foundation]
surfaces: [app]
replaces: []
components: [blocks/avatar]
inspiration: []
status: stable
---

## When to use

Use it wherever a person or an account is represented by a picture: comment authors, member lists, the account menu, assignees in a table. Pictures fail all the time (no upload, 404, slow network), so the fallback is part of the component, not an afterthought.

Do not use it for brands or products. A company mark is a logo and follows original-logo-assets. Do not use a generated cartoon face as a stand-in for users who have no photo.

## Anatomy

- Root: a round, clipped box with a hairline border (`--border`) and `--bg-elev` as the surface.
- Image: `object-fit: cover`, fills the root, has an `alt` of the person's name or an empty alt when the name sits next to it.
- Fallback: one or two initials, centered, `--text-muted`, weight 500, shown while the image loads and when it fails.
- Sizes: three steps, 32px (table rows), 40px (lists), 56px (profile header). Initial size scales with the root: caption, label, title.
- Group: overlapped avatars use a 2px ring in the page background color, never a shadow, and end with a "+3" count chip.

## Do

- Render the fallback first and let the image replace it once it has loaded, so there is no empty circle.
- Derive initials from the display name: first letter of the first and last word, uppercased for Latin, first syllable for Hangul.
- Keep the fallback surface neutral. If you need to tell people apart, rely on the name beside the avatar.
- Set explicit width and height to prevent layout shift.
- Use the same three sizes everywhere so avatars line up across screens.

## Don't

- Do not give every fallback a different saturated background color hashed from the name. It turns a list into a rainbow.
- Do not show a generic silhouette icon in a gray disc for hundreds of rows.
- Do not use a drop shadow or a glowing online ring. A status needs a real meaning and a small neutral dot at most.
- Do not stretch non-square photos. Crop with `object-fit: cover`.
- Do not leave the `alt` text as "avatar".

## Swap recipe

Slop: broken image icon, or a hashed pastel circle.

```jsx
{/* before */}
<img src={user.photo} className="size-10 rounded-full" />   {/* shows a broken icon on 404 */}
<div className="size-10 rounded-full" style={{ background: hashToHsl(user.name) }}>{user.name[0]}</div>
```

Fixed: image with a neutral initials fallback.

```tsx
import { Avatar, AvatarImage, AvatarFallback } from './blocks/avatar'

{/* after */}
<Avatar size="md">
  <AvatarImage src={user.photo} alt={user.name} />
  <AvatarFallback>{initials(user.name)}</AvatarFallback>
</Avatar>
```

```css
.avatar {
  width: 40px; height: 40px; border-radius: var(--r-pill);
  background: var(--bg-elev); border: 1px solid var(--border);
  color: var(--text-muted); font-size: var(--t-sm); font-weight: var(--w-med);
}
```

## Tokens

`--bg-elev`, `--border`, `--text-muted`, `--r-pill`, `--t-xs`, `--t-sm`, `--t-title`, `--w-med`. Tailwind: `rounded-full border border-border bg-bg-elev text-text-muted`, sizes `h-8 w-8`, `h-10 w-10`, `h-14 w-14`.

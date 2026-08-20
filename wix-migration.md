# Crown's Worship Ministry — Wix handoff

This build is a polished, self-contained website prototype that keeps the ministry's real content and photography while making the experience more editorial, mobile-friendly, and easier to maintain.

## Important Wix note

Wix does not provide a one-click importer for a Vite/React-style project. The practical choices are:

1. **Fastest visual transfer:** host this folder and place it in a full-width Wix Studio HTML Embed element. This keeps the exact design and interactions, but the page is technically inside an iframe.
2. **Best long-term Wix build:** recreate the sections natively in Wix Studio using the mapping below. Use Wix Multilingual for the English/Nepali switch, and upload the supplied images to Wix Media Manager.

I recommend the second option for the public site because it gives you better SEO, accessibility controls, analytics, and easier editing by a nontechnical team. The first option is useful as a faithful visual checkpoint while the native Wix page is assembled.

## Native Wix Studio section map

- Header: logo, anchor navigation, English / नेपाली language switch, Connect CTA
- Hero: full-bleed `public/assets/crown-of-thorns.mp4` video only, Pokhara eyebrow, “Worship that sounds like hope.” headline, Join the mission CTA. The decorative photo, grid, circles, stamps, and frame outline have been removed.
- Hero motion: the supplied crown-of-thorns clip runs muted, looped, and inline. In Wix Studio, add it as a background video and use a solid dark fallback for reduced motion so the hero remains video-led.
- Impact strip: 4+ districts, 120+ leaders, 3 provinces, 20+ training events
- About: Ranipouwa / Pokhara story, dhaka team image, pull quote
- Ministry: four image cards — Churches, Holy Roar Training, Baby Basics Outreach, Youth
- Reach: Holy Roar image in its natural color treatment, 3 provinces / 20+ events / 1000+ lives touched
- Gallery: the original five Journey photos plus seven supplied Journey photos (12 total) in a balanced responsive grid; thumbnails are monochrome and the lightbox reveals each original color photo with previous / next controls and keyboard navigation
- Give: premium wide crop of `public/assets/donation-support-premium.jpg` plus click-to-reveal donation QR, bank details, international giving note
- Connect: supporting Journey photo, WhatsApp, email, Facebook, Instagram, TikTok
- Footer: Psalm 22:3, location, year

## Refinement and QA notes

- Added a cinematic, reduced-motion-aware drift to the hero video, a scroll progress indicator, stronger focus states, and smoother card/button hover feedback.
- Kept the mobile menu intentionally quiet: About and नेपाली have no decorative arrows, while Gallery carries one restrained navigation cue.
- Applied a cool slate monochrome treatment to the About, Ministry, Reach, Give, and Connect feature imagery, while gallery lightbox images remain available in their original color.
- Refined the framed image crop so the featured photo sits slightly lower in the composition on small screens.
- The responsive layout was checked at 390×844 phone, 768×1024 iPad, and 1440×900 desktop widths with no horizontal overflow.
- The donation image is intentionally cropped wide so the worship team stays in focus without the distracting ceiling strip.

## Brand tokens

- Ink: `#0B0B12`
- Paper: `#F5F1EA`
- Gold: `#F5B34C`
- Coral: `#F7695E`
- Violet: `#7C62FF`
- Teal: `#47D2C2`
- Display: Manrope 800 / 700
- Body: DM Sans 400 / 500 / 700

## Content to confirm before launch

- Confirm that the bank account holder name and number are still correct.
- Confirm the 2026 figures before publishing them as current impact.
- Add a dedicated international giving method if one is available.
- Replace any image that includes a person who has not approved public website use.

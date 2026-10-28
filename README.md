# Shooter's Bar & Grill website

Built and maintained by Web Walker. Bar & grill at 2201 Grand Ave, Fort Smith, AR.

## Editing (no code)

Go to https://app.pagescms.org, sign in with GitHub, and open **webwalkerhub/shooters-bar-and-grill**.
Pick a screen (Business info & hours, Pool tournaments, Full menu, Menu preview & lunch special, Fan favorites, Reviews…), change it, and click **Save**.
The site rebuilds automatically in about a minute.

Tips:
- Hours use a 24-hour clock: `10:00` = 10 AM, `02:00` = 2 AM. A closing time earlier than the opening time means after midnight.
- Tournament day names must be a day of the week (e.g. `Thursday`); today's tournament gets highlighted.
- In "Menu preview", the "See all" link opens the full menu section whose name you type (e.g. `Drinks`).
- New photos: upload them in the Fan favorites photo field (they're stored in `src/img`).
- If a save has a mistake (like a time typed as "10am"), the build stops and the previous version stays live.

## How it works

- `content/*.json`: everything editable (business info, hours, tournaments, menu, favorites, reviews, SEO)
- `src/page.html`: the design template
- `src/img/`: photos, share image (`og.jpg`) and icons
- `build.js`: combines them into `dist/` (no outside packages; the host runs `node build.js`)
- `.pages.yml`: the editing dashboard screens

Build locally: `node build.js`, then open `dist/index.html`.

## At launch

Set `hideFromGoogle` to false and change `siteUrl` (Google & sharing screen), clear the footer note, and remove the `X-Robots-Tag` header in `netlify.toml`.

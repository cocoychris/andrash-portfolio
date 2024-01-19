# Change Log for This Version

Added resume and portfolio content. Extended markdown feature. Optimized game rendering.
Fixed minor bugs. Added new game map and assets.
Considering open sourcing the project with an AGPL-3.0 license.

## Backend

- None

## Frontend & Common

- Added: AGPL-3.0 license to package.json.
- Added: Implemented table rendering, code highlights, and jump to anchor features for markdown.
- Fixed: Bug that prevented opening external links from pages.
- Updated: Rendered SVG images in pages with `svg` tag instead of `img` to avoid issues with rendering animated SVG images as static.
- Updated: Optimized game rendering. Removed the game rendering engine implemented by `react-window` from `TileGrid` component and replaced it with my own implementation to reduce unnecessary rendering and improve performance. Optimized how `gameView` renders characters.
- Fixed: Minor UI bugs.
- Added: `About` item to the navigation bar as a shortcut to access my resume.
- Removed: Unnecessary console logs.

## Assets

- Added: Letter items for spelling `Andrash`.
- Updated: Simplified version of `magentaCrystal` item SVG file to reduce impact on performance.
- Updated: Non-animated version of `water` item SVG file to reduce impact on performance.
- Added: Red and yellow `trafficCone` items in case we need to publish the project when some parts of the playground are still under construction.
- Added: Several portfolio markdown & HTML pages as the content of the playground for introducing me, my skills, and this project.
- Added: My resume in PDF format `Andrash_Yang_Resume.pdf`, which can be downloaded from the playground.
- Removed: Template pages for the portfolio since the real content has been added.
- Added: Brand new game map which serves as my portfolio.

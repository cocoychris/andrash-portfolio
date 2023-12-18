# Change Log for This Version

This version introduces dynamic map and asset loading. The `DataHolder` now manages child `DataHolder`s. Unit testing for `DataHolder` has been implemented with Jest. Each page now has its own URL.

## Backend

- Updated: The `Room` class has been adapted to handle the new async `game.init()` method. Dynamic map loading has been implemented.
- Updated: The `GameServer` now uses the `AssetPack` class for dynamic asset loading.

## Frontend & Common

- Added: The `AssetPack` class has been introduced to manage dynamic asset loading.
- Added: The `DefPack` class has been added to hold the definitions loaded from `AssetPack`. It also replaces the old `DefLoader`.
- Added: The `SVGDisplay` component has been added to display SVG images from the asset pack.
- Updated: Dynamic map loading has been implemented in the `GameClient`.
- Updated: The `GameClient` now uses the `AssetPack` class for dynamic asset loading.
- Updated: `GameMap` has been renamed to `TileManager` to avoid confusion with map data.
- Updated: `DataHolder` now manages child `DataHolder`s. Most operations applied to the parent will also be applied to the children. Children can be assigned manually or created automatically by the parent when a `childCreator` callback is provided.
- Removed: The `init()` method is no longer provided by `DataHolder`. It should be implemented by the subclasses if needed.
- Updated: All subclasses of `DataHolder` have been updated to adapt to the new `DataHolder`. All redundant code for managing children has been removed.
- Added: Unit testing for `DataHolder` has been implemented with Jest.
- Updated: Each page now has its own URL and can be visited directly. The URL will be updated when a new page is loaded.
- Added: The website now has an icon.
- Added: The title of the website will be updated when a new page is loaded.
- Added: When a page is opened by clicking a link, the page will load without refreshing the whole page. The new page will fade in and scroll to the top when loaded.
- Updated: `Game data` and `Map data` are now distinguished. Game data without a game ID is considered as map data. A `reset` update phase has been added to the game. It will reset any play-time changes in the game data and convert the game data into map data.

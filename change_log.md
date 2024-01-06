# Change Log for This Version

Auto tile transition. Tile text display. Image assets. Rendering optimization.

## Backend

- Fixed: Issue where joining another player's room with a link failed. The `Room` and `Session` classes have been updated.

## Frontend & Common

- Added: `PageView` now refuses to open a page and resets the browser location to root when editing a map (using `EditorView`).
- Fixed: Issue where `Page` did not load when the `popstate` event was triggered.
- Updated: Scrolling (on mobile, aka `touch-action` in CSS) is now only prevented in `EditorView`. Scrolling is allowed in `GameView` so that users can scroll down to see the page section and scroll back to the game section.
- Updated: PNG images are now supported in AssetPack.
- Removed: The `bootstrap` & `axios` packages, as they are not used.
- Updated: The `react-color` package is now used for the color picker instead of the default HTML color picker, which does not support copying & pasting color codes.
- Added: A variety of Tile & item asset images have been created. All images were designed by me.
- Added: A new default map has been created.
- Updated: Rendering performance has been improved. Animation FPS settings are now unified and set to 60 FPS. `TileGrid` now caches the `TileDisplay` component to reduce unnecessary re-rendering.
- Added: Dynamic z-index for all objects rendered by `TileDisplay` according to their row position.
- Added: Auto tile transition feature implemented for `EditorView`. The tile texture system has been added. Each tile can have multiple textures. A suitable transition tile will be selected according to the surrounding tile textures.
- Updated: `DefPack` has been split into `ItemDefPack`, `TileDefPack`, `CharacterDefPack`, and `SysObjDefPack`.
- Added: Mode switching menu added to the navbar. Online mode, local mode, and editor mode are supported.
- Added: Text display feature for `TileDisplay` implemented. Text can be displayed on top of a tile.
- Added: Items can be set to be walkable or not. If an item is not walkable, the player cannot walk on it.
- Fixed: Issue where a property was not deleted and was set to `null` after the child `DataHolder` for the property was removed from the parent `DataHolder`.
- Removed: `isOpen`,`isLocalGame`,`tickInterval` properties from the `loadGame` event. These properties cannot be set from the client side.

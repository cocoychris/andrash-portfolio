# Change Log of This Version

Refactored the code to use OOP principles and added new features.

## Frontend

- Changed: Replaced "Player" with "Character" for consistency.
- Changed: Upgraded `PlayerManager` to `Game` to better reflect its functionality.
- Added: `Tile` and `Item` classes to represent game objects.
- Added: `GameEvent`, `CharacterEvent`, `TileEvent`, and `ItemEvent` classes to handle events.
- Added: Definition files for characters, tiles, and items (see `src/data` folder). This avoids storing duplicate data for each tile of the map but only the tile type.
- Added: `IDefinition` (and other related) interfaces to standardize the definition data of characters, tiles, and items.
- Added: Frame switching feature - Characters and items can switch between frames to display different images at different states.
- Used: GitHub Copilot to assist with programming and comment writing.

## Backend

- None

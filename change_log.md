# Change Log for This Version

Map Editor implemented.
FieldDef class introduced for handling object property manipulation.
Events and data propagation processes refined.

## Backend

- No changes

## Frontend

- Added: Introduced the `Editor` class as the core of the Map Editor. This class, while not a UI component, holds the data and logic of the Map Editor. It emits events to notify the UI components to update themselves.
- Added: Implemented the Map Editor and related components, including `EditorView`, `MapCreator`, `EditorLayout`, and `ToolbarLayout`.
- Updated: Enhanced `DropdownMenu`, `Navbar`, `TileDisplay`, `CharacterDisplay`, and `MapView` to support the Map Editor.
- Added: Introduced `DataUpdater` as a subclass of `DataHolder` to handle more complex data propagation processes in future game development.
- Added: Created the `FieldDef` class for handling object property manipulation in the Map Editor. It defines the property name, type, and default value of the object and provides a method for validation when assigning a new value to the property.
- Added: Defined fields for `Player`, `Tile`, `Character`, and `Item` using the `FieldDef` class.
- Updated: Refined the object destruction process by splitting the destroy event into `willDestroy` and `didDestroy` events. The `willDestroy` event is emitted before the object is destroyed, and the `didDestroy` event is emitted after the object is destroyed. This allows all UI components to unmount themselves before the object is destroyed, preventing errors from accessing the destroyed object.
- Updated: Tile objects now emit events when characters/items enter or leave them.

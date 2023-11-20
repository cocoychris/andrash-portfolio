# Change Log of This Version

Multiplayer online game framework built

## Backend

- Added: Room management system.
- Added: Player management system.
- Added: Session management system.

## Common

- Added:`AnyEventEmitter` event dispatching system.
- Added:`Transmitter` a socket.io based client-server event dispatching system.
- Updated:`DataHolder` replacing `EventDispatcher` with `AnyEventEmitter` as the base class.
- Updated: Character & item collision detection system.

## UI

- Added: Popup message box component.
- Updated: Navbar component redesigned.
- Updated: DropdownMenu component redesigned.

## Documentation

- Updated: `Server-Client_Communication_API.md`

## Others

- Removed: Unused util classes `Bindings`.
- Removed: Files from old event dispatching system, such as `EventDispatcher`, `CharacterEvent`, `ItemEvent`, etc.

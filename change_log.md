# Change Log of this version

Object-oriented programming (OOP) infrastructure created.
New game fratures added. Few bugs fixed.

## Frontend

- Fix: Player icon were stacking on top of the foreground image.
- Fix: GameView glitchs while camera moving. (reduced by 60%)
- Fix: Player moving transition not performed correctly.
- Change: Player React component renamed as PlayerDisplay.
- Change: All the interfaces are moved to the 'interface.ts' file.
- Add: OOP Classes - GameMap, Player, PlayerManager, Position as data operator.
- Add: Feature - Walkable property added to tileData. Player can not move to an unwalkable tile.
- Add: Feature - Auto path finding. Setup a target and move to it autometically.

## Backend

- none

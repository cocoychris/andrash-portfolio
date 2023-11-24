# Change Log of This Version

Patch for local game mode.
Frontend GameView rendering mechanism improved.
Several bug fixes.

## Backend

- none

## Frontend

- Updated: The GameView rendering mechanism has been improved for better performance. It now only updates:
  - The tiles occupied by characters.
  - The tiles where players set or remove the target beacon.
- Updated: The Navbar & Dropdown Menu now update in real-time when users join or leave the room.
- Fixed: An issue causing an infinite loop error when clicking the "Dismiss" button of the alert message has been resolved.
- Fixed: The "Pause Game" and "New Game" features in the dropdown menu now function correctly in local game mode.
- Updated: The "Game Players" menu has been adjusted for local game mode.
- Updated: Adjacent unselectable items in the dropdown menu now form a single block.

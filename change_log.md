# Change Log of This Version

GameView redesigned & glitching issue fixed.
Unnecessary rerendering of gameView, popup & navebar fixed.

## Backend

- No change.

## Frontend

- Updated: `GameView` redesigned using `react-window` to solve the glitching issue while scrolling.
  - New features:
    - The cell size of `GameView` now adapts to the size of the window, ensuring that there is always at least 5 cells visible in row and column.
    - The position at the center of the viewport stays the same when the window is resized.
- Added: Breaking `useOperator` custom hook into `NavbarLayout`, `GameLayout` and `PopupLayout` components so that `navbar`, `gameView` and `popup` can be rendered & updated independently.
- Updated: `Popup` redesigned as React class component to provide `open()` and `close()` method to other components.

## Known Bugs

- Player display name undefined when starting a local game directly without connecting to the game server.

## Future Improvements

- Customizing Player menu options for local game mode.
- The performance of `GameView` rendering can be improved to make it mobile friendly.

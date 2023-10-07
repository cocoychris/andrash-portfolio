# Change Log of This Version

Major refactor for abstraction and reusability.

1. Code for the game has been refactored.
   - The game looks exactly the same as before, but the code is now more abstracted and reusable.
   - Common features of characters, tiles, and items are now abstracted into `Group`, `Member`, and `DataHolder` classes.
2. Data update collection and propagation mechanism for data synchronization has been implemented.
   - The `DataHolder` class is the essential building block of the game. All objects in the game that need to hold a set of data and transfer updates between the frontend and backend to keep in sync are extended from the `DataHolder` class. It allows us to collect updates and send them to the other side, and also allows us to receive updates from the other side and apply them.
   - The `Group` and `Member` classes are extended from the `DataHolder` class. They are a special type of `DataHolder` that implements the update collection and propagation mechanism for a group of objects, such as a group of characters, tiles, or items. The convenience is that all updates of the members in the group can be collected and sent to the other side in one go, and all updates from the other side can be applied to the members in the group in one go.
   - NOTE: Currently, data updates are not yet synchronized between the frontend and backend. For POC purposes, updates are sent and received by the top-level data holder (the `Game` object) itself locally to prove the update collection and propagation mechanism is working.
3. Frontend and backend can now share some of the same code.
   - The project structure has been changed. Backend data has been moved to the root directory, making the frontend directory its subdirectory. So, the backend can now access frontend code.
   - Most of the game-related classes (stored in the frontend directory) will be shared between the frontend and backend to keep the game logic consistent.

## Other Changes

1. Frontend and backend real-time communication tested.
   - Implemented using Socket.IO.
   - Tested and proven to be working, but not yet used in the game.
2. Deployment process updated.
   - Execute the `dev.bat` batch script (on Windows) to run both the frontend and backend server in development mode.
   - Execute the `serve-both.sh` shell script (on Linux) to run both the frontend and backend server in production mode.
     - Alternatively, use the command `pm2 start serve-backend.json` to run the backend server in production mode.
     - And use the command `pm2 start frontend/serve-frontend.json` to run the frontend server in production mode.
3. Event dispatching mechanism updated.
   - Using the `EventDispatcher` class for event dispatching, which is a wrapper class of `EventTarget` with better compatibility with custom events and will not cause TypeScript compiler errors. It also provides more convenient methods for event listening and dispatching, such as `on()` as a shorthand for `addEventListener()`.
4. `Bindings` class transplanted from one of my legacy projects.
   - `Bindings` is a handy tool I created in the past for creating "multiple to multiple" bindings between a bunch of keys (aka "tag") and values (aka "target").
   - A little bit clunky from today's perspective, but still useful. It was written in vanilla JavaScript with Traditional Chinese comments, and now transplanted to TypeScript with English comments.

## Frontend

- Removed: Unused event classes.

## Backend

- Added: `GameServer` class. Able to handle both API requests (using Express.js) and real-time communication (using Socket.IO). Only with some POC code. Not yet used in the game.
- Added: `Player`, `PlayerManager`, and `Room` classes. Development in progress. Currently unusable.

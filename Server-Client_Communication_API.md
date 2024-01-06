# Server-Client Communication API

This document describes the **custom socket.io events** used for server-client communication.

_Design and written by [Andrash Yang](mailto:cocoychris@gmail.com)_

## aka Transmitter Events

- I'd like to refer to these events as `"Transmitter Events"` (or `TransEvent` for short) because they are sent and received by the `Transmitter` class.
- The `Transmitter` class is used to facilitate event communication between the client and the server. It acts as a wrapper that transforms a socket.io `Socket` instance into an `AnyEventEmitter` instance. This allows for the definition of custom socket.io events using TypeScript interfaces, which is extremely beneficial for maintaining event consistency between the client and the server.
- All the Transmitter events described in this document are defined in the `transEventTypes.ts` file.
- Also see `Transmitter.ts` and `TransEvent.ts`.

## All Events

Client events:

1. [authenticate](#authentication-and-room-joining)
2. [loadGame](#loading-a-game)
3. [startGame](#starting--resuming-the-game)
4. [updatePlayer](#updating-player-data-to-server)
5. [stopGame](#stopping-the-game)

Server events:

1. [connect](#estsblishing-connection) (socket.io built-in event)
2. [gameTick](#propagating-game-data-to-clients)
3. [gameStop](#stopping-the-game)

## Estsblishing connection

The first thing to do is to establish a connection between the client and the server before any other events can be emitted.

The client will request a connection to the server by calling the `connect()` method. The server will then accept the connection and emit the `connect` event to the client. The client will then know that the connection is established and ready to communicate with the server.

**Note for those who are not familiar with socket.io:** The process described above is the built-in behavior of socket.io. The `connect()` method and the `connect` event are the built-in feature of socket.io. The only thing I do is to encapsulate them within the `Transmitter` class and define the `connect` event with a TypeScript interface.

| Step | Origin | Type      | Event       | Data       | Description                                                     |
| ---- | ------ | --------- | ----------- | ---------- | --------------------------------------------------------------- |
| 1    | Client | socket.io | `connect()` | -          | Request connection to server.                                   |
| 2    | Server | emit      | `connect`   | `socketID` | Connected. Realtime communication with events is now available. |

## Authentication and Room Joining

This process must occur after the connection is established.

The server expects this event to be emitted within a specific timeframe, otherwise, the connection will be closed. Note that this must be completed before any other events can be emitted.

As this is just a project for demonstration purposes, there is no login or authorization process. The `sessionID` is only used to identify the client and restore the client's data when the client reconnects to the server. If the `sessionID` is not provided or not found from server, a new session will be created for the client.

Client will be joined to a room according to the `publicID` provided in the request after authentication. If the `publicID` is not provided or not found from server, the client will be joined to the default room (own room). In this case the `publicID` in the response will be different from the one in the request and a warning message `joinRoomWarning` will be included in the response.

If a client (session) is joined to its own room, it is also the host of the room. In this case, the `isHost` field in the response will be `true`. The host can initiate a new game and stop the game.

| Step | Origin | Type     | Event          | Data                                                | Description                                                                                               |
| ---- | ------ | -------- | -------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1    | Client | emit     | `authenticate` | `sessionID?`, `publicID?`                           | Will create new session if sessionID is not provided. Will join default room if publicID is not provided. |
| -    | Server | response | -              | `joinRoomWarning`,`sessionID`, `publicID`, `isHost` | Authenticated and joined room.                                                                            |

## Loading a Game

Every room contains a game. The client can load either the existing game in the room or initiate a new game using the `loadGame` event. The server will then return the corresponding game data in the response.

To load the existing game, the `mapID` field should be omitted in the request.

To initiate a new game, the `mapID` should be included in the request. However, ensure that the client is the host of the room, otherwise, the request will be rejected.

`tickNum` in the response is the number of current tick. For a new game, it is 0. For an existing game, it is the number of ticks that have passed since the game started.

The game will be paused when a `loadGame` request is received by the server until the client confirms that it is ready to start the game by emitting the `startGame` event. This is to prevent the game from going to the next tick before the client is ready causing the game to be out of sync.

| Step | Origin | Type     | Event      | Data                              | Description                                   |
| ---- | ------ | -------- | ---------- | --------------------------------- | --------------------------------------------- |
| 1    | Client | emit     | `loadGame` | `mapID?`                          | Request to load a game.                       |
| -    | Server | response | -          | `playerID`, `gameData`, `tickNum` | Server returns the game data in the response. |

## Starting & Resuming the Game

The `startGame` event is used to start or resume the game.

There are few reasons why the game would be stopped, not all of them can be started/resumed with the `startGame` event:

1. **The game is waiting for all players to be ready.** The server will start the game automatically when all players are ready. Players (Clients) should emit the `startGame` event to indicate that they are ready to start the game. The host can also kick all the unready players out of the room and force the game to start by setting the `force` field to `true` in the request.
2. **The host has paused the game.** In this case, the host can resume the game by emitting the `startGame` event. This will not work for other players.
3. **The game is finished or the host has ended the game.** In this case, the `startGame` event will not work.

When the game is started/resumed, the server will begin emitting the `gameTick` event to all clients. Please see next section for details.

| Step | Origin | Type     | Event       | Data                               | Description                                                                                       |
| ---- | ------ | -------- | ----------- | ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1    | Client | emit     | `startGame` | `force`                            | Request game start. This will tell the server that the player is ready to start the game.         |
| -    | Server | response | -           | `isStarted` , `waitingPlayerNames` | The game will start when all players are ready. If `isStarted == true` then the game has started. |
| 2    | Server | emit     | `gameTick`  | `gameData`, `tickNum`              | Will keep sending the game data update at each tick until the game stops.                         |
| -    | Client | response | -           | -                                  | Client receives the `gameData` and updates the game accordingly.                                  |

## Propagating Game Data to Clients

`gameTick` event is used to send the game data update to all clients. The client will then update the game accordingly. The server will keep sending the game data update at each tick until the game stops.

In a special scenario, if some players (clients) become temporarily unreachable or disconnected, the server will continue to emit the `gameTick` event to the reachable clients. However, the `tickNum` will not increment and `gameData` will be null. This process continues until all clients become reachable again, or the unreachable clients are removed from the room due to a timeout.

This is to prevent the game from going to the next tick before all clients are updated to the latest game data, causing the game to be out of sync.

| Step | Origin | Type     | Event      | Data                  | Description                                                               |
| ---- | ------ | -------- | ---------- | --------------------- | ------------------------------------------------------------------------- |
| 1    | Server | emit     | `gameTick` | `gameData`, `tickNum` | Will keep sending the game data update at each tick until the game stops. |
| -    | Client | response | -          | -                     | Client receives the `gameData` and updates the game accordingly.          |

## Updating Player Data to Server

The server will receive player data in real-time whenever it changes on the client side. The game will be affected and the changes made by the player data will be reflected in the `gameData` of the next `gameTick` event.

| Step | Origin | Type     | Event          | Data                     | Description                    |
| ---- | ------ | -------- | -------------- | ------------------------ | ------------------------------ |
| 1    | Client | emit     | `updatePlayer` | `playerID`, `playerData` | Request to update player data. |
| -    | Server | response | -              | -                        | Player data received.          |

## Stopping the Game

A game can be stopped by the server or by the client (host).

When the game is stopped by the server, the server will emit the `gameStop` event to all clients. The clients will then stop the game and show relevant popups.

The following are the scenarios where the server will stop the game:

1. The game is waiting for all players to be ready. In this case, the `type` == `"waiting"`. All the unreadied player names will be included in the `waitingPlayerNames` field.
2. The game is paused by the host. To do this, the host should emit the `stopGame` event to the server (as shown in the table below). In this case, the `type` == `"pause"`.
3. The game is finished or the host has ended the game. In this case, the `type` == `"end"`.

When the game stops, the server will emit the `gameStop` event and stop emitting the `gameTick` event to all clients. The clients will stop the game, show relevant popups and start waiting for the `gameTick` event to resume the game.

| Step | Origin | Type     | Event      | Data                                   | Description                                                                     |
| ---- | ------ | -------- | ---------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| 1    | Client | emit     | `stopGame` | -                                      | Request to stop the game.                                                       |
| -    | Server | response | -          | -                                      | Server accepts the request and stops the game (otherwise an error is returned). |
| 2    | Server | emit     | `gameStop` | `type`, `reason`, `waitingPlayerNames` | Tell all clients that the game is stopped.                                      |
| -    | Client | response | -          | -                                      | -                                                                               |

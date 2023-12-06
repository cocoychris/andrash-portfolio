import { IWillDestroyEvent } from "./Destroyable";
import Game, { IGameData, IGameDef } from "./Game";
import { IMapData } from "./GameMap";
import Tile, { ITileData } from "./Tile";
import AnyEventEmitter from "./events/AnyEventEmitter";
import tileDefPack from "../assets/gameDef/tile";
import itemDefPack from "../assets/gameDef/item";
import characterDefPack from "../assets/gameDef/character";
import Player, { IPlayerData } from "./Player";
import { IGroupData } from "./Group";
import Character, { ICharacterData } from "./Character";
import { randomElement, randomInterger } from "./data/util";
import GameClient from "./GameClient";
import AnyEvent, { IEventType } from "./events/AnyEvent";
import Position, { IPosition } from "./Position";
import Item from "./Item";
import { ILoadGameEvent } from "./events/transEventTypes";

let DEFAULT_GAME_DEF: IGameDef = {
  characterDefPack,
  tileDefPack,
  itemDefPack,
};
const CHARACTER_TYPE_LIST: Array<string> = Object.keys(characterDefPack);
const TILE_TYPE_LIST: Array<string> = Object.keys(tileDefPack);
const ITEM_TYPE_LIST: Array<string> = Object.keys(itemDefPack);

const MIN_COL_COUNT = 10;
const MIN_ROW_COUNT = 10;
const MAX_COL_COUNT = 100;
const MAX_ROW_COUNT = 100;
const MIN_PLAYER_COUNT = 1;
const MAX_PLAYER_COUNT = 4;
const DEFAULT_PLAYER_COLOR_LIST = [
  "#ff0000",
  "#00ff00",
  "#0000ff",
  "#ffff00",
  "#00ffff",
  "#ff00ff",
];

export interface IToolData {
  toolType: string | null;
  templateTile: Tile | null;
  templateCharacter: Character | null;
  templateItem: Item | null;
  selectedPlayer: Player | null;
  selectedTile: Tile | null;
}

export interface IStartTestingEvent extends IEventType {
  type: "startTesting";
}
export interface IStopTestingEvent extends IEventType {
  type: "stopTesting";
}
export interface IDidLoadMapEvent extends IEventType {
  type: "didLoadMap";
}
export interface IDisposeMapEvent extends IEventType {
  type: "disposeMap";
}

export interface IToolChangeEvent extends IEventType {
  type: "toolChanged";
  data: IToolData;
}

export interface IPlayerSelectEvent extends IEventType {
  type: "playerSelect";
  data: {
    prevPlayer: Player | null;
    player: Player | null;
  };
}

export interface ITileSelectEvent extends IEventType {
  type: "tileSelect";
  data: {
    prevTile: Tile | null;
    tile: Tile | null;
  };
}

export interface INewMapOptions {
  name: string;
  colCount: number;
  rowCount: number;
  tileType: string;
  tileBgColor?: string;
  playerCount: number;
}
/**
 * Editor class is the core of the Map Editor.
 * It is not a UI component but holds the data and logic of the Map Editor. It emits events to notify the UI components to update themselves.
 */
export default class Editor extends AnyEventEmitter {
  public static readonly MAX_COL_COUNT = MAX_COL_COUNT;
  public static readonly MAX_ROW_COUNT = MAX_ROW_COUNT;
  public static readonly MIN_COL_COUNT = MIN_COL_COUNT;
  public static readonly MIN_ROW_COUNT = MIN_ROW_COUNT;
  public static readonly MIN_PLAYER_COUNT = MIN_PLAYER_COUNT;
  public static readonly MAX_PLAYER_COUNT = MAX_PLAYER_COUNT;
  public static readonly DEFAULT_PLAYER_COLOR_LIST = DEFAULT_PLAYER_COLOR_LIST;
  public static readonly CHARACTER_TYPE_LIST = CHARACTER_TYPE_LIST;
  public static readonly TILE_TYPE_LIST = TILE_TYPE_LIST;
  public static readonly ITEM_TYPE_LIST = ITEM_TYPE_LIST;
  public static readonly TOOL_TILE_BRUSH = "tileBrush";
  public static readonly TOOL_ITEM_PLACER = "itemPlacer";
  public static readonly TOOL_CHARACTER_PLACER = "characterPlacer";
  public static readonly TOOL_PLAYER_PLACER = "playerPlacer";
  public static readonly TOOL_TILE_SELECTOR = "tileSelector";

  private _gameClient: GameClient;
  private _game: Game | null = null;
  private _backupData: IGameData | null = null;
  private _selectedTile: Tile | null = null;
  private _templateTile: Tile | null = null;
  private _templateCharacter: Character | null = null;
  private _templateItem: Item | null = null;
  private _toolType: string | null = Editor.TOOL_TILE_SELECTOR;
  private _templateTileList: Array<Tile> = [];
  private _templateCharacterList: Array<Character> = [];
  private _templateItemList: Array<Item> = [];
  private _selectedPlayer: Player | null = null;
  private _playerCharacterList: Array<Character> = [];

  public get mapID(): string | null {
    return this._game?.map.id || null;
  }

  //   public get gameClient(): GameClient | null {
  //     return this._gameClient;
  //   }

  public get game(): Game | null {
    return this._game;
  }

  public get isTesting(): boolean {
    return !!this._backupData;
  }

  public get selectedTile(): Tile | null {
    return this._selectedTile;
  }

  public get templateTileList(): Array<Tile> {
    return this._templateTileList;
  }
  public get templateCharacterList(): Array<Character> {
    return this._templateCharacterList;
  }
  public get templateItemList(): Array<Item> {
    return this._templateItemList;
  }

  public get templateTile() {
    if (this._templateTile) {
      return this._templateTile;
    }
    return null;
  }

  public get templateCharacter() {
    if (this._templateCharacter) {
      return this._templateCharacter;
    }
    return null;
  }

  public get templateItem() {
    if (this._templateItem) {
      return this._templateItem;
    }
    return null;
  }

  public get selectedPlayer(): Player | null {
    return this._selectedPlayer;
  }

  public get toolType(): string | null {
    return this._toolType;
  }

  public get playerCharacterList(): Array<Character> {
    return this._playerCharacterList;
  }

  constructor(gameClient: GameClient) {
    super();
    this._gameClient = gameClient;
    this._createTemplateGame();
  }
  /**
   * Update the state of current tool.
   */
  public setToolData(options: Partial<IToolData>) {
    options.toolType !== undefined && (this._toolType = options.toolType);
    options.templateTile !== undefined &&
      (this._templateTile = options.templateTile);
    options.templateCharacter !== undefined &&
      (this._templateCharacter = options.templateCharacter);
    options.templateItem !== undefined &&
      (this._templateItem = options.templateItem);
    if (options.selectedPlayer !== undefined) {
      let prevPlayer = this._selectedPlayer;
      this._selectedPlayer = options.selectedPlayer;
      prevPlayer && (prevPlayer.isSelected = false);
      this._selectedPlayer && (this._selectedPlayer.isSelected = true);
      this.emit<IPlayerSelectEvent>(
        new AnyEvent("playerSelect", {
          prevPlayer,
          player: this._selectedPlayer,
        })
      );
    }
    if (options.selectedTile !== undefined) {
      let prevTile = this._selectedTile;
      this._selectedTile = options.selectedTile;
      prevTile && (prevTile.isSelected = false);
      this._selectedTile && (this._selectedTile.isSelected = true);
      this.emit<ITileSelectEvent>(
        new AnyEvent("tileSelect", {
          prevTile,
          tile: this._selectedTile,
        })
      );
    }

    this.emit<IToolChangeEvent>(
      new AnyEvent("toolChanged", {
        toolType: this._toolType,
        templateTile: this._templateTile,
        templateCharacter: this._templateCharacter,
        templateItem: this._templateItem,
        selectedPlayer: this._selectedPlayer,
        selectedTile: this._selectedTile,
      })
    );
  }

  public resetToolData() {
    this.setToolData({
      toolType: Editor.TOOL_TILE_SELECTOR,
      templateTile: null,
      templateCharacter: null,
      templateItem: null,
      selectedPlayer: null,
      selectedTile: null,
    });
  }

  public getToolData(): IToolData {
    return {
      toolType: this._toolType,
      templateTile: this._templateTile,
      templateCharacter: this._templateCharacter,
      templateItem: this._templateItem,
      selectedPlayer: this._selectedPlayer,
      selectedTile: this._selectedTile,
    };
  }

  /**
   * Create a new map for editing.
   */
  public async createMap(options: INewMapOptions): Promise<Game> {
    options.colCount = Math.max(
      Math.min(options.colCount, MAX_COL_COUNT),
      MIN_COL_COUNT
    );
    options.rowCount = Math.max(
      Math.min(options.rowCount, MAX_ROW_COUNT),
      MIN_ROW_COUNT
    );
    options.playerCount = Math.max(
      Math.min(options.playerCount, MAX_PLAYER_COUNT),
      MIN_PLAYER_COUNT
    );
    // Generate tile data
    let tileData2DArray: Array<Array<ITileData>> = [];
    for (let r = 0; r < options.rowCount; r++) {
      tileData2DArray[r] = [];
      for (let c = 0; c < options.colCount; c++) {
        tileData2DArray[r][c] = {
          type: options.tileType,
          walkable: null,
          bgColor: options.tileBgColor,
        };
      }
    }
    // Create the map data
    let mapData: IMapData = {
      id: generateMapID(),
      name: options.name,
      colCount: options.colCount,
      rowCount: options.rowCount,
      tileData2DArray,
    };
    // Generate player and character data
    let playerColors = DEFAULT_PLAYER_COLOR_LIST.slice();
    let playerDataDict: IGroupData<IPlayerData> = {};
    let characterDataDict: IGroupData<ICharacterData> = {};
    for (let i = 0; i < options.playerCount; i++) {
      (playerDataDict as IGroupData<IPlayerData>)[i] = {
        name: `Player ${i}`,
        color: randomElement(playerColors, true),
        characterID: i,
      };
      (characterDataDict as IGroupData<ICharacterData>)[i] = {
        type: randomElement(CHARACTER_TYPE_LIST),
        position: { row: i, col: i },
      };
    }
    // Create the game data
    return this._loadGame({
      playerDataDict,
      characterDataDict,
      itemDataDict: {},
      mapData,
    });
  }

  public disposeMap() {
    this._game = null;
    this.emit<IDisposeMapEvent>(new AnyEvent("disposeMap", null));
  }

  /**
   * Start testing the game with the current data.
   * @returns
   */
  public async startTesting() {
    if (!this._game) {
      return;
    }
    // Reset Tool Data
    this.setToolData({
      toolType: null,
      templateTile: null,
      templateCharacter: null,
      templateItem: null,
      selectedPlayer: null,
      selectedTile: null,
    });
    // Apply the current data
    this._game.apply();
    this._backupData = this._game.getData();
    let playerID = this._selectedPlayer
      ? this._selectedPlayer.id
      : randomElement(this._game.playerGroup.list()).id;
    console.log("start testing", playerID);
    await this._gameClient.loadGame({
      gameData: this._backupData,
      playerID,
    });
    await this._gameClient.startGame();
    this.emit<IStartTestingEvent>(new AnyEvent("startTesting", null));
  }
  /**
   * Stop testing the game and restore the game data.
   */
  public stopTesting() {
    if (!this._backupData) {
      return;
    }
    this._loadGame(this._backupData);
    this._backupData = null;
    this.emit<IStopTestingEvent>(new AnyEvent("stopTesting", null));
  }
  /**
   * Save the game data to a file.
   */
  public saveFile() {
    if (!this._game) {
      throw new Error("No game is created.");
    }
    this._game.apply();
    let data = this._game.getData();
    let blob = new Blob([JSON.stringify(data)], {
      type: "application/json",
    });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = `${data.mapData?.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  /**
   * Load game data from a file.
   */
  public async loadFile(): Promise<Game> {
    // Show dialog to select file
    let input = document.createElement("input");
    input.style.display = "none";
    input.type = "file";
    input.accept = ".json";
    input.multiple = false;
    input.click();
    let gameData = await new Promise<IGameData>((resolve, reject) => {
      input.onchange = () => {
        let file = input.files && input.files[0];
        if (!file) {
          reject("No file is selected.");
          return;
        }
        let reader = new FileReader();
        reader.onload = () => {
          let text = String(reader.result);
          if (!reader.result) {
            reject("File is empty.");
          }
          resolve(JSON.parse(text));
        };
        reader.readAsText(file);
      };
    });
    if (!gameData || !gameData.mapData || !gameData.mapData.id) {
      throw new Error("Invalid game data.");
    }
    return this._loadGame(gameData);
  }

  private async _loadGame(gameData: IGameData): Promise<Game> {
    this._game = await this._gameClient.loadGame({
      gameData,
    });
    this._game.on<IWillDestroyEvent>("willDestroy", () => {
      this.resetToolData();
      this._game = null;
    });
    this._game.playerGroup.forEach((player) => {
      player.isOccupied = true;
      player.apply();
      player.updateCharacter();
      player.character.apply();
    });
    this._playerCharacterList = this._game.playerGroup.map((player) => {
      return player.character;
    });
    this.emit<IDidLoadMapEvent>(new AnyEvent("didLoadMap", null));
    return this._game;
  }
  private _createTemplateGame() {
    let length = Math.max(
      Editor.TILE_TYPE_LIST.length,
      Editor.CHARACTER_TYPE_LIST.length,
      Editor.ITEM_TYPE_LIST.length
    );
    let tileData: ITileData = {
      type: Editor.TILE_TYPE_LIST[0],
      walkable: null,
      bgColor: null,
    };
    let mapData: IMapData = {
      id: generateMapID(),
      name: "Template",
      colCount: length,
      rowCount: 3,
      tileData2DArray: [
        Array<ITileData>(length).fill(tileData),
        Array<ITileData>(length).fill(tileData),
        Array<ITileData>(length).fill(tileData),
      ],
    };
    Editor.TILE_TYPE_LIST.forEach((type, index) => {
      mapData.tileData2DArray[0][index] = {
        type,
        walkable: null,
        bgColor: null,
      };
    });

    let playerDataDict: IGroupData<IPlayerData> = {
      0: {
        name: "Player 0",
        color: "#ff0000",
        characterID: 0,
      },
    };
    let characterDataDict: IGroupData<ICharacterData> = {};
    Editor.CHARACTER_TYPE_LIST.forEach((type, index) => {
      characterDataDict[index] = {
        type,
        position: { row: 1, col: index },
      };
    });
    let itemDataDict: IGroupData<ICharacterData> = {};
    Editor.ITEM_TYPE_LIST.forEach((type, index) => {
      itemDataDict[index] = {
        type,
        position: { row: 2, col: index },
      };
    });
    let game = new Game(DEFAULT_GAME_DEF, {
      mapData,
      playerDataDict,
      characterDataDict,
      itemDataDict,
    });
    game.init();
    // Create template tile list
    for (let i = 0; i < Editor.TILE_TYPE_LIST.length; i++) {
      let tile = game.map.getTile({ row: 0, col: i });
      if (tile) {
        this._templateTileList.push(tile);
      }
    }
    // Create template character list
    for (let i = 0; i < Editor.CHARACTER_TYPE_LIST.length; i++) {
      let character = game.characterGroup.get(i);
      if (character) {
        this._templateCharacterList.push(character);
      }
    }
    // Create template item list
    for (let i = 0; i < Editor.ITEM_TYPE_LIST.length; i++) {
      let item = game.itemGroup.get(i);
      if (item) {
        this._templateItemList.push(item);
      }
    }
  }
}

function generateMapID(): string {
  return `M${Date.now().toString(36)}-${randomInterger(10000, 99999).toString(
    36
  )}`;
}

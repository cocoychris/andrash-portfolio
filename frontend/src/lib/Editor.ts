import { IWillDestroyEvent } from "./Destroyable";
import Game, { IGameData } from "./Game";
import TileManager, { ITileDataDict } from "./TileManager";
import Tile, { ITileData } from "./Tile";
import AnyEventEmitter from "./events/AnyEventEmitter";
import Player, { IPlayerData } from "./Player";
import { IGroupData } from "./data/Group";
import Character, { ICharacterData } from "./Character";
import { randomElement, randomInterger } from "./data/util";
import GameClient from "./GameClient";
import AnyEvent, { IEventType } from "./events/AnyEvent";
import Item, { IItemData } from "./Item";
import AssetPack from "./data/AssetPack";
import { IMapInfo } from "./MapInfo";

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
export interface IDidLoadGameEvent extends IEventType {
  type: "didLoadGame";
}
export interface IWillUnloadGameEvent extends IEventType {
  type: "willUnloadGame";
  data: {
    isLoading: boolean;
  };
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
  width: number;
  height: number;
  tileType: string;
  tileBgColor?: string;
  playerCount: number;
  assetPack: AssetPack;
}
/**
 * Editor class is the core of the Map Editor.
 * It is not a UI component but holds the data and logic of the Map Editor. It emits events to notify the UI components to update themselves.
 */
export default class Editor extends AnyEventEmitter {
  public static readonly MAP_NAME_REGEXP: RegExp = /^[^\\\/:*?"<>\|]+$/;
  public static readonly MAX_COL_COUNT = 100;
  public static readonly MAX_ROW_COUNT = 100;
  public static readonly MIN_COL_COUNT = 10;
  public static readonly MIN_ROW_COUNT = 10;
  public static readonly MIN_PLAYER_COUNT = 1;
  public static readonly MAX_PLAYER_COUNT = 4;
  public static readonly DEFAULT_PLAYER_COLOR_LIST = Object.freeze([
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#00ffff",
    "#ff00ff",
  ]);
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
  private _templateTileDict: { [key: string]: Tile } = {};
  private _templateCharacterList: Array<Character> = [];
  private _templateItemList: Array<Item> = [];
  private _selectedPlayer: Player | null = null;
  private _playerCharacterList: Array<Character> = [];
  private _templateGame: Game | null = null;

  public get mapID(): string | null {
    return this._game?.mapInfo.id || null;
  }

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

  public getTemplateTile(type: string): Tile | null {
    return this._templateTileDict[type] || null;
  }

  /**
   * Create a new map for editing.
   */
  public async createMap(options: INewMapOptions): Promise<Game> {
    console.log("create map", this._templateCharacterList);

    options.width = Math.max(
      Math.min(options.width, Editor.MAX_COL_COUNT),
      Editor.MIN_COL_COUNT
    );
    options.height = Math.max(
      Math.min(options.height, Editor.MAX_ROW_COUNT),
      Editor.MIN_ROW_COUNT
    );
    options.playerCount = Math.max(
      Math.min(options.playerCount, Editor.MAX_PLAYER_COUNT),
      Editor.MIN_PLAYER_COUNT
    );
    // Generate tile data
    let tileDataDict: ITileDataDict = {};
    for (let row = 0; row < options.height; row++) {
      for (let col = 0; col < options.width; col++) {
        tileDataDict[TileManager.getTileKey({ col, row })] = {
          type: options.tileType,
          walkable: null,
          bgColor: options.tileBgColor,
        };
      }
    }
    // Create the map data
    let mapInfoData: IMapInfo = {
      id: options.name,
      name: options.name,
      width: options.width,
      height: options.height,
    };
    // Generate player and character data
    let playerColors = Editor.DEFAULT_PLAYER_COLOR_LIST.slice();
    let playerDataDict: IGroupData<IPlayerData> = {};
    let characterDataDict: IGroupData<ICharacterData> = {};
    for (let i = 0; i < options.playerCount; i++) {
      (playerDataDict as IGroupData<IPlayerData>)[i] = {
        name: `Player ${i}`,
        color: randomElement(playerColors, true),
        characterID: i,
      };
      (characterDataDict as IGroupData<ICharacterData>)[i] = {
        type: randomElement(options.assetPack.characterDefPack.typeNames),
        position: { row: i, col: i },
      };
    }
    // Create the game data
    return this._loadGame({
      id: "",
      assetPackName: options.assetPack.name,
      playerDataDict,
      characterDataDict,
      itemDataDict: {},
      tileDataDict,
      mapInfoData,
    });
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
    this._game.reset();
    this._backupData = this._game.getData();
    let playerID = this._selectedPlayer
      ? this._selectedPlayer.id
      : Player.ID_RANDOM;
    console.log("start testing", playerID);
    await this._gameClient.loadLocalGame(this._backupData, playerID);
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
    this._game.mapInfo.id = this._game.mapInfo.name;
    this._game.reset();

    let data = this._game.getData();
    let blob = new Blob([JSON.stringify(data)], {
      type: "application/json",
    });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = `${this._game.mapInfo.id}.json`;
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
    let fileName = "";
    let gameData = await new Promise<IGameData>((resolve, reject) => {
      input.onchange = () => {
        let file = input.files && input.files[0];
        if (!file) {
          reject("No file is selected.");
          return;
        }
        fileName = file.name;
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
    if (!gameData.mapInfoData) {
      throw new Error("Invalid game data. Missing mapInfoData.");
    }
    return this._loadGame(gameData);
  }

  public unloadMap() {
    this.resetToolData();
    this.emit<IWillUnloadGameEvent>(
      new AnyEvent("willUnloadGame", { isLoading: false })
    );
    if (!this._game) {
      return;
    }
    this._game.destroy();
    this._game = null;
  }

  private async _loadGame(gameData: IGameData): Promise<Game> {
    this.emit<IWillUnloadGameEvent>(
      new AnyEvent("willUnloadGame", { isLoading: true })
    );
    await this._createTemplateGame(gameData.assetPackName);
    let game = await this._gameClient.loadLocalGame(gameData, Player.ID_UNSET);

    if (!game) {
      throw new Error("Failed to load game.");
    }
    game.on<IWillDestroyEvent>("willDestroy", () => {
      this.unloadMap();
      this._game = null;
    });
    game.playerGroup.forEach((player) => {
      player.isOccupied = true;
      player.apply();
      player.updateCharacter();
      player.character.apply();
    });
    this._playerCharacterList = game.playerGroup.map((player) => {
      return player.character;
    });
    this._game = game;
    this.emit<IDidLoadGameEvent>(new AnyEvent("didLoadGame", null));
    return game;
  }

  private async _createTemplateGame(assetPackName: string) {
    let assetPack = await AssetPack.load(assetPackName);
    // Destroy the previous template game
    if (this._templateGame) {
      this._templateCharacterList = [];
      this._templateTileList = [];
      this._templateTileDict = {};
      this._templateItemList = [];
      this._templateGame.destroy();
    }
    // Create a new template game
    const TILE_TYPE_LIST = assetPack.tileDefPack.typeNames;
    const CHARACTER_TYPE_LIST = assetPack.characterDefPack.typeNames;
    const ITEM_TYPE_LIST = assetPack.itemDefPack.typeNames;

    let length = Math.max(
      TILE_TYPE_LIST.length,
      CHARACTER_TYPE_LIST.length,
      ITEM_TYPE_LIST.length
    );
    let tileData: ITileData = {
      type: TILE_TYPE_LIST[0],
      walkable: null,
      bgColor: null,
    };
    let mapInfoData: IMapInfo = {
      id: undefined,
      name: "Template",
      width: length,
      height: 3,
    };
    let tileDataDict: ITileDataDict = {};
    for (let row = 0; row < mapInfoData.height; row++) {
      for (let col = 0; col < mapInfoData.width; col++) {
        tileDataDict[TileManager.getTileKey({ col, row })] = tileData;
      }
    }
    TILE_TYPE_LIST.forEach((type, index) => {
      tileDataDict[TileManager.getTileKey({ row: 0, col: index })] = {
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
    CHARACTER_TYPE_LIST.forEach((type, index) => {
      characterDataDict[index] = {
        type,
        position: { row: 1, col: index },
      };
    });
    let itemDataDict: IGroupData<IItemData> = {};
    ITEM_TYPE_LIST.forEach((type, index) => {
      itemDataDict[index] = {
        type,
        position: { row: 2, col: index },
      };
    });
    let game = new Game({
      id: "",
      assetPackName: AssetPack.DEFAULT_ASSET_PACK_NAME,
      playerDataDict,
      characterDataDict,
      itemDataDict,
      mapInfoData,
      tileDataDict,
    });
    this._templateGame = game;
    await game.init();
    // Create template tile list
    for (let i = 0; i < TILE_TYPE_LIST.length; i++) {
      let tile = game.tileManager.getTile({ row: 0, col: i });
      if (tile) {
        this._templateTileList.push(tile);
        this._templateTileDict[tile.type] = tile;
      }
    }
    // Create template character list
    for (let i = 0; i < CHARACTER_TYPE_LIST.length; i++) {
      let character = game.characterGroup.get(i);
      if (character) {
        this._templateCharacterList.push(character);
      }
    }
    // Create template item list
    for (let i = 0; i < ITEM_TYPE_LIST.length; i++) {
      let item = game.itemGroup.get(i);
      if (item) {
        this._templateItemList.push(item);
      }
    }
  }
}

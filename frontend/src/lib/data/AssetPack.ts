import { url } from "inspector";
import { IDidDestroyEvent } from "../Destroyable";
import Game from "../Game";
import AnyEvent, { IEventType } from "../events/AnyEvent";
import AnyEventEmitter from "../events/AnyEventEmitter";
import DefPack, { ISysObjDef } from "./DefPack";
import { ICharacterDef, IItemDef, ITileDef } from "./DefPack";
import { applyDefault } from "./util";

/**
 * Will be emitted when the asset pack is about to be unloaded.
 * The event handler can call the cancel() method to cancel the unloading.
 */
export interface IWillUnloadEvent extends IEventType {
  type: "willUnload";
  data: null;
}
/**
 * Will be emitted when the asset pack is unloaded.
 */
export interface IDidUnloadEvent extends IEventType {
  type: "didUnload";
  data: null;
}

export interface IAssetPackInitOptions {
  /**
   * Set this to false if you do not need to load SVG files.
   * This is useful when you are running the game on a server and do not need SVG rendering.
   * @default true
   */
  loadSVG?: boolean;
  /**
   * The base URL (or path) of the asset pack.
   * @default "/assets"
   */
  basePath?: string;
  /**
   * The URL (or path) separator.
   * @default "/"
   */
  pathSeparator?: string;
  /**
   * A custom file fetcher function.
   * This is useful when you are running the game on a server and need to fetch files from the file system instead of the network.
   * Will fetch files from the network by default.
   * @default undefined
   */
  fileFetcher?: (path: string) => Promise<string>;
  /**
   * Automatically unload the asset pack when there is no game bound to it.
   * @default true
   */
  autoUnload?: boolean;
}
const DEFAULT_OPTIONS = {
  loadSVG: true,
  basePath: "/assets",
  pathSeparator: "/",
  fileFetcher: defaultFetcher,
  autoUnload: true,
};

const PACKS_FILE_NAME = "packs.txt";
const ASSET_PACK_DICT: { [key: string]: AssetPack } = {};
const CHARACTER_DEF_FILE_NAME = "characters.json";
const ITEM_DEF_FILE_NAME = "items.json";
const TILE_DEF_FILE_NAME = "tiles.json";
const SYS_OBJ_DEF_FILE_NAME = "sysObjs.json";
const SVG_DIR_NAME = "svgs";
// const SVG_INDEX_FILE_NAME = `svgs.txt`;
let _allowNew = false;

/**
 * An asset pack that contains all the assets needed for a game.
 * The main purpose of this class is to preload and cache assets before the game starts.
 * To get an asset pack, use AssetPack.load() instead of creating a new instance.
 */
export default class AssetPack extends AnyEventEmitter {
  private static _options: IAssetPackInitOptions;
  private static _packs: Array<string> | null = null;

  public static readonly DEFAULT_ASSET_PACK_NAME = "default";

  private _bindedGameSet: Set<Game> = new Set();
  /**
   * Initialize the asset pack system.
   * @param options Configuration options.
   */
  public static init(options?: IAssetPackInitOptions) {
    if (AssetPack._options) {
      throw new Error("AssetPack.init() must be called only once.");
    }
    AssetPack._options = applyDefault(options || {}, DEFAULT_OPTIONS);
  }
  /**
   * Load an asset pack.
   * If the specified asset pack is already loaded, this method will return the cached asset pack.
   */
  public static load(name: string): Promise<AssetPack> {
    if (!AssetPack._options) {
      throw new Error(
        "AssetPack.init() must be called before loading asset packs."
      );
    }
    let assetPack = ASSET_PACK_DICT[name];
    if (!assetPack) {
      _allowNew = true;
      assetPack = new AssetPack(name);
      _allowNew = false;
      ASSET_PACK_DICT[name] = assetPack;
    }
    return assetPack._load();
  }
  /**
   * Unload an asset pack.
   * Usually you do not need to call this method manually because the asset pack will be unloaded automatically when there is no game bound to it.
   * Unloading an asset pack while there are still games bound to it will cause unexpected errors and should be avoided.
   */
  public static unload(name: string) {
    if (!AssetPack._options) {
      throw new Error(
        "AssetPack.init() must be called before unloading asset packs."
      );
    }
    let assetPack = ASSET_PACK_DICT[name];
    if (!assetPack) {
      return;
    }
    assetPack.emit<IWillUnloadEvent>(new AnyEvent("willUnload", null));
    assetPack._clearCache();
    delete ASSET_PACK_DICT[name];
    assetPack.emit<IDidUnloadEvent>(new AnyEvent("didUnload", null));
  }
  /**
   * Get a list of available asset packs.
   */
  public static async getPacks(): Promise<Array<string>> {
    if (!AssetPack._options) {
      throw new Error(
        "AssetPack.init() must be called before getting asset packs."
      );
    }
    if (AssetPack._packs) {
      return AssetPack._packs;
    }
    let packsURL = [AssetPack._options.basePath, PACKS_FILE_NAME].join(
      AssetPack._options.pathSeparator
    );
    let packsText = await AssetPack._options.fileFetcher!(packsURL);
    let packs: Array<string> = [];
    packsText.split("\n").forEach((line) => {
      line = line.trim();
      if (line.length > 0) {
        packs.push(line);
      }
    });
    AssetPack._packs = packs;
    return packs;
  }

  private _isLoaded: boolean = false;
  private _name: string;
  private _characterDefPack: DefPack<ICharacterDef> | null = null;
  private _itemDefPack: DefPack<IItemDef> | null = null;
  private _tileDefPack: DefPack<ITileDef> | null = null;
  private _sysObjDefPack: DefPack<ISysObjDef> | null = null;
  private _svgNameSet: Set<string> | null = null;
  private _svgURLDict: { [key: string]: string } = {};
  // private _svgIndexURL: string;
  private _loadingPromise: Promise<this> | null = null;

  /**
   * Check if this asset pack is the default asset pack.
   */
  public get isDefault(): boolean {
    return this._name === AssetPack.DEFAULT_ASSET_PACK_NAME;
  }
  /**
   * Get the name of this asset pack.
   */
  public get name(): string {
    return this._name;
  }
  /**
   * Get the base URL of this asset pack.
   */
  public get basePath(): string {
    return AssetPack._options.basePath as string;
  }
  /**
   * Get the character definition pack of this asset pack.
   */
  public get characterDefPack(): DefPack<ICharacterDef> {
    return this._characterDefPack as DefPack<ICharacterDef>;
  }
  /**
   * Get the item definition pack of this asset pack.
   */
  public get itemDefPack(): DefPack<IItemDef> {
    return this._itemDefPack as DefPack<IItemDef>;
  }
  /**
   * Get the tile definition pack of this asset pack.
   */
  public get tileDefPack(): DefPack<ITileDef> {
    return this._tileDefPack as DefPack<ITileDef>;
  }
  /**
   * Get the system object definition pack of this asset pack.
   */
  public get sysObjDefPack(): DefPack<ISysObjDef> {
    return this._sysObjDefPack as DefPack<ISysObjDef>;
  }
  /**
   * Check if this asset pack is loaded.
   */
  public get isLoaded(): boolean {
    return this._isLoaded;
  }

  /**
   * An asset manager that loads and caches assets from the specified asset pack.
   * @param name
   */
  constructor(name: string) {
    if (!_allowNew) {
      throw new Error(
        "Cannot create new AssetPack. Use AssetPack.getAssetPack() instead."
      );
    }
    super();
    this._name = name;
  }
  /**
   * Get the list of SVG Names (without the .svg extension) in this asset pack.
   */
  public getSVGNames(): Array<string> {
    return Array.from(this._svgNameSet as Set<string>);
  }
  /**
   * Get the blob URL of the loaded SVG.
   * Will throw an error if the specified SVG not found or not loaded yet.
   * Use AssetPack.isSVGLoaded() to check if the SVG is loaded before calling this method.
   * @param svgName The name of the SVG (without the .svg extension).
   */
  public getSVGURL(svgName: string): string {
    let url = this._svgURLDict[svgName];
    if (url) {
      return url;
    }
    if (this._svgNameSet?.has(svgName)) {
      throw new Error(`SVG ${svgName} is not loaded yet.`);
    }
    throw new Error(`Unknown SVG ID: ${svgName}`);
  }
  /**
   * Check if the asset pack has the specified SVG.
   * Note that even if this method returns true, the SVG may not be loaded yet.
   * To check if the SVG is loaded, use AssetPack.isSVGLoaded() instead.
   * @param svgName The name of the SVG (without the .svg extension).
   */
  public hasSVG(svgName: string): boolean {
    return this._svgNameSet?.has(svgName) || false;
  }
  /**
   * Check if the specified SVG is loaded.
   * @param svgName The name of the SVG (without the .svg extension).
   */
  public isSVGLoaded(svgName: string): boolean {
    return !!this._svgURLDict[svgName];
  }
  /**
   * Bind the asset pack to a game to prevent it from being unloaded.
   * Will unbind the asset pack from the game automatically when the game is destroyed.
   * @param game the game to bind to.
   */
  public bind(game: Game) {
    if (game.isDestroyed) {
      throw new Error("Cannot bind a destroyed game.");
    }
    this._bindedGameSet.add(game);
    game.once<IDidDestroyEvent>("didDestroy", () => {
      this.unbind(game);
    });
  }
  /**
   * Usually you do not need to call this method manually because the asset pack will be unbound automatically when the game is destroyed.
   * Unbind the asset pack from a game.
   * If the option autoUnload is set to true, the asset pack will be unloaded if there is no game bound to it.
   * @param game
   */
  public unbind(game: Game) {
    this._bindedGameSet.delete(game);
    if (
      AssetPack._options.autoUnload &&
      this._bindedGameSet.size === 0 &&
      !this.isDefault
    ) {
      AssetPack.unload(this.name);
    }
  }
  /**
   * Get a list of games that are bound to this asset pack.
   */
  public getBindings(): Array<Game> {
    return Array.from(this._bindedGameSet);
  }

  private _load(): Promise<this> {
    if (this._isLoaded) {
      return Promise.resolve(this);
    }
    if (this._loadingPromise) {
      return this._loadingPromise;
    }
    let exec = async () => {
      // Load definition files.
      let promiseList: Array<Promise<DefPack<any>>> = [
        this._loadCharacterDef(),
        this._loadItemDef(),
        this._loadTileDef(),
        this._loadSysObjDef(),
      ];
      let defPacks = await Promise.all(promiseList);
      // Create SVG name set.
      if (!this._svgNameSet) {
        let rawSVGNameList: Array<string> = [];
        defPacks.forEach((defPack) => {
          rawSVGNameList.push(...defPack.svgNames);
        });
        this._svgNameSet = new Set(rawSVGNameList);
      }
      // Load SVG files.
      if (AssetPack._options.loadSVG) {
        await this._loadSvgFiles(this._svgNameSet);
      }
      this._isLoaded = true;
      this._loadingPromise = null;
      return this;
    };
    this._loadingPromise = exec();
    return this._loadingPromise;
  }

  private async _loadCharacterDef() {
    if (!this._characterDefPack) {
      const url = [this.basePath, this._name, CHARACTER_DEF_FILE_NAME].join(
        AssetPack._options.pathSeparator
      );
      let characterDefText = await this._fetchFile(url);
      this._characterDefPack = DefPack.character(JSON.parse(characterDefText));
    }
    return this._characterDefPack;
  }

  private async _loadItemDef() {
    if (!this._itemDefPack) {
      const url = [this.basePath, this._name, ITEM_DEF_FILE_NAME].join(
        AssetPack._options.pathSeparator
      );
      let itemDefText = await this._fetchFile(url);
      this._itemDefPack = DefPack.item(JSON.parse(itemDefText));
    }
    return this._itemDefPack;
  }

  private async _loadTileDef() {
    if (!this._tileDefPack) {
      const url = [this.basePath, this._name, TILE_DEF_FILE_NAME].join(
        AssetPack._options.pathSeparator
      );
      let tileDefText = await this._fetchFile(url);
      this._tileDefPack = DefPack.tile(JSON.parse(tileDefText));
    }
    return this._tileDefPack;
  }

  private async _loadSysObjDef() {
    if (!this._sysObjDefPack) {
      const url = [this.basePath, this._name, SYS_OBJ_DEF_FILE_NAME].join(
        AssetPack._options.pathSeparator
      );
      let sysObjDefText = await this._fetchFile(url);
      this._sysObjDefPack = DefPack.sysObj(JSON.parse(sysObjDefText));
    }
    return this._sysObjDefPack;
  }

  protected async _loadSvgFiles(svgNameSet: Set<string>) {
    let svgNameList = Array.from(svgNameSet);
    // Load SVG files.
    for (let i = 0; i < svgNameList.length; i++) {
      let svgName = svgNameList[i];
      if (this._svgURLDict[svgName]) {
        continue;
      }
      let svgSrcURL = [
        this.basePath,
        this._name,
        SVG_DIR_NAME,
        `${svgName}.svg`,
      ].join(AssetPack._options.pathSeparator);
      let svgText = await this._fetchFile(svgSrcURL);
      const svg = new Blob([svgText], { type: "image/svg+xml" });
      const url = URL.createObjectURL(svg);
      this._svgURLDict[svgName] = url;
    }
  }

  private async _clearCache() {
    this._isLoaded = false;
    this._characterDefPack = null;
    this._itemDefPack = null;
    this._tileDefPack = null;
    this._sysObjDefPack = null;
    this._svgNameSet = null;
    Object.keys(this._svgURLDict).forEach((key) => {
      URL.revokeObjectURL(this._svgURLDict[key]);
    });
    this._svgURLDict = {};
  }
  // Wrap the file fetcher function to handle errors.
  private async _fetchFile(path: string): Promise<string> {
    try {
      return await AssetPack._options.fileFetcher!(path);
    } catch (error) {
      throw new Error(
        `Failed to fetch file ${path}: ${(error as Error).message || error}`
      );
    }
  }
}

async function defaultFetcher(url: string): Promise<string> {
  let response = await fetch(url);
  if (response.ok) {
    return response.text();
  }
  return Promise.reject(response.statusText);
}

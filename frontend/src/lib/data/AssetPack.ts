import { IDidDestroyEvent } from "../Destroyable";
import Game from "../Game";
import AnyEvent, { IEventType } from "../events/AnyEvent";
import AnyEventEmitter from "../events/AnyEventEmitter";
import DefPack from "./DefPack";
import { applyDefault } from "./util";
import TileDefPack from "./TileDefPack";
import CharacterDefPack from "./CharacterDefPack";
import ItemDefPack from "./ItemDefPack";
import SysObjDefPack from "./SysObjDefPack";

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
  loadImage?: boolean;
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
  loadImage: true,
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
const IMAGE_DIR_NAME = "images";
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
  private _characterDefPack: CharacterDefPack | null = null;
  private _itemDefPack: ItemDefPack | null = null;
  private _tileDefPack: TileDefPack | null = null;
  private _sysObjDefPack: SysObjDefPack | null = null;
  private _svgNameSet: Set<string> | null = null;
  private _imageNameSet: Set<string> | null = null;
  private _svgStringDict: { [key: string]: string } = {};
  private _imageURLDict: { [key: string]: string } = {};
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
  public get characterDefPack(): CharacterDefPack {
    return this._characterDefPack as CharacterDefPack;
  }
  /**
   * Get the item definition pack of this asset pack.
   */
  public get itemDefPack(): ItemDefPack {
    return this._itemDefPack as ItemDefPack;
  }
  /**
   * Get the tile definition pack of this asset pack.
   */
  public get tileDefPack(): TileDefPack {
    return this._tileDefPack as TileDefPack;
  }
  /**
   * Get the system object definition pack of this asset pack.
   */
  public get sysObjDefPack(): SysObjDefPack {
    return this._sysObjDefPack as SysObjDefPack;
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
   * Get the list of image names in this asset pack.
   */
  public getImageNames(): Array<string> {
    return Array.from(this._imageNameSet as Set<string>);
  }
  /**
   * Get the SVG string of the specified SVG.
   * Will throw an error if the specified SVG not found or not loaded yet.
   * Use AssetPack.isSVGLoaded() to check if the SVG is loaded before calling this method.
   */
  public getSVGString(svgName: string): string {
    let svgString = this._svgStringDict[svgName];
    if (svgString) {
      return svgString;
    }
    if (this._svgNameSet?.has(svgName)) {
      throw new Error(`SVG ${svgName} is not loaded yet.`);
    }
    throw new Error(`Unknown SVG ID: ${svgName}`);
  }
  /**
   * Get the URL of the specified image.
   * Will throw an error if the specified image not found or not loaded yet.
   * Use AssetPack.isImageLoaded() to check if the image is loaded before calling this method.
   */
  public getImageURL(imageName: string): string {
    let imageURL = this._imageURLDict[imageName];
    if (imageURL) {
      return imageURL;
    }
    if (this._imageNameSet?.has(imageName)) {
      throw new Error(`Image ${imageName} is not loaded yet.`);
    }
    throw new Error(`Unknown image name: ${imageName}`);
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
   * Check if the asset pack has the specified image.
   * @param imageName The name of the image.
   */
  public hasImage(imageName: string): boolean {
    return this._imageNameSet?.has(imageName) || false;
  }
  /**
   * Check if the specified SVG is loaded.
   * @param svgName The name of the SVG (without the .svg extension).
   */
  public isSVGLoaded(svgName: string): boolean {
    return !!this._svgStringDict[svgName];
  }
  /**
   * Check if the specified image is loaded.
   */
  public isImageLoaded(imageName: string): boolean {
    return !!this._imageNameSet?.has(imageName);
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
        // Using Set to remove duplicates.
        this._svgNameSet = new Set(rawSVGNameList);
      }
      // Create image name set.
      if (!this._imageNameSet) {
        let rawImageNameList: Array<string> = [];
        defPacks.forEach((defPack) => {
          rawImageNameList.push(...defPack.imageNames);
        });
        // Using Set to remove duplicates.
        this._imageNameSet = new Set(rawImageNameList);
      }
      // Load SVG & image files.
      if (AssetPack._options.loadImage) {
        await Promise.all([
          this._loadSvgFiles(this._svgNameSet),
          this._loadImageFiles(this._imageNameSet),
        ]);
      }
      // Set loaded flag.
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
      this._characterDefPack = new CharacterDefPack(
        JSON.parse(characterDefText)
      );
    }
    return this._characterDefPack;
  }

  private async _loadItemDef() {
    if (!this._itemDefPack) {
      const url = [this.basePath, this._name, ITEM_DEF_FILE_NAME].join(
        AssetPack._options.pathSeparator
      );
      let itemDefText = await this._fetchFile(url);
      this._itemDefPack = new ItemDefPack(JSON.parse(itemDefText));
    }
    return this._itemDefPack;
  }

  private async _loadTileDef() {
    if (!this._tileDefPack) {
      const url = [this.basePath, this._name, TILE_DEF_FILE_NAME].join(
        AssetPack._options.pathSeparator
      );
      let tileDefText = await this._fetchFile(url);
      this._tileDefPack = new TileDefPack(JSON.parse(tileDefText));
    }
    return this._tileDefPack;
  }

  private async _loadSysObjDef() {
    if (!this._sysObjDefPack) {
      const url = [this.basePath, this._name, SYS_OBJ_DEF_FILE_NAME].join(
        AssetPack._options.pathSeparator
      );
      let sysObjDefText = await this._fetchFile(url);
      this._sysObjDefPack = new SysObjDefPack(JSON.parse(sysObjDefText));
    }
    return this._sysObjDefPack;
  }

  private async _loadSvgFiles(svgNameSet: Set<string>) {
    let svgNameList = Array.from(svgNameSet);
    let promiseList: Array<Promise<string | null>> = svgNameList.map(
      (svgName) => {
        if (this._svgStringDict[svgName]) {
          return Promise.resolve(null);
        }
        let svgURL = [this.basePath, this._name, IMAGE_DIR_NAME, svgName].join(
          AssetPack._options.pathSeparator
        );
        return this._fetchFile(svgURL);
      }
    );
    let svgStringList = await Promise.all(promiseList);
    // Create SVG string dict.
    svgStringList.forEach((svgString, index) => {
      if (svgString) {
        this._svgStringDict[svgNameList[index]] = svgString;
      }
    });
  }

  private async _loadImageFiles(imageNameSet: Set<string>) {
    let imageNameList = Array.from(imageNameSet);
    let promiseList: Array<Promise<HTMLImageElement | null>> =
      imageNameList.map((imageName) => {
        if (this._imageURLDict[imageName]) {
          return Promise.resolve(null);
        }
        let imageURL = [
          this.basePath,
          this._name,
          IMAGE_DIR_NAME,
          imageName,
        ].join(AssetPack._options.pathSeparator);
        return this._preloadImage(imageURL);
      });
    let imageList = await Promise.all(promiseList);
    // Create image URL dict.
    imageList.forEach((image, index) => {
      if (image) {
        this._imageURLDict[imageNameList[index]] = image.src;
      }
    });
  }

  private _preloadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      let img = new Image();
      img.onload = () => {
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  private async _clearCache() {
    this._isLoaded = false;
    this._characterDefPack = null;
    this._itemDefPack = null;
    this._tileDefPack = null;
    this._sysObjDefPack = null;
    this._svgNameSet = null;
    this._imageNameSet = null;
    Object.keys(this._svgStringDict).forEach((key) => {
      URL.revokeObjectURL(this._svgStringDict[key]);
    });
    this._svgStringDict = {};
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

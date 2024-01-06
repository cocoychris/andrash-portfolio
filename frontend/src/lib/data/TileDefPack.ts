import DefPack, { IDefPack, IDefinition } from "./DefPack";
import FieldDef from "./FieldDef";

/**
 * Definition of a tile.
 */
export interface ITileDef extends IDefinition {
  bgColor: string | null;
  bgImageName?: string | null;
  fgImageName?: string | null;
  fgSVGName?: string | null;
  walkable: boolean;
  texture: string;
  transition?: {
    texture: string;
    type: string;
  } | null;
  pathway?: {
    texture: string;
    type: string;
  } | null;
  _textures: Array<string>;
}

const TILE_FIELD_DEF: FieldDef<ITileDef> = new FieldDef(
  {
    type: "object",
    children: {
      bgColor: {
        type: "string",
        acceptNull: true,
      },
      bgImageName: {
        type: "string",
        acceptNull: true,
        acceptUndefined: true,
      },
      fgImageName: {
        type: "string",
        acceptNull: true,
        acceptUndefined: true,
      },
      fgSVGName: {
        type: "string",
        acceptNull: true,
        acceptUndefined: true,
      },
      walkable: {
        type: "boolean",
      },
      texture: {
        type: "string",
      },
      transition: {
        type: "object",
        acceptNull: true,
        acceptUndefined: true,
        children: {
          texture: {
            type: "string",
          },
          type: {
            type: "string",
          },
        },
      },
      pathway: {
        type: "object",
        acceptNull: true,
        acceptUndefined: true,
        children: {
          texture: {
            type: "string",
          },
          type: {
            type: "string",
          },
        },
      },
    },
  },
  undefined as any,
  "tileDef"
);

const PATH = "_pathwayTexture"; //Pathway tile texture
const TRAN = "_transitionTexture"; //Transition tile texture
const MAIN = "_mainTexture"; //Main tile texture
const ANYT = "_anyTexture"; //Any texture will match
const NOTX = "_noTexture"; //No texture at this direction
const NOPA = "_noPathway"; //No path at this direction
/**
 * This is a map that defines the requirements of textures for a tile to turn into a transition tile (of a specific transition type).
 * Each transition type has a template that defines the requirements for each adjacent tile.
 * The tile will turn into the transition tile of the transition type if the adjacent tiles fulfill the requirements.
 *
 * The meaning of each transition type is as follows:
 * - top_left: A transition tile that is at the top-left corner of a main tile.
 * - top: A transition tile that is at the top side of a main tile.
 * - top_right: A transition tile that is at the top-right corner of a main tile.
 * - left: A transition tile that is at the left side of a main tile.
 * - main: A main tile that is treated as a transition tile with only one texture. This is used to turn a transition tile into a main tile when all adjacent tiles are with the same texture and no transition tile is needed.
 * - right: A transition tile that is at the right side of a main tile.
 * - bottom_left: A transition tile that is at the bottom-left corner of a main tile.
 * - bottom: A transition tile that is at the bottom side of a main tile.
 * - bottom_right: A transition tile that is at the bottom-right corner of a main tile.
 *
 * The length of the array is 8, each element represents a direction:
 * - #0: top-left
 * - #1: top
 * - #2: top-right
 * - #3: left
 * - #4: right
 * - #5: bottom-left
 * - #6: bottom
 * - #7: bottom-right
 *
 * The value of each element is the texture requirement for that direction:
 * - MAIN: main tile texture
 * - TRAN: transition tile texture
 * - PATH: pathway texture
 * - ANYT: no requirement. Any texture will match.
 */
const TRANSITION_REQUIREMENT_MAP: {
  [transitionType: string]: Array<string>;
} = Object.freeze({
  main: [MAIN, MAIN, MAIN, MAIN, MAIN, MAIN, MAIN, MAIN], // Not a transition tile, therefore no transition texture specified.
  top_left: [TRAN, TRAN, ANYT, TRAN, ANYT, ANYT, ANYT, MAIN],
  top: [ANYT, TRAN, ANYT, ANYT, ANYT, ANYT, MAIN, ANYT],
  top_right: [ANYT, TRAN, TRAN, ANYT, TRAN, MAIN, ANYT, ANYT],
  left: [ANYT, ANYT, ANYT, TRAN, MAIN, ANYT, ANYT, ANYT],
  right: [ANYT, ANYT, ANYT, MAIN, TRAN, ANYT, ANYT, ANYT],
  bottom_left: [ANYT, ANYT, MAIN, TRAN, ANYT, TRAN, TRAN, ANYT],
  bottom: [ANYT, MAIN, ANYT, ANYT, ANYT, ANYT, TRAN, ANYT],
  bottom_right: [MAIN, ANYT, ANYT, ANYT, TRAN, ANYT, TRAN, TRAN],
});

/**
 * This is a map that defines the textures that a tile provides at 8 directions.
 * The value of each element is the texture for that direction:
 * - MAIN: main tile texture
 * - TRAN: transition tile texture
 * - NOTX: no texture. This will not fulfill any requirement value unless the requirement is ANYT.
 */
const TRANSITION_FULFILLMENT_MAP: {
  [transitionType: string]: Array<string>;
} = Object.freeze({
  main: [MAIN, MAIN, MAIN, MAIN, MAIN, MAIN, MAIN, MAIN],
  top_left: [TRAN, TRAN, TRAN, TRAN, NOTX, TRAN, NOTX, MAIN],
  top: [TRAN, TRAN, TRAN, NOTX, NOTX, MAIN, MAIN, MAIN],
  top_right: [TRAN, TRAN, TRAN, NOTX, TRAN, MAIN, NOTX, TRAN],
  left: [TRAN, NOTX, MAIN, TRAN, MAIN, TRAN, NOTX, MAIN],
  right: [MAIN, NOTX, TRAN, MAIN, TRAN, MAIN, NOTX, TRAN],
  bottom_left: [TRAN, NOTX, MAIN, TRAN, NOTX, TRAN, TRAN, TRAN],
  bottom: [MAIN, MAIN, MAIN, NOTX, NOTX, TRAN, TRAN, TRAN],
  bottom_right: [MAIN, NOTX, TRAN, NOTX, TRAN, TRAN, TRAN, TRAN],
});

const BASIC_PATHWAY_TYPE_SET = new Set<string>(["horizontal", "vertical"]);

const PATHWAY_REQUIREMENT_MAP: { [pathwayType: string]: Array<string> } =
  Object.freeze({
    cross: [NOPA, PATH, NOPA, PATH, PATH, NOPA, PATH, NOPA],
    horizontal: [NOPA, NOPA, NOPA, PATH, PATH, NOPA, NOPA, NOPA],
    vertical: [NOPA, PATH, NOPA, NOPA, NOPA, NOPA, PATH, NOPA],
    top_left: [NOPA, NOPA, NOPA, NOPA, PATH, NOPA, PATH, NOPA],
    top: [NOPA, NOPA, NOPA, PATH, PATH, NOPA, PATH, NOPA],
    top_right: [NOPA, NOPA, NOPA, PATH, NOPA, NOPA, PATH, NOPA],
    left: [NOPA, PATH, NOPA, NOPA, PATH, NOPA, PATH, NOPA],
    right: [NOPA, PATH, NOPA, PATH, NOPA, NOPA, PATH, NOPA],
    bottom_left: [NOPA, PATH, NOPA, NOPA, PATH, NOPA, NOPA, NOPA],
    bottom: [NOPA, PATH, NOPA, PATH, PATH, NOPA, NOPA, NOPA],
    bottom_right: [NOPA, PATH, NOPA, PATH, NOPA, NOPA, NOPA, NOPA],
    end_top: [NOPA, NOPA, NOPA, NOPA, NOPA, NOPA, PATH, NOPA],
    end_left: [NOPA, NOPA, NOPA, NOPA, PATH, NOPA, NOPA, NOPA],
    end_right: [NOPA, NOPA, NOPA, PATH, NOPA, NOPA, NOPA, NOPA],
    end_bottom: [NOPA, PATH, NOPA, NOPA, NOPA, NOPA, NOPA, NOPA],
  });
const PATHWAY_FULFILLMENT_MAP: { [pathwayType: string]: Array<string> } =
  Object.freeze({
    cross: [NOPA, PATH, NOPA, PATH, PATH, NOPA, PATH, NOPA],
    horizontal: [NOPA, NOPA, NOPA, PATH, PATH, NOPA, NOPA, NOPA],
    vertical: [NOPA, PATH, NOPA, NOPA, NOPA, NOPA, PATH, NOPA],
    top_left: [NOPA, NOPA, NOPA, NOPA, PATH, NOPA, PATH, NOPA],
    top: [NOPA, NOPA, NOPA, PATH, PATH, NOPA, PATH, NOPA],
    top_right: [NOPA, NOPA, NOPA, PATH, NOPA, NOPA, PATH, NOPA],
    left: [NOPA, PATH, NOPA, NOPA, PATH, NOPA, PATH, NOPA],
    right: [NOPA, PATH, NOPA, PATH, NOPA, NOPA, PATH, NOPA],
    bottom_left: [NOPA, PATH, NOPA, NOPA, PATH, NOPA, NOPA, NOPA],
    bottom: [NOPA, PATH, NOPA, PATH, PATH, NOPA, NOPA, NOPA],
    bottom_right: [NOPA, PATH, NOPA, PATH, NOPA, NOPA, NOPA, NOPA],
    end_top: [NOPA, NOPA, NOPA, NOPA, NOPA, NOPA, PATH, NOPA],
    end_left: [NOPA, NOPA, NOPA, NOPA, PATH, NOPA, NOPA, NOPA],
    end_right: [NOPA, NOPA, NOPA, PATH, NOPA, NOPA, NOPA, NOPA],
    end_bottom: [NOPA, PATH, NOPA, NOPA, NOPA, NOPA, NOPA, NOPA],
  });

export default class TileDefPack extends DefPack<ITileDef> {
  public static TEXTURE_NONE = NOTX;
  public static PATHWAY_NONE = NOPA;
  private _textureMainTileTypeMap: Map<string, Array<string>> = new Map<
    string,
    Array<string>
  >();
  private _textureTransTileTypeMap: Map<string, Array<string>> = new Map<
    string,
    Array<string>
  >();
  private _textureBasicPathwayTileTypeMap: Map<string, Array<string>> = new Map<
    string,
    Array<string>
  >();
  private _texturePathwayTileTypeMap: Map<string, Array<string>> = new Map<
    string,
    Array<string>
  >();
  private _tileTextureNames: Array<string> = [];
  private _pathwayTextureNames: Array<string> = [];
  private _requirementTileTypeTree: Map<
    string | null,
    Map<string | null, any> | Array<string>
  > = new Map<string | null, any>();

  /**
   * List of tile texture names
   * Pathway textures are not included
   */
  public get tileTextureNames(): Array<string> {
    return this._tileTextureNames;
  }
  /**
   * List of pathway texture names
   */
  public get pathwayTextureNames(): Array<string> {
    return this._pathwayTextureNames;
  }

  constructor(defPack: IDefPack<ITileDef>) {
    super("tile", defPack, TILE_FIELD_DEF);
    // Get textures from main tile
    this.typeNames.forEach((typeName) => {
      const tileDef = this.defPack[typeName];
      // Add textures to tile def
      tileDef._textures = this._getTextures(tileDef);
      if (tileDef.pathway) {
        let pathwayTexture = tileDef.pathway.texture;
        let pathwayType: string = tileDef.pathway.type;
        if (BASIC_PATHWAY_TYPE_SET.has(pathwayType)) {
          this._addBasicPathwayTileType(pathwayTexture, typeName);
        }
        this._addPathwayTileType(pathwayTexture, typeName);
        this._addTransitionTileType(pathwayTexture, typeName);
      } else if (tileDef.transition) {
        let transitionTexture = tileDef.transition.texture;
        // Is transition tile - add to transition tile map
        [tileDef.texture, transitionTexture].forEach((texture) => {
          this._addTransitionTileType(texture, typeName);
        });
      } else {
        // Is main tile - add to main tile map
        this._addMainTileType(tileDef.texture, typeName);
      }
      // Create transition tile type tree for auto-fitting
      let requirements = this._getTextures(tileDef, true);
      let requirementTileTypeTree: Map<string | null, any> =
        this._requirementTileTypeTree;
      for (let i = 0; i < requirements.length; i++) {
        const texture = requirements[i];
        if (i === requirements.length - 1) {
          let typeNameList = requirementTileTypeTree.get(texture);
          if (!typeNameList) {
            requirementTileTypeTree.set(texture, [typeName]);
          } else {
            typeNameList.push(typeName);
          }
          break;
        }
        // Create child tree
        let childTree = requirementTileTypeTree.get(texture);
        if (!childTree) {
          childTree = new Map<string | null, any>();
          requirementTileTypeTree.set(texture, childTree);
        }
        requirementTileTypeTree = childTree;
      }
    });
  }
  /**
   * Get main tile types that use the given texture
   */
  public getTextureMainTileTypes(texture: string): Array<string> {
    return this._textureMainTileTypeMap.get(texture) || [];
  }
  /**
   * Get transition tile types that use the given texture
   */
  public getTextureTransitionTileTypes(texture: string): Array<string> {
    return this._textureTransTileTypeMap.get(texture) || [];
  }
  /**
   * Get pathway tile types that use the given texture
   */
  public getTextureBasicPathwayTileTypes(texture: string): Array<string> {
    return this._textureBasicPathwayTileTypeMap.get(texture) || [];
  }
  /**
   * Get pathway tile types that use the given texture
   */
  public getTexturePathwayTileTypes(texture: string): Array<string> {
    return this._texturePathwayTileTypeMap.get(texture) || [];
  }
  /**
   * Search for the suitable transition tile type for the given adjacent textures
   * @param textures
   * @returns
   */
  public searchAutoTileTypes(
    adjacentTextures: Array<string>
  ): Array<string> | null {
    if (adjacentTextures.length !== 16) {
      throw new Error(
        `Invalid adjacent texture array length (${adjacentTextures.length}), must be 16`
      );
    }
    let search = (
      tree: Map<string | null, any>,
      index: number
    ): Array<string> | null => {
      const texture = adjacentTextures[index];
      let childNode: Map<string | null, any> | Array<string> | undefined;
      let result: Array<string> = [];
      // Any adjacent texture will matche "any" texture requirement
      childNode = tree.get(ANYT); //sreach in "any" first
      // A tile type is found - return it
      if (Array.isArray(childNode)) {
        result.push(...childNode);
        // A child tree is found - search deeper
      } else if (childNode instanceof Map) {
        const childResult = search(childNode, index + 1);
        if (childResult) {
          result.push(...childResult);
        }
      }
      // A null adjacent texture matches nothing - return null
      if (texture !== null) {
        // An adjacent texture is provided - search with the texture
        childNode = tree.get(texture);
        // A tile type is found - return it
        if (Array.isArray(childNode)) {
          result.push(...childNode);
          // A child tree is found - search deeper
        } else if (childNode instanceof Map) {
          const childResult = search(childNode, index + 1);
          if (childResult) {
            result.push(...childResult);
          }
        }
      }
      // No tile type is found - return null
      return result.length > 0 ? result : null;
    };
    return search(this._requirementTileTypeTree, 0);
  }
  /**
   * Get an array that represents the texture that the tile provides ( or required for auto-fit ) at 8 directions.
   * @param tileDef Tile definition
   * @param isRequirement Use requirement map instead of texture map
   * @returns An array of texture names. The length of the array is 16. 8 for transition tile and 8 for pathway tile.
   */
  private _getTextures(
    tileDef: ITileDef,
    isRequirement: boolean = false
  ): Array<string> {
    const transitionMap: { [key: string]: Array<string> } = isRequirement
      ? TRANSITION_REQUIREMENT_MAP
      : TRANSITION_FULFILLMENT_MAP;
    const pathwayMap: { [key: string]: Array<string> } = isRequirement
      ? PATHWAY_REQUIREMENT_MAP
      : PATHWAY_FULFILLMENT_MAP;
    // Transition tile
    let transitionTexture: string = tileDef.texture;
    let transitionTemplate: Array<string> = transitionMap["main"];
    if (tileDef.transition) {
      transitionTexture = tileDef.transition.texture;
      let transitionType: string = tileDef.transition.type;
      if (transitionTexture == tileDef.texture) {
        throw new Error(
          `Invalid transition texture (${transitionTexture}), cannot be the same as main tile texture`
        );
      }
      transitionTemplate = transitionMap[transitionType];
      if (!transitionTemplate) {
        throw new Error(`Invalid transition type (${transitionType})`);
      }
    }
    // Pathway tile
    let pathwayTexture: string = tileDef.texture;
    let pathwayTemplate: Array<string> = Array(8).fill(NOPA);
    if (tileDef.pathway) {
      pathwayTexture = tileDef.pathway.texture;
      let pathwayType: string = tileDef.pathway.type;
      if (pathwayTexture == tileDef.texture) {
        throw new Error(
          `Invalid pathway texture (${pathwayTexture}), cannot be the same as main tile texture`
        );
      }
      pathwayTemplate = pathwayMap[pathwayType];
      if (!pathwayTemplate) {
        throw new Error(`Invalid pathway type (${pathwayType})`);
      }
    }
    // Create requirement array by combining transition and pathway templates
    const textureDict: { [key: string]: string } = {
      [MAIN]: tileDef.texture,
      [TRAN]: transitionTexture,
      [PATH]: pathwayTexture,
    };
    return [...transitionTemplate, ...pathwayTemplate].map((texture) => {
      return (texture && textureDict[texture]) || texture;
    });
  }

  private _addMainTileType(texture: string, typeName: string) {
    const mainTileTypes = this._textureMainTileTypeMap.get(texture);
    if (mainTileTypes) {
      mainTileTypes.push(typeName);
    } else {
      this._tileTextureNames.push(texture);
      this._textureMainTileTypeMap.set(texture, [typeName]);
    }
  }

  private _addTransitionTileType(texture: string, typeName: string) {
    const transTileTypes = this._textureTransTileTypeMap.get(texture);
    if (transTileTypes) {
      transTileTypes.push(typeName);
    } else {
      this._textureTransTileTypeMap.set(texture, [typeName]);
    }
  }

  private _addBasicPathwayTileType(texture: string, typeName: string) {
    const pathwayTileTypes = this._textureBasicPathwayTileTypeMap.get(texture);
    if (pathwayTileTypes) {
      pathwayTileTypes.push(typeName);
    } else {
      this._pathwayTextureNames.push(texture);
      this._textureBasicPathwayTileTypeMap.set(texture, [typeName]);
    }
  }
  private _addPathwayTileType(texture: string, typeName: string) {
    const pathwayTileTypes = this._texturePathwayTileTypeMap.get(texture);
    if (pathwayTileTypes) {
      pathwayTileTypes.push(typeName);
    } else {
      this._texturePathwayTileTypeMap.set(texture, [typeName]);
    }
  }
}

import { ReactSVG } from "react-svg";
import React, { Component, ReactNode } from "react";
import AssetPack, { IDidUnloadEvent } from "../../lib/data/AssetPack";
import { IIndexable } from "../../lib/data/util";

interface ISVGDisplayProps {
  assetPack: AssetPack;
  svgName: string;
  divID?: string;
  divClassName?: string;
  svgStyle?: React.CSSProperties;
}

export default function SVGDisplay(props: ISVGDisplayProps) {
  return SVGCachePack.getElement(props);
}
function _setStyle(svg: SVGElement, style: React.CSSProperties) {
  let keys = Object.keys(style) as Array<keyof React.CSSProperties>;
  keys.forEach((key) => {
    (svg.style as IIndexable)[key] = style[key];
  });
}
/**
 * SVGCachePack caches SVG elements for an asset pack.
 *
 * This approach is used to prevent ReactSVG from reloading the same SVG while setting the style with `beforeInjection`. Invoking `beforeInjection` each time ReactSVG loads an SVG can cause significant lag and may also trigger a restart of the SVG animation, as the SVG is entirely reloaded.
 *
 * This cache is different from the cache used by AssetPack or ReactSVG. The cache used by AssetPack caches the SVG data, while the cache used by ReactSVG caches the SVG element. This cache caches the SVG element with the style and all the props applied.
 * @author Andrash Yang 2023.12
 * cocoychris@gmail.com
 */
class SVGCachePack {
  private static _allowNew = false;
  private static readonly CACHE_PACK_DICT: { [key: string]: SVGCachePack } = {};

  public static getElement(props: ISVGDisplayProps) {
    let cachePack = SVGCachePack._getPack(props.assetPack);
    return cachePack.getElement(props);
  }

  /**
   * Get a cachePack for an assetPack
   * @param assetPack AssetPack to get cachePack for
   * @returns CachePack for assetPack
   */
  private static _getPack(assetPack: AssetPack) {
    // Return cachePack if it exists
    let cachePack = SVGCachePack.CACHE_PACK_DICT[assetPack.name];
    if (cachePack) {
      return cachePack;
    }
    // Create new cachePack
    SVGCachePack._allowNew = true;
    cachePack = new SVGCachePack(assetPack);
    SVGCachePack._allowNew = false;
    SVGCachePack.CACHE_PACK_DICT[assetPack.name] = cachePack;
    // Remove cachePack when assetPack is unloaded
    assetPack.once<IDidUnloadEvent>("didUnload", () => {
      delete SVGCachePack.CACHE_PACK_DICT[assetPack.name];
    });
    return cachePack;
  }

  private readonly SVG_ELEMENT_DICT: { [key: string]: ReactNode } = {};
  private _assetPack: AssetPack;

  constructor(assetPack: AssetPack) {
    if (!SVGCachePack._allowNew) {
      throw new Error("Use SVGCachePack.get() instead.");
    }
    // Check if assetPack is loaded
    if (!assetPack.isLoaded) {
      throw new Error("AssetPack is not loaded.");
    }
    this._assetPack = assetPack;
  }

  public getElement(props: ISVGDisplayProps) {
    if (props.assetPack !== this._assetPack) {
      throw new Error("AssetPack does not match.");
    }
    let key = this._generateKey(props);
    let svgElement = this.SVG_ELEMENT_DICT[key];
    if (svgElement) {
      return svgElement;
    }
    svgElement = (
      <ReactSVG
        id={props.divID}
        className={props.divClassName}
        src={this._assetPack.getSVGURL(props.svgName)}
        renumerateIRIElements={true}
        beforeInjection={(svg) => {
          props.svgStyle &&
            this._setStyle(svg, props.svgStyle as React.CSSProperties);
        }}
        useRequestCache={true}
      />
    );
    this.SVG_ELEMENT_DICT[key] = svgElement;
    return svgElement;
  }

  private _generateKey(props: ISVGDisplayProps) {
    let keyString = [
      props.divID,
      props.divClassName,
      props.assetPack.name,
      props.svgName,
      props.svgStyle && JSON.stringify(props.svgStyle),
    ].join("&");
    return simpleHash(keyString);
  }
  private _setStyle(svg: SVGElement, style: React.CSSProperties) {
    let keys = Object.keys(style) as Array<keyof React.CSSProperties>;
    keys.forEach((key) => {
      (svg.style as IIndexable)[key] = style[key];
    });
  }
}

/**
 * Credit to:
 * https://gist.github.com/jlevy/c246006675becc446360a798e2b2d781
 * https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript
 * http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 */
function simpleHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash &= hash; // Convert to 32bit integer
  }
  return (hash >>> 0).toString(36);
}

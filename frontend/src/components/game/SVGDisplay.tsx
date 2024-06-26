import { ReactSVG } from "react-svg";
import React, {
  Component,
  JSXElementConstructor,
  ReactElement,
  ReactNode,
} from "react";
import AssetPack, { IDidUnloadEvent } from "../../lib/data/AssetPack";
import { IIndexable } from "../../lib/data/util";
// import parse, { DOMNode, Element, domToReact } from "html-react-parser";
// import attributesToProps, {
//   Attributes,
// } from "html-react-parser/lib/attributes-to-props";

interface ISVGDisplayProps {
  assetPack: AssetPack;
  svgName: string;
  divID?: string;
  divClassName?: string;
  svgStyle?: React.CSSProperties;
  divStyle?: React.CSSProperties;
}

export default function SVGDisplay(props: ISVGDisplayProps) {
  return SVGCachePack.getElement(props);
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

  public static getElement(
    props: ISVGDisplayProps
  ): ReactElement<any, string | JSXElementConstructor<any>> | null {
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

  private readonly SVG_ELEMENT_DICT: {
    [key: string]: ReactElement<any, string | JSXElementConstructor<any>>;
  } = {};
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
  /**
   * An alternative way for rendering SVGs.
   * Using HTML parser to parse the SVG string and render it as a React element instead of using ReactSVG.
   * It works, but the performance is worse than using ReactSVG.
   * Also there are some minor issues with the SVGs rendered this way because the HTML parser does not replace the ids of the SVG elements.
   * Keeping this method here for reference.
   */
  // public getElement(props: ISVGDisplayProps) {
  //   if (props.assetPack !== this._assetPack) {
  //     throw new Error("AssetPack does not match.");
  //   }
  //   let key = this._generateKey(props);
  //   let svgElement = this.SVG_ELEMENT_DICT[key];
  //   if (svgElement) {
  //     return svgElement;
  //   }
  //   svgElement = (
  //     <div
  //       id={props.divID}
  //       className={props.divClassName}
  //       style={props.divStyle}
  //     >
  //       {parse(this._assetPack.getSVGString(props.svgName), {
  //         replace: (domNode: DOMNode) => {
  //           if (!(domNode instanceof Element)) {
  //             return;
  //           }
  //           if (domNode.name !== "svg") {
  //             return;
  //           }
  //           let attribs = domNode.attribs;
  //           let children = domNode.children;
  //           let svgProps = attributesToProps(attribs);
  //           return (
  //             <svg {...svgProps} style={props.svgStyle}>
  //               {domToReact(children as DOMNode[])}
  //             </svg>
  //           );
  //         },
  //       })}
  //     </div>
  //   );
  //   this.SVG_ELEMENT_DICT[key] = svgElement;
  //   return svgElement;
  // }

  public getElement(
    props: ISVGDisplayProps
  ): ReactElement<any, string | JSXElementConstructor<any>> | null {
    if (props.assetPack !== this._assetPack) {
      throw new Error("AssetPack does not match.");
    }
    let key = this._generateKey(props);
    let svgElement = this.SVG_ELEMENT_DICT[key];
    if (svgElement) {
      return svgElement;
    }
    const svgString = this._assetPack.getSVGString(props.svgName);
    svgElement = (
      <ReactSVG
        id={props.divID}
        className={props.divClassName}
        src={`data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`}
        renumerateIRIElements={true}
        beforeInjection={(svg) => {
          props.svgStyle &&
            this._setStyle(svg, props.svgStyle as React.CSSProperties);
        }}
        useRequestCache={true}
        style={props.divStyle}
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
      // props.svgAttributes && JSON.stringify(props.svgAttributes),
      props.divStyle && JSON.stringify(props.divStyle),
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

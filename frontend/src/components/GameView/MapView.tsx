import {
  FixedSizeGrid,
  FixedSizeGridProps,
  GridChildComponentProps,
} from "react-window";
import React, { ReactNode, RefObject, useEffect } from "react";
import Position, { IPosition } from "../../lib/Position";
import { Easing, Tween } from "@tweenjs/tween.js";
import AutoSizer from "react-virtualized-auto-sizer";
import TileDisplay, { ITileDisplayProps } from "./TileDisplay";
import Game from "../../lib/Game";

export interface IPoint {
  x: number;
  y: number;
}

export interface IScrollInfo {
  left: number;
  top: number;
}

export interface IMapViewProps {
  game: Game;
  initPosition?: IPosition;
  // mapSize: IPosition;
  minVisibleTileCount: number;
  /**
   * A callback function that is invoked when the map is clicked
   * @param position The tile position (col and row) at the clicked point
   * @param point The clicked point on the map in pixel
   * @returns Whether the tile display at the clicked position should be updated
   */
  onClick?: (position: Position, point: IPoint) => boolean;
}
interface IState {}

export default class MapView extends React.Component<IMapViewProps, IState> {
  private _width: number = 0;
  private _height: number = 0;
  private _cellSize: number = 0;
  private _gridRef: React.RefObject<Grid> = React.createRef<Grid>();
  private _position: IPosition = { col: 0, row: 0 };
  private _mapSize: IPosition = { col: 0, row: 0 };
  private _tween: Tween<IPosition> | null = null;
  private _refDict: Map<string, React.RefObject<TileDisplay>> = new Map();

  private get _grid(): Grid | null {
    if (!this._gridRef.current) {
      return null;
    }
    return this._gridRef.current;
  }
  /**
   * Width of the viewport in pixel
   */
  public get width() {
    return this._width;
  }
  /**
   * Height of the viewport in pixel
   */
  public get height() {
    return this._height;
  }
  /**
   * Cell size in pixel
   */
  public get cellSize() {
    return this._cellSize;
  }
  /**
   * The tile position (col and row) at the center of the viewport
   */
  public get position(): Position {
    return new Position(this._position);
  }
  public set position(position: IPosition) {
    this.cancel();
    this._setPosition(position);
  }
  /**
   * The map coordinate (x and y) at the center of the viewport in pixel
   */
  public get center(): IPoint {
    return this._toCenter(this._position);
  }
  public set center(value: IPoint) {
    this.cancel();
    this._setPosition(this._toPosition(value));
  }

  constructor(props: IMapViewProps) {
    console.log("MapView");
    super(props);
    // this._mapSize = props.mapSize;
    let map = props.game.map;
    this._mapSize = { col: map.colCount, row: map.rowCount };
    this._position = props.initPosition || { col: 0, row: 0 };
    this._onClick = this._onClick.bind(this);
  }

  public updateTileDisplay(position: IPosition) {
    let ref = this._refDict.get(this._toRefKey(position.col, position.row));
    ref?.current?.forceUpdate();
  }

  public componentWillUnmount(): void {
    if (this._tween) {
      this._tween.stop();
    }
  }

  public render() {
    return (
      <AutoSizer>
        {({ width, height }) => {
          this._width = width;
          this._height = height;
          this._cellSize = Math.ceil(
            Math.min(height, width) / this.props.minVisibleTileCount
          );
          let initScroll = this._toScroll(this._position);
          return (
            <div className="mapView" onClick={this._onClick}>
              <Grid
                initialScrollTop={initScroll.top}
                initialScrollLeft={initScroll.left}
                rowCount={this._mapSize.row}
                columnCount={this._mapSize.col}
                rowHeight={this._cellSize}
                columnWidth={this._cellSize}
                height={this._height}
                width={this._width}
                style={{ overflow: "hidden" }}
                ref={this._gridRef}
                onUpdate={() => {
                  this._setPosition(this._position);
                }}
              >
                {(props: GridChildComponentProps) => {
                  let ref = React.createRef<TileDisplay>();
                  this._refDict.set(
                    this._toRefKey(props.columnIndex, props.rowIndex),
                    ref
                  );
                  return (
                    <TileDisplay {...props} game={this.props.game} ref={ref} />
                  );
                }}
              </Grid>
            </div>
          );
        }}
      </AutoSizer>
    );
  }
  /**
   * Ease to a position
   */
  public ease(position: IPosition, duration: number = 500, delay: number = 0) {
    this.cancel();
    let target = this._correctPosition(position);
    // console.log("ease", target);
    this._tween = new Tween(this._position)
      .to(target, duration)
      .delay(delay)
      .easing(Easing.Quadratic.Out)
      .onUpdate((position) => {
        this._setPosition(position);
      })
      .onStop((position) => {
        this._tween = null;
      })
      .onComplete((position) => {
        this._tween = null;
      })
      .start();
  }
  /**
   * Cancel easing
   */
  public cancel() {
    if (this._tween) {
      this._tween.stop();
      this._tween = null;
    }
  }

  private _toRefKey(col: number, row: number) {
    return `${col},${row}`;
  }

  private _onClick(event: React.MouseEvent<any, MouseEvent>) {
    if (this.props.onClick) {
      let scroll = this._toScroll(this._position);
      let point = {
        x: scroll.left + event.clientX,
        y: scroll.top + event.clientY,
      };
      let position = new Position({
        col: point.x / this._cellSize,
        row: point.y / this._cellSize,
      });
      if (this.props.onClick(position.clone(), point)) {
        this.updateTileDisplay(position.floor());
      }
    }
  }

  private _toScroll(position: IPosition): IScrollInfo {
    let scroll = {
      left: position.col * this._cellSize - (this._width - this._cellSize) / 2,
      top: position.row * this._cellSize - (this._height - this._cellSize) / 2,
    };
    return this._correctScroll(scroll);
  }

  private _toCenter(position: IPosition): IPoint {
    return {
      x: position.col * this._cellSize + this._cellSize * 0.5,
      y: position.row * this._cellSize + this._cellSize * 0.5,
    };
  }

  private _toPosition(center: IPoint): Position {
    return new Position({
      col: center.x / this._cellSize,
      row: center.y / this._cellSize,
    });
  }

  private _setPosition(value: IPosition) {
    this._position = this._correctPosition(value);
    let scroll = this._toScroll(this._position);
    this._grid?.scrollTo({
      scrollLeft: scroll.left,
      scrollTop: scroll.top,
    });
  }
  private _correctPosition(position: IPosition): IPosition {
    return new Position(position)
      .max({ col: 0, row: 0 })
      .min(this._mapSize)
      .toObject();
  }
  private _correctScroll(scroll: IScrollInfo): IScrollInfo {
    let maxScroll = {
      left: this._mapSize.col * this._cellSize - this._width,
      top: this._mapSize.row * this._cellSize - this._height,
    };
    return {
      left: Math.max(0, Math.min(maxScroll.left, scroll.left)),
      top: Math.max(0, Math.min(maxScroll.top, scroll.top)),
    };
  }
}

interface IGridProps extends FixedSizeGridProps {
  onUpdate?: Function;
}
class Grid extends React.Component<IGridProps> {
  private _onUpdate?: Function;
  private _gridRef: RefObject<FixedSizeGrid> = React.createRef<FixedSizeGrid>();
  constructor(props: IGridProps) {
    super(props);
    this._onUpdate = props.onUpdate;
  }
  public scrollTo(params: {
    scrollLeft?: number | undefined;
    scrollTop?: number | undefined;
  }): void {
    this._gridRef.current?.scrollTo(params);
  }
  public componentDidUpdate(
    prevProps: Readonly<FixedSizeGridProps<any>>,
    prevState: Readonly<{}>,
    snapshot?: any
  ): void {
    this._onUpdate && this._onUpdate();
  }
  public render() {
    return <FixedSizeGrid {...this.props} ref={this._gridRef} />;
  }
}

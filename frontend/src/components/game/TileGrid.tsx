import {
  FixedSizeGrid,
  FixedSizeGridProps,
  GridChildComponentProps,
} from "react-window";
import React, { ReactElement, ReactNode, RefObject } from "react";
import Position, { IPosition } from "../../lib/Position";
import { Easing, Tween } from "@tweenjs/tween.js";
import AutoSizer from "react-virtualized-auto-sizer";
import TileDisplay from "./TileDisplay";
import Game from "../../lib/Game";

export interface IPoint {
  x: number;
  y: number;
}

export interface IScrollInfo {
  left: number;
  top: number;
}

export interface IMouseInfo {
  position: Position;
  mapX: number;
  mapY: number;
  pageX: number;
  pageY: number;
  viewWidth: number;
  viewHeight: number;
}

export interface ITileGridProps {
  game: Game;
  initPosition?: IPosition;
  // mapSize: IPosition;
  minVisibleTileCount: number;
  paddingCellCount?: number;
  /**
   * A callback function that is invoked when the view is clicked
   * @param position The tile position (col and row) at the clicked point
   * @param point The clicked point on the grid in pixel
   * @returns Whether the tile display at the clicked position should be updated
   */
  onClick?: (info: IMouseInfo) => boolean;
  onDrag?: (info: IMouseInfo) => boolean;
  onMouseDown?: (info: IMouseInfo) => boolean;
  onMouseUp?: (info: IMouseInfo) => boolean;
  className?: string;
}
interface IState {}

export default class TileGrid extends React.Component<ITileGridProps, IState> {
  private _width: number = 0;
  private _height: number = 0;
  private _cellSize: number = 0;
  private _gridRef: React.RefObject<Grid> = React.createRef<Grid>();
  private _position: IPosition = { col: 0, row: 0 };
  private _mapSize: IPosition = { col: 0, row: 0 };
  private _tween: Tween<IPosition> | null = null;
  private _refDict: Map<string, React.RefObject<TileDisplay>> = new Map();
  private _containerRef: RefObject<AutoSizer> = React.createRef<AutoSizer>();
  private _mouseDown: boolean = false;
  private _paddingCellCount: number;
  private _tileDisplayMap: Map<string, ReactElement> = new Map();

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
   * The grid coordinate (x and y) at the center of the viewport in pixel
   */
  public get center(): IPoint {
    return this._toCenter(this._position);
  }
  public set center(value: IPoint) {
    this.cancel();
    this._setPosition(this._toPosition(value));
  }

  constructor(props: ITileGridProps) {
    super(props);
    // this._mapSize = props.mapSize;
    let tileManager = props.game.tileManager;
    this._mapSize = { col: tileManager.colCount, row: tileManager.rowCount };
    this._position = props.initPosition || { col: 0, row: 0 };
    this._paddingCellCount = Math.floor(props.paddingCellCount || 0);
    this._onClick = this._onClick.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._renderTile = this._renderTile.bind(this);
  }

  public updateTileDisplay(position: IPosition) {
    let ref = this._refDict.get(
      this._toPositionKey(position.col, position.row)
    );
    ref?.current?.forceUpdate();
  }
  public componentWillUnmount(): void {
    if (this._tween) {
      this._tween.stop();
    }
    window.removeEventListener("pointerup", this._onMouseUp);
    window.removeEventListener("pointermove", this._onMouseMove);
  }

  public render() {
    if (this.props.game.isDestroyed) {
      throw new Error("TileGrid cannot render a destroyed game");
    }
    return (
      <AutoSizer
        className={this.props.className}
        onClick={this._onClick}
        // onMouseDown={this._onMouseDown}
        onPointerDown={this._onMouseDown}
        ref={this._containerRef}
      >
        {({ width, height }: { width: number; height: number }) => {
          this._width = width;
          this._height = height;
          this._cellSize = Math.ceil(
            Math.min(height, width) / this.props.minVisibleTileCount
          );
          let initScroll = this._toScroll(this._position);
          return (
            <Grid
              initialScrollTop={initScroll.top}
              initialScrollLeft={initScroll.left}
              rowCount={this._mapSize.row + this._paddingCellCount * 2}
              columnCount={this._mapSize.col + this._paddingCellCount * 2}
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
              {this._renderTile}
            </Grid>
          );
        }}
      </AutoSizer>
    );
  }
  private _renderTile(props: GridChildComponentProps) {
    props = {
      ...props,
      rowIndex: props.rowIndex - this._paddingCellCount,
      columnIndex: props.columnIndex - this._paddingCellCount,
    };
    let key = this._toPositionKey(props.columnIndex, props.rowIndex);
    // Try to reuse the tile display
    let tileDisplay: ReactElement | undefined = this._tileDisplayMap.get(key);
    if (tileDisplay) {
      return tileDisplay;
    }
    // Create a new tile display
    let ref = React.createRef<TileDisplay>();
    this._refDict.set(key, ref);
    tileDisplay = (
      <TileDisplay
        {...props}
        cellSize={this._cellSize}
        game={this.props.game}
        ref={ref}
      />
    );
    this._tileDisplayMap.set(key, tileDisplay);
    return tileDisplay;
  }
  /**
   * Ease to a position
   */
  public ease(position: IPosition, duration: number = 500, delay: number = 0) {
    this.cancel();
    let target = this._correctPosition(position);
    requestAnimationFrame(() => {
      this._tween = new Tween(this._position)
        .to(target, duration)
        .delay(delay)
        .easing(Easing.Quadratic.InOut)
        .onUpdate((position) => {
          // console.log("ease");
          this._setPosition(position);
        })
        .onStop((position) => {
          this._tween = null;
        })
        .onComplete((position) => {
          this._tween = null;
        })
        .start();
    });
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
  /**
   * Get the tile position (col and row) at the given point on webpage
   */
  public getPosition(pageX: number, pageY: number): Position {
    let scroll = this._toScroll(this._position);
    let point = {
      x: scroll.left + pageX,
      y: scroll.top + pageY,
    };
    let position = new Position({
      col: point.x / this._cellSize - this._paddingCellCount,
      row: point.y / this._cellSize - this._paddingCellCount,
    });
    return position;
  }

  private _toPositionKey(col: number, row: number) {
    return `${col},${row}`;
  }

  private _onClick(event: React.MouseEvent<any, MouseEvent>) {
    if (this.props.onClick) {
      let mouseInfo = this._getMouseInfo(event);

      if (this.props.onClick(mouseInfo)) {
        this.updateTileDisplay(mouseInfo.position.floor());
      }
    }
  }
  private _onMouseDown(event: React.MouseEvent<any, MouseEvent>) {
    window.addEventListener("pointerup", this._onMouseUp);
    window.addEventListener("pointermove", this._onMouseMove);
    this._mouseDown = true;
    if (this.props.onMouseDown) {
      let mouseInfo = this._getMouseInfo(event);
      if (this.props.onMouseDown(mouseInfo)) {
        this.updateTileDisplay(mouseInfo.position.floor());
      }
    }
  }
  // private _onMouseUp(event: React.MouseEvent<any, MouseEvent>) {
  private _onMouseUp(event: MouseEvent) {
    window.removeEventListener("pointerup", this._onMouseUp);
    window.removeEventListener("pointermove", this._onMouseMove);
    this._mouseDown = false;
    if (this.props.onMouseUp) {
      let mouseInfo = this._getMouseInfo(event);
      if (this.props.onMouseUp(mouseInfo)) {
        this.updateTileDisplay(mouseInfo.position.floor());
      }
    }
  }
  private _onMouseMove(event: React.MouseEvent<any, MouseEvent> | MouseEvent) {
    if (!this._mouseDown) {
      return;
    }
    if (this.props.onDrag) {
      let mouseInfo = this._getMouseInfo(event);
      if (this.props.onDrag(mouseInfo)) {
        this.updateTileDisplay(mouseInfo.position.floor());
      }
    }
  }
  private _getMouseInfo(
    event: React.MouseEvent<any, MouseEvent> | MouseEvent
  ): IMouseInfo {
    let scroll = this._toScroll(this._position);
    let point = {
      x: scroll.left + event.pageX,
      y: scroll.top + event.pageY,
    };
    let position = this.getPosition(event.pageX, event.pageY);
    return {
      position: position.clone(),
      mapX: point.x,
      mapY: point.y,
      pageX: event.pageX,
      pageY: event.pageY,
      viewWidth: this._width,
      viewHeight: this._height,
    };
  }

  private _toScroll(position: IPosition): IScrollInfo {
    let scroll = {
      left:
        (position.col + this._paddingCellCount) * this._cellSize -
        (this._width - this._cellSize) / 2,
      top:
        (position.row + this._paddingCellCount) * this._cellSize -
        (this._height - this._cellSize) / 2,
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
    let minPosition = {
      col: this._width / 2 / this._cellSize - this._paddingCellCount - 0.5,
      row: this._height / 2 / this._cellSize - this._paddingCellCount - 0.5,
    };
    let maxPosition = {
      col:
        minPosition.col +
        this._mapSize.col -
        this._width / this._cellSize +
        this._paddingCellCount * 2,
      row:
        minPosition.row +
        this._mapSize.row -
        this._height / this._cellSize +
        this._paddingCellCount * 2,
    };
    return new Position(position).max(minPosition).min(maxPosition).toObject();
  }
  private _correctScroll(scroll: IScrollInfo): IScrollInfo {
    let minScroll = {
      left: this._paddingCellCount * this._cellSize * -1,
      top: this._paddingCellCount * this._cellSize * -1,
    };
    let maxScroll = {
      left:
        (this._mapSize.col + this._paddingCellCount * 2) * this._cellSize -
        this._width,
      top:
        (this._mapSize.row + this._paddingCellCount * 2) * this._cellSize -
        this._height,
    };
    return {
      left: Math.max(minScroll.left, Math.min(maxScroll.left, scroll.left)),
      top: Math.max(minScroll.top, Math.min(maxScroll.top, scroll.top)),
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
  public componentDidMount(): void {
    // This will help TileGrid update its initial position. The init position need to be corrected as it may be out of bound.
    this._onUpdate && this._onUpdate();
  }
  public componentDidUpdate(): void {
    // This will help TileGrid update its position every time when the grid size changes along with the window size.
    this._onUpdate && this._onUpdate();
  }
  public render() {
    return <FixedSizeGrid {...this.props} ref={this._gridRef} />;
  }
}

export interface IPosition {
  col: number;
  row: number;
}

export default class Position implements IPosition {
  protected _col: number = 0;
  protected _row: number = 0;

  public get col(): number {
    return this._col;
  }
  public get row(): number {
    return this._row;
  }
  public set col(value: number) {
    this._col = value;
  }
  public set row(value: number) {
    this._row = value;
  }

  constructor(position?: IPosition) {
    position && this.set(position);
  }

  set(position: IPosition): Position {
    this._col = position.col;
    this._row = position.row;
    return this;
  }

  clone(): Position {
    return new Position(this);
  }

  equals(position: IPosition): boolean {
    return this._col == position.col && this._row == position.row;
  }

  add(position: IPosition): Position {
    return new Position({
      col: this._col + position.col,
      row: this._row + position.row,
    });
  }

  subtract(position: IPosition): Position {
    return new Position({
      col: this._col - position.col,
      row: this._row - position.row,
    });
  }

  max(position: IPosition): Position {
    return new Position({
      col: Math.max(this._col, position.col),
      row: Math.max(this._row, position.row),
    });
  }

  min(position: IPosition): Position {
    return new Position({
      col: Math.min(this._col, position.col),
      row: Math.min(this._row, position.row),
    });
  }

  floor(): Position {
    return new Position({
      col: Math.floor(this._col),
      row: Math.floor(this._row),
    });
  }

  toObject(): IPosition {
    return { col: this._col, row: this._row };
  }
  toString(): string {
    return `(${this._col},${this._row})`;
  }
}

import React, { RefObject } from "react";
import Editor, { INewMapOptions } from "../../lib/Editor";
import "./MapCreator.css";

interface IMapCreatorProps {
  editor: Editor;
}
// interface IMapCreatorState extends INewMapOptions {
//   // Add additional state here
// }

const DEFAULT_OPTIONS = {
  name: "MyMap",
  colCount: 20,
  rowCount: 20,
  tileType: Editor.TILE_TYPE_LIST[0],
  playerCount: Editor.MIN_PLAYER_COUNT,
};

export default class MapCreator extends React.Component<IMapCreatorProps> {
  // ,IMapCreatorState
  private _editor: Editor;
  private _newMapOptions: INewMapOptions = { ...DEFAULT_OPTIONS };

  constructor(props: { editor: Editor }) {
    super(props);
    this._editor = props.editor;
    // this.state = {
    //   ...DEFAULT_OPTIONS,
    // };
    this._onSubmit = this._onSubmit.bind(this);
  }

  private _onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Filter the characters that are not allowed in file names
    // https://stackoverflow.com/a/31976060/1293256
    const invalidNameCharRegex = /[\\/:*?"<>|]/g;
    let options: INewMapOptions = {
      name: this._newMapOptions.name.replace(invalidNameCharRegex, ""),
      colCount: Math.max(
        Editor.MIN_COL_COUNT,
        Math.min(Editor.MAX_COL_COUNT, this._newMapOptions.colCount)
      ),
      rowCount: Math.max(
        Editor.MIN_ROW_COUNT,
        Math.min(Editor.MAX_ROW_COUNT, this._newMapOptions.rowCount)
      ),
      tileType: this._newMapOptions.tileType,
      playerCount: Math.max(
        Editor.MIN_PLAYER_COUNT,
        Math.min(Editor.MAX_PLAYER_COUNT, this._newMapOptions.playerCount)
      ),
    };
    console.log("onCreateMap", options);

    this._editor.createMap(options);
  }

  public render() {
    return (
      <div className="mapCreator">
        <form className="box" onSubmit={this._onSubmit}>
          <h1>Map Creator</h1>
          <label htmlFor="mapName">Map Name</label>
          <input
            id="mapName"
            type="text"
            defaultValue={this._newMapOptions.name}
            onChange={(event) => {
              this._newMapOptions.name = event.target.value;
              // this.setState({ name: event.target.value });
            }}
          />
          <label htmlFor="colCount">Column Count</label>
          <input
            id="colCount"
            type="number"
            defaultValue={this._newMapOptions.colCount}
            min={Editor.MIN_COL_COUNT}
            max={Editor.MAX_COL_COUNT}
            onChange={(event) => {
              this._newMapOptions.colCount = parseInt(event.target.value);
              // this.setState({ colCount: parseInt(event.target.value) });
            }}
          />

          <label htmlFor="rowCount">Row Count</label>
          <input
            id="rowCount"
            type="number"
            defaultValue={this._newMapOptions.rowCount}
            min={Editor.MIN_ROW_COUNT}
            max={Editor.MAX_ROW_COUNT}
            onChange={(event) => {
              this._newMapOptions.rowCount = parseInt(event.target.value);
              // this.setState({
              //   rowCount: parseInt(event.target.value),
              // });
            }}
          />
          <label htmlFor="tileType">Tile Type</label>
          <select
            id="tileType"
            defaultValue={this._newMapOptions.tileType}
            onChange={(event) => {
              this._newMapOptions.tileType = event.target.value;
              // this.setState({ tileType: event.target.value });
            }}
          >
            {Editor.TILE_TYPE_LIST.map((tileName: string) => {
              return (
                <option key={tileName} defaultValue={tileName}>
                  {tileName}
                </option>
              );
            })}
          </select>
          <label htmlFor="playerCount">Player Count</label>
          <input
            id="playerCount"
            type="number"
            defaultValue={this._newMapOptions.playerCount}
            min={Editor.MIN_PLAYER_COUNT}
            max={Editor.MAX_PLAYER_COUNT}
            onChange={(event) => {
              this._newMapOptions.playerCount = parseInt(event.target.value);
              // this.setState({
              //   playerCount: parseInt(event.target.value),
              // });
            }}
          />
          <button type="submit">Create Map</button>
        </form>
      </div>
    );
  }
}

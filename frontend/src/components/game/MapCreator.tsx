import React, { RefObject } from "react";
import Editor, { INewMapOptions } from "../../lib/Editor";
import "./MapCreator.css";
import AssetPack from "../../lib/data/AssetPack";
import FieldDef from "../../lib/data/FieldDef";
import PopupLayout from "../../layouts/PopupLayout";

interface IMapCreatorProps {
  editor: Editor;
  popupRef: RefObject<PopupLayout>;
}
interface IMapCreatorState {
  isLoading: boolean;
  assetPack: AssetPack | null;
  assetPackNames: Array<string> | null;
}

const DEFAULT_INPUT_DATA = {
  name: "MyMap",
  width: 20,
  height: 20,
  tileType: "",
  playerCount: Editor.MIN_PLAYER_COUNT,
};

export default class MapCreator extends React.Component<
  IMapCreatorProps,
  IMapCreatorState
> {
  // ,IMapCreatorState
  private _editor: Editor;
  private get _popup(): PopupLayout | null {
    return this.props.popupRef.current;
  }

  constructor(props: IMapCreatorProps) {
    super(props);
    this._editor = props.editor;
    this.state = {
      isLoading: true,
      assetPack: null,
      assetPackNames: null,
    };
    this._loadAssetPack = this._loadAssetPack.bind(this);
    this._loadAssetPackNames = this._loadAssetPackNames.bind(this);
  }

  public componentDidMount() {
    this._loadAssetPackNames();
  }

  private async _loadAssetPackNames() {
    try {
      this.setState({ isLoading: true });
      let assetPackNames: Array<string> = await AssetPack.getPacks();
      this.setState({ assetPackNames, isLoading: false });
    } catch (error) {
      if (this._popup) {
        this._popup.show({
          type: "error",
          title: "Error",
          content: (
            <details>
              <summary>Failed to get asset pack index file.</summary>
              {String((error as Error).message || error)}
            </details>
          ),
          buttonLabels: ["Retry"],
          buttonActions: [this._loadAssetPackNames],
        });
      } else {
        alert(`Failed to get asset pack index: ${error}`);
      }
    } finally {
      this.setState({ isLoading: false });
    }
  }

  private async _loadAssetPack(assetPackName: string) {
    try {
      this.setState({ isLoading: true });
      let assetPack = await AssetPack.load(assetPackName);
      this.setState({ assetPack, isLoading: false });
    } catch (error) {
      if (this._popup) {
        this._popup.show({
          type: "error",
          title: "Error",
          content: (
            <details>
              <summary>Failed to load asset pack '{assetPackName}'.</summary>
              {String((error as Error).message || error)}
            </details>
          ),
          buttonLabels: ["Retry"],
          buttonActions: [
            () => {
              this._loadAssetPack(assetPackName);
            },
          ],
        });
      } else {
        alert(
          `Failed to load asset pack '${assetPackName}': ${
            (error as Error).message || error
          }`
        );
      }
    } finally {
      this.setState({ isLoading: false });
    }
  }

  public render() {
    let content: JSX.Element | null = null;
    if (!this.state.assetPackNames || this.state.isLoading) {
      content = <div className="content loading">Loading...</div>;
    } else if (!this.state.assetPack) {
      content = (
        <AssetPackSelector
          assetPackNames={this.state.assetPackNames}
          onConfirm={this._loadAssetPack}
        />
      );
    } else {
      content = (
        <MapCreatorForm
          assetPack={this.state.assetPack}
          onConfirm={(inputData: Partial<INewMapOptions>) => {
            this._editor.createMap({
              ...inputData,
              assetPack: this.state.assetPack,
            } as INewMapOptions);
          }}
          popupRef={this.props.popupRef}
        />
      );
    }
    return <div className="mapCreator">{content}</div>;
  }
}

function AssetPackSelector(props: {
  assetPackNames: Array<string>;
  onConfirm: (assetPackName: string) => void;
}) {
  const { assetPackNames, onConfirm } = props;
  let assetPackName: string = assetPackNames[0];
  function onChanged(event: React.ChangeEvent<HTMLSelectElement>) {
    assetPackName = event.target.value;
  }
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (assetPackName) {
      onConfirm(assetPackName);
    }
    return false;
  }
  return (
    <form className="content" onSubmit={onSubmit}>
      <div>Select an asset pack for the new map.</div>
      <label htmlFor="assetPack">Asset Pack</label>
      <select id="assetPack" onChange={onChanged}>
        {assetPackNames.map((typeName: string) => {
          return (
            <option key={typeName} defaultValue={typeName}>
              {typeName}
            </option>
          );
        })}
      </select>
      <button type="submit">Confirm</button>
    </form>
  );
}

function MapCreatorForm(props: {
  assetPack: AssetPack;
  onConfirm: (inputData: Partial<INewMapOptions>) => void;
  popupRef: RefObject<PopupLayout>;
}) {
  const inputData: Partial<INewMapOptions> = { ...DEFAULT_INPUT_DATA };
  const { assetPack, onConfirm, popupRef } = props;
  // const tileTypeNames = ["👉 Select 👈", ...assetPack.tileDefPack.typeNames];
  const tileTypeNames = ["", ...assetPack.tileDefPack.typeNames];
  const INPUT_FIELD_DEF = new FieldDef<INewMapOptions>(
    {
      type: "object",
      children: {
        name: { type: "string", regExp: Editor.MAP_NAME_REGEXP },
        width: {
          type: "number",
          minNum: Editor.MIN_COL_COUNT,
          maxNum: Editor.MAX_COL_COUNT,
        },
        height: {
          type: "number",
          minNum: Editor.MIN_ROW_COUNT,
          maxNum: Editor.MAX_ROW_COUNT,
        },
        tileType: {
          type: "string",
          valueList: assetPack.tileDefPack.typeNames,
        },
        playerCount: {
          type: "number",
          minNum: Editor.MIN_PLAYER_COUNT,
          maxNum: Editor.MAX_PLAYER_COUNT,
        },
      },
    },
    undefined,
    "form"
  );

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let result = INPUT_FIELD_DEF.validate(inputData);
    if (!result.isValid) {
      invalidValueAlert(popupRef, result.message);
      return false;
    }
    onConfirm(inputData);
    return false;
  }

  return (
    <form className="content" onSubmit={onSubmit}>
      <h1>Map Creator</h1>
      <label htmlFor="mapName">Map Name</label>
      <input
        id="mapName"
        type="text"
        defaultValue={inputData.name}
        onChange={(event) => {
          inputData.name = event.target.value;
        }}
      />
      <label htmlFor="width">Width</label>
      <input
        id="width"
        type="number"
        defaultValue={inputData.width}
        min={Editor.MIN_COL_COUNT}
        max={Editor.MAX_COL_COUNT}
        onChange={(event) => {
          inputData.width = parseInt(event.target.value);
        }}
      />

      <label htmlFor="height">Height</label>
      <input
        id="height"
        type="number"
        defaultValue={inputData.height}
        min={Editor.MIN_ROW_COUNT}
        max={Editor.MAX_ROW_COUNT}
        onChange={(event) => {
          inputData.height = parseInt(event.target.value);
        }}
      />
      <label htmlFor="tileType">Tile Type</label>
      <select
        id="tileType"
        defaultValue={inputData.tileType}
        onChange={(event) => {
          inputData.tileType = event.target.value;
        }}
        required
      >
        {tileTypeNames.map((typeName: string) => {
          return (
            <option key={typeName} defaultValue={typeName}>
              {typeName}
            </option>
          );
        })}
      </select>
      <label htmlFor="playerCount">Player Count</label>
      <input
        id="playerCount"
        type="number"
        defaultValue={inputData.playerCount}
        min={Editor.MIN_PLAYER_COUNT}
        max={Editor.MAX_PLAYER_COUNT}
        onChange={(event) => {
          inputData.playerCount = parseInt(event.target.value);
        }}
      />
      <button type="submit">Create Map</button>
    </form>
  );
}

function invalidValueAlert(popupRef: RefObject<PopupLayout>, message: string) {
  if (popupRef.current) {
    popupRef.current.show({
      type: "warning",
      title: "Invalid Value",
      content: message,
      buttonLabels: ["OK"],
      showCloseButton: false,
    });
    return;
  }
  alert(message);
}

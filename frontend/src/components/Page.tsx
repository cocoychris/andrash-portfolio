import React, { Component } from "react";
import Markdown from "react-markdown";

interface IProps {
  pageURL: string;
  useCache: boolean;
  /**
   * Callback when page is loaded
   * @param response The response object from fetch. Null if loaded from cache.
   */
  onLoad?: () => void;
  /**
   * Callback when page fails to load
   * @param response The response object from fetch.
   */
  onError?: () => void;
}
interface IState {
  status: "loading" | "loaded" | "error";
}

const CONTENT_CACHE: { [key: string]: string } = {};

export default class Page extends Component<IProps, IState> {
  private _isMarkDown: boolean;
  private _content: string = "";

  public get isMarkDown() {
    return this._isMarkDown;
  }

  constructor(props: IProps) {
    super(props);
    this._isMarkDown = this.props.pageURL.endsWith(".md");
    this.state = {
      status: "loading",
    };
  }

  componentDidMount(): void {
    if (this.state.status === "loading") {
      this._loadPage();
    }
  }
  componentDidUpdate(
    prevProps: Readonly<IProps>,
    prevState: Readonly<IState>,
    snapshot?: any
  ): void {
    if (this.state.status === "loaded") {
      if (this.props.onLoad) {
        this.props.onLoad();
      }
      return;
    }
    if (this.state.status === "error") {
      if (this.props.onError) {
        this.props.onError();
      }
      return;
    }
  }

  private async _loadPage() {
    // Check cache
    if (this.props.useCache && CONTENT_CACHE[this.props.pageURL]) {
      this._content = CONTENT_CACHE[this.props.pageURL];
      this.setState({ status: "loaded" });
      return;
    }
    // Fetch page
    const response: Response = await fetch(this.props.pageURL, {
      method: "GET",
      headers: new Headers({
        "Content-Type": "text/plain",
      }),
    });
    // Handle error
    if (!response.ok) {
      this.setState({ status: "error" });
      return;
    }
    // Handle success
    this._content = await response.text();
    CONTENT_CACHE[this.props.pageURL] = this._content;
    this.setState({ status: "loaded" });
  }

  render() {
    return (
      <div className="page">
        {this.state.status === "loading" && (
          <div className="message loading">Loading...</div>
        )}
        {this.state.status === "error" && (
          <div className="message error">Error loading page</div>
        )}
        {this.state.status === "loaded" && this._isMarkDown && (
          <Markdown className="content markdown">{this._content}</Markdown>
        )}
        {this.state.status === "loaded" && !this._isMarkDown && (
          <div className="content webPage">{this._content}</div>
        )}
      </div>
    );
  }
}

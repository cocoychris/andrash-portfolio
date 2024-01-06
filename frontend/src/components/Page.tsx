import React, { Component, ReactNode } from "react";
import Markdown from "react-markdown";
import parse, { DOMNode } from "html-react-parser";
import { HTMLReactParserOptions, Element } from "html-react-parser";

// Prevent rendering of <html> tag
const REPLACE_TAGS: Set<string> = new Set(["html", "head", "body"]);

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
  private _message: string = "";
  private _title: string = "";

  public get isMarkDown() {
    return this._isMarkDown;
  }

  public get title(): string {
    return this._title;
  }

  constructor(props: IProps) {
    super(props);
    this._onParserReplace = this._onParserReplace.bind(this);
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
  componentDidUpdate(): void {
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
      this._message = `Error ${response.status}: ${response.statusText}`;
      this._title = `Error ${response.status}`;
      this.setState({ status: "error" });
      return;
    }
    // Handle success
    this._content = await response.text();
    CONTENT_CACHE[this.props.pageURL] = this._content;
    // Get title from content
    if (this._isMarkDown) {
      let match = this._content.match(/^#+\s*(.+)$/m);
      this._title = match ? match[1].trim() : "";
    } else {
      let match = this._content.match(/<title>(.*)<\/title>/);
      this._title = match ? match[1].trim() : "";
    }
    // Update state
    this.setState({ status: "loaded" });
  }

  private _onParserReplace(domNode: DOMNode) {
    if (domNode instanceof Element && domNode.attribs) {
      if (REPLACE_TAGS.has(domNode.tagName)) {
        domNode.tagName = "div";
        return domNode;
      }
    }
  }

  render() {
    return (
      <div className="page">
        {this.state.status === "loading" && (
          <div className="message loading">
            <h2>Loading...</h2>
          </div>
        )}
        {this.state.status === "error" && (
          <div className="message error">
            <h2>Failed to load page</h2>
            <p>{this._message ? this._message : ""}</p>
          </div>
        )}
        {this.state.status === "loaded" && this._isMarkDown && (
          <Markdown className="content markdown">{this._content}</Markdown>
        )}
        {this.state.status === "loaded" && !this._isMarkDown && (
          <div className="content webPage">
            {parse(this._content, {
              replace: this._onParserReplace,
            })}
          </div>
        )}
      </div>
    );
  }
}

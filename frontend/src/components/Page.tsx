import React, { Component, LegacyRef, ReactNode } from "react";
import Markdown, { ExtraProps } from "react-markdown";
import parse, { DOMNode } from "html-react-parser";
import remarkGfm from "remark-gfm";
import { Element } from "html-react-parser";
import { ReactSVG } from "react-svg";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { nord as highlightStyle } from "react-syntax-highlighter/dist/esm/styles/prism";

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
          <Markdown
            className="content markdown"
            remarkPlugins={[remarkGfm]}
            components={{
              img: (props) => {
                props = addImageProps(props);
                if (props.src?.endsWith(".svg")) {
                  return (
                    <ReactSVG
                      src={props.src}
                      width={props.width}
                      height={props.height}
                      style={props.style}
                      wrapper="span"
                    />
                  );
                }
                return <img {...props} />;
              },
              h1: (props) => <h1 {...addIDToProps(props)} />,
              h2: (props) => <h2 {...addIDToProps(props)} />,
              h3: (props) => <h3 {...addIDToProps(props)} />,
              h4: (props) => <h4 {...addIDToProps(props)} />,
              table: (props) => {
                let { node, ...rest } = props;
                return (
                  <div className="tableWrapper">
                    <table {...rest} />
                  </div>
                );
              },
              code(props) {
                const { children, className, node, ref, ...rest } = props;
                const match = /language-(\w+)/.exec(className || "");
                if (!match) {
                  return (
                    <code {...rest} className={className}>
                      {children}
                    </code>
                  );
                }
                return (
                  <SyntaxHighlighter
                    {...rest}
                    ref={ref as any}
                    PreTag="div"
                    children={String(children).replace(/\n$/, "")}
                    language={match[1]}
                    style={highlightStyle}
                  />
                );
              },
            }}
          >
            {this._content}
          </Markdown>
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

function addIDToProps(
  props: React.ClassAttributes<HTMLHeadingElement> &
    React.HTMLAttributes<HTMLHeadingElement> &
    ExtraProps
) {
  const { node, ...rest } = props;
  props = rest;
  if (!props.children) {
    return props;
  }
  // Remove invalid characters
  props.id = props.children
    .toString()
    .trim()
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return props;
}

function addImageProps(
  props: React.ImgHTMLAttributes<HTMLImageElement> & ExtraProps
) {
  const { node, ...rest } = props;
  props = rest;
  if (!props.src) {
    return props;
  }
  let url = new URL(props.src, window.location.href);
  let width = url.searchParams.get("width");
  let height = url.searchParams.get("height");
  let borderRadius = url.searchParams.get("borderRadius");
  let shadowRadius = url.searchParams.get("shadowRadius");
  let shadowAlpha = url.searchParams.get("shadowAlpha");
  if (width) {
    props.width = width;
  }
  if (height) {
    props.height = height;
  }
  props.style = {
    ...props.style,
    borderRadius: borderRadius || undefined,
    boxShadow: shadowRadius
      ? `0 0 ${shadowRadius} rgba(0, 0, 0, ${shadowAlpha || 0.5})`
      : undefined,
  };
  return props;
}

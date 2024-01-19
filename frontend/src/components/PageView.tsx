import React, { Component } from "react";
import Page from "./Page";
import { CSSTransition } from "react-transition-group";
import GameClient from "../lib/GameClient";

interface IProps {
  gameClient: GameClient;
  baseDir: string;
  onOpen?: (page: string, title: string, offsetTop: number) => void;
  onClose?: () => void;
}
interface IState {
  page: string;
  fadeInPage: string;
}
const TRANSITION_TIMEOUT = 300;
const MAX_TRANS_TIMEOUT = 1100;
const MIN_TRANS_TIMEOUT = 350;

export default class PageView extends Component<IProps, IState> {
  private _useCache: boolean = true;
  private _sectionRef = React.createRef<HTMLElement>();
  private _pageRef = React.createRef<Page>();

  constructor(props: IProps) {
    super(props);
    this.state = {
      page: "",
      fadeInPage: "",
    };
    this._onOpen = this._onOpen.bind(this);
    this._onClickLink = this._onClickLink.bind(this);
    this._onPopState = this._onPopState.bind(this);
  }

  public componentDidMount(): void {
    this.open(this._getPageFromLocation());
    // Listen to pop state event
    window.addEventListener("popstate", this._onPopState);
    // Intercept all link clicks
    document.addEventListener("click", this._onClickLink);
  }
  public componentWillUnmount(): void {
    window.removeEventListener("popstate", this._onPopState);
    document.removeEventListener("click", this._onClickLink);
  }

  public open(page: string, useCache: boolean = true) {
    let gameClient = this.props.gameClient;
    // Do not open page if editing.
    if (
      gameClient.mode == GameClient.MODE_EDITOR &&
      !gameClient.editor?.isTesting
    ) {
      this._clearPageFromLocation();
      return;
    }
    // Do not open page is already at the same page
    if (useCache && this.state.page === page) {
      return;
    }
    //Open page
    this._useCache = useCache;
    this.setState({
      page,
      fadeInPage: this.state.fadeInPage || page,
    });
    this._setPageToLocation(page);
  }

  public close() {
    if (this.state.page === "") {
      return;
    }
    this.setState({ page: "" });
    this._setPageToLocation("");
    this.props.onClose && this.props.onClose();
  }

  public page(): string {
    return this.state.page;
  }

  private _onOpen() {
    this.props.onOpen &&
      this.props.onOpen(
        this.state.page,
        this._pageRef.current?.title || "",
        this._sectionRef.current?.offsetTop || 0
      );
  }

  private _clearPageFromLocation() {
    let url = new URL(window.location.href);
    url.pathname = "";
    window.history.replaceState({}, "", url.toString());
  }

  private _getPageFromLocation(pathName?: string): string {
    // Convert path name to page name
    pathName = pathName || window.location.pathname;
    const PAGE_PATH_NAME_REGEX = /^\/page\/(md\/)?(.*)$/;
    let match = pathName.match(PAGE_PATH_NAME_REGEX);
    if (!match) {
      return "";
    }
    let pageName = match[2];
    if (!pageName) {
      return "";
    }
    let isMarkDown = match[1] ? true : false;
    let page = `${pageName}${isMarkDown ? ".md" : ".html"}`;
    return page;
  }

  private _setPageToLocation(page: string) {
    // Convert page name to path name
    let isMarkDown = page.endsWith(".md");
    let pageName = page.replace(/\..*$/, "");
    let url = new URL(window.location.href);
    url.pathname = page ? `/page/${isMarkDown ? "md/" : ""}${pageName}` : "";
    window.history.pushState({}, "", url.toString());
  }

  private _onClickLink(event: MouseEvent) {
    let target = event.target as HTMLElement;
    let anchorElement: HTMLAnchorElement | null = null;
    // Find the anchor element from the target or its parent
    while (target) {
      if (target.tagName == "A") {
        anchorElement = target as HTMLAnchorElement;
        break;
      }
      if (!target.parentElement) {
        break;
      }
      target = target.parentElement;
    }
    // Not an anchor element
    if (!anchorElement) {
      return;
    }
    // Is an anchor element
    if (!anchorElement.href) {
      return;
    }
    let url = new URL(anchorElement.href, window.location.href);
    // Is root
    if (url.pathname == "/") {
      return;
    }
    event.preventDefault();
    // External link
    if (url.origin !== window.location.origin) {
      // Open in new tab
      window.open(url, "_blank");
      return;
    }
    // Internal link
    let page = this._getPageFromLocation(url.pathname);
    // Not a page link
    if (!page) {
      window.open(url, "_blank");
      return;
    }
    // Same page
    if (page == this.state.page) {
      if (url.hash) {
        let hash = url.hash.replace(/^#/, "");
        let element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
      return;
    }
    // Different page
    this.open(page);
  }

  private _onPopState(event: PopStateEvent) {
    this.open(this._getPageFromLocation());
  }

  public render() {
    let fadeIn =
      this.state.page != "" && this.state.page == this.state.fadeInPage;
    let isCloseing = this.state.page == "";
    let timeout = TRANSITION_TIMEOUT;
    // Provide a longer timeout when closing page so that the page will not be unmounted before
    // the window can finish scrolling to the top causing an unpleasant jump.
    if (isCloseing) {
      // The timeout is calculated based on the current scroll position
      // The more it needs to scroll, the longer the timeout.
      timeout = Math.max(
        Math.min(window.scrollY * 0.85, MAX_TRANS_TIMEOUT),
        MIN_TRANS_TIMEOUT
      );
    }
    return (
      <CSSTransition
        in={fadeIn}
        nodeRef={this._sectionRef}
        timeout={timeout}
        classNames="pageSection"
        unmountOnExit
        onEntered={this._onOpen}
        onExited={() => this.setState({ fadeInPage: this.state.page })}
      >
        <section id="page" ref={this._sectionRef}>
          <Page
            key={this.state.fadeInPage}
            pageURL={`${this.props.baseDir}/${this.state.fadeInPage}`}
            useCache={this._useCache}
            ref={this._pageRef}
          />
          <button className="btnClosePage" onClick={() => this.close()}>
            Close
          </button>
        </section>
      </CSSTransition>
    );
  }
}

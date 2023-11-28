import React, { Component } from "react";
import Page from "./Page";
import { CSSTransition } from "react-transition-group";

interface IProps {
  baseDir: string;
  onOpen?: (page: string, offsetTop: number) => void;
  onClose?: () => void;
}
interface IState {
  page: string;
}

const MAX_TRANS_TIMEOUT = 1000;
const MIN_TRANS_TIMEOUT = 350;

export default class PageView extends Component<IProps, IState> {
  private _useCache: boolean = true;
  private _sectionRef = React.createRef<HTMLElement>();
  public state: Readonly<IState> = {
    page: "",
  };

  constructor(props: IProps) {
    super(props);
    this._onOpen = this._onOpen.bind(this);
  }

  public open(page: string, useCache: boolean = true) {
    if (useCache && this.state.page === page) {
      return;
    }
    this._useCache = useCache;
    this.setState({ page });
  }

  public close() {
    if (this.state.page === "") {
      return;
    }
    this.setState({ page: "" });
    this.props.onClose && this.props.onClose();
  }

  public page(): string {
    return this.state.page;
  }

  private _onOpen() {
    this.props.onOpen &&
      this.props.onOpen(
        this.state.page,
        this._sectionRef.current?.offsetTop || 0
      );
  }

  public render() {
    return (
      <CSSTransition
        in={this.state.page !== ""}
        nodeRef={this._sectionRef}
        timeout={Math.max(
          Math.min(window.scrollY * 0.85, MAX_TRANS_TIMEOUT),
          MIN_TRANS_TIMEOUT
        )}
        classNames="pageSection"
        unmountOnExit
        onEntered={this._onOpen}
      >
        <section id="page" ref={this._sectionRef}>
          <Page
            pageURL={`${this.props.baseDir}/${this.state.page}`}
            useCache={this._useCache}
          />
          <button className="btnClosePage" onClick={() => this.close()}>
            Close
          </button>
        </section>
      </CSSTransition>
    );
  }
}

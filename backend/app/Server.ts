import express from "express";
import path from "path";
import { Express, Request, Response } from "express";

export class Server {
  private app: Express;

  constructor(app: Express) {
    this.app = app;

    // this.app.use(express.static(path.resolve("./") + "/build/frontend"));

    this.app.get("/api", (req: Request, res: Response): void => {
      res.send("You have reached the API! 123");
    });
    this.app.delete("/api/delete", (req: Request, res: Response): void => {
      res.send("DELETED!");
    });

    // this.app.get("*", (req: Request, res: Response): void => {
    //   res.sendFile(path.resolve("./") + "/build/frontend/index.html");
    // });
  }

  public start(port: number): void {
    this.app.listen(port, () =>
      console.log(`Server running on http://localhost:${port}`)
    );
  }
}

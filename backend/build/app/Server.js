"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
class Server {
    constructor(app) {
        this.app = app;
        // this.app.use(express.static(path.resolve("./") + "/build/frontend"));
        this.app.get("/api", (req, res) => {
            res.send("You have reached the API! 123");
        });
        this.app.delete("/api/delete", (req, res) => {
            res.send("DELETED!");
        });
        // this.app.get("*", (req: Request, res: Response): void => {
        //   res.sendFile(path.resolve("./") + "/build/frontend/index.html");
        // });
    }
    start(port) {
        this.app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
    }
}
exports.Server = Server;

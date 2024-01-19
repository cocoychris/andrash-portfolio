# Node.js

![Node.js Icon](/assets/default/images/items/nodejsCrystal.svg)

## Familiarity: `★★★★★` ( 4.5 / 5 )

I've been utilizing Node.js for nearly four years and have gained substantial familiarity with it.

I understand the `Event Loop` and `Asynchronous Programming` concepts and can design and implement `event-driven` and `non-blocking` application architectures in an OOP style with `TypeScript`.

## Experience

I have experience in:

- Designing and implementing `Node.js` applications using an Object-Oriented Programming (OOP) approach with `TypeScript`.
- Building `RESTful APIs` with `Express.js`
- Creating real-time communication APIs with `socket.io`.
  - See the design document: [Server-Client_Communication_API](/page/md/Server-Client_Communication_API)
  - See the server-side implementation [source code](https://github.com/cocoychris/andrash-portfolio/tree/master/app).
  - See the client-side implementation [source code](https://github.com/cocoychris/andrash-portfolio/blob/master/frontend/src/lib/GameClient.ts).
- Writing unit tests for `Node.js` applications using `Jest`.
  - See the test for [DataHolder](https://github.com/cocoychris/andrash-portfolio/blob/master/frontend/src/lib/data/DataHolder.ts) class: [DataHolder.test.ts](https://github.com/cocoychris/andrash-portfolio/blob/master/frontend/tests/DataHolder.test.ts)
- Managing `Node.js` applications with `PM2`.
- Building `React.js` applications with `Vite`.
- Server-side rendering with `EJS`.
- Creating web & desktop automation applications with `Puppeteer` and `Nut.js`.
- Building multi-threaded applications with `Worker Threads`.

## Projects

I have two projects in production that use Node.js:

1. **Playground by Andrash**
   - Which is this portfolio website. It's built on top of a customized `multiplayer online game engine` that I developed. This engine provides visitors with an unconventional, game-like web browsing experience. It allows visitors to share the same game world (playground) and interact with each other in real-time.
   - Programming language: `TypeScript`.
   - Frameworks: `React.js`, `Express.js`, `socket.io`, `Jest`, `Vite`, `PM2`.
   - See [About This Place](/page/md/About_This_Place) for more details.
   - See the source code [on GitHub](https://github.com/cocoychris/andrash-portfolio)
2. **Automated Robot platform** (ARP)
   - A web-based RPA (Robotic Process Automation) platform that allows users to manage, inspect, and run automated tasks. These tasks, called robots, can be run on a schedule or on demand.
   - I built the ARP platform and more than 30 robots on top of the platform over three years while working for the company (BRAND'S Suntory Ltd. Taiwan Branch).
   - Programming language: `JavaScript`.
   - Frameworks: `Express.js`, `EJS`, `jQuery`, `Jest`, `Puppeteer`, `Nut.js`, `PM2`.
   - The source code is not available as it is a proprietary project of the company.

## Modules

I have also developed numerous Node.js modules for my projects. Some of these include:

- The `FieldDef` module, which can be used to define a data structure and validate the data type and value of each field at runtime. Since TypeScript only performs static type checking at compile time, this module is useful for dynamic type checking at runtime.
  - See the source code: [FieldDef.ts](https://github.com/cocoychris/andrash-portfolio/blob/master/frontend/src/lib/data/FieldDef.ts)
- The `CLICore` module, which allows users to create a set of custom commands and execute them by sending a command string to the server. Each command is implemented as a JavaScript function. The command string is parsed and converted into a function call, with the result returned to the client. This module is utilized in the ARP project to implement a web-based command-line interface, enabling users to manage and run robots from the web browser.

- The `Logger` module, which logs messages to the console and writes them to a log file in HTML format with syntax highlighting.
- The `ConfigFile` module, which loads and saves configuration data to a JSON file.
- The `Table` module, which reads `xlsx` and `csv` files and allows users to manipulate the data like a mini database. It provides type checking, data validation, indexing, sorting, merging, filtering, and more.
- And more...

## Source Code on GitHub

To learn more about my coding style and how I design and implement Node.js applications
, please check out the source code of this portfolio website [on GitHub](https://github.com/cocoychris/andrash-portfolio).

## Keep Exploring

To learn more about me, my skills and my projects, please continue exploring this playground.😁

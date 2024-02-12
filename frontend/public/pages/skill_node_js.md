# Node.js

![Node.js Icon](/assets/default/images/items/nodejsCrystal.svg)

## Familiarity: `★★★★☆` ( 4 / 5 )

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
   - For more details, please refer to [About This Place](/page/md/About_This_Place).
   - You can view the source code [on GitHub](https://github.com/cocoychris/andrash-portfolio).
2. **Automated Robot platform** (ARP)
   - A web-based RPA (Robotic Process Automation) platform that allows users to manage, inspect, and run automated tasks. These tasks, called robots, can simulate human interactions with web pages and desktop applications. They can be run on a schedule or on demand.
   - Over the course of more than 3 years working for the company (BRAND'S Suntory Ltd. Taiwan Branch), I built the ARP system and developed more than 30 robots on it.
   - Programming language: `JavaScript`.
   - Frameworks: `Express.js`, `EJS`, `jQuery`, `Jest`, `Puppeteer`, `Nut.js`, `PM2`.
   - For more details, please refer to the article [Automated Robot Platform (ARP)](/page/md/project_arp_system).
   - The source code is not available as it is a proprietary project of the company. However, a [Demo video](https://youtu.be/IO3-2_hz4XU) is available that demonstrates how the system operates.

## Modules

I have also developed numerous Node.js modules for my projects. Some of these include:

- The `FieldDef` module, which can be used to define a data structure and validate the data type and value of each field at runtime. Since TypeScript only performs static type checking at compile time, this module is useful for dynamic type checking at runtime.
  - See the source code: [FieldDef.ts](https://github.com/cocoychris/andrash-portfolio/blob/master/frontend/src/lib/data/FieldDef.ts)
- The `CLICore` module, which allows users to create a set of custom commands and execute them by sending a command string to the server. Each command is implemented as a JavaScript function. The command string is parsed and converted into a function call, with the result returned to the client. This module is utilized in the ARP project to implement a web-based command-line interface, enabling users to manage and run robots from the web browser.
- The `Table` module, which reads `xlsx` and `csv` files and allows users to manipulate the data like a mini database. It provides type checking, data validation, indexing, sorting, merging, filtering, and more.
- The `Logger` module, which logs messages to the console and writes them to a log file in HTML format with syntax highlighting.
- The `ConfigFile` module, which loads and saves configuration data to a JSON file automatically when the data is modified.
- And more...

## Source Code on GitHub

To learn more about my coding style and how I design and implement Node.js applications
, please check out the source code of this portfolio website [on GitHub](https://github.com/cocoychris/andrash-portfolio).

## Keep Exploring

To learn more about me, my skills and my projects, please continue exploring this playground.😁

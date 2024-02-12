# React.js

![React.js Icon](/assets/default/images/items/reactCrystal.svg)

## Familiarity: `★★★☆☆` ( 3 / 5 )

The frontend of this portfolio website is built using React.js. Everything you see, including the navigation bar, dropdown menu, game rendering, characters, items, and tiles, are all built using React.js components.

While this website might look cool, it doesn't utilize every single feature of React.js. React.js is a powerful library with many features, and I'm still exploring its full potential. Although I've gained a lot of experience from this project, I wouldn't claim to be a React.js expert just yet. 😎

## Challenges Overcome

There are countless challenges that I've faced while developing this website on both frontend and backend. However, I'll only mention the most significant ones related to React.js here.

### 1. Game Rendering System

The challenge in building the `game rendering system` was that the game world could be significantly larger than the screen size. The system needed to render only the portion of the game world visible on the screen. Moreover, when the character moved, the system should only re-render the area where the character moved to, instead of re-rendering the entire screen.

To enhance the performance of the game rendering system and fix the glitches, I rebuilt the system three times. I also experimented with the `react-window` library but ultimately decided to implement my own solution to further improve performance. As a result, I was able to significantly reduce the number of re-renders and achieve better performance given the limited time and resources.

The system might still lag on some devices or browsers. However, this is not due to over-rendering of React.js components. Scrolling through 60 to 100 pieces of images, including animated SVGs, can simply be too much for some devices or browsers to handle. I'm unsure if using React.js to build a game rendering system was the best approach, or if a canvas-based approach would have been better. Nevertheless, I am satisfied with the results I have achieved so far.

#### Relevant Components

Components such as `TileGrid`, `TileDisplay`, `SVGDisplay`, `CharacterDisplay`, `GameView`, `EditorView`.

You can view the [Source Code](https://github.com/cocoychris/andrash-portfolio/tree/master/frontend/src/components/game) for these components.

### 2. Dynamic loading mechanism

This project was ambitious, not only because I aimed to build a portfolio website with a game-like user interface, but also because I developed a `dynamic loading mechanism`. This mechanism dynamically loads and renders HTML, markdown pages, and all game assets, instead of hardcoding them into the source code and bundling them. Figuring out how to do this took a significant amount of time.

While this might seem like overkill for a portfolio, I did it deliberately. I plan to transform this into my personal content management system, where all the content should be able to be edited, loaded, and rendered dynamically.

Additionally, I anticipate the addition of multiple maps, which would allow visitors to navigate between different maps within the game world. This would require the ability to dynamically load and render distinct sets of game assets for each map.

#### Relevant Classes

Classes related to the `Dynamic game asset loading` feature include: `AssetPack`, `DefPack`, `CharacterDefPack`, `ItemDefPack`, `TileDefPack`, `SysObjDefPack`.

You can view the [Source Code](https://github.com/cocoychris/andrash-portfolio/tree/master/frontend/src/lib/data) for these classes.

#### Relevant Components

Components related to the `Dynamic game asset loading` feature include: `SVGDisplay`, `TileDisplay`, `CharacterDisplay`, `TileGrid`.

You can view the [Source Code](https://github.com/cocoychris/andrash-portfolio/tree/master/frontend/src/components/game) for these components.

Components related to the `Dynamic markdown & HTML page loading` feature include: `Page`([Source Code](https://github.com/cocoychris/andrash-portfolio/blob/master/frontend/src/components/Page.tsx)), `PageView`([Source Code](https://github.com/cocoychris/andrash-portfolio/blob/master/frontend/src/components/PageView.tsx)).

## A Tale of Functional and Class Components

Upon examining the source code, you'll notice that I've used both `Functional` and `Class Components` in this project. Why, you ask?

Let me share a little story.🤠

Initially, I implemented all components as Functional Components. However, as the need to handle more complex logic arose, and the requirement to expose `custom public methods` of a component for external control over its state and behavior became apparent, I found myself at a crossroads.

At that point, I wasn't sure how to achieve this with Functional Components, so I switched to Class Components and successfully accomplished the task.😄

And here's the kicker: I discovered that I could have achieved the same result with Functional Components using the `useImperativeHandle` hook **TODAY** while writing this document.🤣

Bear with me, though.😅 I'm not planning to refactor all the Class Components right now, but perhaps I will in the future.

On the bright side, I'm now familiar with both Functional and Class Components.😎 Isn't that a win?😁

For examples of how I implement `Functional Components`, please refer to the `DropdownMenu` ([Source Code](https://github.com/cocoychris/andrash-portfolio/blob/master/frontend/src/components/DropdownMenu.tsx)).

For examples of how I implement `Class Components`, please refer to the `Navbar` ([Source Code](https://github.com/cocoychris/andrash-portfolio/blob/master/frontend/src/components/Navbar.tsx)).

## React Libraries Utilized in This Project

Just so you know, despite making my own components, I'm also pretty handy with using React.js libraries.😉

- `html-react-parser`: This library is used to dynamically render HTML pages. It parses HTML strings into React.js components.
- `react-markdown` & `remark-gfm`: These libraries are used to dynamically render markdown pages. They parse markdown strings into React.js components. **The page you're currently reading is a markdown page rendered using this feature.**
- `react-svg`: This library is used to dynamically render SVG assets. It parses SVG strings into React.js components.
- `react-virtualized-auto-sizer`: This library is used to dynamically resize the game rendering area to fit the screen size.
- `react-color`: This is a color picker component for the map editor.
- `react-transition-group`: This library is used to implement fade-in, fade-out, slide-in, and slide-out animations for the user interface and game rendering.

## Keep Exploring

To learn more about me, my skills and my projects, please continue exploring this playground.😁

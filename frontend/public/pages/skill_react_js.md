# React.js

![React.js Icon](/assets/default/images/items/reactCrystal.svg)

## Familiarity: `★★★★☆` ( 4 / 5 )

I have built several websites and web applications (such as the [User Management System](https://golden-happiness.com/)) using React.js, including this portfolio website. Everything you see here are custom-built React.js components, from the dropdown menu to the game rendering system. 

I am familiar with the core concepts of React.js, such as components, props, state, lifecycle methods, hooks, context, and refs, and am able to implement them in both functional and class component styles.

I have also used various React.js libraries to enhance the functionality and user experience of web applications.

## Challenges Overcome

Here are some of the challenges I faced while building this portfolio website and how I overcame them using React.js.

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

## About Functional and Class Components

In this project, I've used both Functional and Class Components.

Initially, I implemented all components as Functional Components. However, when I needed to handle more complex logic and expose custom public methods for external control, I switched to Class Components.

Interestingly, I later discovered that the same result could have been achieved with Functional Components using the `useImperativeHandle` hook.

While I don't plan to refactor the Class Components right now, this experience has made me proficient in both Functional and Class Components.

To see how I implement `Functional Components`, please refer to the `DropdownMenu` ([Source Code](https://github.com/cocoychris/andrash-portfolio/blob/master/frontend/src/components/DropdownMenu.tsx)) or just check out my another project, the [User Management System](https://golden-happiness.com/).

To see how I implement `Class Components`, please refer to the `Navbar` ([Source Code](https://github.com/cocoychris/andrash-portfolio/blob/master/frontend/src/components/Navbar.tsx)).

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

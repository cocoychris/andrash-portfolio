# Mobile App Development
![Magenta Crystal](/assets/default/images/items/magentaCrystal_lite.svg)

I previously worked as a cross-platform mobile app developer at the startup company QLL (Quick Language Learning) Pte. Ltd. for approximately two years.

During that time, I created [several apps](#apps). Most of these apps are educational, designed to help both adults and children learn a new language, especially English, through games or interactive storybooks.

I developed these apps using a tool called `Corona SDK`, now known as `Solar 2D`. This cross-platform mobile app development framework allows you to create Android and iOS apps with the same code base using the `Lua` language.

## The Lua Language
I had never used the `Lua` language before working for the company. However, I learned it on the job and managed to build apps with it in a short period without much difficulty.

Lua is a flexible language that is very easy to use. The only thing that bothered me was that Lua is a weakly typed and non-OOP language, which does not support `class`, `inheritance`, `private properties`, `getter/setter`, and other OOP features.

This wasn't a big deal when the project was small, but the shortcomings became obvious as the scale of the project grew beyond a certain level.

## OOP for Lua
Eventually, it reached a point where the problem needed to be addressed. That's why I built a library called `oop-lib` that implements most of the OOP features using existing Lua functions, effectively simulating an OOP development environment for the Lua language.

This library provides `type checking`, `class declaration`, `class inheritance`, `getters`, `setters`, `private properties`, `static properties`, `abstract classes`, and so on.

The OOP library became the foundation of my app development and significantly improved the maintainability of the code base.

For more information about the OOP library, please refer to the OOP article (not available yet).

## Apps
Here are the three most notable apps that I developed while working for the company.
1. [**找一找，動動腦 (Where is the word?)**](#-where-is-the-word)
    - This is an item-finding game that helps children learn English words.
2. [**臉書塗鴉王 (Facebook Draw)**](#-facebook-draw)
    - This is a drawing app that allows users to draw on a canvas and share their drawings on Facebook.
3. [**GEPT全民英檢初級保證班 (GEPT Workbook)**](#gept-gept-workbook)
    - GEPT stands for General English Proficiency Test, which is an important English proficiency test in Taiwan.
    - This is a workbook app that helps students prepare for the GEPT exam.

## 找一找，動動腦 (Where is the word?)
![Where is the word icon](/images/app_wiw_icon.webp)

This app is a straightforward item-finding game designed to help children learn English words. 

![Where is the word image2](/images/app_wiw_02.webp)

The app can be found on the [Google Play Store](https://play.google.com/store/apps/details?id=com.qll.witw) (Login required. Not sure if it's accessible from all regions). However, it could be very difficult to find a compatible device to run such an old app.

I worked on this app as the main developer and worked with a graphic designer who created the game assets.

The key features I implemented for this app include:
- A game engine that identifies a polygonal area for each item and verifies if the player's touch is within that area. (I'm grateful to my colleague for assisting me with the math.)
- A map editor that enables the game designer to create new levels by defining the polygonal area for each item and setting the word list.
- A card collection system that allows players to accumulate cards by completing the game.
- Data structures that store the game level and the player's progress.
- All transition animations and UI effects.

![Where is the word image1](/images/app_wiw_01.webp)

As depicted in the screenshot above, players must find items from a pile of objects (displayed on the right side) that correspond to the given word (listed on the left side), all within a set time limit (indicated by a red vertical bar next to the word list).

![Where is the word image5](/images/app_wiw_05.webp)

Also, there is a card collection system that allows players to collect cards by completing the game. The cards can be used to unlock new levels.

## 臉書塗鴉王 (Facebook Draw)
![Facebook Draw icon](/images/app_fbd_icon.webp)

This app is a drawing app that allows users to draw on a canvas and share their drawings on Facebook.

![Facebook Draw image5](/images/app_fbd_05.jpg)

The app can be found on the [Google Play Store](https://play.google.com/store/apps/details?id=com.qll.fbdraw) (Login required. Not sure if it's accessible from all regions). However, it could be very difficult to find a compatible device to run such an old app.

![Facebook Draw image1](/images/app_fbd_01.webp)

I served as the main developer for this app, collaborating with a graphic designer who created the assets.

The key features I implemented for this app include:
- A painting engine that allows users to draw on a canvas.
- A unique color picker UI that lets users browse and select colors by spinning a color wheel.
- A brush rendering system that produces different styles of strokes when drawing with different brushes.
- A draggable palette and brush selection UI that can be hidden or repositioned anywhere to avoid obstructing the canvas.

![Facebook Draw image3](/images/app_fbd_03.webp)

This app offers the following features to users:
1. Over fifty types of backgrounds and scenarios, including characters, songs, comics, dialogue boxes, and more, for creative expression.
2. Five types of brushes to choose from, including marker pens, calligraphy brushes, and crayons.
3. A palette of sixteen colors.
4. An eraser for correcting mistakes.
5. An undo button that allows easy reversion of a step if a mistake is made.
6. Facebook sharing functionality, enabling easy sharing of drawings on your Facebook timeline.
7. A feature to save your masterpiece to your device's photo album for permanent storage.

## GEPT全民英檢初級保證班 (GEPT Workbook)
![GEPT Workbook icon](/images/app_gept_icon.png)

This app is an interactive workbook designed to help students prepare for the GEPT (General English Proficiency Test) exam in Taiwan.

![GEPT Workbook AppStore](/images/app_gept_appstore_page.jpg)

The app can be found on the [App Store](https://itunes.apple.com/tw/app/gept%E5%85%A8%E6%B0%91%E8%8B%B1%E6%AA%A2%E5%88%9D%E7%B4%9A%E4%BF%9D%E8%AD%89%E7%8F%AD/id1107494896?mt=8) (The link is only available on iOS devices). The app is no longer available on the Google Play Store.

I worked on this app as the main developer and worked with a graphic designer who created the assets.

The key features I implemented for this app include:
- An e-book rendering engine that interprets e-book data (in JSON format) and displays it as an interactive e-book. This engine accurately positions and sizes all text, images, and interactive elements. Some of these interactive elements play audio or video when clicked.
- An e-book player module that works in conjunction with the e-book rendering engine. This module loads the e-book and provides a user interface for navigating the e-book, including a table of contents, page navigation, and control over the speed of automatic page turning.
- A quiz module that allows users to take quizzes and review their answers. The system also corrects the answers, provides feedback, and calculates the score.
- A client module that communicates with the server to download e-books and quizzes, and to upload analytics & user data.
- Note: This e-book system is also used in the company's main product, the `《QLand》閱讀器 (QLand Reader)` App. This is a platform where teachers can create and share interactive e-books and quizzes with students. Students can then download and read the e-books and take quizzes on their devices. There used to be many storybooks and workbooks available on the platform. The app might still be available on the [App Store](https://itunes.apple.com/tw/app/qland-%E5%AD%B8%E7%BF%92%E5%A5%BD%E5%A4%A5%E4%BC%B4/id446037386?mt=8). However, the company is no longer in operation, and most of the content is no longer available.

![GEPT Workbook image1](/images/app_gept_01.jpg)

As shown in the screenshot above, there are many books available for students to read and practice with. Students can subscribe and receive new books periodically.

![GEPT Workbook image2](/images/app_gept_02.jpg)

Additionally, a quiz can be taken to test the student's understanding of the content.

## Wrapping Up
There are more apps that I developed during my time at the company, however, most of them are no longer available on google play store or app store. That's why I only introduced the three most notable apps here.

Since the company is no longer in operation, the apps are no longer maintained, and there's no guarantee that the apps will still be available on the app stores when you read this article. 

The content here is provided for reference only, to give you an idea of the work I did as a mobile app developer.

I'm also eager to learn the latest mobile app development technologies such as `React Native`
(since I have experience with `React.js`), or even native development with `Swift` and `Kotlin`. I look forward to working on new mobile app projects in the future if the opportunity presents itself.

Technology is not my greatest concern. What truly matters to me is the opportunity to create something cool, useful, and something I can be proud of. I am open to learning any technology that can help me achieve this goal.

Thank you for reading this article. If you're interested in my work and would like to hire me for a mobile app or other kinds of project, please feel free to contact me. I'd be happy to discuss the details with you.

## Keep Exploring
To learn more about me, my skills and my projects, please continue exploring this playground.😁
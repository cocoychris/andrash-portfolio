# TypeScript

![TypeScript](/assets/default/images/items/tsCrystal.svg)

## Familiarity: `★★★★☆` ( 4 / 5 )

Even though I've been using `TypeScript` for less than a year, I've become quite familiar with it in a short time. This is largely due to its similarity in syntax and structure to `ActionScript 3.0`, a language I used extensively in the early days of my career. Like `TypeScript`, `ActionScript 3.0` is a strongly typed OOP language based on `ECMAScript`.

I found that almost 90% of the knowledge and experience I gained from using `ActionScript 3.0` transferred directly to `TypeScript` without any effort. This includes all the OOP concepts and design patterns such as `class`, `interface`, `getter`, `setter`, `public`, `private`, `protected`, `static function`, `static property`, `abstract class`, `static class`, `singleton class`, `polymorphism`, `encapsulation`, `composition`, `event`, `event listener`, `event dispatcher`, `event propagation`, and so on.

In addition, I've been using `JavaScript` for over 3 years, always writing `JavaScript` code in an OOP style. So, I'm very familiar with the `ECMAScript` syntax and structure.

However, `TypeScript` is still a distinct language with its own unique features and syntax. I've been learning and exploring these features, understanding them by putting them into practice in this project.

For instance, I've recently discovered `Type Generics`, which has quickly become my new favorite feature of `TypeScript`. It's incredibly useful for creating reusable components and functions, and I've been using it extensively in this project.

At this point, I can confidently say that I'm very familiar with `TypeScript` and can use it to build complex applications, as demonstrated by this project.

## Custom Event System

In this project, I've built a custom event system using `TypeScript`. This system involves extending the `EventTarget` class to create the `AnyEventEmitter` class, and the `Event` class to create the `AnyEvent` class. Both these classes support `Type Generics` for managing custom event types.

As a result, I can create custom event types using interfaces, without the need to extend the `Event` class and create new ones. This approach makes the code more concise and easier to maintain.

To declare a custom event type, all I need to do is create an interface that extends the `IEventType` interface, and define the event name and the event data type within that interface.

```ts
export interface ICharacterAddedEvent extends IEventType {
  // The name of the event type.
  type: "characterAdded";
  // The event data type.
  data: {
    character: Character;
  };
}
```

To dispatch a custom event, I simply need to call the `emit()` method (a shorthand for `dispatchEvent()`) of the `AnyEventEmitter` class and pass in an `AnyEvent` object with the custom event type and the event data.

```ts
class Tile extends AnyEventEmitter {
  private _character: Character | null = null;
  public addCharacter(character: Character) {
    // Set the character.
    this._character = character;
    // Dispatch the custom event.
    this.emit<ICharacterAddedEvent>(
      new AnyEvent<ICharacterAddedEvent>("characterAdded", {
        character: character,
      })
    );
  }
}
```

To listen for a custom event, I simply need to call the `on()` method (a shorthand for `addEventListener()`) of the `AnyEventEmitter` class and pass in the event type and the event handler.

```ts
let tile = new Tile();
tile.on<ICharacterAddedEvent>(
  "characterAdded",
  (event: AnyEvent<ICharacterAddedEvent>) => {
    console.log(event.data.character.name);
  }
);
tile.addCharacter(new Character("Andrash"));
```

With this custom event system, I can create, dispatch, and listen for custom events in a type-safe way, ensuring that the event data type always matches the event type.

This custom event system is used on both the frontend and the backend sharing the same codebase.

Additionally, I've created a `Transmitter` class that extends the `AnyEventEmitter` class, and a `TransEvent` class that extends the `AnyEvent` class. These were developed to integrate the `socket.io` API into the custom event system. The `Transmitter` class wraps the `socket.io` API and converts `socket.io` events into `TransEvent` objects, which are then dispatched by the `Transmitter` class.

For a deeper understanding of how the custom event system is used to implement the server-client communication API, please refer to the [Server-Client Communication API](/page/md/Server-Client_Communication_API) design document.

You can also check out the [source code](https://github.com/cocoychris/andrash-portfolio/tree/master/frontend/src/lib/events) of these classes on GitHub.

## Keep Exploring

To learn more about me, my skills and my projects, please continue exploring this playground.😁

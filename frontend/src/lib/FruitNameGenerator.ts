const FRUIT_NAME_LIST = [
  "Apple",
  "Banana",
  "Cherry",
  "Durian",
  "Elderberry",
  "Fig",
  "Grape",
  "Honeydew",
  "Jackfruit",
  "Kiwi",
  "Lemon",
  "Mango",
  "Orange",
  "Peach",
  "Raspberry",
  "Strawberry",
  "Tomato",
  "Watermelon",
  "Tangerine",
  "Pineapple",
  "Papaya",
  "Plum",
  "Pear",
  "Lychee",
  "Coconut",
  "Avocado",
  "Apricot",
  "Blueberry",
  "Blackberry",
  "Cantaloupe",
  "Cranberry",
  "Grapefruit",
  "Guava",
  "Lime",
  "Mandarin",
  "Nectarine",
  "Olive",
  "Passionfruit",
  "Pomegranate",
  "Rambutan",
];

const TITLE_LIST = [
  "Super",
  "Happy",
  "Angry",
  "Creepy",
  "Cranky",
  "Crazy",
  "Cute",
  "Dancing",
  "Drunk",
  "Evil",
  "Flying",
  "Funny",
  "Giant",
  "Glowing",
  "Hairy",
  "Hungry",
  "Mr.",
  "Mrs.",
  "Dr.",
  "Chief",
  "Prof.",
  "Lord",
  "Master",
  "Captain",
  "Agent",
  "Detective",
  "President",
  "Saint",
  "Director",
  "King",
  "Queen",
  "Prince",
  "Princess",
  "Pope",
  "Pilot",
  "General",
  "Colonel",
  "Major",
  "Duke",
  "Wizard",
  "Warlock",
  "Warrior",
  "Knight",
  "Sailor",
  "Slow",
  "Fast",
  "Quick",
  "Brilliant",
  "Bright",
  "Dark",
  "Light",
  "Bitter",
  "Sandy",
  "Salty",
  "Sweet",
  "Sour",
  "Spicy",
  "Hot",
  "Cold",
  "Cool",
  "Warm",
  "Freezing",
  "Burning",
  "Frozen",
  "Baked",
  "Boiled",
  "Fried",
  "Grilled",
  "Steamed",
  "Raw",
  "Rotten",
  "Fresh",
  "Stinky",
  "Smelly",
  "Dirty",
  "Clean",
  "Shiny",
  "Rusty",
  "Broken",
  "Fixed",
  "Tasty",
  "Delicious",
  "Yummy",
];
const VOWEL_LIST = ["a", "e", "i", "o", "u"];

export default abstract class FruitNameGenerator {
  /**
   * Generate a random name that is not in the avoiding list.
   * @param avoidingList A list of names to avoid. Ignore this parameter if you want to avoid nothing.
   */
  public static newName(avoidingList?: Array<string>): string {
    let avoidDict = avoidingList
      ? Object.fromEntries(avoidingList.map((name) => [name, true]))
      : {};
    let generate = () => {
      let title = TITLE_LIST[Math.floor(Math.random() * TITLE_LIST.length)];
      let fruit =
        FRUIT_NAME_LIST[Math.floor(Math.random() * FRUIT_NAME_LIST.length)];
      if (title.endsWith(" a") && VOWEL_LIST.includes(fruit[0].toLowerCase())) {
        title += "n";
      }
      return `${title} ${fruit}`;
    };
    let name = generate();
    for (let i = 0; i < 100; i++) {
      if (!avoidDict[name]) {
        break;
      }
      name = generate();
    }
    return name;
  }
  /**
   * Add a suffix to the name to differentiate it from the names in the avoiding list.
   * For example, if the name is "John Doe" and the avoiding list contains "John Doe", "John Doe Jr.", and "John Doe the 3rd", the function will return "John Doe the 4th".
   * @param oldName The name to differentiate.
   * @param avoidingList A list of names to avoid. Ignore this parameter if you want to avoid nothing.
   */
  public static differentiateName(
    oldName: string,
    avoidingList: Array<string>
  ): string {
    let avoidDict = Object.fromEntries(
      avoidingList.map((name) => [name, true])
    );
    if (!avoidDict[oldName]) {
      return oldName;
    }
    let generate = () => {
      let result = oldName.match(/ (Jr\.|the (3)rd|the (\d+)th)$/);
      if (result) {
        oldName = oldName.substring(0, oldName.length - result[1].length);
        let num = parseInt(result[2]);
        if (!num) {
          // Jr. --> 3rd
          return `the ${oldName}3rd`;
        }
        // 3rd --> 4th
        return `the ${oldName}${num + 1}th`;
      }
      // No suffix --> Jr.
      return `${oldName} Jr.`;
    };
    let name = generate();
    for (let i = 0; i < 100; i++) {
      if (!avoidDict[name]) {
        break;
      }
      name = generate();
    }
    return name;
  }
}

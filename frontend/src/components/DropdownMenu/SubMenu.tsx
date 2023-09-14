import { ItemData } from "./ItemData";
import MenuItem from "./MenuItem";
export interface SubMenuProps {
  items: Array<ItemData>;
  onItemSelect: (itemIndex: number, itemData: ItemData) => void;
  location: string;
}

export default function SubMenu(props: SubMenuProps) {
  const itemDataList = props.items;

  return itemDataList.map((itemData, itemIndex) => {
    return (
      <MenuItem
        item={itemData}
        onSelect={() => {
          props.onItemSelect(itemIndex, itemData);
        }}
        key={`${props.location}(${itemIndex})`}
      />
    );
  });
}

# Change Log for This Version

PageView added. Popup layout updated.
Character opens page view by touching an item.
Player get notified when a player joins or leaves the room.

## Backend

- No changes

## Frontend

- Added: PageView can now load a web page or a markdown page when a player's character interacts with an item.
- Updated: The popup layout has been updated to accommodate the new PageView. A gradient background has been added for the message box and buttons. CSS transitions have been added for a smoother popup animation.
- Updated: A new popup type has been introduced that does not block mouse clicks on the GameView. This is applicable when a popup does not have any buttons for player interaction. It's useful for displaying quick messages that only show for a few seconds and do not require player interaction.
- Updated: The player will now be notified when another player joins or leaves the room.

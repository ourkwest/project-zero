# Project Zero

Project Zero is a space dogfighting game.

## Flow

Splash / menu screen:
* Default landing page
* 'Host game' -> moves to the host game screen
* 'Join game' -> moves to join game screen

Host game screen:
* User name input
* User color selector
* 'Start game' -> creates a session id and moves to session screen
  * Session ids will be randomly constructed 3-word noun phrases. There should be at least 1000 possible session ids, but it should be easy to extend the set of input words later by modifying the source code.
  * Can only be pressed once a gamepad with two joysticks and three buttons has been connected.
  * Can only be pressed once a user name has been entered.

Join game screen:
* User name input
* User color selector
* Has three dropdowns to enter a 3-word noun phrase as the session id, and a 'Join' button.
* Alternative landing page - reachable via a weblink or QR code, which will pre-fill the dropdowns, but await the user entering their name and pressing the join button.
* 'Join' -> moves to session screen
  * Can only be pressed once a gamepad with two joysticks and three buttons has been connected.
  * Can only be pressed once a user name has been entered.
  * Can only be pressed once a session id has been entered.

Session screen:
* Displays session id in plain text, weblink (including session id), QR code for weblink with session id.
* Displays list of names of players who have joined.
* 'Play' -> moves to gameplay screen

Gameplay screen:
* The user pilots a ship in space and shoots at opponents.
* The gameplay and art will be 2d, but the view will be tilted forward of the player's ship to give a perspective that shows much more of what is in front of the ship than behind.
* The ship will have two thrusters, one on each side. They can fire in any direction and are triggered by the two joysticks on the gamepad.
* The ship will have a gun that is triggered by one of the buttons. The other two buttons will cycle between weapons.
* Movement:
  * will be realtime based on thruster controls
  * thrusters will apply acceleration to each side of the ship in the matching direction
    * Left: forwards, Right: forwards -> ship accelerates forwards
    * Left: backwards, Right: forwards -> ship accelerates counter-clockwise rotation
    * Left: forwards, Right: backwards -> ship accelerates clockwise rotation
    * Left: backwards, Right: backwards -> ship decelerates / accelerates backwards
  * friction will decelerate ships from full speed to a standstill when no thrusters are firing, both rotationally and normally, in about 3 seconds
  * Players can pass through each other and black holes, or they could bounce off them, I don't mind.
* The world:
  * will be a large open space
  * a thin starfield backdrop will provide a sense of location, ideally parallaxed behind the 2d game world, but with the same perspective view
* User display:
  * Health percentage
    * Depleted when hit by weapons
  * Energy percentage
    * Energy will regenerate at a constant rate
    * Firing thrusters will slowly deplete energy
    * Firing weapons will deplete energy
  * Current selected Weapon
  * Other player indicators
    * A small colored marker at the edge of the screen will show the direction of other offscreen players
* Weapons:
  * Small Gun - uses a little energy, fires a small fast projectile, does small damage
  * Big Gun - uses a lot of energy, fires a large slow projectile, does large damage
  * Shotgun - uses a little energy, fires a spread of tiny projectiles, each doing tiny damage
  * Homing Missile - uses a lot of energy, fires a small homing projectile, does small damage
  * Repair - channels energy into slowly regenerating health
* Death:
  * When a players health reaches zero, they explode and leave behind a black hole, a point mass (though rendered slightly lager) that attracts projectiles, but not players.
  * Exploded players respawn.

## Technical notes
A high frame rate is important.
Libraries can be added sparingly, discuss with me first. 
Language choice is up to you. Clojurescript would be my preference, but the immutability might work against performance. Javascript is also an option. Any other language: discuss with me first.
Ask plenty of questions.
Sound effects would be great, as well as graphical flourishes around thrusters, weapons, etc.
Complex graphical assets should be rendered with code into in-memory images to then be used in the game engine. This allows for parameterized rendering (e.g. different player colors, potentially health / energy levels).
Code should prioritize modularity and maintainability - keep each source file small and focused where you can.
There may be future enhancements around: shields, power up crates, more weapons.

## Decisions

### Networking library
Build an abstraction that could support both PeerJS and Trystero. For now, implement it with PeerJS only.

### Language
Plain modern Javascript in a functional style. Tasteful libraries that bring it towards clojurescript in feel can be considered.

### Rendering
Use Canvas 2D. If we can sprinkle in some WebGL effects that might be fun, but only if it doesn't make the code a horrible complex mess.

### Game state sync
Each player will be authoritative over their own state and broadcast it to other players.

### Sound effects
Will be procedurally generated, but can be cached if appropriate.

### Tooling
Vite with dev HTTPS (for mobile gamepad support), HMR, and static production builds.

## Milestones

1. Vite setup + single-player ship with gamepad controls (thrusters + physics)
2. Rendering (perspective view, starfield, HUD)
3. Networking (lobby flow: host/join/session screens, P2P connection)
4. Multiplayer (see other ships moving)
5. Weapons + combat
6. Death/respawn + black holes
7. Sound + visual polish
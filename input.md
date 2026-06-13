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

## Feedback

Ask as many questions as you need.

### Control scheme

A new model for controlling the ship will replace the old model. The same physics model (two physics-based thrusters) will be kept though.
On steering input, the thrusters will fire differentially to cause an increase in angular momentum, as if the user were pushing one stick more forward than the other under the old control scheme.
Both steering and flying should still work simultaneously though, so steering will create one set of thrusts and moving another, and then the sum of those thrusts will be applied to the thrusters.

Both control schemes will be enabled simultaneously:

#### Mouse + Keyboard:
Mouse used for steering left/right - capture the mouse if it seems sensible, if so, do it on click in the gameplay view and 'esc' should release it.
Mouse click to fire, scroll wheel to select weapon.
Arrow keys - used to go forwards, backwards and sideways (strafing) in the rotational reference frame of the ship - 'up' is always straight forward for the ship.

#### Gamepad:
Left stick - steering left/right
Right stick - used to go forwards, backwards and sideways (strafing)
L1 / R1 to select weapons
R2 to fire

### Graphical

A big explosion going out that then gets sucked in to nothing when a dead player becomes a black hole.
Dead players not drawn while waiting to respawn
Some bug in other player indicators when they are far away maybe?
A player kill count or death count (whichever is easier, but kill count is preferred if the difference is marginal) should be displayed as a leaderboard in one of the top corners of the screen.
Move the energy bar just below the player ship.
Move the weapon display just below the energy bar below the ship.
Display the health as a green stroked arc centered around the center of the ship that shrinks as damage is taken. 100% health -> full green circle, 50% -> green semi-circle around back half of ship, 1% health -> small green line (very short arc segment) behind ship.

### Gameplay

Respawn in a new location, not where you died.
Player ships get bigger (to make them bigger targets) when they kill another player.
* 20% bigger per death. Their mass should slightly increase too (maybe 5%?) (or fake it by some other means) so that their acceleration is slower.
* Max player size is 10x starting size.
* On death, player size/mass resets.
Movement should deplete energy, almost as fast as it regenerates when flying at full thrust, but scaled with control inputs.
A "Boost" button (L2? / Shift?) - you can just fly faster when activating it, but energy consumption will be slightly higher than the regeneration rate.

### Weapons

A new Laser weapon added to the cyclable roster of weapons
* draws a line, with decreasing power/damage/brightness as distance from the ship increases.
* Exact range/line length can be tweaked but start at ~25x initial ship length (but can be hard coded, doesn't need to be relative to ship length in the code).
* Path affected by gravity.
* Continuous beam while holding the fire button.

More ideas for weapons please.

#### Weapon Ideas (brainstormed)

1. **Gravity Bomb** — Fires a slow projectile that, on impact or after a timer, creates a temporary black hole lasting ~5 seconds. Pulls enemy projectiles off course and can trap ships in its pull. High energy cost, long cooldown.
2. **Shield Pulse** — Briefly projects a circular shield that reflects incoming projectiles back at attackers. Short duration (~0.5s), moderate cooldown. Rewards timing.
3. **Mine Layer** — Drops stationary proximity mines behind your ship. They detonate when an enemy comes within range. Low damage individually but you can lay a trail. Lasts 15-20 seconds before self-destructing.
4. **Tether/Grapple** — Fires a beam that latches onto an enemy and tethers you together (slowing them, pulling you toward each other). While tethered, other weapons can still fire. Enemy can break free by boosting.
5. **EMP Burst** — Short-range radial pulse that drains enemy energy (not health) and briefly disables their steering. Great defensive tool when someone's on your tail.
6. **Railgun** — Instant hitscan line (no gravity bending), very high damage, very long cooldown (~4s), narrow (no AoE). High-risk high-reward sniper weapon.
7. **Scatter Rockets** — Fires 3 slow-moving rockets that fan out, then after 1 second all turn toward the nearest enemy. Less accurate than homing missile but harder to evade as a group.
8. **Plasma Wall** — Fires a short-lived barrier (perpendicular to your heading) that damages enemies who fly through it. Acts as area denial — forces opponents to go around or take damage.


# Feedback 2

'Start Game' button should read 'Start Session' as clicking it does not immediately start the gameplay.
Starting a session as host should add the session id to the URL. 
The join screen should have the session id dropdowns filled if they are provided in the URL.
The colors of players can still be too similar - there should be logic to separate them, but it might need revisiting.
Guest session id is displayed lower case, host is Title Case. They should match, but I don't mind what case is used.
When the ship disappears during the respawn pause, so should the energy bar and weapon selection indicator
The health arc should be less opaque
Laser needs at least double the range, and more gravity curvature.
Strafing and Turning should stay where they are, but moving forwards/backwards should change to the left stick with the turning.



- are we tracking both age and lifetime on the projectiles?
- are there other simplifications that could be made to the code?
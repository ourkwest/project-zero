# Project Zero

A multiplayer 2D space dogfighting game played with gamepads. Players host or join sessions via peer-to-peer connections, pilot ships with dual-thruster controls, and fight using a variety of weapons. Defeated players leave behind black holes that bend projectile paths.

## Local Development

```sh
npm install
npm run dev
```

Opens on HTTPS (required for gamepad API on mobile). Connect a gamepad with two joysticks and at least three buttons.

## Production Build

```sh
npm run build
npm run preview
```

Deploys automatically to GitHub Pages on push to `main`.

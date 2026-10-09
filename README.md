# Hot Potato Island 3D — multiplayer prototype

This version keeps the original single-player game and adds online rooms with room codes and real-time remote-player movement/avatars.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm start
```

Open `http://localhost:3000` in a browser. For testing with another device on the same Wi-Fi, use the computer's LAN IP and port 3000 (firewall must allow it).

## Publish online

Deploy this folder as a Node web service on a host that supports WebSockets. Build command: `npm install`. Start command: `npm start`. The service uses the `PORT` environment variable provided by the host. Open the deployed HTTPS URL; the game automatically uses secure WebSockets (`wss://`).

## Important status

This is the first multiplayer milestone: rooms, up to 8 connected users, remote avatars, and movement synchronization. The original bomb timer, passing/throwing, power-ups, eliminations, and score are still simulated independently on each browser. They are **not yet authoritative/shared between players**. That is the next development step; don't present this build as finished competitive multiplayer yet.

The 3D library is loaded from public CDNs, so the first launch requires internet access.

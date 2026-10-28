# Blockling English · Bunny Garden

An original, small island adventure for children beginning English, best explored together with a grown-up.

## Play

Open this repository's GitHub Pages website in a modern browser. No account or installation is needed. Tap **Let's explore**.

1. Find an apple and collect three blue blocks.
2. Repair the bridge to reach a new island and meet bunny.
3. Jump on the star and plant a flower.
4. Collect two wood bundles and two seed bags. Choose benches, lanterns, flowers or carrots for four garden plots; choose a roof color. After decorating at least two plots, choose **Picnic & rest** for a clear stopping point.

Tap grass to walk and objects to interact. Arrow keys / WASD also move; Space jumps when the game canvas has focus. On small screens, direction buttons are available. **Build** uses the six sandy tiles on the first island. **Pick up** returns placed blocks and garden materials for rearranging. **Map** shows both islands. Chinese hints and a parent guide are available.

## Music and speech

The original, low-volume procedural melody starts only after a user gesture. **Music** turns it on/off and saves that choice. Instruction speech lowers the melody; pause, dialogs and page hiding stop the music. Audio availability and quality vary by browser and device. The game remains playable without audio.

**Listen** uses only English voices the browser identifies as local. Voice detection does not verify pronunciation or audible output. Text remains available if speech cannot play. No microphone is requested.

## Saves and privacy

Progress and the music choice stay in this browser's localStorage. Different devices, browsers and website origins have separate saves. Local-development saves are not uploaded or transferred to this website.

A valid V1 save on the same origin is copied into a separate V2 record, leaving the original V1 record unchanged. Existing V2 progress takes precedence. Unreadable saves are protected from automatic replacement. Reset requires explicit confirmation in **Parents** and resets V2 only, retaining V1 and the music choice. Clearing browser data can remove saves; unavailable storage prevents saving.

The game has no accounts, chat, ads, analytics, purchases, or collection of children's names/photos. The hosting provider may keep ordinary access/security logs, including IP addresses.

## Scope and verification

Original Canvas-drawn characters and scenery, a bounded 2.5D isometric world, a bridge, a friendly bunny and a small customizable garden. This is not a true 3D engine. There are no third-party runtime libraries, asset services or paid APIs. No educational outcome is promised.

V2 has 40 passing source-level tests covering game progression, inventory, migration, storage safeguards and simulated UI/audio events. These are not real-browser or listening tests. V2 visual acceptance, physical mobile behavior and audible music/voice quality remain unverified at publication preparation.

For local development, serve these files with a static HTTP server. Opening index.html directly as a local file is not supported because the game uses JavaScript modules.

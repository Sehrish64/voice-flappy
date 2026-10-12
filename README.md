# 🐦 Voice Flappy

A Flappy Bird clone you control with your voice. Shout to flap, or hum and sing to steer the bird by pitch. No libraries, no build step.

## Modes
- **Shout mode:** loud sound or the words "up", "jump", "oopar" make the bird flap.
- **Pitch mode:** high note = fly up, low note = go down, silence = fall. Pick Low / Normal / High voice range so the bird reaches the whole screen.
- **Sound effects:** flap, score and crash sounds are generated in code, no audio files.

## Share your score
After game over, a **📤 Share score** button appears. It renders a 1080×1080 score card (title, score, best, code-drawn bird, dark theme) and:
- on mobile → opens the native share sheet with the image attached (`navigator.share`);
- on desktop → downloads the PNG instead.

## How it works
- **Pitch:** autocorrelation on the mic signal finds your voice frequency (70–700 Hz), mapped on a log scale to the bird's height within your chosen voice range.
- **Volume flap:** the Web Audio API measures mic loudness; a loud sound crosses a threshold and the bird flaps. Fast and works in any language.
- **Word flap:** the Web Speech API listens for "up", "jump", "flap" (English) or "oopar" / "اوپر" (Urdu). Slightly slower, Chrome/Edge/Safari only.
- **Fallback:** Space, Arrow Up, or tap also flap.

## Run it
Mic access needs HTTPS or localhost:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Tips
- Use the sensitivity slider. The red line on the meter is the flap threshold.
- Headphones help, so game sounds don't trigger the mic.
- Humming or singing "ooo" works best in pitch mode.

## Ideas
- [ ] Global leaderboard
- [ ] More voice commands ("neeche" to dive)

## License
MIT

# 🎵 Music Library

Add your MP3 files to this folder. The app will automatically play them.

## How to Add Music

1. Place your MP3 files in this `music/` folder
2. Name your files to match the filenames in the app:
   - `haareya.mp3`
   - `pal-pal-dil-ke-paas.mp3`
   - `century.mp3`
   - `reflections.mp3`
   - `itni-si-baat-hain.mp3`
   - `ishq-wala-love.mp3`
   - `teri-meri-kahaani.mp3`
   - `tum-jo-aate-ho.mp3`
   - `lut-gaye.mp3`
   - `ae-dil-hai-mushkil.mp3`

## To Customize Song List

Edit the `SONGS` array in `index.html` (around line 4528):

```javascript
const SONGS = [
  {id:1, title:'Your Song Title', artist:'Artist Name', icon:'🎵', file:'your-filename.mp3'},
  // Add more songs...
];
```

Change these fields:
- **title**: Display name in the app
- **artist**: Artist name shown below title
- **icon**: Emoji to represent the song
- **file**: Exact MP3 filename in this folder

## Supported Formats

- MP3 (`.mp3`)
- WAV (`.wav`)
- OGG (`.ogg`)
- M4A (`.m4a`)

## Music Folder Path

If you want to move the music folder to a different location, update this line in `index.html`:

```javascript
const MUSIC_FOLDER = 'music/'; // Change this path
```

## Troubleshooting

If a song doesn't play:
1. Check that the filename in your code matches the actual file (case-sensitive on some systems)
2. Make sure the file is in the correct `music/` folder
3. Check browser console for error messages
4. Ensure the file is a valid audio format

---

Happy studying! 🎧

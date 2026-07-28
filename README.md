# Wallpaper Time

A GNOME Shell extension that changes your desktop wallpaper dynamically based on the time of day.

## Features

- Schedule different wallpapers for different times of day
- Automatic wallpaper switching every 30 seconds
- Midnight wrap-around: after the last scheduled time, the first entry takes over
- Simple preferences UI to add, remove, and reorder time slots
- Supports any image format supported by GNOME

## Installation

### From source

```bash
git clone https://github.com/hsott/wallpaper-time.git
cd wallpaper-time@hsott
cp -r . ~/.local/share/gnome-shell/extensions/wallpaper-time@hsott/
```

Restart GNOME Shell (`Alt+F2`, type `r`, press Enter), then enable the extension via GNOME Extensions app or:

```bash
gnome-extensions enable wallpaper-time@hsott
```

## Usage

1. Open **GNOME Extensions** app and go to Wallpaper Time settings.
2. Click **Add Time Slot** to add a new entry.
3. Use the time spinner to set the desired hour and minute.
4. Click the folder icon to select a wallpaper image.
5. Add as many time slots as you like.

The wallpaper changes at each configured time and stays until the next scheduled entry. After the last entry of the day, the wallpaper rolls over to the first entry.

## Configuration

Settings are stored in `org.gnome.shell.extensions.wallpaper-time` and can also be edited via `dconf`:

```bash
dconf write /org/gnome/shell/extensions/wallpaper-time/wallpaper-list "['06:00,file:///path/to/morning.jpg', '12:00,file:///path/to/noon.jpg', '18:00,file:///path/to/evening.jpg', '22:00,file:///path/to/night.jpg']"
```

## Structure

```
wallpaper-time@hsott/
├── extension.js                  # Main extension logic
├── metadata.json                 # Extension metadata
├── prefs.js                      # Preferences UI
├── schemas/
│   ├── gschemas.compiled         # Compiled GSettings schema
│   └── org.gnome.shell.extensions.wallpaper-time.gschema.xml  # Schema definition
└── README.md
```

## Requirements

- GNOME Shell 50
- GNOME 50+

## License

MIT

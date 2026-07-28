// GNOME Shell imports
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

// GSettings schema for the desktop background
const BACKGROUND_SCHEMA = 'org.gnome.desktop.background';

export default class WallpaperTimeExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        // Timer that periodically checks if the wallpaper should change
        this._timeoutId = null;
        // Signal connection ID for reacting to preference changes
        this._settingsChangedId = null;
        // Extension-specific settings (wallpaper-list)
        this._settings = null;
        // GNOME desktop background settings (picture-uri)
        this._bgSettings = null;
        // Tracks the last applied wallpaper URI to avoid redundant updates
        this._currentUri = null;
    }

    // Called when the extension is enabled
    enable() {
        this._settings = this.getSettings();
        this._bgSettings = new Gio.Settings({ schema_id: BACKGROUND_SCHEMA });

        // Apply the correct wallpaper immediately
        this._updateWallpaper();

        // Poll every 30 seconds to handle time-based wallpaper changes
        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => {
            this._updateWallpaper();
            return GLib.SOURCE_CONTINUE;
        });

        // Re-apply wallpaper whenever the user modifies the schedule in preferences
        this._settingsChangedId = this._settings.connect('changed::wallpaper-list', () => {
            this._updateWallpaper();
        });
    }

    // Called when the extension is disabled
    disable() {
        if (this._timeoutId !== null) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
        if (this._settingsChangedId !== null && this._settings !== null) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        if (this._settings !== null) {
            this._settings = null;
        }
        this._bgSettings = null;
        this._currentUri = null;
    }

    // Determine and apply the correct wallpaper based on the current time
    _updateWallpaper() {
        const entries = this._settings.get_strv('wallpaper-list');
        if (entries.length === 0)
            return;

        const now = new Date();
        const currentMin = now.getHours() * 60 + now.getMinutes();

        // Phase 1: find the entry whose time is the closest to the current time
        // without being in the future (i.e., the last entry that has already started)
        let bestEntry = null;
        let bestMin = -1;

        for (const entry of entries) {
            const parts = entry.split(',', 2);
            if (parts.length !== 2)
                continue;

            const [timeStr, uri] = parts;
            const [hStr, mStr] = timeStr.split(':');
            const h = parseInt(hStr, 10);
            const m = parseInt(mStr, 10);
            if (isNaN(h) || isNaN(m))
                continue;

            const entryMin = h * 60 + m;

            if (entryMin <= currentMin && entryMin > bestMin) {
                bestMin = entryMin;
                bestEntry = entry;
            }
        }

        // Phase 2: if no entry matched (current time is before the first entry),
        // wrap around to the last entry of the day (midnight rollover)
        if (!bestEntry) {
            let latestMin = -1;
            for (const entry of entries) {
                const parts = entry.split(',', 2);
                if (parts.length !== 2)
                    continue;
                const [timeStr, uri] = parts;
                const [hStr, mStr] = timeStr.split(':');
                const m = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
                if (m > latestMin) {
                    latestMin = m;
                    bestEntry = entry;
                }
            }
        }

        // Apply the wallpaper if it's different from the current one
        if (bestEntry) {
            const uri = bestEntry.split(',', 2)[1];
            if (uri && uri !== this._currentUri) {
                this._bgSettings.set_string('picture-uri', uri);
                this._bgSettings.set_string('picture-uri-dark', uri);
                this._currentUri = uri;
            }
        }
    }
}

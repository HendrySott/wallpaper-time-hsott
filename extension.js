import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

const BACKGROUND_SCHEMA = 'org.gnome.desktop.background';

export default class WallpaperTimeExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._timeoutId = null;
        this._settingsChangedId = null;
        this._settings = null;
        this._bgSettings = null;
        this._currentUri = null;
    }

    enable() {
        this._settings = this.getSettings();
        this._bgSettings = new Gio.Settings({ schema_id: BACKGROUND_SCHEMA });

        this._updateWallpaper();

        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => {
            this._updateWallpaper();
            return GLib.SOURCE_CONTINUE;
        });

        this._settingsChangedId = this._settings.connect('changed::wallpaper-list', () => {
            this._updateWallpaper();
        });
    }

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

    _updateWallpaper() {
        const entries = this._settings.get_strv('wallpaper-list');
        if (entries.length === 0)
            return;

        const now = new Date();
        const currentMin = now.getHours() * 60 + now.getMinutes();

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

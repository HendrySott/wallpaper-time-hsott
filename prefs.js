'use strict';

import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class WallpaperTimePreferences extends ExtensionPreferences {
    async fillPreferencesWindow(window) {
        const settings = this.getSettings(this.metadata['settings-schema']);

        window.set_default_size(550, 500);

        const page = new Adw.PreferencesPage();
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: 'Wallpaper Schedule',
            description: 'Configure wallpapers for different times of day. ' +
                'At each configured time, the wallpaper changes to the selected image. ' +
                'The image stays until the next scheduled time (wrap-around at midnight).',
        });
        page.add(group);

        let currentRows = [];

        const rebuildList = () => {
            for (const row of currentRows)
                group.remove(row);
            currentRows = [];

            const entries = settings.get_strv('wallpaper-list');
            for (let i = 0; i < entries.length; i++) {
                const parts = entries[i].split(',', 2);
                const row = this._createEntryRow(settings, i, parts[0] || '12:00', parts[1] || '', window, rebuildList);
                group.add(row);
                currentRows.push(row);
            }

            const addBtn = new Gtk.Button({
                label: 'Add Time Slot',
                cssClasses: ['suggested-action'],
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
                marginTop: 6,
                marginBottom: 6,
            });
            addBtn.connect('clicked', () => {
                const list = settings.get_strv('wallpaper-list');
                list.push('12:00,');
                settings.set_strv('wallpaper-list', list);
                rebuildList();
            });
            group.add(addBtn);
            currentRows.push(addBtn);
        };

        rebuildList();
    }

    _createEntryRow(settings, index, time, uri, window, onChanged) {
        const [hStr, mStr] = (time || '12:00').split(':');
        let hours = parseInt(hStr, 10);
        let minutes = parseInt(mStr, 10);
        if (isNaN(hours)) hours = 12;
        if (isNaN(minutes)) minutes = 0;

        const filename = uri
            ? decodeURIComponent(uri.replace(/^file:\/\//, ''))
            : 'No file selected';

        const row = new Adw.ActionRow({
            title: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
            subtitle: filename,
        });

        const timeBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 2 });
        const hourSpin = Gtk.SpinButton.new_with_range(0, 23, 1);
        hourSpin.valign = Gtk.Align.CENTER;
        hourSpin.value = hours;
        const minSpin = Gtk.SpinButton.new_with_range(0, 59, 1);
        minSpin.valign = Gtk.Align.CENTER;
        minSpin.value = minutes;
        const sep = new Gtk.Label({ label: ':' });
        timeBox.append(hourSpin);
        timeBox.append(sep);
        timeBox.append(minSpin);
        row.add_prefix(timeBox);

        const chooseIcon = new Gtk.Image({ icon_name: 'document-open-symbolic' });
        const chooseBtn = new Gtk.Button({ child: chooseIcon });
        chooseBtn.tooltip_text = 'Choose wallpaper image';
        chooseBtn.connect('clicked', () => {
            const dialog = new Gtk.FileChooserNative({
                title: 'Select Wallpaper Image',
                action: Gtk.FileChooserAction.OPEN,
                transient_for: window,
            });
            const filter = new Gtk.FileFilter();
            filter.add_mime_type('image/*');
            dialog.add_filter(filter);
            dialog.connect('response', (d, response) => {
                if (response === Gtk.ResponseType.ACCEPT) {
                    const file = d.get_file();
                    if (file) {
                        const newUri = file.get_uri();
                        const list = settings.get_strv('wallpaper-list');
                        const h = Math.round(hourSpin.value);
                        const m = Math.round(minSpin.value);
                        list[index] = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')},${newUri}`;
                        settings.set_strv('wallpaper-list', list);
                        onChanged();
                    }
                }
                d.destroy();
            });
            dialog.show();
        });
        row.add_suffix(chooseBtn);

        const delIcon = new Gtk.Image({ icon_name: 'user-trash-symbolic' });
        const delBtn = new Gtk.Button({ child: delIcon });
        delBtn.tooltip_text = 'Remove this time slot';
        delBtn.cssClasses = ['destructive-action'];
        delBtn.connect('clicked', () => {
            const list = settings.get_strv('wallpaper-list');
            list.splice(index, 1);
            settings.set_strv('wallpaper-list', list);
            onChanged();
        });
        row.add_suffix(delBtn);

        let updating = false;
        const updateTime = () => {
            if (updating) return;
            updating = true;
            const h = Math.round(hourSpin.value);
            const m = Math.round(minSpin.value);
            const list = settings.get_strv('wallpaper-list');
            const existingUri = list[index]?.split(',', 2)[1] || '';
            list[index] = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')},${existingUri}`;
            settings.set_strv('wallpaper-list', list);
            row.title = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            updating = false;
        };
        hourSpin.connect('value-changed', updateTime);
        minSpin.connect('value-changed', updateTime);

        return row;
    }
}

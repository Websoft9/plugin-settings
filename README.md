[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)
[![GitHub last commit](https://img.shields.io/github/last-commit/websoft9/plugin-settings)](https://github.com/websoft9/plugin-settings)
[![GitHub Release Date](https://img.shields.io/github/release-date/websoft9/plugin-settings)](https://github.com/websoft9/plugin-settings)
[![GitHub Repo stars](https://img.shields.io/github/stars/websoft9/plugin-settings?style=social)](https://github.com/websoft9/plugin-settings)

# Websoft9 Plugin - `settings`

This plugin is the system settings of Websoft9, it is used to manage application key, port and default domain.

![image](https://github.com/Websoft9/plugin-settings/assets/43192516/773b2fde-044b-42fb-a3d0-4e2cd4cd70ce)


## Installation and update

Your server must be have [Websoft9](https://github.com/Websoft9) installed.  

```
wget https://websoft9.github.io/websoft9/scripts/update_zip.sh && bash ./update_zip.sh --channel release --package_name "settings-latest.zip" --sync_to "/usr/share/cockpit/settings"
```

## Development

See [Developer.md](docs/developer.md) for details about how to efficiently change the code, run, and test it.

### Building

These commands check out the source and build it into the directory:build/
```
git clone https://github.com/Websoft9/plugin-settings
cd plugin-settings
npm build
```
You can also triggers action workflow for building

### Release

#### When

Two scenarios that trigger this plugin release:

* Add new functions for this plugin
* [Websoft9](https://github.com/Websoft9/websoft9) release

#### How

You should following the standard [release process](https://github.com/Websoft9/websoft9/blob/main/docs/plugin-developer.md#release).   

Every release will creates the official release zipball and publishes as upstream release to GitHub

## License

**plugin-settings** is maintained by [Websoft9](https://www.websoft9.com) and released under the GPL3 license.

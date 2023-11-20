# Developer

## Technology Stack

**Frontend**  

- ui: react-bootstrap, classnames
- js framework: [Create React App](https://create-react-app.dev/docs/documentation-intro)
- template: no use

**Backend API**  

- apphub: this is for websoft9 system settings, such as port, api-key, domain
- cockpit: this is for running command at host machine


## Build and Test

You should install [Websoft9](https://github.com/Websoft9/websoft9) for testing, then build it:

```
git clone https://github.com/Websoft9/plugin-settings
cd plugin-settings
yarn build && cp -r ./build/* /usr/share/cockpit/settings/
```
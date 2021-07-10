# pslight

A small app to provide ambient lighting for a PS5 based on its power status and who is currently logged in. It is designed to be run on a Raspbery Pi with a strip of addressable RGB leds attached.

Many thanks to [Tustin](https://github.com/Tustin), who's GitHub repositories helped answer a couple of vital questions about the PSN API.

## Getting an NPSSO token

This app requires an NPSSO token to communicate with the PSN API. The easiest way to get one is to follow these steps:

- Open an incognito\* browser window
- Sign in to https://my.playstation.com/
- Visit https://ca.account.sony.com/api/v1/ssocookie
- Save the page in this folder as psn.json

\* Signing out of your account, will invalidate your NPSSO. By using an incognito browser you can be sure that you are getting a new NPSSO token and that it won't be used by anything else.

# Mielo

A mobile vocabulary learning app with spaced repetition. Decks, cards, and progress are stored locally. Mielo uses FSRS for scheduling and Whisper for speech recognition.

## Running on iOS

Requires macOS, Xcode with iOS Simulator, CocoaPods, and Node.js. The project has been tested with Node.js 26.

```sh
npm install
npm run ios
```

`npm run ios` builds and installs a development build on the simulator. After the first build, start the development server with:

```sh
npm start
```

Run `npm run ios` again after adding or changing native dependencies. Expo Go cannot run this project because Whisper requires a native module.

Download the speech model once from the app settings to use voice input. After that, speech recognition runs locally without an internet connection. Answer playback uses system voices, whose availability depends on the language.

## Importing words

Import words into a deck from a UTF-8 CSV, TXT, or TSV file, or paste text directly. Supported delimiters are comma, semicolon, and tab. Each import is limited to 5,000 entries and 5 MiB; duplicate words in the deck are skipped.

Fields without a header: **word; translation; reading; comment**. The last two fields are optional:

```text
食べる;to eat;たべる;about eating
猫;cat;ねこ
```

Enclose fields containing a delimiter or line break in double quotes. Escape a double quote inside a field as `""`.

## Checks

```sh
npm run typecheck
npm test
```

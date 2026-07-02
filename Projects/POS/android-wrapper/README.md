# RealtyBytes POS Android Wrapper

This Android project wraps the browser POS in a native WebView and adds a native Bluetooth ESC/POS print bridge for common paired thermal printers.

## Open In Android Studio

1. Open Android Studio.
2. Choose `Open`.
3. Select the `android-wrapper` folder.
4. Let Android Studio sync Gradle.
5. Run on an Android tablet or phone.

The Gradle build copies these web files into Android assets automatically:

- `../index.html`
- `../styles.css`
- `../app.js`

The app loads:

```text
file:///android_asset/pos/index.html
```

## Printer Flow

1. Pair the Bluetooth thermal printer in Android system Bluetooth settings.
2. Open the POS app.
3. Go to `Settings`.
4. Choose `58mm thermal` or `80mm thermal`.
5. Tap `Connect printer`.
6. Select the paired printer.
7. Open or complete a receipt and tap `Print`.

## Notes

- This targets generic Bluetooth ESC/POS printers using the common SPP UUID.
- Some printers use vendor-specific Bluetooth services and may need custom commands.
- Android 12+ requires Bluetooth permission; the app requests it on startup.
- The current bridge prints plain receipt text from the WebView receipt preview.

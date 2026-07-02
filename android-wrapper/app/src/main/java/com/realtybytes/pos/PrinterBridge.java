package com.realtybytes.pos;

import android.Manifest;
import android.app.AlertDialog;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;

import java.io.OutputStream;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public class PrinterBridge {
    private static final String PREFS = "printer";
    private static final String KEY_ADDRESS = "address";
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private final Context context;
    private final WebView webView;
    private final SharedPreferences prefs;

    public PrinterBridge(Context context, WebView webView) {
        this.context = context;
        this.webView = webView;
        this.prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @JavascriptInterface
    public void selectPrinter() {
        runOnUi(() -> {
            if (!hasBluetoothPermission()) {
                toast("Allow Bluetooth permission first.");
                return;
            }

            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null) {
                toast("Bluetooth is not available on this device.");
                return;
            }

            Set<BluetoothDevice> devices = adapter.getBondedDevices();
            if (devices == null || devices.isEmpty()) {
                toast("Pair your thermal printer in Android Bluetooth settings first.");
                return;
            }

            List<BluetoothDevice> list = new ArrayList<>(devices);
            String[] labels = new String[list.size()];
            for (int i = 0; i < list.size(); i++) {
                BluetoothDevice device = list.get(i);
                labels[i] = safeName(device) + " - " + device.getAddress();
            }

            new AlertDialog.Builder(context)
                .setTitle("Select thermal printer")
                .setItems(labels, (dialog, which) -> {
                    BluetoothDevice device = list.get(which);
                    prefs.edit().putString(KEY_ADDRESS, device.getAddress()).apply();
                    String js = "window.onAndroidPrinterSelected(" +
                        quote(safeName(device)) + "," + quote(device.getAddress()) + ")";
                    webView.evaluateJavascript(js, null);
                    toast("Printer selected: " + safeName(device));
                })
                .show();
        });
    }

    @JavascriptInterface
    public void printText(String receiptText, String paperWidth) {
        new Thread(() -> {
            String address = prefs.getString(KEY_ADDRESS, "");
            if (address.isEmpty()) {
                runOnUi(() -> toast("Select a Bluetooth printer first."));
                return;
            }
            if (!hasBluetoothPermission()) {
                runOnUi(() -> toast("Allow Bluetooth permission first."));
                return;
            }

            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null) {
                runOnUi(() -> toast("Bluetooth is not available."));
                return;
            }

            try {
                BluetoothDevice device = adapter.getRemoteDevice(address);
                BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                adapter.cancelDiscovery();
                socket.connect();
                OutputStream output = socket.getOutputStream();
                output.write(buildEscPos(receiptText, "80".equals(paperWidth)));
                output.flush();
                output.close();
                socket.close();
                runOnUi(() -> toast("Receipt sent to printer."));
            } catch (Exception error) {
                runOnUi(() -> toast("Could not print. Check printer pairing and power."));
            }
        }).start();
    }

    private byte[] buildEscPos(String receiptText, boolean paper80mm) {
        String widthText = wrap(receiptText == null ? "" : receiptText, paper80mm ? 48 : 32);
        byte[] init = new byte[] { 0x1B, 0x40 };
        byte[] alignLeft = new byte[] { 0x1B, 0x61, 0x00 };
        byte[] feedCut = new byte[] { 0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x42, 0x00 };
        byte[] body = widthText.getBytes(Charset.forName("CP437"));
        byte[] result = new byte[init.length + alignLeft.length + body.length + feedCut.length];
        int index = 0;
        System.arraycopy(init, 0, result, index, init.length);
        index += init.length;
        System.arraycopy(alignLeft, 0, result, index, alignLeft.length);
        index += alignLeft.length;
        System.arraycopy(body, 0, result, index, body.length);
        index += body.length;
        System.arraycopy(feedCut, 0, result, index, feedCut.length);
        return result;
    }

    private String wrap(String text, int maxWidth) {
        StringBuilder result = new StringBuilder();
        String[] lines = text.replace("\r", "").split("\n");
        for (String line : lines) {
            String remaining = line.trim();
            if (remaining.isEmpty()) {
                result.append('\n');
                continue;
            }
            while (remaining.length() > maxWidth) {
                result.append(remaining, 0, maxWidth).append('\n');
                remaining = remaining.substring(maxWidth).trim();
            }
            result.append(remaining).append('\n');
        }
        return result.toString();
    }

    private boolean hasBluetoothPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
            context.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
    }

    private String safeName(BluetoothDevice device) {
        try {
            String name = device.getName();
            return name == null || name.trim().isEmpty() ? "Bluetooth printer" : name;
        } catch (SecurityException error) {
            return "Bluetooth printer";
        }
    }

    private String quote(String value) {
        return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'";
    }

    private void runOnUi(Runnable action) {
        webView.post(action);
    }

    private void toast(String message) {
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show();
    }
}

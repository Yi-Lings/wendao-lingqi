package com.lingqi.game;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.AtomicFile;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public final class MainActivity extends Activity {
    private static final String ENTRY = "file:///android_asset/index.html";
    private static final int EXPORT = 41, IMPORT = 42, MAX_SAVE = 1024 * 1024;
    private final Object saveLock = new Object();
    private WebView web;
    private AtomicFile saveFile, exportFile;
    private String pendingExport, pendingImport;
    private boolean pickerOpen, exitDialogOpen, activityReady, activityResumed, pendingExportRecovery;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        saveFile = new AtomicFile(new File(getFilesDir(), "lingqi-save.json"));
        exportFile = new AtomicFile(new File(getFilesDir(), "lingqi-export.tmp"));
        pickerOpen = state != null && state.getBoolean("pickerOpen", false);
        if (state != null && state.getBoolean("exportPending", false)) {
            pendingExport = readExportSnapshot();
            pendingExportRecovery = state.getBoolean("exportRecovery", false);
        } else exportFile.delete();
        getWindow().setStatusBarColor(Color.rgb(13, 21, 37));
        getWindow().setNavigationBarColor(Color.rgb(13, 21, 37));
        getWindow().getDecorView().setSystemUiVisibility(0);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(13, 21, 37));
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
                return WindowInsets.CONSUMED;
            }
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(13, 21, 37));
        WebView.setWebContentsDebuggingEnabled(false);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setGeolocationEnabled(false);
        settings.setSafeBrowsingEnabled(true);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !isEntry(request.getUrl().toString());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) { return !isEntry(url); }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (isAsset(request.getUrl())) return null;
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", null,
                        new ByteArrayInputStream(new byte[0]));
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (isEntry(url)) {
                    activityReady = true;
                    dispatchPendingImport();
                    lifecycle(activityResumed ? "resume" : "pause");
                }
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                activityReady = false;
                view.removeJavascriptInterface("Native");
                if (view.getParent() instanceof FrameLayout) ((FrameLayout) view.getParent()).removeView(view);
                view.destroy();
                web = null;
                new AlertDialog.Builder(MainActivity.this).setTitle("游戏页面需要重新启动")
                        .setMessage("已提交的进度保存在应用内。请重新打开游戏继续。")
                        .setPositiveButton("关闭", (dialog, which) -> finish()).setCancelable(false).show();
                return true;
            }
        });
        web.addJavascriptInterface(new SaveBridge(), "Native");
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        root.requestApplyInsets();
        web.loadUrl(ENTRY);
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
    }

    private static boolean isEntry(String url) {
        return ENTRY.equals(url) || (url != null && url.startsWith(ENTRY + "#"));
    }
    private static boolean isAsset(Uri uri) {
        String path = uri.getPath();
        return "file".equals(uri.getScheme()) && (uri.getAuthority() == null || uri.getAuthority().isEmpty())
                && path != null && path.startsWith("/android_asset/") && !path.contains("..") && !path.contains("\\");
    }
    private static String validatedSave(String text) throws Exception {
        if (text == null) throw new IllegalArgumentException("empty save");
        if (text.startsWith("\uFEFF")) text = text.substring(1);
        if (text.getBytes(StandardCharsets.UTF_8).length > MAX_SAVE) throw new IllegalArgumentException("save too large");
        JSONObject root = new JSONObject(text);
        int version = root.optInt("version", 0);
        if (version < 1 || version > 3) throw new IllegalArgumentException("unsupported save version");
        if (!(root.opt("player") instanceof JSONObject) || !(root.opt("story") instanceof JSONObject))
            throw new IllegalArgumentException("not a game save");
        if (version >= 2 && !(root.opt("paths") instanceof JSONObject)) throw new IllegalArgumentException("missing paths");
        if (version == 3 && (!(root.opt("gacha") instanceof JSONObject) || !(root.opt("loadouts") instanceof JSONObject)))
            throw new IllegalArgumentException("missing v3 state");
        return text;
    }
    private static String readBounded(InputStream input) throws Exception {
        if (input == null) throw new IllegalArgumentException("no input stream");
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int length;
            while ((length = input.read(buffer)) != -1) {
                if (output.size() + length > MAX_SAVE) throw new IllegalArgumentException("save too large");
                output.write(buffer, 0, length);
            }
            return StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(output.toByteArray())).toString();
        }
    }
    private boolean writeInternalSave(String json) {
        synchronized (saveLock) {
            FileOutputStream output = null;
            try {
                String clean = validatedSave(json);
                output = saveFile.startWrite();
                output.write(clean.getBytes(StandardCharsets.UTF_8));
                saveFile.finishWrite(output);
                return true;
            } catch (Exception error) {
                if (output != null) saveFile.failWrite(output);
                return false;
            }
        }
    }
    private String readInternalSave() {
        synchronized (saveLock) {
            // Return the original bounded text to the game validator. Treating a corrupt
            // existing save as an empty slot would allow a new game to overwrite it.
            try (InputStream input = saveFile.openRead()) { return readBounded(input); }
            catch (Exception error) {
                File base = saveFile.getBaseFile();
                if (base.exists() || new File(base.getPath() + ".bak").exists())
                    return "[原生存档无法读取，原始文件已保留。请先恢复备份。]";
                return "";
            }
        }
    }
    private static String boundedText(String text) {
        if (text == null || text.getBytes(StandardCharsets.UTF_8).length > MAX_SAVE)
            throw new IllegalArgumentException("text too large or missing");
        return text;
    }
    private boolean preserveExport(String text) {
        synchronized (saveLock) {
            FileOutputStream output = null;
            try {
                output = exportFile.startWrite();
                output.write(boundedText(text).getBytes(StandardCharsets.UTF_8));
                exportFile.finishWrite(output);
                return true;
            } catch (Exception error) {
                if (output != null) exportFile.failWrite(output);
                return false;
            }
        }
    }
    private String readExportSnapshot() {
        synchronized (saveLock) {
            try (InputStream input = exportFile.openRead()) { return readBounded(input); }
            catch (Exception error) { return null; }
        }
    }
    private void clearPendingExport() {
        pendingExport = null;
        pendingExportRecovery = false;
        synchronized (saveLock) { exportFile.delete(); }
    }
    private void dispatchPendingImport() {
        if (pendingImport == null || web == null || !activityReady || !isEntry(web.getUrl())) return;
        String json = pendingImport;
        pendingImport = null;
        web.evaluateJavascript("(function(){if(typeof window.onNativeImport!=='function')return false;"
                + "window.onNativeImport(" + JSONObject.quote(json) + ");return true;})()",
                delivered -> { if (!"true".equals(delivered)) message("存档导入失败：页面尚未就绪，请重新选择文件。"); });
    }
    private void startExport(String text, boolean recovery) {
        if (!readyForPicker()) return;
        try {
            pendingExportRecovery = recovery;
            pendingExport = recovery ? boundedText(text) : validatedSave(text);
            if (!recovery && !writeInternalSave(pendingExport)) throw new IllegalStateException("could not preserve save");
            if (!preserveExport(pendingExport)) throw new IllegalStateException("could not preserve export");
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType(recovery ? "text/plain" : "application/json");
            String date = new SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(new Date());
            intent.putExtra(Intent.EXTRA_TITLE, recovery ? "lingqi-recovery-" + date + ".txt" : "lingqi-save-" + date + ".json");
            pickerOpen = true;
            startActivityForResult(intent, EXPORT);
        } catch (Exception error) {
            clearPendingExport(); pickerOpen = false;
            message("存档导出失败：内容无效、保存失败或系统文件选择器不可用。");
        }
    }
    private void message(String value) {
        Toast.makeText(this, value, Toast.LENGTH_SHORT).show();
        if (web != null) web.evaluateJavascript(
                "if(window.onNativeMessage){window.onNativeMessage(" + JSONObject.quote(value) + ");}", null);
    }
    private void lifecycle(String value) {
        if (web != null && activityReady) web.evaluateJavascript(
                "if(window.onNativeLifecycle){window.onNativeLifecycle(" + JSONObject.quote(value) + ");}", null);
    }
    private boolean readyForPicker() {
        if (web == null || !activityReady || !isEntry(web.getUrl())) return false;
        if (pickerOpen) { message("已有存档文件操作正在进行，请稍后再试。"); return false; }
        return true;
    }

    public final class SaveBridge {
        @JavascriptInterface public boolean persistSave(String json) { return writeInternalSave(json); }
        @JavascriptInterface public String loadSave() { return readInternalSave(); }
        @JavascriptInterface public int maxSaveBytes() { return MAX_SAVE; }
        @JavascriptInterface public void exportSave(String json) { runOnUiThread(() -> startExport(json, false)); }
        @JavascriptInterface public void exportRecovery(String text) { runOnUiThread(() -> startExport(text, true)); }
        @JavascriptInterface public void importSave() {
            runOnUiThread(() -> {
                if (!readyForPicker()) return;
                try {
                    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                    intent.putExtra(Intent.EXTRA_MIME_TYPES,
                            new String[]{"application/json", "text/plain", "application/octet-stream"});
                    pickerOpen = true; startActivityForResult(intent, IMPORT);
                } catch (Exception error) { pickerOpen = false; message("无法打开系统文件选择器。"); }
            });
        }
    }

    @Override protected void onSaveInstanceState(Bundle out) {
        out.putBoolean("pickerOpen", pickerOpen);
        out.putBoolean("exportPending", pendingExport != null);
        out.putBoolean("exportRecovery", pendingExportRecovery);
        super.onSaveInstanceState(out);
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != EXPORT && request != IMPORT) return;
        pickerOpen = false;
        if (result != RESULT_OK || data == null || data.getData() == null) {
            clearPendingExport(); message("已取消存档文件操作。"); return;
        }
        Uri uri = data.getData();
        try {
            if (!"content".equals(uri.getScheme())) throw new IllegalArgumentException("unsupported document URI");
            if (request == EXPORT) {
                if (pendingExport == null) pendingExport = readExportSnapshot();
                String clean = pendingExportRecovery ? boundedText(pendingExport) : validatedSave(pendingExport);
                try (OutputStream output = getContentResolver().openOutputStream(uri, "wt")) {
                    if (output == null) throw new IllegalStateException("no output stream");
                    output.write(clean.getBytes(StandardCharsets.UTF_8));
                }
                message(pendingExportRecovery ? "恢复备份已导出到所选文件。" : "存档已导出到所选文件。");
            } else {
                String json;
                try (InputStream input = getContentResolver().openInputStream(uri)) { json = validatedSave(readBounded(input)); }
                // Full game validation must succeed before the UI commits an imported save.
                pendingImport = json;
                dispatchPendingImport();
            }
        } catch (Exception error) {
            message(request == EXPORT ? "存档导出失败，请重新选择文件后再试。"
                    : "存档导入失败：请使用有效的游戏 JSON 存档，大小不超过 1 MiB。");
        } finally { clearPendingExport(); }
    }
    private void handleBack() {
        if (web == null) { finish(); return; }
        if (exitDialogOpen || pickerOpen) return;
        web.evaluateJavascript("(function(){return typeof window.onNativeBack==='function' && window.onNativeBack()===true;})()",
                handled -> {
                    if (!"true".equals(handled) && !isFinishing() && !isDestroyed() && web != null && !exitDialogOpen && !pickerOpen) {
                        exitDialogOpen = true;
                        AlertDialog dialog = new AlertDialog.Builder(this).setTitle("离开问道灵契？")
                                .setMessage("已提交的进度会自动保存，战斗可在下次打开后继续。")
                                .setPositiveButton("退出", (item, which) -> { lifecycle("pause"); finish(); })
                                .setNegativeButton("继续修行", null).create();
                        dialog.setOnDismissListener(item -> exitDialogOpen = false);
                        dialog.show();
                    }
                });
    }
    @Override public void onBackPressed() { handleBack(); }
    @Override protected void onPause() { activityResumed = false; lifecycle("pause"); if (web != null) web.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); activityResumed = true; if (web != null) web.onResume(); lifecycle("resume"); }
    @Override protected void onDestroy() {
        activityReady = false;
        if (web != null) { web.removeJavascriptInterface("Native"); web.destroy(); web = null; }
        super.onDestroy();
    }
}

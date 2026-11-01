package ee.malt.diadem;

import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT < 35 || getBridge() == null) return;

        WebView webView = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
            int types = WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout();
            Insets insets = windowInsets.getInsets(types);
            ViewGroup.MarginLayoutParams margins = (ViewGroup.MarginLayoutParams) view.getLayoutParams();
            if (margins.leftMargin != insets.left || margins.topMargin != insets.top
                || margins.rightMargin != insets.right || margins.bottomMargin != insets.bottom) {
                margins.setMargins(insets.left, insets.top, insets.right, insets.bottom);
                view.setLayoutParams(margins);
            }

            // System bars are handled by the native margins. Keep IME insets flowing
            // to WebView so the keyboard resizes its visual viewport (CONSUMED does not).
            WindowInsetsCompat remaining = new WindowInsetsCompat.Builder(windowInsets)
                .setInsets(types, Insets.NONE).build();
            return ViewCompat.onApplyWindowInsets(view, remaining);
        });
        ViewCompat.requestApplyInsets(webView);
    }
}

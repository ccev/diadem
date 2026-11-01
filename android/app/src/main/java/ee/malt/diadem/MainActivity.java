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

        getWindow().setNavigationBarContrastEnforced(false);

        WebView webView = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
            int types = WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout();
            Insets insets = windowInsets.getInsets(types);
            ViewGroup.MarginLayoutParams margins = (ViewGroup.MarginLayoutParams) view.getLayoutParams();
            if (margins.leftMargin != insets.left || margins.topMargin != 0
                || margins.rightMargin != insets.right || margins.bottomMargin != 0) {
                margins.setMargins(insets.left, 0, insets.right, 0);
                view.setLayoutParams(margins);
            }

            // Draw the map behind the status and navigation bars. Forward their
            // safe areas to CSS; side cutouts still use native margins.
            // Keep IME insets flowing so the keyboard resizes the visual viewport.
            WindowInsetsCompat remaining = new WindowInsetsCompat.Builder(windowInsets)
                .setInsets(types, Insets.of(0, insets.top, 0, insets.bottom)).build();
            return ViewCompat.onApplyWindowInsets(view, remaining);
        });
        ViewCompat.requestApplyInsets(webView);
    }
}

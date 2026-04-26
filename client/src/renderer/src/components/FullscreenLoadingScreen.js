import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function FullscreenLoadingScreen({ title, fixed = true, }) {
    return (_jsxs("div", { style: {
            position: fixed ? 'fixed' : 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)',
            color: 'white',
            zIndex: 9999,
            pointerEvents: 'none'
        }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }, children: [_jsx("div", { style: {
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            border: '4px solid rgba(255,255,255,0.25)',
                            borderTopColor: 'rgba(255,255,255,0.95)',
                            animation: 'tgif-spin 1s linear infinite'
                        } }), _jsx("div", { style: { fontWeight: 700 }, children: title ?? 'Loading…' })] }), _jsx("style", { children: `
        @keyframes tgif-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      ` })] }));
}

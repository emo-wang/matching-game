import { tween, UIOpacity, Node, director } from 'cc';

export class ErrorOverlay {
    private static node: any = document.getElementById('error');

    public static show(message: string) {
        // 移除旧的
        if (this.node) {
            this.hide();
        }

        // 创建 DOM 容器
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '10vh'; // 下移一点
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.background = '#2c2c2c';
        container.style.color = '#fff';
        container.style.padding = '2em 2em';
        container.style.borderRadius = '12px';
        container.style.boxShadow = '0 0 24px rgba(0,0,0,0.5)';
        container.style.fontFamily = 'sans-serif';
        container.style.fontSize = '1rem'; // 更大字体
        container.style.zIndex = '9999';
        container.style.maxWidth = '80vw'; // 更宽
        container.style.wordBreak = 'break-word';
        container.style.opacity = '1';
        container.style.transition = 'opacity 0.5s ease';

        container.innerHTML = `
            <div style="position: relative;">
                <div style="margin-bottom: 1em; font-weight: bold;"> Error: </div>
                <div>${message}</div>
                <span style="
    position: absolute;
    top: -0.75em;
    right: -0.75em;
    font-size: 1.25rem;
    font-weight: bold;
    cursor: pointer;
    color: #fff;
    background: #444;
    width: 2em;
    height: 2em;
    line-height: 2em;
    text-align: center;
    border-radius: 50%;
    box-shadow: 0 0 6px rgba(0,0,0,0.2);
" onclick="this.parentElement.parentElement.remove()">×</span>
            </div>
        `;

        document.body.appendChild(container);

        // 自动淡出（5 秒后）
        setTimeout(() => {
            container.style.opacity = '0';
            setTimeout(() => {
                container.remove();
            }, 500);
        }, 5000);

        // 用于 hide()
        this.node = null;
    }

    public static initErrorHandler() {
        window.addEventListener('unhandledrejection', (event) => {
            this.show(event.reason?.message || String(event.reason));
        });
    }

    public static hide() {
        if (this.node) {
            this.node.remove();
            this.node = null;
        }
        const popup = document.querySelector('div[style*="z-index: 9999"]');
        if (popup) popup.remove();
    }
}

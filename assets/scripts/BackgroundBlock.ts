import { _decorator, Component, Graphics, Color, UITransform } from 'cc';
const { ccclass } = _decorator;

@ccclass('BackgroundBlock')
export class BackgroundBlock extends Component {

    onLoad() {
        const g = this.node.getComponent(Graphics);
        if (!g) return;

        const width = this.node.parent.getComponent(UITransform).width;
        const height = this.node.parent.getComponent(UITransform).height;

        this.drawBackgroundBlock(g, -width / 2, -height / 2, width, height);
    }

    /**
     * 画带阴影效果的背景块
     * @param g Graphics组件
     * @param x 左下角x坐标
     * @param y 左下角y坐标
     * @param width 宽度
     * @param height 高度
     */
    drawBackgroundBlock(g: Graphics, x: number, y: number, width: number, height: number) {
        const shadowOffset = 5;

        // 画阴影（深粉色）
        g.fillColor = new Color(255, 100, 200, 255); // 深粉色阴影
        g.moveTo(x + shadowOffset, y - shadowOffset);
        g.lineTo(x + shadowOffset, y + height - shadowOffset);
        g.lineTo(x + width + shadowOffset, y + height - shadowOffset);
        g.lineTo(x + width + shadowOffset, y - shadowOffset);
        g.close();
        g.fill();

        // 画主背景（浅粉色）
        g.fillColor = new Color(255, 180, 220, 255); // 浅粉色
        g.moveTo(x, y);
        g.lineTo(x, y + height);
        g.lineTo(x + width, y + height);
        g.lineTo(x + width, y);
        g.close();
        g.fill();

        // 画主背景（浅粉色）
        g.fillColor = new Color(0, 0, 0, 255); // 浅粉色
        g.lineWidth = 2;
        g.rect(-width / 2, -height / 2, width, height);
        g.stroke();
    }
}

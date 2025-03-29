import { _decorator, Component, Label, tween, UIOpacity } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Toast')
export class Toast extends Component {

    @property(Label)
    messageLabel: Label = null!;

    @property(UIOpacity)
    toastOpacity: UIOpacity = null!;

    private static instance: Toast | null = null;

    onLoad() {
        Toast.instance = this;
        this.node.active = false;  // 默认隐藏
    }

    public static show(message: string, duration: number = 2) {
        if (!Toast.instance) {
            console.warn("Toast 未初始化！");
            return;
        }
        Toast.instance.displayToast(message, duration);
    }

    private displayToast(message: string, duration: number) {
        this.messageLabel.string = message;
        this.node.active = true;
        this.toastOpacity.opacity = 0;

        tween(this.toastOpacity)
            .to(0.3, { opacity: 255 })
            .delay(duration)
            .to(0.3, { opacity: 0 })
            .call(() => {
                this.node.active = false;
            })
            .start();
    }
}

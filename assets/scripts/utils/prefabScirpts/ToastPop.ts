import { _decorator, Component, Node, tween, Vec3, Label, UITransform, Tween } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Toast')
export class Toast extends Component {
    @property(Label) label: Label = null!;
    @property(Node) Toast: Node = null!;

    private originalPos: Vec3 = new Vec3();
    private toastHeight: number = 100;
    private currentTween: Tween<Node> | null = null;

    onLoad() {
        this.originalPos = this.node.position.clone();

        const uiTrans = this.Toast.getComponent(UITransform);
        if (uiTrans) {
            this.toastHeight = uiTrans.height;
        }

        this.node.active = false;
    }

    show(msg: string, duration: number = 2) {
        this.label.string = msg;

        const downPos = this.originalPos.clone().add(new Vec3(0, -this.toastHeight, 0));

        // 如果之前有动画，停止它
        if (this.currentTween) {
            this.currentTween.stop();
            this.node.setPosition(this.originalPos);
        }

        this.node.active = true;
        this.node.setPosition(this.originalPos);

        this.currentTween = tween(this.node)
            .to(0.3, { position: downPos }, { easing: 'backOut' })
            .delay(duration)
            .to(0.3, { position: this.originalPos }, { easing: 'backIn' })
            .call(() => {
                this.node.active = false;
                this.currentTween = null;
            })
            .start();
    }
}

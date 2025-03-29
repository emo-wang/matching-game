import { _decorator, Component, Label, Node, Button } from 'cc';
const { ccclass, property } = _decorator;

type Callback = () => void;

@ccclass('ConfirmDialog')
export class ConfirmDialog extends Component {

    @property(Label) titleLabel: Label = null!;
    @property(Label) contentLabel: Label = null!;
    @property(Node) confirmButton: Node = null!;
    @property(Node) cancelButton: Node = null!;

    private confirmCallback: Callback | null = null;
    private cancelCallback: Callback | null = null;

    private static instance: ConfirmDialog | null = null;

    onLoad() {
        ConfirmDialog.instance = this;
        this.node.active = false;

        // 按钮监听
        this.confirmButton.on(Button.EventType.CLICK, this.onConfirm, this);
        this.cancelButton.on(Button.EventType.CLICK, this.onCancel, this);
    }

    public static show(
        title: string,
        content: string,
        confirmText: string = "confirm",
        cancelText: string | null = "cancel",
        onConfirm?: Callback,
        onCancel?: Callback
    ) {
        if (!ConfirmDialog.instance) {
            console.warn("ConfirmDialog 未初始化！");
            return;
        }
        ConfirmDialog.instance.open(title, content, confirmText, cancelText, onConfirm, onCancel);
    }

    private open(
        title: string,
        content: string,
        confirmText: string,
        cancelText: string | null,
        onConfirm?: Callback,
        onCancel?: Callback
    ) {
        this.titleLabel.string = title;
        this.contentLabel.string = content;
        this.confirmButton.getComponentInChildren(Label)!.string = confirmText;

        if (cancelText) {
            this.cancelButton.active = true;
            this.cancelButton.getComponentInChildren(Label)!.string = cancelText;
        } else {
            this.cancelButton.active = false;  // 单按钮模式
        }

        this.confirmCallback = onConfirm || null;
        this.cancelCallback = onCancel || null;

        this.node.active = true;
    }

    private close() {
        this.node.active = false;
    }

    private onConfirm() {
        if (this.confirmCallback) this.confirmCallback();
        this.close();
    }

    private onCancel() {
        if (this.cancelCallback) this.cancelCallback();
        this.close();
    }
}


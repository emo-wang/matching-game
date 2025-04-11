import {
    _decorator, Component, Node, Label, EditBox, Toggle,
    Prefab, instantiate
} from 'cc';

const { ccclass, property } = _decorator;

type FieldType = 'text' | 'number' | 'toggle';

interface FormSchemaItem {
    label: string;
    key: string;
    type: FieldType;
    required?: boolean;
    defaultValue?: any;
}

@ccclass('FormGenerator')
export class FormGenerator extends Component {
    @property(Prefab) rowPrefab: Prefab = null!;
    @property(Prefab) labelPrefab: Prefab = null!;
    @property(Prefab) editBoxPrefab: Prefab = null!;
    @property(Prefab) togglePrefab: Prefab = null!;
    @property(Node) contentRoot: Node = null!;

    private formData: Record<string, EditBox | Toggle> = {};

    start() {
        const schema = this.getSchema();
        this.generateForm(schema);
    }

    getSchema(): FormSchemaItem[] {
        return [
            { label: '用户名', key: 'username', type: 'text', required: true, defaultValue: 'Player' },
            { label: '年龄', key: 'age', type: 'number' },
            { label: '是否订阅', key: 'subscribed', type: 'toggle', defaultValue: true }
        ];
    }

    generateForm(schema: FormSchemaItem[]) {
        for (const field of schema) {
            const row = instantiate(this.rowPrefab);

            // 创建 label
            const label = instantiate(this.labelPrefab);
            const labelComp = label.getComponent(Label)!;
            labelComp.string = field.label + (field.required ? ' *' : '');

            // 创建输入组件
            let inputNode: Node;
            if (field.type === 'toggle') {
                inputNode = instantiate(this.togglePrefab);
                inputNode.getComponent(Toggle)!.isChecked = field.defaultValue ?? false;
                this.formData[field.key] = inputNode.getComponent(Toggle)!;
            } else {
                inputNode = instantiate(this.editBoxPrefab);
                const editBox = inputNode.getComponent(EditBox)!;
                editBox.string = field.defaultValue ?? '';
                this.formData[field.key] = editBox;
            }

            // 添加到行
            row.addChild(label);
            row.addChild(inputNode);

            // 添加到面板
            this.contentRoot.addChild(row);
        }
    }

    collectFormData() {
        const result: Record<string, any> = {};
        for (const key in this.formData) {
            const comp = this.formData[key];
            result[key] = comp instanceof EditBox ? comp.string : comp.isChecked;
        }
        return result;
    }

    validateForm(): string[] {
        const schema = this.getSchema();
        const missing: string[] = [];

        for (const field of schema) {
            if (field.required) {
                const comp = this.formData[field.key];
                const value = comp instanceof EditBox ? comp.string.trim() : comp.isChecked;
                if (comp instanceof EditBox && !value) {
                    missing.push(field.label);
                }
            }
        }

        return missing;
    }
}

import {
    _decorator, Component, Node, Label, EditBox, Toggle,
    Prefab, instantiate
} from 'cc';

const { ccclass, property } = _decorator;

export type FieldType = 'text' | 'number' | 'toggle' | 'toggleGroup';
interface OptionItem<T = string> {
    label: string;
    value: T;
}

export interface FormSchemaItem {
    label: string;
    key: string;
    type: FieldType;
    required?: boolean;
    defaultValue?: any;
    options?: OptionItem<any>[];

}

@ccclass('FormGenerator')
export class FormGenerator extends Component {
    @property(Prefab) rowPrefab: Prefab = null!;
    @property(Prefab) labelPrefab: Prefab = null!;
    @property(Prefab) editBoxPrefab: Prefab = null!;
    @property(Prefab) togglePrefab: Prefab = null!;
    @property(Prefab) toggleGroupPrefab: Prefab = null!;
    @property(Prefab) editNumberPrefab: Prefab = null!;
    @property(Node) contentRoot: Node = null!;
    private formSchema: FormSchemaItem[] = [];
    private formData: Record<string, EditBox | Toggle> = {};

    start() {
        // const schema = this.getSchema();
        // this.generateForm(schema);
    }

    getSchema(): FormSchemaItem[] {
        return this.formSchema
    }

    setSchema(schema: FormSchemaItem[]) {
        this.formSchema = schema;
    }

    generateForm(schema: FormSchemaItem[]) {
        for (const field of schema) {
            const row = instantiate(this.rowPrefab).getChildByName('row')!;

            // 创建 label
            const label = instantiate(this.labelPrefab).getChildByName('Label')!;
            const labelComp = label.getComponent(Label)!;
            labelComp.string = field.label + (field.required ? ' *' : '');

            // 创建输入组件
            let inputNode: Node;
            if (field.type === 'toggle') {
                inputNode = instantiate(this.togglePrefab).getChildByName('Toggle')!;
                inputNode.getComponent(Toggle)!.isChecked = field.defaultValue ?? false;
                this.formData[field.key] = inputNode.getComponent(Toggle)!;
            } else {
                inputNode = instantiate(this.editBoxPrefab);
                const editBox = inputNode.getChildByName('EditBox').getComponent(EditBox)!;
                editBox.string = field.defaultValue ?? '';
                this.formData[field.key] = editBox;
            }

            // 添加到行
            row.getChildByName('rowLeft').addChild(label);
            row.getChildByName('rowRight').addChild(inputNode);

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

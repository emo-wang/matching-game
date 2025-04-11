function inferType(value: any): string {
    if (Array.isArray(value)) {
      if (value.length === 0) return 'any[]';
      return `${inferType(value[0])}[]`;
    }
  
    if (value === null) return 'any';
  
    const type = typeof value;
  
    if (type === 'object') {
      return generateInlineInterface(value, 2);
    }
  
    return type;
  }
  
  function generateInlineInterface(obj: Record<string, any>, indent = 2): string {
    const space = ' '.repeat(indent);
    const lines = Object.entries(obj).map(([key, val]) => {
      return `${space}${key}: ${inferType(val)};`;
    });
    return `{\n${lines.join('\n')}\n${' '.repeat(indent - 2)}}`;
  }
  
  /**
   * 根据对象生成TypeScript interface 字符串
   * @param obj 要转换的对象
   * @param name 接口名（默认是 `GeneratedInterface`）
   * @returns interface 字符串
   */
  export default function objectToInterface(obj: Record<string, any>, name = 'GeneratedInterface'): string {
    const body = generateInlineInterface(obj, 2);
    return `interface ${name} ${body}`;
  }
  
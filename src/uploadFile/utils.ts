export function applyField(inst: any, field: string, value: any): any {
    inst = inst || {};
    if (inst[field]) {
        if (!inst[field].length) inst[field] = [inst[field]];
        inst[field].push(value);
    } else {
        inst[field] = value;
    }

    return inst;
}

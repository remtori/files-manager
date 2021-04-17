export function applyField(inst: any, field: string, value: any): any {
	inst = inst || {};

	if (field.endsWith('[]')) {
		if (field.endsWith('[]')) field = field.slice(0, -2);
		if (!inst[field]) inst[field] = [];

		inst[field].push(value);
	} else {
		inst[field] = value;
	}

	return inst;
}

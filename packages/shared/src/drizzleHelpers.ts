export const oneOrNullFromFindMany = <T>(values: T[]): T | null => {
	if (values.length === 1 && values[0]) {
		return values[0];
	}
	return null;
};
